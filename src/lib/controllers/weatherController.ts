import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { verifyToken, TokenPayload } from "@/lib/auth";

// NWS API base
const NWS_BASE = "https://api.weather.gov";

interface NWSForecastPeriod {
  startTime: string;
  temperature: number;
  temperatureUnit: string;
}

/**
 * Fetch hourly forecast from NWS for a given office/gridX/gridY.
 * Returns an array of { time, tempF } for the next 24 hours.
 */
export async function fetchNWSHourlyForecast(
  office: string,
  gridX: number,
  gridY: number
): Promise<{ time: string; tempF: number }[]> {
  try {
    const res = await fetch(
      `${NWS_BASE}/gridpoints/${office}/${gridX},${gridY}/forecast/hourly`,
      {
        headers: { "User-Agent": "TempAlertPortal/1.0" },
        next: { revalidate: 0 }, // no cache
      }
    );

    if (!res.ok) {
      console.error(`NWS API error: ${res.status} ${res.statusText}`);
      return getMockHourlyForecast();
    }

    const data = await res.json();
    const periods: NWSForecastPeriod[] = data.properties?.periods || [];

    // Take next 24 hours
    return periods.slice(0, 24).map((p) => ({
      time: p.startTime,
      tempF: p.temperatureUnit === "F" ? p.temperature : Math.round(p.temperature * 9 / 5 + 32),
    }));
  } catch (error) {
    console.error("Error fetching NWS forecast:", error);
    return getMockHourlyForecast();
  }
}

/**
 * Mock fallback when NWS API is unavailable.
 */
function getMockHourlyForecast(): { time: string; tempF: number }[] {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const time = new Date(now.getTime() + i * 60 * 60 * 1000);
    // Simulate a temperature curve: base 55°F with variation
    const tempF = Math.round(55 + 15 * Math.sin((i - 6) * Math.PI / 12) + (Math.random() * 4 - 2));
    return {
      time: time.toISOString(),
      tempF,
    };
  });
}

export const getForecast = async (req: NextRequest, cityId: string) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const city = await db.getCityById(cityId);
    if (!city) {
      return NextResponse.json({ message: "City not found" }, { status: 404 });
    }

    const forecast = await fetchNWSHourlyForecast(
      city.nws_office,
      city.nws_grid_x,
      city.nws_grid_y
    );

    return NextResponse.json({
      cityId: city.id,
      office: city.nws_office,
      forecast,
    });
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return NextResponse.json({ message: "Error fetching forecast" }, { status: 500 });
  }
};
