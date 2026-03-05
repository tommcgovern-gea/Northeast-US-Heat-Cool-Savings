import { neon } from '@neondatabase/serverless';

const client = neon(process.env.POSTGRES_URL || '');
export const sql = client;

/** Neon returns rows array directly; normalize for .rows or array. */
export function toRows(result: any): any[] {
  return Array.isArray(result) ? result : (result?.rows ?? []);
}

export interface City {
  id: string;
  name: string;
  state: string;
  nws_office: string;
  nws_grid_x: number;
  nws_grid_y: number;
  alert_temp_delta: number;
  alert_window_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  city_id: string;
  name: string;
  address: string;
  is_active: boolean;
  is_paused: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: string;
  building_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  preference: 'email' | 'sms' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertLog {
  id: string;
  city_id: string;
  alert_type: 'sudden_fluctuation' | 'daily_summary';
  temperature_data: any;
  threshold_used: any;
  triggered_at: string;
  processed: boolean;
}

export interface TemperatureSnapshot {
  id: string;
  city_id: string;
  recorded_at: string;
  temperature_f: number;
  forecast_data: any;
  created_at: string;
}

export const db = {
  async query(text: string, params?: any[]) {
    try {
      const result = await (client as any)(text, params ?? []);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  async getCities(): Promise<City[]> {
    const result = await sql`
      SELECT * FROM cities ORDER BY name
    `;
    const rows = toRows(result);
    return (rows ?? []) as City[];
  },

  async getCityById(id: string): Promise<City | null> {
    const result = await sql`
      SELECT * FROM cities WHERE id = ${id}
    `;
    const rows = toRows(result);
    return (rows[0] as City) ?? null;
  },

  async createCity(data: Omit<City, 'id' | 'created_at' | 'updated_at'>): Promise<City> {
    const result = await sql`
      INSERT INTO cities (
        name, state, nws_office, nws_grid_x, nws_grid_y,
        alert_temp_delta, alert_window_hours, is_active
      ) VALUES (
        ${data.name}, ${data.state}, ${data.nws_office}, ${data.nws_grid_x}, ${data.nws_grid_y},
        ${data.alert_temp_delta}, ${data.alert_window_hours}, ${data.is_active}
      ) RETURNING *
    `;
    return toRows(result)[0] as City;
  },

  async updateCity(id: string, data: Partial<Omit<City, 'id' | 'created_at' | 'updated_at'>>): Promise<City | null> {
    const city = await this.getCityById(id);
    if (!city) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      state: 'state',
      nws_office: 'nws_office',
      nws_grid_x: 'nws_grid_x',
      nws_grid_y: 'nws_grid_y',
      alert_temp_delta: 'alert_temp_delta',
      alert_window_hours: 'alert_window_hours',
      is_active: 'is_active',
    };

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return city;
    }

    values.push(id);
    const query = `UPDATE cities SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const result = await (client as any)(query, values);
    const rows = toRows(result);
    return (rows[0] as City) ?? null;
  },

  async getBuildings(cityId?: string, buildingId?: string): Promise<Building[]> {
    if (buildingId) {
      const result = await sql`
        SELECT * FROM buildings WHERE id = ${buildingId}
      `;
      return (toRows(result) ?? []) as Building[];
    }

    if (cityId) {
      const result = await sql`
        SELECT * FROM buildings WHERE city_id = ${cityId} ORDER BY name
      `;
      return (toRows(result) ?? []) as Building[];
    }

    const result = await sql`
      SELECT * FROM buildings ORDER BY name
    `;
    return (toRows(result) ?? []) as Building[];
  },

  async createBuilding(data: Omit<Building, 'id' | 'created_at' | 'updated_at'>): Promise<Building> {
    const result = await sql`
      INSERT INTO buildings (city_id, name, address, is_active, is_paused)
      VALUES (${data.city_id}, ${data.name}, ${data.address}, ${data.is_active}, ${data.is_paused})
      RETURNING *
    `;
    return toRows(result)[0] as Building;
  },

  async getRecipients(buildingId: string, includeInactive: boolean = false): Promise<Recipient[]> {
    if (includeInactive) {
      const result = await sql`
        SELECT * FROM recipients WHERE building_id = ${buildingId}
        ORDER BY created_at
      `;
      return toRows(result) as Recipient[];
    }
    const result = await sql`
      SELECT * FROM recipients WHERE building_id = ${buildingId} AND is_active = true
      ORDER BY created_at
    `;
    return toRows(result) as Recipient[];
  },

  async getRecipientById(id: string): Promise<Recipient | null> {
    const result = await sql`
      SELECT * FROM recipients WHERE id = ${id}
    `;
    const rows = toRows(result);
    return (rows[0] as Recipient) ?? null;
  },

  async createRecipient(data: Omit<Recipient, 'id' | 'created_at' | 'updated_at'>): Promise<Recipient> {
    const result = await sql`
      INSERT INTO recipients (building_id, name, email, phone, preference, is_active)
      VALUES (${data.building_id}, ${data.name}, ${data.email}, ${data.phone}, ${data.preference}, ${data.is_active})
      RETURNING *
    `;
    return toRows(result)[0] as Recipient;
  },

  async updateRecipient(id: string, data: Partial<Omit<Recipient, 'id' | 'created_at' | 'updated_at' | 'building_id'>>): Promise<Recipient | null> {
    const recipient = await this.getRecipientById(id);
    if (!recipient) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      preference: 'preference',
      is_active: 'is_active',
    };

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && fieldMap[key]) {
        updates.push(`${fieldMap[key]} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return recipient;
    }

    values.push(id);
    const query = `UPDATE recipients SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const result = await (client as any)(query, values);
    const rows = toRows(result);
    return (rows[0] as Recipient) ?? null;
  },

  async deleteRecipient(id: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM recipients WHERE id = ${id} RETURNING id
    `;
    return toRows(result).length > 0;
  },

  async createAlertLog(data: Omit<AlertLog, 'id' | 'triggered_at'>): Promise<AlertLog> {
    const result = await sql`
      INSERT INTO alert_logs (city_id, alert_type, temperature_data, threshold_used, processed)
      VALUES (
        ${data.city_id},
        ${data.alert_type},
        ${JSON.stringify(data.temperature_data)}::jsonb,
        ${JSON.stringify(data.threshold_used)}::jsonb,
        ${data.processed}
      )
      RETURNING *
    `;
    return toRows(result)[0] as AlertLog;
  },

  async getUnprocessedAlerts(): Promise<AlertLog[]> {
    const result = await sql`
      SELECT * FROM alert_logs WHERE processed = false ORDER BY triggered_at
    `;
    return toRows(result) as AlertLog[];
  },

  async markAlertProcessed(id: string): Promise<void> {
    await sql`
      UPDATE alert_logs SET processed = true WHERE id = ${id}
    `;
  },

  async saveTemperatureSnapshot(data: Omit<TemperatureSnapshot, 'id' | 'created_at'>): Promise<TemperatureSnapshot> {
    const result = await sql`
      INSERT INTO temperature_snapshots (city_id, recorded_at, temperature_f, forecast_data)
      VALUES (
        ${data.city_id},
        ${data.recorded_at},
        ${data.temperature_f},
        ${JSON.stringify(data.forecast_data)}::jsonb
      )
      RETURNING *
    `;
    return toRows(result)[0] as TemperatureSnapshot;
  },

  async getRecentTemperatureSnapshots(cityId: string, hours: number = 24): Promise<TemperatureSnapshot[]> {
    const result = await sql`
      SELECT * FROM temperature_snapshots
      WHERE city_id = ${cityId}
        AND recorded_at >= NOW() - make_interval(hours => ${hours})
      ORDER BY recorded_at DESC
    `;
    return toRows(result) as TemperatureSnapshot[];
  },

  async getUserByEmail(email: string): Promise<any | null> {
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    const rows = toRows(result);
    return rows[0] ?? null;
  },

  async createUser(data: {
    email: string;
    password_hash: string;
    role: 'ADMIN' | 'STAFF' | 'BUILDING';
    building_id?: string | null;
  }): Promise<any> {
    const result = await sql`
      INSERT INTO users (email, password_hash, role, building_id)
      VALUES (${data.email}, ${data.password_hash}, ${data.role}, ${data.building_id || null})
      RETURNING *
    `;
    return toRows(result)[0];
  },
};
