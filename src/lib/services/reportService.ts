import { energyService, MonthlyComparison } from './energyService';
import { db } from '@/lib/db/client';
import { sendEmail } from './emailService';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';

export interface ReportData {
  buildingId: string;
  buildingName: string;
  month: number;
  year: number;
  comparison: MonthlyComparison;
  baselineInfo: {
    heating?: {
      periodStart: string;
      periodEnd: string;
      dataPoints: number;
    };
    cooling?: {
      periodStart: string;
      periodEnd: string;
      dataPoints: number;
    };
  };
}

export class ReportService {
  async generateMonthlyReport(
    buildingId: string,
    month: number,
    year: number
  ): Promise<ReportData | null> {
    const comparison = await energyService.calculateMonthlyComparison(buildingId, month, year);
    
    if (!comparison) {
      return null;
    }

    const building = await db.getBuildings(undefined, buildingId);
    if (building.length === 0) return null;

    const heatingBaseline = await sql`
      SELECT * FROM energy_baselines
      WHERE building_id = ${buildingId}
        AND month = ${month}
        AND baseline_type = 'heating'
      LIMIT 1
    `;

    const coolingBaseline = await sql`
      SELECT * FROM energy_baselines
      WHERE building_id = ${buildingId}
        AND month = ${month}
        AND baseline_type = 'cooling'
      LIMIT 1
    `;

    return {
      buildingId,
      buildingName: building[0].name,
      month,
      year,
      comparison,
      baselineInfo: {
        heating: heatingBaseline.rows.length > 0 ? {
          periodStart: heatingBaseline.rows[0].baseline_period_start,
          periodEnd: heatingBaseline.rows[0].baseline_period_end,
          dataPoints: heatingBaseline.rows[0].data_points,
        } : undefined,
        cooling: coolingBaseline.rows.length > 0 ? {
          periodStart: coolingBaseline.rows[0].baseline_period_start,
          periodEnd: coolingBaseline.rows[0].baseline_period_end,
          dataPoints: coolingBaseline.rows[0].data_points,
        } : undefined,
      },
    };
  }

  async generatePDF(reportData: ReportData): Promise<string> {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    .header { margin-bottom: 30px; }
    .section { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .savings { color: green; font-weight: bold; }
    .increase { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Energy Savings Report</h1>
    <p><strong>Building:</strong> ${reportData.buildingName}</p>
    <p><strong>Period:</strong> ${monthNames[reportData.month - 1]} ${reportData.year}</p>
  </div>

  <div class="section">
    <h2>Consumption Data</h2>
    <table>
      <tr>
        <th>Fuel Type</th>
        <th>Consumption</th>
      </tr>
      ${reportData.comparison.electricKWH ? `<tr><td>Electric</td><td>${reportData.comparison.electricKWH.toLocaleString()} kWh</td></tr>` : ''}
      ${reportData.comparison.gasTherms ? `<tr><td>Gas</td><td>${reportData.comparison.gasTherms.toLocaleString()} therms</td></tr>` : ''}
      ${reportData.comparison.fuelOilGallons ? `<tr><td>Fuel Oil</td><td>${reportData.comparison.fuelOilGallons.toLocaleString()} gallons</td></tr>` : ''}
      ${reportData.comparison.districtSteamMBTU ? `<tr><td>District Steam</td><td>${reportData.comparison.districtSteamMBTU.toLocaleString()} MBTU</td></tr>` : ''}
      <tr>
        <td><strong>Total</strong></td>
        <td><strong>${reportData.comparison.totalKBTU.toLocaleString()} kBTU</strong></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Degree Days</h2>
    <table>
      <tr>
        <th>Type</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Heating Degree Days (HDD)</td>
        <td>${reportData.comparison.hdd.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Cooling Degree Days (CDD)</td>
        <td>${reportData.comparison.cdd.toLocaleString()}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Normalized Consumption</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Current</th>
        <th>Baseline</th>
        <th>Unit</th>
      </tr>
      ${reportData.comparison.hdd > 0 ? `
      <tr>
        <td>Consumption per HDD</td>
        <td>${reportData.comparison.currentConsumptionPerHDD.toFixed(4)}</td>
        <td>${reportData.comparison.baselineConsumptionPerHDD.toFixed(4)}</td>
        <td>kBTU/HDD</td>
      </tr>
      ` : ''}
      ${reportData.comparison.cdd > 0 ? `
      <tr>
        <td>Consumption per CDD</td>
        <td>${reportData.comparison.currentConsumptionPerCDD.toFixed(4)}</td>
        <td>${reportData.comparison.baselineConsumptionPerCDD.toFixed(4)}</td>
        <td>kBTU/CDD</td>
      </tr>
      ` : ''}
    </table>
  </div>

  <div class="section">
    <h2>Savings Analysis</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Savings Percentage</td>
        <td class="${reportData.comparison.savingsPercentage >= 0 ? 'savings' : 'increase'}">
          ${reportData.comparison.savingsPercentage >= 0 ? '+' : ''}${reportData.comparison.savingsPercentage.toFixed(2)}%
        </td>
      </tr>
      <tr>
        <td>Savings (kBTU)</td>
        <td class="${reportData.comparison.savingsKBTU >= 0 ? 'savings' : 'increase'}">
          ${reportData.comparison.savingsKBTU >= 0 ? '+' : ''}${reportData.comparison.savingsKBTU.toLocaleString()}
        </td>
      </tr>
    </table>
  </div>

  ${reportData.baselineInfo.heating || reportData.baselineInfo.cooling ? `
  <div class="section">
    <h2>Baseline Information</h2>
    <p><strong>Baseline Period:</strong> Calculated from historical data</p>
    ${reportData.baselineInfo.heating ? `
    <p><strong>Heating Baseline:</strong> ${reportData.baselineInfo.heating.dataPoints} data points from ${new Date(reportData.baselineInfo.heating.periodStart).toLocaleDateString()} to ${new Date(reportData.baselineInfo.heating.periodEnd).toLocaleDateString()}</p>
    ` : ''}
    ${reportData.baselineInfo.cooling ? `
    <p><strong>Cooling Baseline:</strong> ${reportData.baselineInfo.cooling.dataPoints} data points from ${new Date(reportData.baselineInfo.cooling.periodStart).toLocaleDateString()} to ${new Date(reportData.baselineInfo.cooling.periodEnd).toLocaleDateString()}</p>
    ` : ''}
  </div>
  ` : ''}

  <div class="section">
    <p><em>Report generated on ${new Date().toLocaleString()}</em></p>
  </div>
</body>
</html>
    `;

    const fileName = `energy-report-${reportData.buildingId}-${reportData.year}-${reportData.month}.html`;
    const blob = await put(fileName, html, {
      access: 'public',
      contentType: 'text/html',
    });

    return blob.url;
  }

  async saveReport(
    buildingId: string,
    month: number,
    year: number,
    reportData: ReportData,
    pdfUrl: string
  ): Promise<string> {
    const utilityResult = await sql`
      SELECT id FROM utility_consumption
      WHERE building_id = ${buildingId}
        AND month = ${month}
        AND year = ${year}
      LIMIT 1
    `;

    const building = await db.getBuildings(undefined, buildingId);
    if (building.length === 0) throw new Error('Building not found');

    const cityId = building[0].city_id;
    const degreeDaysResult = await sql`
      SELECT id FROM degree_days
      WHERE city_id = ${cityId}
        AND month = ${month}
        AND year = ${year}
      LIMIT 1
    `;

    const result = await sql`
      INSERT INTO energy_reports (
        building_id, month, year,
        utility_consumption_id, degree_days_id,
        consumption_per_hdd, consumption_per_cdd,
        baseline_consumption_per_hdd, baseline_consumption_per_cdd,
        savings_percentage, savings_kbtu,
        report_data, pdf_url
      ) VALUES (
        ${buildingId}, ${month}, ${year},
        ${utilityResult.rows.length > 0 ? utilityResult.rows[0].id : null},
        ${degreeDaysResult.rows.length > 0 ? degreeDaysResult.rows[0].id : null},
        ${reportData.comparison.currentConsumptionPerHDD},
        ${reportData.comparison.currentConsumptionPerCDD},
        ${reportData.comparison.baselineConsumptionPerHDD},
        ${reportData.comparison.baselineConsumptionPerCDD},
        ${reportData.comparison.savingsPercentage},
        ${reportData.comparison.savingsKBTU},
        ${JSON.stringify(reportData)}::jsonb,
        ${pdfUrl}
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (result.rows.length === 0) {
      const existing = await sql`
        SELECT id FROM energy_reports
        WHERE building_id = ${buildingId}
          AND month = ${month}
          AND year = ${year}
        LIMIT 1
      `;
      return existing.rows[0].id;
    }

    return result.rows[0].id;
  }

  async sendReportEmail(
    reportData: ReportData,
    pdfUrl: string,
    recipientEmail: string
  ): Promise<boolean> {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const subject = `Energy Savings Report - ${reportData.buildingName} - ${monthNames[reportData.month - 1]} ${reportData.year}`;

    const text = `
Energy Savings Report

Building: ${reportData.buildingName}
Period: ${monthNames[reportData.month - 1]} ${reportData.year}

Total Consumption: ${reportData.comparison.totalKBTU.toLocaleString()} kBTU
Savings: ${reportData.comparison.savingsPercentage >= 0 ? '+' : ''}${reportData.comparison.savingsPercentage.toFixed(2)}% (${reportData.comparison.savingsKBTU >= 0 ? '+' : ''}${reportData.comparison.savingsKBTU.toLocaleString()} kBTU)

View full report: ${pdfUrl}
    `;

    const html = `
      <h2>Energy Savings Report</h2>
      <p><strong>Building:</strong> ${reportData.buildingName}</p>
      <p><strong>Period:</strong> ${monthNames[reportData.month - 1]} ${reportData.year}</p>
      <p><strong>Total Consumption:</strong> ${reportData.comparison.totalKBTU.toLocaleString()} kBTU</p>
      <p><strong>Savings:</strong> <span style="color: ${reportData.comparison.savingsPercentage >= 0 ? 'green' : 'red'}">${reportData.comparison.savingsPercentage >= 0 ? '+' : ''}${reportData.comparison.savingsPercentage.toFixed(2)}%</span> (${reportData.comparison.savingsKBTU >= 0 ? '+' : ''}${reportData.comparison.savingsKBTU.toLocaleString()} kBTU)</p>
      <p><a href="${pdfUrl}">View Full Report</a></p>
    `;

    const result = await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html,
    });

    return result.success;
  }
}

export const reportService = new ReportService();
