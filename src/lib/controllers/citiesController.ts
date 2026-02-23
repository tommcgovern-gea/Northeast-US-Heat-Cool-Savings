import { NextRequest, NextResponse } from "next/server";
import { mockCities } from "@/lib/mock-cities";
import { verifyToken, TokenPayload } from "@/lib/auth";

// GET /api/cities — Admin only
export const getCities = async (req: NextRequest) => {
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

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(mockCities);
  } catch {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }
};

// POST /api/cities — Admin only
export const createCity = async (req: NextRequest) => {
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

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const newCity = {
      id: Date.now().toString(),
      name: body.name,
      state: body.state,
      nwsOffice: body.nwsOffice,
      nwsGridX: body.nwsGridX,
      nwsGridY: body.nwsGridY,
      alertTempDelta: body.alertTempDelta ?? 5,
      alertWindowHours: body.alertWindowHours ?? 6,
      isActive: true,
      buildingCount: 0,
      createdAt: new Date().toISOString(),
    };

    mockCities.push(newCity);

    return NextResponse.json(newCity, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Error creating city" }, { status: 500 });
  }
};

// PUT /api/cities/:id — Admin only
export const updateCity = async (req: NextRequest, id: string) => {
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

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const city = mockCities.find((c) => c.id === id);

    if (!city) {
      return NextResponse.json({ message: "City not found" }, { status: 404 });
    }

    city.name = body.name ?? city.name;
    city.state = body.state ?? city.state;
    city.alertTempDelta = body.alertTempDelta ?? city.alertTempDelta;
    city.alertWindowHours = body.alertWindowHours ?? city.alertWindowHours;
    city.isActive = body.isActive ?? city.isActive;

    return NextResponse.json(city);
  } catch {
    return NextResponse.json({ message: "Error updating city" }, { status: 500 });
  }
};

// DELETE /api/cities/:id — Admin only (soft delete)
export const deleteCity = async (req: NextRequest, id: string) => {
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

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const city = mockCities.find((c) => c.id === id);

    if (!city) {
      return NextResponse.json({ message: "City not found" }, { status: 404 });
    }

    city.isActive = false; // soft delete

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Error deleting city" }, { status: 500 });
  }
};
