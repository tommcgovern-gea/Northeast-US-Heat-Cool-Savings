import { db, sql, toRows } from "@/lib/db/client";
import {
  normalizeStateCode,
  searchCitiesByName,
} from "@/lib/controllers/citiesController";

const DEFAULT_NWS = {
  nws_office: "OKX",
  nws_grid_x: 33,
  nws_grid_y: 35,
  state: "NY",
};

export type CitySignupSelection = {
  name: string;
  state: string;
  nwsOffice: string;
  nwsGridX: number;
  nwsGridY: number;
};

async function upsertCityFromNws(pick: CitySignupSelection): Promise<string> {
  const stateCode = normalizeStateCode(pick.state || DEFAULT_NWS.state);
  const dup = await sql`
    SELECT id FROM cities
    WHERE LOWER(name) = LOWER(${pick.name})
      AND LOWER(state) = LOWER(${stateCode})
      AND nws_office = ${pick.nwsOffice}
      AND nws_grid_x = ${Number(pick.nwsGridX)}
      AND nws_grid_y = ${Number(pick.nwsGridY)}
    LIMIT 1
  `;
  const existing = toRows(dup)[0] as { id: string } | undefined;
  if (existing) return existing.id;

  const created = await db.createCity({
    name: pick.name,
    state: stateCode,
    nws_office: pick.nwsOffice,
    nws_grid_x: Number(pick.nwsGridX),
    nws_grid_y: Number(pick.nwsGridY),
    alert_temp_delta: 5,
    alert_window_hours: 6,
    is_active: true,
  });
  return created.id;
}

/** Resolve or create a city for signup using API search or a user-selected match. */
export async function resolveCityForSignup(
  cityName: string,
  zipCode: string,
  selected?: CitySignupSelection | null,
): Promise<string> {
  const name = cityName.trim();
  const zip = zipCode.trim();
  if (!name) throw new Error("City is required");

  if (selected?.nwsOffice && selected.nwsGridX != null && selected.nwsGridY != null) {
    return upsertCityFromNws(selected);
  }

  const suggestions = await searchCitiesByName(
    zip ? `${name}, ${zip}` : name,
  );
  const pick = suggestions[0];

  if (pick) {
    return upsertCityFromNws({
      name: pick.name,
      state: pick.state,
      nwsOffice: pick.nwsOffice,
      nwsGridX: Number(pick.nwsGridX),
      nwsGridY: Number(pick.nwsGridY),
    });
  }

  const byName = await sql`
    SELECT id FROM cities WHERE LOWER(name) = LOWER(${name}) LIMIT 1
  `;
  const nameRow = toRows(byName)[0] as { id: string } | undefined;
  if (nameRow) return nameRow.id;

  const cities = await db.getCities();
  const active = (Array.isArray(cities) ? cities : []).filter((c) => c.is_active);
  if (active.length > 0) return active[0].id;

  const created = await db.createCity({
    name,
    state: DEFAULT_NWS.state,
    nws_office: DEFAULT_NWS.nws_office,
    nws_grid_x: DEFAULT_NWS.nws_grid_x,
    nws_grid_y: DEFAULT_NWS.nws_grid_y,
    alert_temp_delta: 5,
    alert_window_hours: 6,
    is_active: true,
  });
  return created.id;
}
