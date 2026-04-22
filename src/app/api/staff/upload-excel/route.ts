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
      const processedMonths = new Set<number>();
      for (let i = 0; i < (data as any[]).length; i++) {
        const row = (data as any[])[i];
        try {
          const month = parseInt(row.month || row.Month);
          const year = parseInt(row.year || row.Year);
          const totalKBTU = parseFloat(row.totalKBTU || row['Total kBTU'] || row.total_kbtu);

          if (isNaN(month) || isNaN(year) || isNaN(totalKBTU) || !month || !year || !totalKBTU) {
            errors.push(`Row ${i + 2}: Missing or invalid required fields (month, year, totalKBTU)`);
            continue;
          }

          const rawElec = row.electricKWH ?? row['Electric (kWh)'] ?? row.electric_kwh;
          const rawGas = row.gasTherms ?? row['Gas (therms)'] ?? row.gas_therms;
          const rawOil = row.fuelOilGallons ?? row['Fuel Oil (gallons)'] ?? row.fuel_oil_gallons;
          const rawSteam = row.districtSteamMBTU ?? row['District Steam (MBTU)'] ?? row.district_steam_mbtu;

          await energyService.uploadUtilityData(
            buildingId!,
            month,
            year,
            {
              electricKWH: rawElec != null && rawElec !== '' ? parseFloat(rawElec) : undefined,
              gasTherms: rawGas != null && rawGas !== '' ? parseFloat(rawGas) : undefined,
              fuelOilGallons: rawOil != null && rawOil !== '' ? parseFloat(rawOil) : undefined,
              districtSteamMBTU: rawSteam != null && rawSteam !== '' ? parseFloat(rawSteam) : undefined,
              totalKBTU,
            },
            uploadedBy
          );

          processedMonths.add(month);
          results.push({ month, year, success: true });
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }
      // Calculate baselines once per unique month after all rows processed
      for (const month of processedMonths) {
        try {
          await energyService.calculateBaseline(buildingId!, month);
        } catch {
          // baseline calc is best-effort; don't fail the upload
        }
      }
    } else if (type === 'degree-days') {
      for (let i = 0; i < (data as any[]).length; i++) {
        const row = (data as any[])[i];
        try {
          const month = parseInt(row.month || row.Month);
          const year = parseInt(row.year || row.Year);
          const hdd = parseFloat(row.hdd || row.HDD || row.heating_degree_days);
          const cdd = parseFloat(row.cdd || row.CDD || row.cooling_degree_days || 0);

          if (isNaN(month) || isNaN(year) || isNaN(hdd)) {
            errors.push(`Row ${i + 2}: Missing or invalid required fields (month, year, hdd)`);
            continue;
          }

          await energyService.uploadDegreeDays(
            cityId!,
            month,
            year,
            hdd,
            isNaN(cdd) ? 0 : cdd,
            uploadedBy
          );

          results.push({ month, year, success: true });
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message}`);
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
