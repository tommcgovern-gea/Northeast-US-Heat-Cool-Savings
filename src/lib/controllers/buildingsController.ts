import { NextRequest, NextResponse } from "next/server";
import { mockBuildings } from "@/lib/mock-buildings";
import { verifyToken, TokenPayload } from "@/lib/auth";

export const getBuildings = async (req: NextRequest) => {
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

    let buildings = mockBuildings;

    // Building user sees only their own building
    if (user.role === "BUILDING") {
      buildings = buildings.filter((b) => b.id === user.buildingId);
    } else if (user.role !== "ADMIN" && user.role !== "STAFF") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const responseData = buildings.map(b => ({
      id: b.id,
      name: b.name,
      address: b.address,
      cityId: b.cityId,
      cityName: b.cityName,
      isActive: b.isActive,
      isPaused: b.isPaused,
      recipientCount: b.recipientCount,
      complianceRate: b.complianceRate,
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching buildings" }, { status: 500 });
  }
};

export const createBuilding = async (req: NextRequest) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    
    // validate required fields
    if (!body.name || !body.address || !body.cityId) {
        return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const newBuilding = {
      id: Date.now().toString(),
      name: body.name,
      address: body.address,
      cityId: body.cityId,
      cityName: "Unknown", // Ideally we'd look up the city name from mockCities
      isActive: true,
      isPaused: false,
      recipientCount: 0,
      complianceRate: 0,
      createdAt: new Date().toISOString(),
      recipients: [],
      recentMessages: [],
      recentUploads: []
    };

    mockBuildings.push(newBuilding);

    return NextResponse.json({
        id: newBuilding.id,
        name: newBuilding.name,
        address: newBuilding.address,
        cityId: newBuilding.cityId,
        isActive: newBuilding.isActive,
        isPaused: newBuilding.isPaused,
        createdAt: newBuilding.createdAt
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error creating building" }, { status: 500 });
  }
};

export const getBuildingById = async (req: NextRequest, id: string) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    const building = mockBuildings.find((b) => b.id === id);

    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    // Apply authorization check to ensure BUILDING users can't access other buildings
    if (user.role === "BUILDING" && user.buildingId !== building.id) {
       return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
        id: building.id,
        name: building.name,
        address: building.address,
        city: building.city,
        recipients: building.recipients || [],
        recentMessages: building.recentMessages || [],
        recentUploads: building.recentUploads || [],
        complianceRate: building.complianceRate,
        isPaused: building.isPaused
    });
  } catch (error) {
    return NextResponse.json({ message: "Error fetching building details" }, { status: 500 });
  }
};

export const updateBuilding = async (req: NextRequest, id: string) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const building = mockBuildings.find((b) => b.id === id);

    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    building.name = body.name ?? building.name;
    building.address = body.address ?? building.address;
    if (body.isPaused !== undefined) building.isPaused = body.isPaused;
    if (body.isActive !== undefined) building.isActive = body.isActive;
    building.updatedAt = new Date().toISOString();

    return NextResponse.json({
        id: building.id,
        name: building.name,
        address: building.address,
        isPaused: building.isPaused,
        isActive: building.isActive,
        updatedAt: building.updatedAt
    });
  } catch (error) {
    return NextResponse.json({ message: "Error updating building" }, { status: 500 });
  }
};
