import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, sql, toRows } from "@/lib/db/client";
import { signToken, verifyOnboardingToken } from "@/lib/auth";
import {
  resolveCityForSignup,
  type CitySignupSelection,
} from "@/lib/building-onboarding";
import { searchCitiesByName } from "@/lib/controllers/citiesController";
import { sendEmail } from "@/lib/services/emailService";
import { sendSMS } from "@/lib/services/smsService";
import { REGISTRATION_SUCCESS_MESSAGE } from "@/lib/content/registrationSuccessMessage";

function getOnboardingToken(req: NextRequest): { accessCodeId: number } | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyOnboardingToken(authHeader.slice(7));
}

const normalizeBuildingText = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

/** Confirms a successful registration over the same channel(s) the user picked, reusing the success-page copy. */
async function sendRegistrationConfirmation(params: {
  email: string;
  phone: string | null;
  preference: "email" | "sms" | "both";
}): Promise<void> {
  const { email, phone, preference } = params;

  if (preference === "email" || preference === "both") {
    try {
      await sendEmail({
        to: email,
        subject: "Registration confirmed",
        text: REGISTRATION_SUCCESS_MESSAGE,
      });
    } catch (e) {
      console.error("Failed to send registration confirmation email:", e);
    }
  }

  if ((preference === "sms" || preference === "both") && phone) {
    try {
      await sendSMS(phone, REGISTRATION_SUCCESS_MESSAGE);
    } catch (e) {
      console.error("Failed to send registration confirmation SMS:", e);
    }
  }
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

function parseCitySelection(body: Record<string, unknown>): CitySignupSelection | null {
  const raw = body.citySelection;
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (
    typeof c.name !== "string" ||
    typeof c.state !== "string" ||
    typeof c.nwsOffice !== "string" ||
    c.nwsGridX === undefined ||
    c.nwsGridY === undefined
  ) {
    return null;
  }
  return {
    name: c.name.trim(),
    state: c.state.trim(),
    nwsOffice: c.nwsOffice.trim(),
    nwsGridX: Number(c.nwsGridX),
    nwsGridY: Number(c.nwsGridY),
  };
}

export async function completeOnboarding(req: NextRequest) {
  const session = getOnboardingToken(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const accessCode =
    typeof body.accessCode === "string" ? body.accessCode.trim() : "";
  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName =
    typeof body.lastName === "string" ? body.lastName.trim() : "";
  const companyName =
    typeof body.companyName === "string" ? body.companyName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone =
    typeof body.phone === "string" ? body.phone.trim() || null : null;
  const buildingAddress =
    typeof body.buildingAddress === "string"
      ? body.buildingAddress.trim()
      : "";
  const city =
    typeof body.city === "string" ? body.city.trim() : "";
  const zipCode =
    typeof body.zipCode === "string" ? body.zipCode.trim() : "";
  const password =
    typeof body.password === "string" ? body.password : "";
  const preference = ["email", "sms", "both"].includes(body.preference)
    ? body.preference
    : "email";
  const reserve1 =
    typeof body.reserve1 === "string" ? body.reserve1.trim() || null : null;
  const reserve2 =
    typeof body.reserve2 === "string" ? body.reserve2.trim() || null : null;
  const reserve3 =
    typeof body.reserve3 === "string" ? body.reserve3.trim() || null : null;

  if (!accessCode || !firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { message: "Access code, name, email, and password are required" },
      { status: 400 },
    );
  }

  if (!companyName || !buildingAddress || !city || !zipCode) {
    return NextResponse.json(
      {
        message:
          "Company name, building address, city, and zip code are required",
      },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return NextResponse.json(
      { message: "Enter a valid email address" },
      { status: 400 },
    );
  }

  if (preference === "sms" || preference === "both") {
    if (!phone) {
      return NextResponse.json(
        { message: "Phone number is required to receive SMS." },
        { status: 400 },
      );
    }
    const phoneRe = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRe.test(phone)) {
      return NextResponse.json(
        { message: "Phone must be in E.164 format (e.g. +1234567890)" },
        { status: 400 },
      );
    }
  } else if (phone) {
    const phoneRe = /^\+?[1-9]\d{9,14}$/;
    if (!phoneRe.test(phone)) {
      return NextResponse.json(
        { message: "Phone must be in E.164 format (e.g. +1234567890)" },
        { status: 400 },
      );
    }
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

  const citySelection = parseCitySelection(body);
  if (!citySelection) {
    return NextResponse.json(
      {
        message:
          "Please select your city from the search results so we can load weather data.",
      },
      { status: 400 },
    );
  }

  let cityId: string;
  try {
    cityId = await resolveCityForSignup(city, zipCode, citySelection);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "City could not be resolved";
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  const normalizedAddress = normalizeBuildingText(buildingAddress);
  const fullAddress = `${normalizedAddress}, ${city}, ${zipCode}`;

  const existingBuilding = await sql`
    SELECT id FROM buildings
    WHERE city_id = ${cityId}
      AND LOWER(REGEXP_REPLACE(BTRIM(name), '\\s+', ' ', 'g')) = LOWER(${companyName})
      AND LOWER(REGEXP_REPLACE(BTRIM(address), '\\s+', ' ', 'g')) = LOWER(${fullAddress})
    LIMIT 1
  `;
  const dupB = toRows(existingBuilding)[0] as { id: string } | undefined;
  let buildingId = dupB?.id;

  if (!buildingId) {
    const created = await db.createBuilding({
      city_id: cityId,
      name: companyName,
      address: fullAddress,
      zip_code: zipCode,
      is_active: true,
      is_paused: false,
    });
    buildingId = created.id;
  }

  const displayName = `${firstName} ${lastName}`.trim();
  const password_hash = await bcrypt.hash(password, 10);
  let user: { id: string; email: string };

  if (existingUser && existingUser.role === "BUILDING") {
    await db.addBuildingToUser(existingUser.id, buildingId);
    user =
      (await db.updateUser(existingUser.id, {
        name: displayName,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        reserve_1: reserve1,
        reserve_2: reserve2,
        reserve_3: reserve3,
        phone,
        preference,
      })) || existingUser;
    await sql`UPDATE users SET password_hash = ${password_hash} WHERE id = ${existingUser.id}`;
    user = { id: existingUser.id, email: existingUser.email };
  } else {
    const created = await db.createUser({
      email,
      password_hash,
      role: "BUILDING",
      building_ids: [buildingId],
      name: displayName,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName,
      reserve_1: reserve1,
      reserve_2: reserve2,
      reserve_3: reserve3,
      phone,
      preference,
      is_active: true,
    });
    user = { id: created.id, email: created.email };
  }

  await db.upsertRecipientForBuilding({
    buildingId,
    name: displayName,
    email: user.email,
    phone,
    preference,
  });

  const marked = await db.markAccessCodeUsed(session.accessCodeId);
  if (!marked) {
    return NextResponse.json(
      { message: "Access code was already used" },
      { status: 409 },
    );
  }

  await sendRegistrationConfirmation({ email: user.email, phone, preference });

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
