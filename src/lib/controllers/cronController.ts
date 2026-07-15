import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { alertService } from "@/lib/services/alertService";
import { messageService } from "@/lib/services/messageService";

const CRON_SECRET = process.env.CRON_SECRET;

export type AlertRunFilter = {
  cityId?: string;
  buildingId?: string;
  userId?: string;
  email?: string;
};

function verifyCronSecret(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    // Allow manual runs from authenticated admin trigger route in dev/staging
    return req.nextUrl.pathname.startsWith("/api/admin/trigger");
  }
  const headerSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return headerSecret === CRON_SECRET || bearerSecret === CRON_SECRET;
}

function filterFromRequest(req: NextRequest): AlertRunFilter {
  const p = req.nextUrl.searchParams;
  return {
    cityId: p.get("cityId") || undefined,
    buildingId: p.get("buildingId") || undefined,
    userId: p.get("userId") || undefined,
    email: p.get("email") || undefined,
  };
}

async function resolveRunFilter(
  filter: AlertRunFilter,
): Promise<AlertRunFilter> {
  const out = { ...filter };
  if (out.userId && !out.buildingId) {
    const user = await db.getUserById(out.userId);
    const ids = (user?.building_ids || []) as string[];
    if (ids.length > 0) out.buildingId = ids[0];
    if (user?.email && !out.email) out.email = user.email;
  }
  if (out.buildingId && !out.cityId) {
    const b = await db.getBuildings(undefined, out.buildingId);
    if (b.length > 0) out.cityId = b[0].city_id;
  }
  return out;
}

export const checkAlerts = async (
  req: NextRequest,
  runFilter?: AlertRunFilter,
) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const filter = await resolveRunFilter({ ...filterFromRequest(req), ...runFilter });
    let cities = await db.getCities();
    let activeCities = cities.filter((c) => c.is_active);
    if (filter.cityId) {
      activeCities = activeCities.filter((c) => c.id === filter.cityId);
    }
    
    const citiesChecked: string[] = [];
    let alertsFired = 0;
    const alertIds: string[] = [];
    const alertsByCity: string[] = [];

    for (const city of activeCities) {
      citiesChecked.push(city.name);

      const result = await alertService.checkSuddenFluctuation(city.id);
      
      if (result && result.shouldAlert) {
        const alertLog = await alertService.processCityAlerts(city.id);
        if (alertLog) {
          await messageService.createMessagesFromAlert(alertLog.id, city.id, {
            buildingId: filter.buildingId,
            userId: filter.userId,
            email: filter.email,
          });
          alertIds.push(alertLog.id);
          alertsByCity.push(city.name);
        }
        alertsFired++;
      }

      await alertService.saveTemperatureSnapshot(city.id);
    }

    await messageService.sendPendingMessages();

    return NextResponse.json({
      citiesChecked,
      alertsFired,
      alertsByCity,
      alertIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in check-alerts cron:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        message: "Error running check-alerts",
        error: errMsg,
        stack: process.env.NODE_ENV === "development" ? errStack : undefined,
      },
      { status: 500 }
    );
  }
};

export const dailySummary = async (
  req: NextRequest,
  runFilter?: AlertRunFilter,
) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const filter = await resolveRunFilter({ ...filterFromRequest(req), ...runFilter });
    let cities = await db.getCities();
    let activeCities = cities.filter((c) => c.is_active);
    if (filter.cityId) {
      activeCities = activeCities.filter((c) => c.id === filter.cityId);
    }
    
    const citiesProcessed: string[] = [];
    const summariesByCity: string[] = [];
    let queuedMessages = 0;

    for (const city of activeCities) {
      citiesProcessed.push(city.name);

      const summary = await alertService.calculateDailySummary(city.id);
      
      if (summary) {
        const alertLog = await db.createAlertLog({
          city_id: city.id,
          alert_type: 'daily_summary',
          temperature_data: {
            currentTemp: summary.currentTemp,
            futureTemp: summary.futureTemp,
            averageTemp: summary.averageTemp,
            minTemp: summary.minTemp,
            maxTemp: summary.maxTemp,
            temperatureChange: summary.temperatureChange,
          },
          threshold_used: {},
          processed: false,
        });
        
        const ids = await messageService.createMessagesFromAlert(
          alertLog.id,
          city.id,
          {
            buildingId: filter.buildingId,
            userId: filter.userId,
            email: filter.email,
          },
        );
        queuedMessages += ids.length;
        summariesByCity.push(city.name);
      }

      await alertService.saveTemperatureSnapshot(city.id);
    }

    const sendResult = await messageService.sendPendingMessages();

    return NextResponse.json({
      citiesProcessed,
      summariesCreated: summariesByCity.length,
      summariesByCity,
      queuedMessages,
      sent: sendResult.sent,
      failed: sendResult.failed,
      processed: sendResult.processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in daily-summary cron:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { message: "Error running daily-summary", error: errMsg },
      { status: 500 }
    );
  }
};

export const sendPendingMessages = async (req: NextRequest) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const result = await messageService.sendPendingMessages();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in send-pending:", error);
    return NextResponse.json({ message: "Error sending pending messages" }, { status: 500 });
  }
};
