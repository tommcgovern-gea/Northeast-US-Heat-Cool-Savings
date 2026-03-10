import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { alertService } from "@/lib/services/alertService";
import { messageService } from "@/lib/services/messageService";

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return !!CRON_SECRET && secret === CRON_SECRET;
}

export const checkAlerts = async (req: NextRequest) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const cities = await db.getCities();
    const activeCities = cities.filter((c) => c.is_active);
    
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
          await messageService.createMessagesFromAlert(alertLog.id, city.id);
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

export const dailySummary = async (req: NextRequest) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const cities = await db.getCities();
    const activeCities = cities.filter((c) => c.is_active);
    
    const citiesProcessed: string[] = [];
    const summariesByCity: string[] = [];

    for (const city of activeCities) {
      citiesProcessed.push(city.name);

      const summary = await alertService.calculateDailySummary(city.id);
      
      if (summary) {
        const alertLog = await db.createAlertLog({
          city_id: city.id,
          alert_type: 'daily_summary',
          temperature_data: {
            averageTemp: summary.averageTemp,
            minTemp: summary.minTemp,
            maxTemp: summary.maxTemp,
            temperatureChange: summary.temperatureChange,
          },
          threshold_used: {},
          processed: false,
        });
        
        await messageService.createMessagesFromAlert(alertLog.id, city.id);
        summariesByCity.push(city.name);
      }

      await alertService.saveTemperatureSnapshot(city.id);
    }

    await messageService.sendPendingMessages();

    return NextResponse.json({
      citiesProcessed,
      summariesCreated: summariesByCity.length,
      summariesByCity,
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
