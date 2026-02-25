import { energyService, MonthlyComparison } from './energyService';
import { db } from '@/lib/db/client';
import { sendEmail } from './emailService';
import { sql } from '@vercel/postgres';
import { put } from '@vercel/blob';
import PDFDocument from 'pdfkit';

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

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const fileName = `energy-report-${reportData.buildingId}-${reportData.year}-${reportData.month}.pdf`;
            
            const blob = await put(fileName, pdfBuffer, {
              access: 'public',
              contentType: 'application/pdf',
            });

            resolve(blob.url);
          } catch (error) {
            reject(error);
          }
        });
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Energy Savings Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Building: ${reportData.buildingName}`, { align: 'center' });
        doc.text(`Period: ${monthNames[reportData.month - 1]} ${reportData.year}`, { align: 'center' });
        doc.moveDown(2);

        // Consumption Data
        doc.fontSize(16).text('Consumption Data', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        
        const consumptionY = doc.y;
        doc.text('Fuel Type', 50, consumptionY);
        doc.text('Consumption', 250, consumptionY);
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);

        if (reportData.comparison.electricKWH) {
          doc.text(`Electric: ${reportData.comparison.electricKWH.toLocaleString()} kWh`, 50);
          doc.moveDown(0.3);
        }
        if (reportData.comparison.gasTherms) {
          doc.text(`Gas: ${reportData.comparison.gasTherms.toLocaleString()} therms`, 50);
          doc.moveDown(0.3);
        }
        if (reportData.comparison.fuelOilGallons) {
          doc.text(`Fuel Oil: ${reportData.comparison.fuelOilGallons.toLocaleString()} gallons`, 50);
          doc.moveDown(0.3);
        }
        if (reportData.comparison.districtSteamMBTU) {
          doc.text(`District Steam: ${reportData.comparison.districtSteamMBTU.toLocaleString()} MBTU`, 50);
          doc.moveDown(0.3);
        }
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text(`Total: ${reportData.comparison.totalKBTU.toLocaleString()} kBTU`, 50);
        doc.font('Helvetica').fontSize(10);
        doc.moveDown(1.5);

        // Degree Days
        doc.fontSize(16).text('Degree Days', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Heating Degree Days (HDD): ${reportData.comparison.hdd.toLocaleString()}`, 50);
        doc.moveDown(0.3);
        doc.text(`Cooling Degree Days (CDD): ${reportData.comparison.cdd.toLocaleString()}`, 50);
        doc.moveDown(1.5);

        // Normalized Consumption
        doc.fontSize(16).text('Normalized Consumption', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        
        if (reportData.comparison.hdd > 0) {
          doc.text('Consumption per HDD:', 50);
          doc.text(`Current: ${reportData.comparison.currentConsumptionPerHDD.toFixed(4)} kBTU/HDD`, 70);
          doc.text(`Baseline: ${reportData.comparison.baselineConsumptionPerHDD.toFixed(4)} kBTU/HDD`, 70);
          doc.moveDown(0.5);
        }
        if (reportData.comparison.cdd > 0) {
          doc.text('Consumption per CDD:', 50);
          doc.text(`Current: ${reportData.comparison.currentConsumptionPerCDD.toFixed(4)} kBTU/CDD`, 70);
          doc.text(`Baseline: ${reportData.comparison.baselineConsumptionPerCDD.toFixed(4)} kBTU/CDD`, 70);
          doc.moveDown(1.5);
        }

        // Savings Analysis
        doc.fontSize(16).text('Savings Analysis', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        
        const savingsColor = reportData.comparison.savingsPercentage >= 0 ? 'green' : 'red';
        doc.fillColor(savingsColor);
        doc.text(`Savings Percentage: ${reportData.comparison.savingsPercentage >= 0 ? '+' : ''}${reportData.comparison.savingsPercentage.toFixed(2)}%`, 50);
        doc.moveDown(0.3);
        doc.text(`Savings (kBTU): ${reportData.comparison.savingsKBTU >= 0 ? '+' : ''}${reportData.comparison.savingsKBTU.toLocaleString()}`, 50);
        doc.fillColor('black');
        doc.moveDown(1.5);

        // Baseline Information
        if (reportData.baselineInfo.heating || reportData.baselineInfo.cooling) {
          doc.fontSize(16).text('Baseline Information', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          
          if (reportData.baselineInfo.heating) {
            doc.text(`Heating Baseline: ${reportData.baselineInfo.heating.dataPoints} data points`, 50);
            doc.text(`Period: ${new Date(reportData.baselineInfo.heating.periodStart).toLocaleDateString()} to ${new Date(reportData.baselineInfo.heating.periodEnd).toLocaleDateString()}`, 70);
            doc.moveDown(0.5);
          }
          if (reportData.baselineInfo.cooling) {
            doc.text(`Cooling Baseline: ${reportData.baselineInfo.cooling.dataPoints} data points`, 50);
            doc.text(`Period: ${new Date(reportData.baselineInfo.cooling.periodStart).toLocaleDateString()} to ${new Date(reportData.baselineInfo.cooling.periodEnd).toLocaleDateString()}`, 70);
            doc.moveDown(0.5);
          }
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(8).fillColor('gray');
        doc.text(`Report generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, { align: 'center' });
        doc.fillColor('black');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
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

    // Check if report already exists
    const existing = await sql`
      SELECT id FROM energy_reports
      WHERE building_id = ${buildingId}
        AND month = ${month}
        AND year = ${year}
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      // Update existing report
      await sql`
        UPDATE energy_reports
        SET utility_consumption_id = ${utilityResult.rows.length > 0 ? utilityResult.rows[0].id : null},
            degree_days_id = ${degreeDaysResult.rows.length > 0 ? degreeDaysResult.rows[0].id : null},
            consumption_per_hdd = ${reportData.comparison.currentConsumptionPerHDD},
            consumption_per_cdd = ${reportData.comparison.currentConsumptionPerCDD},
            baseline_consumption_per_hdd = ${reportData.comparison.baselineConsumptionPerHDD},
            baseline_consumption_per_cdd = ${reportData.comparison.baselineConsumptionPerCDD},
            savings_percentage = ${reportData.comparison.savingsPercentage},
            savings_kbtu = ${reportData.comparison.savingsKBTU},
            report_data = ${JSON.stringify(reportData)}::jsonb,
            pdf_url = ${pdfUrl},
            generated_at = NOW()
        WHERE id = ${existing.rows[0].id}
      `;
      return existing.rows[0].id;
    }

    // Insert new report
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
      RETURNING id
    `;

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
