import { NextRequest, NextResponse } from 'next/server';
import { energyService } from '@/lib/services/energyService';
import * as XLSX from 'xlsx';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "STAFF"]);
    if (auth.error) return auth.error;
    const user = auth.user;
    const uploadedBy = user.userId;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const buildingId = formData.get('buildingId') as string;
    const cityId = formData.get('cityId') as string;

    if (!file || !type) {
      return NextResponse.json(
        { message: 'File and type are required' },
        { status: 400 }
      );
    }

    if (type === 'utility' && !buildingId) {
      return NextResponse.json(
        { message: 'buildingId is required for utility uploads' },
        { status: 400 }
      );
    }

    if (type === 'degree-days' && !cityId) {
      return NextResponse.json(
        { message: 'cityId is required for degree-days uploads' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results: any[] = [];
    const errors: string[] = [];

    if (type === 'utility') {
      for (const row of data as any[]) {
        try {
          const month = parseInt(row.month || row.Month);
          const year = parseInt(row.year || row.Year);
          const totalKBTU = parseFloat(row.totalKBTU || row['Total kBTU'] || row.total_kbtu);

          if (!month || !year || !totalKBTU) {
            errors.push(`Row ${data.indexOf(row) + 2}: Missing required fields`);
            continue;
          }

          const utilityData = await energyService.uploadUtilityData(
            buildingId!,
            month,
            year,
            {
              electricKWH: row.electricKWH || row['Electric (kWh)'] || row.electric_kwh ? parseFloat(row.electricKWH || row['Electric (kWh)'] || row.electric_kwh) : undefined,
              gasTherms: row.gasTherms || row['Gas (therms)'] || row.gas_therms ? parseFloat(row.gasTherms || row['Gas (therms)'] || row.gas_therms) : undefined,
              fuelOilGallons: row.fuelOilGallons || row['Fuel Oil (gallons)'] || row.fuel_oil_gallons ? parseFloat(row.fuelOilGallons || row['Fuel Oil (gallons)'] || row.fuel_oil_gallons) : undefined,
              districtSteamMBTU: row.districtSteamMBTU || row['District Steam (MBTU)'] || row.district_steam_mbtu ? parseFloat(row.districtSteamMBTU || row['District Steam (MBTU)'] || row.district_steam_mbtu) : undefined,
              totalKBTU,
            },
            uploadedBy
          );

          await energyService.calculateBaseline(buildingId!, month);
          results.push({ month, year, success: true });
        } catch (error: any) {
          errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
        }
      }
    } else if (type === 'degree-days') {
      for (const row of data as any[]) {
        try {
          const month = parseInt(row.month || row.Month);
          const year = parseInt(row.year || row.Year);
          const hdd = parseFloat(row.hdd || row.HDD || row.heating_degree_days);
          const cdd = parseFloat(row.cdd || row.CDD || row.cooling_degree_days);

          if (!month || !year || hdd === undefined || cdd === undefined) {
            errors.push(`Row ${data.indexOf(row) + 2}: Missing required fields`);
            continue;
          }

          await energyService.uploadDegreeDays(
            cityId!,
            month,
            year,
            hdd,
            cdd,
            uploadedBy
          );

          results.push({ month, year, success: true });
        } catch (error: any) {
          errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: results.length > 0,
      processed: results.length,
      errors: errors.length > 0 ? errors : undefined,
      results,
    });
  } catch (error: any) {
    console.error('Error processing Excel file:', error);
    return NextResponse.json(
      { message: 'Error processing Excel file', error: error.message },
      { status: 500 }
    );
  }
}
