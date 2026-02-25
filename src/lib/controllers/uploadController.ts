import { NextRequest, NextResponse } from "next/server";
import { mockMessages, mockAlertEvents, mockPhotoUploads, PhotoUpload } from "@/lib/mock-alerts";
import { mockBuildings } from "@/lib/mock-buildings";
import { verifyToken, TokenPayload } from "@/lib/auth";

// GET /api/upload/:token
export const getUploadContext = async (req: NextRequest, { params }: { params: { token: string } }) => {
  try {
    const { token } = params;

    const message = mockMessages.find(m => m.uploadToken === token);

    if (!message) {
      return NextResponse.json({ message: "Invalid token" }, { status: 404 });
    }

    const alertEvent = mockAlertEvents.find(ae => ae.id === message.alertEventId);
    const building = mockBuildings.find(b => b.id === message.buildingId);

    if (!alertEvent || !building) {
      return NextResponse.json({ message: "Context not found" }, { status: 404 });
    }

    const isExpired = new Date() > new Date(message.tokenExpiresAt || "");

    return NextResponse.json({
      valid: true,
      expired: isExpired,
      buildingName: building.name,
      alertType: alertEvent.type,
      message: message.content,
      alreadyUploaded: message.uploadReceived
    });
  } catch (error) {
    console.error("Error fetching upload context:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

// POST /api/upload/:token
export const submitUpload = async (req: NextRequest, { params }: { params: { token: string } }) => {
  try {
    const { token } = params;
    const formData = await req.formData();
    const photo = formData.get("photo") as File | null;

    if (!photo) {
      return NextResponse.json({ message: "No photo provided" }, { status: 400 });
    }

    // Validate token exists and matches
    const message = mockMessages.find(m => m.uploadToken === token);
    if (!message) {
      return NextResponse.json({ message: "Invalid token" }, { status: 404 });
    }

    if (message.uploadReceived) {
        return NextResponse.json({ message: "Already uploaded" }, { status: 400 });
    }

    // Reject non-image file types
    const validMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validMimes.includes(photo.type)) {
      return NextResponse.json({ message: "Invalid file type. Only jpg, png, webp allowed." }, { status: 400 });
    }

    // Max file size: 10MB
    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "File exceeds 10MB limit." }, { status: 400 });
    }

    // Check expiry
    const isLate = new Date() > new Date(message.tokenExpiresAt || "");

    const timestamp = Date.now();
    const s3Path = `uploads/${message.buildingId}/${message.alertEventId}/${timestamp}.jpg`; // mock path

    const uploadRecord: PhotoUpload = {
      id: Date.now().toString(),
      buildingId: message.buildingId,
      messageId: message.id,
      alertEventId: message.alertEventId,
      uploadedAt: new Date().toISOString(),
      s3Url: `https://mock-s3-bucket.com/${s3Path}`, // mock actual save
      isLate: isLate
    };

    mockPhotoUploads.push(uploadRecord);
    message.uploadReceived = true; // Mark stringly so future visits know its uploaded

    // Check for late compliance trigger via building dashboard 
    // Usually updates the Building compliance rating or metrics
    
    return NextResponse.json({
      success: true,
      uploadedAt: uploadRecord.uploadedAt,
      isLate: isLate,
      buildingId: message.buildingId
    });
  } catch (error) {
    console.error("Error submitting upload:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

// GET /api/buildings/:id/uploads
export const getBuildingUploads = async (req: NextRequest, { params }: { params: { id: string } }) => {
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

    const { id: buildingId } = params;

    // Authorization checks
    if (user.role === "BUILDING" && user.buildingId !== buildingId) {
        return NextResponse.json({ message: "Forbidden: You do not have access to this building" }, { status: 403 });
    } else if (user.role !== "ADMIN" && user.role !== "BUILDING") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const alertType = searchParams.get("alertType");

    let buildingUploads = mockPhotoUploads.filter(u => u.buildingId === buildingId);

    if (alertType) {
        buildingUploads = buildingUploads.filter(u => {
            const ae = mockAlertEvents.find(a => a.id === u.alertEventId);
            return ae && ae.type === alertType;
        });
    }

    if (from) {
        const fromDate = new Date(from);
        buildingUploads = buildingUploads.filter(u => new Date(u.uploadedAt) >= fromDate);
    }
    if (to) {
        const toDate = new Date(to);
        buildingUploads = buildingUploads.filter(u => new Date(u.uploadedAt) <= toDate);
    }

    // Expand the response
    const expandedResponse = buildingUploads.map(u => {
      const alertEvent = mockAlertEvents.find(ae => ae.id === u.alertEventId);
      const message = mockMessages.find(m => m.id === u.messageId);

      return {
        id: u.id,
        uploadedAt: u.uploadedAt,
        isLate: u.isLate,
        s3Url: u.s3Url,
        alertType: alertEvent?.type || "UNKNOWN",
        alertFiredAt: alertEvent?.createdAt || u.uploadedAt,
        messageChannel: message?.channel || "UNKNOWN"
      };
    });

    return NextResponse.json(expandedResponse);
  } catch (error) {
    console.error("Error fetching building uploads:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};
