import { neon } from '@neondatabase/serverless';

function getDatabaseUrl(): string {
  const url =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
  if (!url.trim()) {
    throw new Error(
      'POSTGRES_URL is not set. Add it to .env in the project root and restart `npm run dev`.',
    );
  }
  return url;
}

const client = neon(getDatabaseUrl());
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
  zip_code?: string | null;
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

  async updateCity(
    id: string,
    data: Partial<Omit<City, "id" | "created_at" | "updated_at">>,
  ): Promise<City | null> {
    const city = await this.getCityById(id);
    if (!city) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: "name",
      state: "state",
      nws_office: "nws_office",
      nws_grid_x: "nws_grid_x",
      nws_grid_y: "nws_grid_y",
      alert_temp_delta: "alert_temp_delta",
      alert_window_hours: "alert_window_hours",
      is_active: "is_active",
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
    const query = `UPDATE cities SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const result = await (client as any)(query, values);
    const rows = toRows(result);
    return (rows[0] as City) ?? null;
  },

  async getBuildings(
    cityId?: string,
    buildingId?: string,
  ): Promise<Building[]> {
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

  async createBuilding(
    data: Omit<Building, "id" | "created_at" | "updated_at"> & {
      zip_code?: string | null;
    },
  ): Promise<Building> {
    const zip = data.zip_code?.trim() || null;
    const result = await sql`
      INSERT INTO buildings (city_id, name, address, zip_code, is_active, is_paused)
      VALUES (${data.city_id}, ${data.name}, ${data.address}, ${zip}, ${data.is_active}, ${data.is_paused})
      RETURNING *
    `;
    return toRows(result)[0] as Building;
  },

  async getRecipients(
    buildingId: string,
    includeInactive: boolean = false,
  ): Promise<Recipient[]> {
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

  /** Building users (role BUILDING) with this building in building_ids. Returns recipient-like shape. */
  async getBuildingUsers(
    buildingId: string,
    includeInactive: boolean = false,
  ): Promise<
    Array<{
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      preference: string;
      is_active: boolean;
    }>
  > {
    const result = await sql`
      SELECT id, name, email, phone, COALESCE(preference, 'email') AS preference, COALESCE(is_active, true) AS is_active
      FROM users
      WHERE role = 'BUILDING'
        AND building_ids IS NOT NULL
        AND ${buildingId}::uuid = ANY(building_ids)
        AND (${includeInactive} OR COALESCE(is_active, true) = true)
      ORDER BY created_at
    `;
    const rows = toRows(result);
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      preference: r.preference || "email",
      is_active: !!r.is_active,
    }));
  },

  async getRecipientById(id: string): Promise<Recipient | null> {
    const result = await sql`
      SELECT * FROM recipients WHERE id = ${id}
    `;
    const rows = toRows(result);
    return (rows[0] as Recipient) ?? null;
  },

  async createRecipient(
    data: Omit<Recipient, "id" | "created_at" | "updated_at">,
  ): Promise<Recipient> {
    const result = await sql`
      INSERT INTO recipients (building_id, name, email, phone, preference, is_active)
      VALUES (${data.building_id}, ${data.name}, ${data.email}, ${data.phone}, ${data.preference}, ${data.is_active})
      RETURNING *
    `;
    return toRows(result)[0] as Recipient;
  },

  /** Portal/admin building contact for cron email/SMS (one row per building + email). */
  async upsertRecipientForBuilding(data: {
    buildingId: string;
    name: string;
    email: string;
    phone: string | null;
    preference: "email" | "sms" | "both";
  }): Promise<Recipient> {
    const email = data.email.trim();
    const existing = await sql`
      SELECT id FROM recipients
      WHERE building_id = ${data.buildingId}
        AND email IS NOT NULL
        AND LOWER(TRIM(email)) = LOWER(${email})
      LIMIT 1
    `;
    const row = toRows(existing)[0] as { id: string } | undefined;
    if (row) {
      const updated = await this.updateRecipient(row.id, {
        name: data.name,
        phone: data.phone,
        preference: data.preference,
        is_active: true,
      });
      return updated as Recipient;
    }
    return this.createRecipient({
      building_id: data.buildingId,
      name: data.name,
      email,
      phone: data.phone,
      preference: data.preference,
      is_active: true,
    });
  },

  async updateRecipient(
    id: string,
    data: Partial<
      Omit<Recipient, "id" | "created_at" | "updated_at" | "building_id">
    >,
  ): Promise<Recipient | null> {
    const recipient = await this.getRecipientById(id);
    if (!recipient) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: "name",
      email: "email",
      phone: "phone",
      preference: "preference",
      is_active: "is_active",
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
    const query = `UPDATE recipients SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

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

  async createAlertLog(
    data: Omit<AlertLog, "id" | "triggered_at">,
  ): Promise<AlertLog> {
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

  async saveTemperatureSnapshot(
    data: Omit<TemperatureSnapshot, "id" | "created_at">,
  ): Promise<TemperatureSnapshot> {
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

  async getRecentTemperatureSnapshots(
    cityId: string,
    hours: number = 24,
  ): Promise<TemperatureSnapshot[]> {
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
    role: "ADMIN" | "STAFF" | "BUILDING";
    building_ids?: string[] | null;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    reserve_1?: string | null;
    reserve_2?: string | null;
    reserve_3?: string | null;
    phone?: string | null;
    preference?: "email" | "sms" | "both";
    is_active?: boolean;
  }): Promise<any> {
    const ids =
      data.building_ids && data.building_ids.length > 0
        ? data.building_ids
        : [];
    const result = await sql`
      INSERT INTO users (
        email, password_hash, role, building_ids, name,
        first_name, last_name, company_name, reserve_1, reserve_2, reserve_3,
        phone, preference, is_active
      )
      VALUES (
        ${data.email},
        ${data.password_hash},
        ${data.role},
        ${ids},
        ${data.name ?? null},
        ${data.first_name ?? null},
        ${data.last_name ?? null},
        ${data.company_name ?? null},
        ${data.reserve_1 ?? null},
        ${data.reserve_2 ?? null},
        ${data.reserve_3 ?? null},
        ${data.phone ?? null},
        ${data.preference ?? "email"},
        ${data.is_active ?? true}
      )
      RETURNING *
    `;
    return toRows(result)[0];
  },

  async getUserById(id: string): Promise<any | null> {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    const rows = toRows(result);
    return rows[0] ?? null;
  },

  /** All BUILDING users for admin “add existing user” list. */
  async getBuildingRoleUsers(): Promise<
    Array<{
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      preference: string;
      building_ids: string[];
    }>
  > {
    const result = await sql`
      SELECT id, email, name, phone, preference, building_ids
      FROM users
      WHERE role = 'BUILDING'
      ORDER BY email
    `;
    const rows = toRows(result) as any[];
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name ?? null,
      phone: r.phone ?? null,
      preference: r.preference ?? "email",
      building_ids: Array.isArray(r.building_ids)
        ? r.building_ids.filter(Boolean)
        : [],
    }));
  },

  /** Staff users for admin “Staff Signup Details” (id, email, name, signup date). */
  async getStaffUsers(): Promise<
    Array<{
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      is_active: boolean;
      created_at: string;
    }>
  > {
    const result = await sql`
      SELECT id, email, name, phone, is_active, created_at
      FROM users
      WHERE role = 'STAFF'
      ORDER BY created_at DESC
    `;
    const rows = toRows(result) as any[];
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name ?? null,
      phone: r.phone ?? null,
      is_active: r.is_active !== false,
      created_at: r.created_at,
    }));
  },

  async updateUser(
    id: string,
    data: {
      name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      company_name?: string | null;
      reserve_1?: string | null;
      reserve_2?: string | null;
      reserve_3?: string | null;
      email?: string;
      phone?: string | null;
      preference?: string;
      is_active?: boolean;
      building_ids?: string[];
    },
  ): Promise<any | null> {
    const user = await this.getUserById(id);
    if (!user) return null;

    const name = data.name !== undefined ? data.name : user.name;
    const first_name =
      data.first_name !== undefined ? data.first_name : user.first_name;
    const last_name =
      data.last_name !== undefined ? data.last_name : user.last_name;
    const company_name =
      data.company_name !== undefined ? data.company_name : user.company_name;
    const reserve_1 =
      data.reserve_1 !== undefined ? data.reserve_1 : user.reserve_1;
    const reserve_2 =
      data.reserve_2 !== undefined ? data.reserve_2 : user.reserve_2;
    const reserve_3 =
      data.reserve_3 !== undefined ? data.reserve_3 : user.reserve_3;
    const email = data.email !== undefined ? data.email : user.email;
    const phone = data.phone !== undefined ? data.phone : user.phone;
    const preference =
      data.preference !== undefined
        ? data.preference
        : user.preference || "email";
    const is_active =
      data.is_active !== undefined ? data.is_active : user.is_active !== false;
    const building_ids =
      data.building_ids !== undefined
        ? data.building_ids
        : ((user.building_ids || []) as string[]).filter(Boolean);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validIds = building_ids.filter(
      (id) => typeof id === "string" && uuidRegex.test(id.trim()),
    );
    const arrLiteral = validIds.length ? `{"${validIds.join('","')}"}` : "{}";

    const result = await sql`
      UPDATE users
      SET name = ${name},
          first_name = ${first_name ?? null},
          last_name = ${last_name ?? null},
          company_name = ${company_name ?? null},
          reserve_1 = ${reserve_1 ?? null},
          reserve_2 = ${reserve_2 ?? null},
          reserve_3 = ${reserve_3 ?? null},
          email = ${email},
          phone = ${phone},
          preference = ${preference},
          is_active = ${is_active},
          building_ids = ${arrLiteral}::uuid[],
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    const rows = toRows(result);
    return rows[0] ?? null;
  },

  /** Add building to a BUILDING user's building_ids; create user if not exists (for invite flow). */
  async addBuildingToUser(
    userId: string,
    buildingId: string,
  ): Promise<any | null> {
    const user = await this.getUserById(userId);
    if (!user || user.role !== "BUILDING") return null;
    const current = (user.building_ids || []) as string[];
    if (current.includes(buildingId)) return user;
    const next = [...current, buildingId];
    return this.updateUser(userId, { building_ids: next });
  },

  /** Remove building from BUILDING user's building_ids; delete user if no buildings left. */
  async removeBuildingFromUser(
    userId: string,
    buildingId: string,
  ): Promise<any | null> {
    const user = await this.getUserById(userId);
    if (!user || user.role !== "BUILDING") return null;
    const current = ((user.building_ids || []) as string[]).filter(Boolean);
    const next = current.filter((id) => id !== buildingId);
    if (next.length === 0) {
      await this.deleteUser(userId);
      return { deleted: true };
    }
    return this.updateUser(userId, { building_ids: next });
  },

  async deleteUser(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
    return toRows(result).length > 0;
  },

  // ── Access Codes ──────────────────────────────────────────────────────────

  /** All unused access code rows (id + code hash). */
  async getUnusedAccessCodes(): Promise<Array<{ id: number; code: string }>> {
    const result = await sql`
      SELECT id, code FROM access_codes WHERE status = 'unused' ORDER BY id
    `;
    return toRows(result) as Array<{ id: number; code: string }>;
  },

  /** Mark a code as used and record the timestamp. */
  async markAccessCodeUsed(id: number): Promise<boolean> {
    const result = await sql`
      UPDATE access_codes
      SET status = 'used', used_at = NOW()
      WHERE id = ${id} AND status = 'unused'
      RETURNING id
    `;
    return toRows(result).length > 0;
  },

  /** Compare plaintext against unused codes without marking used. */
  async findUnusedAccessCode(
    plainCode: string,
  ): Promise<{ id: number } | null> {
    const trimmed = plainCode.trim();
    if (!trimmed) return null;

    const exact = await sql`
      SELECT id FROM access_codes
      WHERE status = 'unused' AND plain_code = ${trimmed}
      LIMIT 1
    `;
    const exactRow = toRows(exact)[0] as { id: number } | undefined;
    if (exactRow) return { id: exactRow.id };

    const bcrypt = (await import("bcryptjs")).default;
    const unused = await this.getUnusedAccessCodes();
    for (const row of unused) {
      const matches = await bcrypt.compare(trimmed, row.code);
      if (matches) return { id: row.id };
    }
    return null;
  },

  async getAccessCodeById(
    id: number,
  ): Promise<{ id: number; status: string } | null> {
    const result = await sql`
      SELECT id, status FROM access_codes WHERE id = ${id}
    `;
    const row = toRows(result)[0] as { id: number; status: string } | undefined;
    return row ?? null;
  },

  /**
   * Compare plaintext against every unused code hash.
   * Returns the matched row (and marks it used) or null.
   */
  async findAndUseAccessCode(
    plainCode: string,
  ): Promise<{ id: number } | null> {
    const match = await this.findUnusedAccessCode(plainCode);
    if (!match) return null;
    const ok = await this.markAccessCodeUsed(match.id);
    return ok ? match : null;
  },
};
