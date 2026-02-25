import { NextRequest, NextResponse } from "next/server";
import { mockMessages, mockAlertEvents, Message } from "@/lib/mock-alerts";
import { mockBuildings } from "@/lib/mock-buildings";
import { verifyToken, TokenPayload } from "@/lib/auth";

export const getMessages = async (req: NextRequest) => {
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

    const { searchParams } = new URL(req.url);
    const buildingId = searchParams.get("buildingId");
    const cityId = searchParams.get("cityId");
    const type = searchParams.get("type"); // DAILY or SUDDEN
    const status = searchParams.get("status");

    let filteredMessages = mockMessages;

    // Admin sees all, Building user sees only their building's messages
    if (user.role === "BUILDING") {
      // Find the building assigned to this user by using their token buildingId
      if (!user.buildingId) {
        return NextResponse.json({ message: "Forbidden: No assigned building" }, { status: 403 });
      }
      filteredMessages = filteredMessages.filter(m => m.buildingId === user.buildingId);
    } else if (user.role !== "ADMIN") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (buildingId) {
      filteredMessages = filteredMessages.filter(m => m.buildingId === buildingId);
    }

    if (status) {
      filteredMessages = filteredMessages.filter(m => m.status === status);
    }

    if (type || cityId) {
       // Need to join with alertEvents to filter by cityId or alert type (DAILY vs SUDDEN)
       filteredMessages = filteredMessages.filter(m => {
           const alertEvent = mockAlertEvents.find(ae => ae.id === m.alertEventId);
           if (!alertEvent) return false;
           
           if (type && alertEvent.type !== type) return false;
           if (cityId && alertEvent.cityId !== cityId) return false;
           return true;
       });
    }

    // Format output
    const formattedOutput = filteredMessages.map((m: Message) => {
        const building = mockBuildings.find(b => b.id === m.buildingId);
        const alertEvent = mockAlertEvents.find(ae => ae.id === m.alertEventId);
        
        return {
            id: m.id,
            buildingId: m.buildingId,
            buildingName: building ? building.name : "Unknown",
            channel: m.channel,
            recipient: m.recipientId, // Could expand this to recipient name/details if needed
            status: m.status,
            sentAt: m.sentAt,
            alertType: alertEvent ? alertEvent.type : "UNKNOWN",
            uploadToken: m.uploadToken, 
            uploadReceived: m.uploadReceived
        };
    });

    return NextResponse.json(formattedOutput);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};
