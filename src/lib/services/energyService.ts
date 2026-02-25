import { sql } from '@neondatabase/serverless';
import { db } from '@/lib/db/client';

export interface UtilityConsumption {
  id: string;
  building_id: string;
  month: number;
  year: number;
  electric_kwh: number | null;
  gas_therms: number | null;
  fuel_oil_gallons: number | null;
  district_steam_mbtu: number | null;
  total_kbtu: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DegreeDays {
  id: string;
  city_id: string;
  month: number;
  year: number;
  heating_degree_days: number;
  cooling_degree_days: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnergyBaseline {
  id: string;
  building_id: string;
  month: number;
  baseline_type: 'heating' | 'cooling';
  avg_consumption_per_degree_day: number;
  baseline_period_start: string;
  baseline_period_end: string;
  data_points: number;
  calculated_at: string;
}

export interface MonthlyComparison {
  month: number;
  year: number;
  currentConsumptionPerHDD: number;
  baselineConsumptionPerHDD: number;
  currentConsumptionPerCDD: number;
  baselineConsumptionPerCDD: number;
  savingsPercentage: number;
  savingsKBTU: number;
  electricKWH: number | null;
  gasTherms: number | null;
  fuelOilGallons: number | null;
  districtSteamMBTU: number | null;
  totalKBTU: number;
  hdd: number;
  cdd: number;
}

export class EnergyService {
  async uploadUtilityData(
    buildingId: string,
    month: number,
    year: number,
    data: {
      electricKWH?: number;
      gasTherms?: number;
      fuelOilGallons?: number;
      districtSteamMBTU?: number;
      totalKBTU: number;
    },
    uploadedBy: string
  ): Promise<UtilityConsumption> {
    const result = await sql`
      INSERT INTO utility_consumption (
        building_id, month, year,
        electric_kwh, gas_therms, fuel_oil_gallons, district_steam_mbtu,
        total_kbtu, uploaded_by
      ) VALUES (
        ${buildingId},
        ${month},
        ${year},
        ${data.electricKWH || null},
        ${data.gasTherms || null},
        ${data.fuelOilGallons || null},
        ${data.districtSteamMBTU || null},
        ${data.totalKBTU},
        ${uploadedBy}
      )
      ON CONFLICT (building_id, month, year)
      DO UPDATE SET
        electric_kwh = EXCLUDED.electric_kwh,
        gas_therms = EXCLUDED.gas_therms,
        fuel_oil_gallons = EXCLUDED.fuel_oil_gallons,
        district_steam_mbtu = EXCLUDED.district_steam_mbtu,
        total_kbtu = EXCLUDED.total_kbtu,
        uploaded_by = EXCLUDED.uploaded_by,
        updated_at = NOW()
      RETURNING *
    `;

    return result.rows[0] as UtilityConsumption;
  }

  async uploadDegreeDays(
    cityId: string,
    month: number,
    year: number,
    hdd: number,
    cdd: number,
    uploadedBy: string
  ): Promise<DegreeDays> {
    const result = await sql`
      INSERT INTO degree_days (
        city_id, month, year, heating_degree_days, cooling_degree_days, uploaded_by
      ) VALUES (
        ${cityId}, ${month}, ${year}, ${hdd}, ${cdd}, ${uploadedBy}
      )
      ON CONFLICT (city_id, month, year)
      DO UPDATE SET
        heating_degree_days = EXCLUDED.heating_degree_days,
        cooling_degree_days = EXCLUDED.cooling_degree_days,
        uploaded_by = EXCLUDED.uploaded_by,
        updated_at = NOW()
      RETURNING *
    `;

    return result.rows[0] as DegreeDays;
  }

  async calculateBaseline(
    buildingId: string,
    month: number
  ): Promise<{ heating: EnergyBaseline | null; cooling: EnergyBaseline | null }> {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const utilityData = await sql`
      SELECT uc.*, b.city_id
      FROM utility_consumption uc
      JOIN buildings b ON b.id = uc.building_id
      WHERE uc.building_id = ${buildingId}
        AND uc.month = ${month}
        AND (uc.year * 100 + uc.month) >= ${threeYearsAgo.getFullYear() * 100 + threeYearsAgo.getMonth() + 1}
      ORDER BY uc.year DESC
    `;

    if (utilityData.rows.length < 3) {
      return { heating: null, cooling: null };
    }

    const cityId = utilityData.rows[0].city_id;
    const degreeDaysData = await sql`
      SELECT * FROM degree_days
      WHERE city_id = ${cityId}
        AND month = ${month}
        AND (year * 100 + month) >= ${threeYearsAgo.getFullYear() * 100 + threeYearsAgo.getMonth() + 1}
      ORDER BY year DESC
    `;

    const hddMap = new Map(degreeDaysData.rows.map(dd => [`${dd.year}-${dd.month}`, dd.heating_degree_days]));
    const cddMap = new Map(degreeDaysData.rows.map(dd => [`${dd.year}-${dd.month}`, dd.cooling_degree_days]));

    let heatingSum = 0;
    let heatingCount = 0;
    let coolingSum = 0;
    let coolingCount = 0;
    let minYear = Infinity;
    let maxYear = -Infinity;

    for (const utility of utilityData.rows) {
      const key = `${utility.year}-${utility.month}`;
      const hdd = hddMap.get(key);
      const cdd = cddMap.get(key);

      if (hdd && hdd > 0) {
        heatingSum += Number(utility.total_kbtu) / Number(hdd);
        heatingCount++;
      }

      if (cdd && cdd > 0) {
        coolingSum += Number(utility.total_kbtu) / Number(cdd);
        coolingCount++;
      }

      if (utility.year < minYear) minYear = utility.year;
      if (utility.year > maxYear) maxYear = utility.year;
    }

    const heatingBaseline = heatingCount >= 3
      ? await this.saveBaseline(buildingId, month, 'heating', heatingSum / heatingCount, minYear, maxYear, heatingCount)
      : null;

    const coolingBaseline = coolingCount >= 3
      ? await this.saveBaseline(buildingId, month, 'cooling', coolingSum / coolingCount, minYear, maxYear, coolingCount)
      : null;

    return { heating: heatingBaseline, cooling: coolingBaseline };
  }

  async saveBaseline(
    buildingId: string,
    month: number,
    baselineType: 'heating' | 'cooling',
    avgConsumptionPerDegreeDay: number,
    startYear: number,
    endYear: number,
    dataPoints: number
  ): Promise<EnergyBaseline> {
    const startDate = new Date(startYear, month - 1, 1);
    const endDate = new Date(endYear, month - 1, 28);

    const result = await sql`
      INSERT INTO energy_baselines (
        building_id, month, baseline_type,
        avg_consumption_per_degree_day,
        baseline_period_start, baseline_period_end,
        data_points
      ) VALUES (
        ${buildingId}, ${month}, ${baselineType},
        ${avgConsumptionPerDegreeDay},
        ${startDate.toISOString()}, ${endDate.toISOString()},
        ${dataPoints}
      )
      ON CONFLICT (building_id, month, baseline_type)
      DO UPDATE SET
        avg_consumption_per_degree_day = EXCLUDED.avg_consumption_per_degree_day,
        baseline_period_start = EXCLUDED.baseline_period_start,
        baseline_period_end = EXCLUDED.baseline_period_end,
        data_points = EXCLUDED.data_points,
        calculated_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `;

    return result.rows[0] as EnergyBaseline;
  }

  async calculateMonthlyComparison(
    buildingId: string,
    month: number,
    year: number
  ): Promise<MonthlyComparison | null> {
    const utility = await sql`
      SELECT * FROM utility_consumption
      WHERE building_id = ${buildingId}
        AND month = ${month}
        AND year = ${year}
      LIMIT 1
    `;

    if (utility.rows.length === 0) {
      return null;
    }

    const building = await db.getBuildings(undefined, buildingId);
    if (building.length === 0) return null;

    const cityId = building[0].city_id;
    const degreeDays = await sql`
      SELECT * FROM degree_days
      WHERE city_id = ${cityId}
        AND month = ${month}
        AND year = ${year}
      LIMIT 1
    `;

    if (degreeDays.rows.length === 0) {
      return null;
    }

    const hdd = Number(degreeDays.rows[0].heating_degree_days);
    const cdd = Number(degreeDays.rows[0].cooling_degree_days);
    const totalKBTU = Number(utility.rows[0].total_kbtu);

    const consumptionPerHDD = hdd > 0 ? totalKBTU / hdd : 0;
    const consumptionPerCDD = cdd > 0 ? totalKBTU / cdd : 0;

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

    const baselineHDD = heatingBaseline.rows.length > 0
      ? Number(heatingBaseline.rows[0].avg_consumption_per_degree_day)
      : null;
    const baselineCDD = coolingBaseline.rows.length > 0
      ? Number(coolingBaseline.rows[0].avg_consumption_per_degree_day)
      : null;

    let savingsPercentage = 0;
    let savingsKBTU = 0;

    if (baselineHDD && hdd > 0) {
      const expectedConsumption = baselineHDD * hdd;
      savingsKBTU = expectedConsumption - totalKBTU;
      savingsPercentage = (savingsKBTU / expectedConsumption) * 100;
    } else if (baselineCDD && cdd > 0) {
      const expectedConsumption = baselineCDD * cdd;
      savingsKBTU = expectedConsumption - totalKBTU;
      savingsPercentage = (savingsKBTU / expectedConsumption) * 100;
    }

    return {
      month,
      year,
      currentConsumptionPerHDD: Math.round(consumptionPerHDD * 10000) / 10000,
      baselineConsumptionPerHDD: baselineHDD ? Math.round(baselineHDD * 10000) / 10000 : 0,
      currentConsumptionPerCDD: Math.round(consumptionPerCDD * 10000) / 10000,
      baselineConsumptionPerCDD: baselineCDD ? Math.round(baselineCDD * 10000) / 10000 : 0,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100,
      savingsKBTU: Math.round(savingsKBTU * 100) / 100,
      electricKWH: utility.rows[0].electric_kwh ? Number(utility.rows[0].electric_kwh) : null,
      gasTherms: utility.rows[0].gas_therms ? Number(utility.rows[0].gas_therms) : null,
      fuelOilGallons: utility.rows[0].fuel_oil_gallons ? Number(utility.rows[0].fuel_oil_gallons) : null,
      districtSteamMBTU: utility.rows[0].district_steam_mbtu ? Number(utility.rows[0].district_steam_mbtu) : null,
      totalKBTU,
      hdd,
      cdd,
    };
  }

  async getBuildingUtilityHistory(
    buildingId: string,
    limit: number = 36
  ): Promise<UtilityConsumption[]> {
    const result = await sql`
      SELECT * FROM utility_consumption
      WHERE building_id = ${buildingId}
      ORDER BY year DESC, month DESC
      LIMIT ${limit}
    `;

    return result.rows as UtilityConsumption[];
  }

  async getCityDegreeDaysHistory(
    cityId: string,
    limit: number = 36
  ): Promise<DegreeDays[]> {
    const result = await sql`
      SELECT * FROM degree_days
      WHERE city_id = ${cityId}
      ORDER BY year DESC, month DESC
      LIMIT ${limit}
    `;

    return result.rows as DegreeDays[];
  }
}

export const energyService = new EnergyService();
