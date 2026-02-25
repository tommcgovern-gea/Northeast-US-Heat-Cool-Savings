import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { alertService } from "@/lib/services/alertService";
import { messageService } from "@/lib/services/messageService";
import { sql } from '@/lib/db/client';

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
    
    let citiesChecked = 0;
    let alertsFired = 0;
    const alertIds: string[] = [];

    for (const city of activeCities) {
      citiesChecked++;

      const result = await alertService.checkSuddenFluctuation(city.id);
      
      if (result && result.shouldAlert) {
        const alertLog = await alertService.processCityAlerts(city.id);
        if (alertLog) {
          await messageService.createMessagesFromAlert(alertLog.id, city.id);
          alertIds.push(alertLog.id);
        }
        alertsFired++;
      }

      await alertService.saveTemperatureSnapshot(city.id);
    }

    await messageService.sendPendingMessages();

    return NextResponse.json({
      citiesChecked,
      alertsFired,
      alertIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in check-alerts cron:", error);
    return NextResponse.json({ message: "Error running check-alerts" }, { status: 500 });
  }
};

export const dailySummary = async (req: NextRequest) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const cities = await db.getCities();
    const activeCities = cities.filter((c) => c.is_active);
    
    let citiesProcessed = 0;
    let summariesCreated = 0;

    for (const city of activeCities) {
      citiesProcessed++;

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
        summariesCreated++;
      }

      await alertService.saveTemperatureSnapshot(city.id);
    }

    await messageService.sendPendingMessages();

    return NextResponse.json({
      citiesProcessed,
      summariesCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in daily-summary cron:", error);
    return NextResponse.json({ message: "Error running daily-summary" }, { status: 500 });
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
