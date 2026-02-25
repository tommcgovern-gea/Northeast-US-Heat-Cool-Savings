import { NextRequest, NextResponse } from "next/server";
import { mockCities } from "@/lib/mock-cities";
import { mockBuildings } from "@/lib/mock-buildings";
import { mockAlertEvents, mockMessages, mockPhotoUploads } from "@/lib/mock-alerts";
import { verifyToken, TokenPayload } from "@/lib/auth";

/**
 * Helper: extract and verify JWT from Authorization header.
 */
function authenticateRequest(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}

/**
 * Helper: get the date 30 days ago.
 */
function thirtyDaysAgo(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

/**
 * Helper: count recipients across all buildings or a specific set.
 */
function countRecipients(buildings: typeof mockBuildings): number {
  return buildings.reduce((sum, b) => sum + (b.recipients?.length || 0), 0);
}

// ─────────────────────────────────────────────────────
// GET /api/dashboard/admin
// Top-level admin dashboard stats. Admin only.
// ─────────────────────────────────────────────────────
export const getAdminDashboard = async (req: NextRequest) => {
  try {
    const user = authenticateRequest(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden: Admin only" }, { status: 403 });
    }

    const cutoff = thirtyDaysAgo();

    // Basic counts
    const totalCities = mockCities.length;
    const totalBuildings = mockBuildings.length;
    const activeBuildings = mockBuildings.filter(b => b.isActive).length;
    const totalRecipients = countRecipients(mockBuildings);

    // Messages in last 30 days
    const messagesLast30Days = mockMessages.filter(
      m => new Date(m.createdAt) >= cutoff
    ).length;

    // Alerts in last 30 days
    const alertsLast30Days = mockAlertEvents.filter(
      ae => new Date(ae.createdAt) >= cutoff
    ).length;

    // Compute per-building compliance for last 30 days
    const recentMessages = mockMessages.filter(m => new Date(m.createdAt) >= cutoff);
    const recentUploads = mockPhotoUploads.filter(u => new Date(u.uploadedAt) >= cutoff);

    // Overall compliance = (total uploads / total messages that needed upload) * 100
    const messagesWithToken = recentMessages.filter(m => m.uploadToken !== null);
    const overallComplianceRate = messagesWithToken.length > 0
      ? Math.round((recentUploads.length / messagesWithToken.length) * 100 * 10) / 10
      : 100;

    // Buildings at risk: compliance < 50% in last 30 days
    const buildingsAtRisk = mockBuildings
      .map(b => {
        const bMessages = messagesWithToken.filter(m => m.buildingId === b.id);
        const bUploads = recentUploads.filter(u => u.buildingId === b.id);
        const rate = bMessages.length > 0
          ? (bUploads.length / bMessages.length) * 100
          : 100;
        return { id: b.id, name: b.name, city: b.cityName, missedUploads: bMessages.length - bUploads.length, complianceRate: rate };
      })
      .filter(b => b.complianceRate < 50);

    // Recent alerts (last 10)
    const recentAlerts = mockAlertEvents
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(ae => ({
        id: ae.id,
        cityId: ae.cityId,
        type: ae.type,
        firedAt: ae.createdAt,
        tempDelta: ae.triggerTempDelta,
      }));

    return NextResponse.json({
      totalCities,
      totalBuildings,
      activeBuildings,
      totalRecipients,
      messagesLast30Days,
      alertsLast30Days,
      overallComplianceRate,
      buildingsAtRisk,
      recentAlerts,
    });
  } catch (error) {
    console.error("Error in admin dashboard:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

// ─────────────────────────────────────────────────────
// GET /api/dashboard/building/:buildingId
// Building-level dashboard. Accessible by building user or admin.
// ─────────────────────────────────────────────────────
export const getBuildingDashboard = async (req: NextRequest, buildingId: string) => {
  try {
    const user = authenticateRequest(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Building users can only see their own building
    if (user.role === "BUILDING" && user.buildingId !== buildingId) {
      return NextResponse.json({ message: "Forbidden: You do not have access to this building" }, { status: 403 });
    }

    if (user.role !== "ADMIN" && user.role !== "BUILDING") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const building = mockBuildings.find(b => b.id === buildingId);
    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    const city = mockCities.find(c => c.id === building.cityId);
    const cutoff = thirtyDaysAgo();

    // Messages for this building in last 30 days
    const buildingMessages = mockMessages.filter(
      m => m.buildingId === buildingId && new Date(m.createdAt) >= cutoff
    );
    const messagesLast30Days = buildingMessages.length;

    // Uploads for this building in last 30 days
    const buildingUploads = mockPhotoUploads.filter(
      u => u.buildingId === buildingId && new Date(u.uploadedAt) >= cutoff
    );
    const uploadsLast30Days = buildingUploads.length;

    // Late uploads
    const lateUploads = buildingUploads.filter(u => u.isLate).length;

    // Missing uploads = messages with token that haven't been uploaded
    const messagesWithToken = buildingMessages.filter(m => m.uploadToken !== null);
    const missingUploads = messagesWithToken.filter(m => !m.uploadReceived).length;

    // Compliance rate
    const complianceRate = messagesWithToken.length > 0
      ? Math.round((buildingUploads.length / messagesWithToken.length) * 100 * 10) / 10
      : building.complianceRate;

    // Recent messages (last 10)
    const recentMessages = buildingMessages
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(m => ({
        id: m.id,
        channel: m.channel,
        status: m.status,
        content: m.content,
        uploadReceived: m.uploadReceived,
        createdAt: m.createdAt,
        sentAt: m.sentAt,
      }));

    // Recent uploads (last 10)
    const recentUploads = buildingUploads
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 10)
      .map(u => ({
        id: u.id,
        uploadedAt: u.uploadedAt,
        isLate: u.isLate,
        s3Url: u.s3Url,
      }));

    return NextResponse.json({
      buildingName: building.name,
      city: city?.name || building.cityName,
      complianceRate,
      messagesLast30Days,
      uploadsLast30Days,
      lateUploads,
      missingUploads,
      recentMessages,
      recentUploads,
      isPaused: building.isPaused,
    });
  } catch (error) {
    console.error("Error in building dashboard:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};

// ─────────────────────────────────────────────────────
// GET /api/compliance/report
// Compliance report across all buildings. Admin only. Exportable.
// Query: { from: string, to: string, cityId?: string }
// ─────────────────────────────────────────────────────
export const getComplianceReport = async (req: NextRequest) => {
  try {
    const user = authenticateRequest(req);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden: Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const cityId = searchParams.get("cityId");

    // Default range: last 30 days
    const fromDate = from ? new Date(from) : thirtyDaysAgo();
    const toDate = to ? new Date(to) : new Date();

    // Filter buildings by cityId if provided
    let buildings = [...mockBuildings];
    if (cityId) {
      buildings = buildings.filter(b => b.cityId === cityId);
    }

    const report = buildings.map(b => {
      const city = mockCities.find(c => c.id === b.cityId);

      // Messages for this building in date range
      const bMessages = mockMessages.filter(
        m => m.buildingId === b.id &&
          new Date(m.createdAt) >= fromDate &&
          new Date(m.createdAt) <= toDate
      );
      const totalMessages = bMessages.length;

      // Messages that required an upload (had a token)
      const messagesWithToken = bMessages.filter(m => m.uploadToken !== null);

      // Uploads for this building in date range
      const bUploads = mockPhotoUploads.filter(
        u => u.buildingId === b.id &&
          new Date(u.uploadedAt) >= fromDate &&
          new Date(u.uploadedAt) <= toDate
      );
      const totalUploads = bUploads.length;

      // On-time vs late
      const onTimeUploads = bUploads.filter(u => !u.isLate).length;
      const lateUploads = bUploads.filter(u => u.isLate).length;

      // Missing = messages with token but no upload received
      const missingUploads = messagesWithToken.filter(m => !m.uploadReceived).length;

      // Compliance rate
      const complianceRate = messagesWithToken.length > 0
        ? Math.round((totalUploads / messagesWithToken.length) * 100 * 10) / 10
        : 100;

      return {
        buildingId: b.id,
        buildingName: b.name,
        city: city?.name || b.cityName,
        totalMessages,
        totalUploads,
        onTimeUploads,
        lateUploads,
        missingUploads,
        complianceRate,
      };
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error in compliance report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};
