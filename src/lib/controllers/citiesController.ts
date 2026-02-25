import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { verifyToken, TokenPayload } from "@/lib/auth";

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

    const cities = await db.getCities();
    
    const citiesWithCounts = await Promise.all(
      cities.map(async (city) => {
        const buildings = await db.getBuildings(city.id);
        return {
          id: city.id,
          name: city.name,
          state: city.state,
          nwsOffice: city.nws_office,
          nwsGridX: city.nws_grid_x,
          nwsGridY: city.nws_grid_y,
          alertTempDelta: Number(city.alert_temp_delta),
          alertWindowHours: city.alert_window_hours,
          isActive: city.is_active,
          buildingCount: buildings.length,
          createdAt: city.created_at,
        };
      })
    );

    return NextResponse.json(citiesWithCounts);
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json({ message: "Error fetching cities" }, { status: 500 });
  }
};

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

    if (!body.name || !body.state || !body.nwsOffice || body.nwsGridX === undefined || body.nwsGridY === undefined) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const newCity = await db.createCity({
      name: body.name,
      state: body.state,
      nws_office: body.nwsOffice,
      nws_grid_x: body.nwsGridX,
      nws_grid_y: body.nwsGridY,
      alert_temp_delta: body.alertTempDelta ?? 5,
      alert_window_hours: body.alertWindowHours ?? 6,
      is_active: true,
    });

    return NextResponse.json({
      id: newCity.id,
      name: newCity.name,
      state: newCity.state,
      nwsOffice: newCity.nws_office,
      nwsGridX: newCity.nws_grid_x,
      nwsGridY: newCity.nws_grid_y,
      alertTempDelta: Number(newCity.alert_temp_delta),
      alertWindowHours: newCity.alert_window_hours,
      isActive: newCity.is_active,
      buildingCount: 0,
      createdAt: newCity.created_at,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating city:", error);
    return NextResponse.json({ message: "Error creating city" }, { status: 500 });
  }
};

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
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.nwsOffice !== undefined) updateData.nws_office = body.nwsOffice;
    if (body.nwsGridX !== undefined) updateData.nws_grid_x = body.nwsGridX;
    if (body.nwsGridY !== undefined) updateData.nws_grid_y = body.nwsGridY;
    if (body.alertTempDelta !== undefined) updateData.alert_temp_delta = body.alertTempDelta;
    if (body.alertWindowHours !== undefined) updateData.alert_window_hours = body.alertWindowHours;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    const updatedCity = await db.updateCity(id, updateData);

    if (!updatedCity) {
      return NextResponse.json({ message: "City not found" }, { status: 404 });
    }

    const buildings = await db.getBuildings(updatedCity.id);

    return NextResponse.json({
      id: updatedCity.id,
      name: updatedCity.name,
      state: updatedCity.state,
      nwsOffice: updatedCity.nws_office,
      nwsGridX: updatedCity.nws_grid_x,
      nwsGridY: updatedCity.nws_grid_y,
      alertTempDelta: Number(updatedCity.alert_temp_delta),
      alertWindowHours: updatedCity.alert_window_hours,
      isActive: updatedCity.is_active,
      buildingCount: buildings.length,
      createdAt: updatedCity.created_at,
    });
  } catch (error) {
    console.error("Error updating city:", error);
    return NextResponse.json({ message: "Error updating city" }, { status: 500 });
  }
};

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

    await db.updateCity(id, { is_active: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting city:", error);
    return NextResponse.json({ message: "Error deleting city" }, { status: 500 });
  }
};
