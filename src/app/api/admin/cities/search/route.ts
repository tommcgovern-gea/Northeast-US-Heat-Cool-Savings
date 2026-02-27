import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";

const stateMap: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const query = req.nextUrl.searchParams.get("q");
    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    // 1. Geocode with Nominatim (OSM) - specifically for US
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&addressdetails=1&limit=5`;
    const geoRes = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "TempAlertPortal/1.0 (contact@zestgeek.com)"
      }
    });

    if (!geoRes.ok) {
      return NextResponse.json({ message: "Geocoding service unavailable" }, { status: 503 });
    }

    const locations = await geoRes.json();

    // 2. Map and fetch NWS points for each location
    const suggestions = await Promise.all(locations.map(async (loc: any) => {
      try {
        const lat = loc.lat;
        const lon = loc.lon;
        const stateName = loc.address.state || loc.address.state_district || "";
        const stateCode = stateMap[stateName] || (stateName.length === 2 ? stateName.toUpperCase() : "");
        const cityName = loc.address.city || loc.address.town || loc.address.village || loc.display_name.split(',')[0];

        // 3. Get NWS Grid Data
        const nwsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
          headers: { "User-Agent": "TempAlertPortal/1.0" }
        });

        if (!nwsRes.ok) return null;

        const nwsData = await nwsRes.json();
        return {
          name: cityName,
          state: stateCode || stateName,
          nwsOffice: nwsData.properties.gridId,
          nwsGridX: nwsData.properties.gridX,
          nwsGridY: nwsData.properties.gridY,
          displayName: `${cityName}, ${stateCode || stateName}`
        };
      } catch (e) {
        return null;
      }
    }));

    return NextResponse.json(suggestions.filter(s => s !== null));
  } catch (error) {
    console.error("Error searching cities:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
