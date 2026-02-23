import { NextRequest, NextResponse } from "next/server";
import { mockBuildings } from "@/lib/mock-buildings";
import { verifyToken, TokenPayload } from "@/lib/auth";

// GET /api/recipients?buildingId=xxx
export const getRecipients = async (req: NextRequest) => {
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

    const buildingId = req.nextUrl.searchParams.get("buildingId");

    if (!buildingId) {
      return NextResponse.json({ message: "buildingId query param is required" }, { status: 400 });
    }

    const building = mockBuildings.find((b) => b.id === buildingId);

    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    // Building user sees only their own building's recipients
    if (user.role === "BUILDING" && user.buildingId !== buildingId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    } else if (user.role !== "ADMIN" && user.role !== "STAFF" && user.role !== "BUILDING") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const recipients = building.recipients || [];
    const responseData = recipients.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      preferEmail: r.preferEmail,
      preferSms: r.preferSms,
      isActive: r.isActive,
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching recipients" }, { status: 500 });
  }
};

// POST /api/recipients  — body: { buildingId, name, email?, phone?, ... }
export const createRecipient = async (req: NextRequest) => {
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

    if (!body.buildingId) {
      return NextResponse.json({ message: "buildingId is required" }, { status: 400 });
    }

    const building = mockBuildings.find((b) => b.id === body.buildingId);
    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    if (!body.name) {
      return NextResponse.json({ message: "name is required" }, { status: 400 });
    }

    if (!body.email && !body.phone) {
      return NextResponse.json({ message: "At least one of email or phone must be provided" }, { status: 400 });
    }

    const newRecipient = {
      id: Date.now().toString(),
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      preferEmail: body.preferEmail !== undefined ? body.preferEmail : (body.email ? true : false),
      preferSms: body.preferSms !== undefined ? body.preferSms : false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    if (!building.recipients) {
      building.recipients = [];
    }

    building.recipients.push(newRecipient);

    return NextResponse.json({
      id: newRecipient.id,
      name: newRecipient.name,
      email: newRecipient.email,
      phone: newRecipient.phone,
      preferEmail: newRecipient.preferEmail,
      preferSms: newRecipient.preferSms,
      isActive: newRecipient.isActive,
      createdAt: newRecipient.createdAt,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error creating recipient" }, { status: 500 });
  }
};

// PUT /api/recipients/:id  — body: { buildingId, name?, email?, phone?, ... }
export const updateRecipient = async (req: NextRequest, recipientId: string) => {
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

    if (!body.buildingId) {
      return NextResponse.json({ message: "buildingId is required" }, { status: 400 });
    }

    const building = mockBuildings.find((b) => b.id === body.buildingId);

    if (!building || !building.recipients) {
      return NextResponse.json({ message: "Building or recipients not found" }, { status: 404 });
    }

    const recipient = building.recipients.find((r: any) => r.id === recipientId);

    if (!recipient) {
      return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
    }

    if (body.name !== undefined) recipient.name = body.name;
    if (body.email !== undefined) recipient.email = body.email;
    if (body.phone !== undefined) recipient.phone = body.phone;
    if (body.preferEmail !== undefined) recipient.preferEmail = body.preferEmail;
    if (body.preferSms !== undefined) recipient.preferSms = body.preferSms;
    if (body.isActive !== undefined) recipient.isActive = body.isActive;

    recipient.updatedAt = new Date().toISOString();

    return NextResponse.json({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      phone: recipient.phone,
      preferEmail: recipient.preferEmail,
      preferSms: recipient.preferSms,
      isActive: recipient.isActive,
      updatedAt: recipient.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ message: "Error updating recipient" }, { status: 500 });
  }
};

// DELETE /api/recipients/:id?buildingId=xxx
export const deleteRecipient = async (req: NextRequest, recipientId: string) => {
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

    const buildingId = req.nextUrl.searchParams.get("buildingId");

    if (!buildingId) {
      return NextResponse.json({ message: "buildingId query param is required" }, { status: 400 });
    }

    const building = mockBuildings.find((b) => b.id === buildingId);

    if (!building || !building.recipients) {
      return NextResponse.json({ message: "Building or recipients not found" }, { status: 404 });
    }

    const recipientIndex = building.recipients.findIndex((r: any) => r.id === recipientId);

    if (recipientIndex === -1) {
      return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
    }

    // Hard delete
    building.recipients.splice(recipientIndex, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Error deleting recipient" }, { status: 500 });
  }
};
