import { NextRequest, NextResponse } from "next/server";
import { mockCities } from "@/lib/mock-cities";
import { mockBuildings } from "@/lib/mock-buildings";
import { mockAlertEvents, mockMessages, AlertEvent, Message } from "@/lib/mock-alerts";
import { fetchNWSHourlyForecast } from "@/lib/controllers/weatherController";

/**
 * Verify the x-cron-secret header matches CRON_SECRET env var.
 */
function verifyCronSecret(req: NextRequest): boolean {
  const CRON_SECRET = process.env.CRON_SECRET;
  const secret = req.headers.get("x-cron-secret");
  return !!CRON_SECRET && secret === CRON_SECRET;
}

/**
 * Queue messages (PENDING) for all active, non-paused buildings in a city.
 */
function queueMessagesForCity(
  cityId: string,
  alertEvent: AlertEvent,
  messageContentTemplate: string
): number {
  const buildings = mockBuildings.filter(
    (b) => b.cityId === cityId && b.isActive && !b.isPaused
  );

  let messageCount = 0;

  for (const building of buildings) {
    const recipients = building.recipients || [];
    for (const recipient of recipients) {
      if (!recipient.isActive) continue;

      const baseMessage = {
        id: Date.now().toString() + "-" + Math.random().toString(36).substr(2, 5),
        alertEventId: alertEvent.id,
        buildingId: building.id,
        recipientId: recipient.id,
        status: "PENDING" as any,
        sentAt: null,
        createdAt: new Date().toISOString(),
        uploadReceived: false
      };

      // Generate unique token for this specific message
      const uploadToken = Buffer.from(`${baseMessage.id}-${Date.now()}`).toString("base64");
      // Token expires in 2 hours
      const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const content = messageContentTemplate.replace("{uploadToken}", uploadToken);

      // Queue email if preferred
      if (recipient.preferEmail && recipient.email) {
        const msg: Message = {
          ...baseMessage,
          id: baseMessage.id + "-E",
          channel: "EMAIL",
          content,
          uploadToken,
          tokenExpiresAt,
        };
        mockMessages.push(msg);
        messageCount++;
      }

      // Queue SMS if preferred
      if (recipient.preferSms && recipient.phone) {
        const msg: Message = {
          ...baseMessage,
          id: baseMessage.id + "-S",
          channel: "SMS",
          content,
          uploadToken,
          tokenExpiresAt,
        };
        mockMessages.push(msg);
        messageCount++;
      }
    }
  }

  return messageCount;
}

// ─────────────────────────────────────────────────────
// POST /api/cron/check-alerts
// Runs every hour. Checks rolling window temp delta.
// ─────────────────────────────────────────────────────
export const checkAlerts = async (req: NextRequest) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const activeCities = mockCities.filter((c) => c.isActive);
    let citiesChecked = 0;
    let alertsFired = 0;
    const alertIds: string[] = [];

    for (const city of activeCities) {
      citiesChecked++;

      const forecast = await fetchNWSHourlyForecast(
        city.nwsOffice,
        city.nwsGridX,
        city.nwsGridY
      );

      if (forecast.length < 2) continue;

      // Check rolling windows: compare temp at hour 0 vs hour N (N = alertWindowHours)
      const windowEnd = Math.min(city.alertWindowHours, forecast.length - 1);
      const tempNow = forecast[0].tempF;
      const tempLater = forecast[windowEnd].tempF;
      const delta = Math.abs(tempLater - tempNow);

      // If delta >= alertTempDelta, fire a SUDDEN alert
      if (delta >= city.alertTempDelta) {
        const alertEvent: AlertEvent = {
          id: Date.now().toString() + "-" + city.id,
          cityId: city.id,
          type: "SUDDEN",
          triggerTempDelta: delta,
          forecastHighF: Math.max(...forecast.map((f) => f.tempF)),
          forecastLowF: Math.min(...forecast.map((f) => f.tempF)),
          createdAt: new Date().toISOString(),
        };

        mockAlertEvents.push(alertEvent);
        alertsFired++;
        alertIds.push(alertEvent.id);

        // Queue messages for all active buildings
        const messageContent = `⚠️ SUDDEN TEMP ALERT for ${city.name}: Temperature is expected to change by ${delta}°F in the next ${city.alertWindowHours} hours (${tempNow}°F → ${tempLater}°F). Please take necessary precautions.\n\nUpload photo: /upload?token={uploadToken}`;

        queueMessagesForCity(city.id, alertEvent, messageContent);
      }
    }

    return NextResponse.json({
      citiesChecked,
      alertsFired,
      alertIds,
    });
  } catch (error) {
    console.error("Error in check-alerts cron:", error);
    return NextResponse.json({ message: "Error running check-alerts" }, { status: 500 });
  }
};

// ─────────────────────────────────────────────────────
// POST /api/cron/daily-summary
// Runs once per day at 7am. Sends daily summary to all
// active buildings in each city.
// ─────────────────────────────────────────────────────
export const dailySummary = async (req: NextRequest) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const activeCities = mockCities.filter((c) => c.isActive);
    let citiesProcessed = 0;
    let messagesSent = 0;

    for (const city of activeCities) {
      citiesProcessed++;

      const forecast = await fetchNWSHourlyForecast(
        city.nwsOffice,
        city.nwsGridX,
        city.nwsGridY
      );

      if (forecast.length === 0) continue;

      const currentTemp = forecast[0].tempF;
      const highTemp = Math.max(...forecast.map((f) => f.tempF));
      const lowTemp = Math.min(...forecast.map((f) => f.tempF));

      // Determine trend
      const lastTemp = forecast[forecast.length - 1].tempF;
      let trend = "stable";
      if (lastTemp > currentTemp + 3) trend = "rising";
      else if (lastTemp < currentTemp - 3) trend = "falling";

      // Create DAILY alert event
      const alertEvent: AlertEvent = {
        id: Date.now().toString() + "-daily-" + city.id,
        cityId: city.id,
        type: "DAILY",
        triggerTempDelta: null,
        forecastHighF: highTemp,
        forecastLowF: lowTemp,
        createdAt: new Date().toISOString(),
      };

      mockAlertEvents.push(alertEvent);

      const messageContent = `📊 Daily Temperature Summary for ${city.name}:\nCurrent: ${currentTemp}°F | High: ${highTemp}°F | Low: ${lowTemp}°F\nTrend: ${trend}\n\nUpload your compliance photo: /upload?token={uploadToken}`;

      const count = queueMessagesForCity(city.id, alertEvent, messageContent);
      messagesSent += count;
    }

    return NextResponse.json({
      messagesSent,
      citiesProcessed,
    });
  } catch (error) {
    console.error("Error in daily-summary cron:", error);
    return NextResponse.json({ message: "Error running daily-summary" }, { status: 500 });
  }
};

// ─────────────────────────────────────────────────────
// POST /api/messages/send-pending
// Flushes PENDING messages (mock — marks them as SENT).
// ─────────────────────────────────────────────────────
export const sendPendingMessages = async (req: NextRequest) => {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const pendingMessages = mockMessages.filter((m) => m.status === "PENDING");
    let sent = 0;
    let failed = 0;

    for (const msg of pendingMessages) {
      // In production, this would call Twilio (SMS) or SendGrid (email)
      // For mock, we just mark as SENT
      try {
        msg.status = "SENT";
        msg.sentAt = new Date().toISOString();
        sent++;
      } catch {
        msg.status = "FAILED";
        failed++;
      }
    }

    return NextResponse.json({
      processed: pendingMessages.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error("Error in send-pending:", error);
    return NextResponse.json({ message: "Error sending pending messages" }, { status: 500 });
  }
};
