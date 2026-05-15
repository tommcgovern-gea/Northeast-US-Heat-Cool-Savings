import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, sql, toRows } from "@/lib/db/client";
import { signToken, verifyOnboardingToken } from "@/lib/auth";
import {
  normalizeStateCode,
  searchCitiesByName,
  validateNWSCoordinates,
} from "@/lib/controllers/citiesController";

function getOnboardingToken(req: NextRequest): { accessCodeId: number } | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyOnboardingToken(authHeader.slice(7));
}

const normalizeBuildingText = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

export async function listCities(req: NextRequest) {
  const session = getOnboardingToken(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const cities = await db.getCities();
  const active = (Array.isArray(cities) ? cities : []).filter((c) => c.is_active);
  return NextResponse.json(
    active.map((city) => ({
      id: city.id,
      name: city.name,
      state: city.state,
      nwsOffice: city.nws_office,
      nwsGridX: city.nws_grid_x,
      nwsGridY: city.nws_grid_y,
    })),
  );
}

export async function searchCities(req: NextRequest) {
  const session = getOnboardingToken(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 1) return NextResponse.json([]);

  const suggestions = await searchCitiesByName(query);
  const seen = new Set<string>();
  const unique = suggestions.filter((s) => {
    const key = s.displayName || s.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return NextResponse.json(unique);
}

export async function createCityOnboarding(req: NextRequest) {
  const session = getOnboardingToken(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (
    !body.name ||
    !body.state ||
    !body.nwsOffice ||
    body.nwsGridX === undefined ||
    body.nwsGridY === undefined
  ) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  const stateCode = normalizeStateCode(body.state);
  const isValidNWS = await validateNWSCoordinates(
    body.nwsOffice,
    Number(body.nwsGridX),
    Number(body.nwsGridY),
  );
  if (!isValidNWS) {
    return NextResponse.json(
      {
        message:
          "Invalid NWS coordinates. Search a city name to auto-fill weather fields.",
      },
      { status: 400 },
    );
  }

  const dupCheck = await sql`
    SELECT id, name, state FROM cities
    WHERE LOWER(name) = LOWER(${body.name}) AND LOWER(state) = LOWER(${stateCode})
      AND nws_office = ${body.nwsOffice}
      AND nws_grid_x = ${Number(body.nwsGridX)}
      AND nws_grid_y = ${Number(body.nwsGridY)}
    LIMIT 1
  `;
  const existing = toRows(dupCheck)[0] as { id: string; name: string; state: string } | undefined;
  if (existing) {
    return NextResponse.json({
      id: existing.id,
      name: existing.name,
      state: existing.state,
      existing: true,
    });
  }

  const newCity = await db.createCity({
    name: body.name,
    state: stateCode,
    nws_office: body.nwsOffice,
    nws_grid_x: Number(body.nwsGridX),
    nws_grid_y: Number(body.nwsGridY),
    alert_temp_delta: body.alertTempDelta ?? 5,
    alert_window_hours: body.alertWindowHours ?? 6,
    is_active: true,
  });

  return NextResponse.json(
    { id: newCity.id, name: newCity.name, state: newCity.state, existing: false },
    { status: 201 },
  );
}

export async function listBuildings(req: NextRequest) {
  const session = getOnboardingToken(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const cityId = req.nextUrl.searchParams.get("cityId");
  if (!cityId) {
    return NextResponse.json({ message: "cityId is required" }, { status: 400 });
  }

  const buildings = await db.getBuildings(cityId);
  return NextResponse.json(
    buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      cityId: b.city_id,
      isActive: b.is_active,
    })),
  );
}

export async function completeOnboarding(req: NextRequest) {
  const session = getOnboardingToken(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const accessCode =
    typeof body.accessCode === "string" ? body.accessCode.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone =
    typeof body.phone === "string" ? body.phone.trim() || null : null;
  const preference = ["email", "sms", "both"].includes(body.preference)
    ? body.preference
    : "email";

  if (!accessCode || !name || !email) {
    return NextResponse.json(
      { message: "Access code, name, and email are required" },
      { status: 400 },
    );
  }

  if (!body.cityId && !body.newCity) {
    return NextResponse.json({ message: "City is required" }, { status: 400 });
  }

  if (!body.buildingId && !body.newBuilding) {
    return NextResponse.json({ message: "Building is required" }, { status: 400 });
  }

  const codeRow = await db.getAccessCodeById(session.accessCodeId);
  if (!codeRow || codeRow.status !== "unused") {
    return NextResponse.json(
      { message: "Access code is no longer valid" },
      { status: 401 },
    );
  }

  const codeMatch = await db.findUnusedAccessCode(accessCode);
  if (!codeMatch || codeMatch.id !== session.accessCodeId) {
    return NextResponse.json(
      { message: "Access code does not match this session" },
      { status: 401 },
    );
  }

  const existingUser = await db.getUserByEmail(email);
  if (existingUser && existingUser.role !== "BUILDING") {
    return NextResponse.json(
      { message: "Email already used by an admin or staff account" },
      { status: 400 },
    );
  }

  let cityId = body.cityId as string | undefined;

  if (!cityId && body.newCity) {
    const nc = body.newCity;
    const stateCode = normalizeStateCode(nc.state);
    const isValidNWS = await validateNWSCoordinates(
      nc.nwsOffice,
      Number(nc.nwsGridX),
      Number(nc.nwsGridY),
    );
    if (!isValidNWS) {
      return NextResponse.json(
        { message: "Invalid NWS coordinates for the new city" },
        { status: 400 },
      );
    }

    const dupCheck = await sql`
      SELECT id FROM cities
      WHERE LOWER(name) = LOWER(${nc.name}) AND LOWER(state) = LOWER(${stateCode})
        AND nws_office = ${nc.nwsOffice}
        AND nws_grid_x = ${Number(nc.nwsGridX)}
        AND nws_grid_y = ${Number(nc.nwsGridY)}
      LIMIT 1
    `;
    const dup = toRows(dupCheck)[0] as { id: string } | undefined;
    if (dup) {
      cityId = dup.id;
    } else {
      const created = await db.createCity({
        name: nc.name,
        state: stateCode,
        nws_office: nc.nwsOffice,
        nws_grid_x: Number(nc.nwsGridX),
        nws_grid_y: Number(nc.nwsGridY),
        alert_temp_delta: nc.alertTempDelta ?? 5,
        alert_window_hours: nc.alertWindowHours ?? 6,
        is_active: true,
      });
      cityId = created.id;
    }
  }

  if (!cityId) {
    return NextResponse.json({ message: "City could not be resolved" }, { status: 400 });
  }

  let buildingId = body.buildingId as string | undefined;

  if (!buildingId && body.newBuilding) {
    const nb = body.newBuilding;
    const normalizedName = normalizeBuildingText(nb.name || "");
    const normalizedAddress = normalizeBuildingText(nb.address || "");
    if (!normalizedName || !normalizedAddress) {
      return NextResponse.json(
        { message: "Building name and address are required" },
        { status: 400 },
      );
    }

    const existing = await sql`
      SELECT id FROM buildings
      WHERE city_id = ${cityId}
        AND LOWER(REGEXP_REPLACE(BTRIM(name), '\\s+', ' ', 'g')) = LOWER(${normalizedName})
        AND LOWER(REGEXP_REPLACE(BTRIM(address), '\\s+', ' ', 'g')) = LOWER(${normalizedAddress})
      LIMIT 1
    `;
    const dupB = toRows(existing)[0] as { id: string } | undefined;
    if (dupB) {
      buildingId = dupB.id;
    } else {
      const created = await db.createBuilding({
        city_id: cityId,
        name: normalizedName,
        address: normalizedAddress,
        is_active: true,
        is_paused: false,
      });
      buildingId = created.id;
    }
  }

  if (!buildingId) {
    return NextResponse.json(
      { message: "Building could not be resolved" },
      { status: 400 },
    );
  }

  const password_hash = await bcrypt.hash(accessCode, 10);
  let user: any;

  if (existingUser && existingUser.role === "BUILDING") {
    await db.addBuildingToUser(existingUser.id, buildingId);
    user =
      (await db.updateUser(existingUser.id, {
        name,
        phone,
        preference,
      })) || existingUser;
    await sql`UPDATE users SET password_hash = ${password_hash} WHERE id = ${existingUser.id}`;
  } else {
    user = await db.createUser({
      email,
      password_hash,
      role: "BUILDING",
      building_ids: [buildingId],
      name,
      phone,
      preference,
      is_active: true,
    });
  }

  const marked = await db.markAccessCodeUsed(session.accessCodeId);
  if (!marked) {
    return NextResponse.json(
      { message: "Access code was already used" },
      { status: 409 },
    );
  }

  const token = signToken({
    userId: user.id,
    role: "BUILDING",
    buildingId,
    buildingIds: [buildingId],
  });

  return NextResponse.json({
    token,
    role: "BUILDING",
    buildingId,
    buildingIds: [buildingId],
    email: user.email,
  });
}
