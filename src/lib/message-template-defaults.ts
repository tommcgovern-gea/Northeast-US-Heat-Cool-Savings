/** Shared template types and default copy (safe for client components — no DB). */

export const MESSAGE_TEMPLATE_TYPES = [
  'daily_summary_stable',
  'daily_summary_increase',
  'daily_summary_decrease',
  'alert_increase',
  'alert_decrease',
  'warning',
] as const;

export type MessageTemplateType = (typeof MESSAGE_TEMPLATE_TYPES)[number];

export const LEGACY_TEMPLATE_TYPES = ["alert", "daily_summary"] as const;

export type AnyTemplateType =
  | MessageTemplateType
  | (typeof LEGACY_TEMPLATE_TYPES)[number];

export interface TemplateVariables {
  temperatureChange?: number;
  temperatureDelta?: number;
  timeWindow?: number;
  currentTemp?: number;
  futureTemp?: number;
  averageTemp?: number;
  minTemp?: number;
  maxTemp?: number;
  cityName?: string;
  buildingName?: string;
  uploadUrl?: string;
  hoursAgo?: number;
  seasonalInstruction?: string;
}

export function resolveSeasonalInstruction(
  direction: "increase" | "decrease" | "stable" = "increase",
  temperatureData?: Record<string, unknown> | null,
  referenceDate: Date | string | number = new Date(),
): string {
  // Determine season based on calendar month (May-September = summer, else winter)
  const date =
    referenceDate instanceof Date
      ? referenceDate
      : new Date(referenceDate);
  const month = date.getMonth() + 1;
  const isCoolingSeason = month >= 5 && month <= 9; // May-September = summer

  let deltaValue = Number(
    temperatureData?.change ?? temperatureData?.temperatureChange ?? 0,
  );
  if (
    deltaValue === 0 &&
    temperatureData?.currentTemp != null &&
    temperatureData?.futureTemp != null
  ) {
    deltaValue =
      Number(temperatureData.futureTemp) - Number(temperatureData.currentTemp);
  }
  const absDelta = Math.abs(deltaValue);
  const deltaSuffix = absDelta > 0 ? ` by ${absDelta}°F` : "";

  if (direction === "increase") {
    return isCoolingSeason
      ? `In summer, use more cooling${deltaSuffix}.`
      : `In winter, use less heat${deltaSuffix}.`;
  }

  if (direction === "decrease") {
    return isCoolingSeason
      ? `In summer, use less cooling${deltaSuffix}.`
      : `In winter, use more heat${deltaSuffix}.`;
  }

  return "";
}

export const CLIENT_DEFAULT_TEMPLATES: Record<MessageTemplateType, string> = {
  daily_summary_stable: `Here is your daily temperature setting message.
Temperatures appear to be consistent, no setting changes needed.
Please keep monitoring temperatures and adjusting throughout the day.`,

  daily_summary_increase: `Here is your daily temperature setting message.
Current Temperature: {{currentTemp}}°F | Future Temperature: {{futureTemp}}°F (Change: {{temperatureDelta}}°F)
Temperatures appear to be increasing. {{seasonalInstruction}}
Please forward pictures of temperature setting changes in the next two hours, to keep your guarantee active.
Please keep monitoring temperatures and adjusting throughout the day.

Upload photo or BMS record: {{uploadUrl}}`,

  daily_summary_decrease: `Here is your daily temperature setting message.
Current Temperature: {{currentTemp}}°F | Future Temperature: {{futureTemp}}°F (Change: {{temperatureDelta}}°F)
Temperatures appear to be decreasing. {{seasonalInstruction}}
Please forward pictures of temperature setting changes in the next two hours, to keep your guarantee active.
Please keep monitoring temperatures and adjusting throughout the day.

Upload photo or BMS record: {{uploadUrl}}`,

  alert_increase: `Here is a special temperature setting alert.
Current Temperature: {{currentTemp}}°F | Future Temperature: {{futureTemp}}°F (Change: {{temperatureDelta}}°F)
Temperatures appear to be increasing suddenly. {{seasonalInstruction}}
Please forward pictures of temperature setting changes in the next two hours, to keep your guarantee active.
Please keep monitoring temperatures and adjusting throughout the day.

Upload photo or BMS record: {{uploadUrl}}`,

  alert_decrease: `Here is a special temperature setting alert.
Current Temperature: {{currentTemp}}°F | Future Temperature: {{futureTemp}}°F (Change: {{temperatureDelta}}°F)
Temperatures appear to be decreasing suddenly. {{seasonalInstruction}}
Please forward pictures of temperature setting changes in the next two hours, to keep your guarantee active.
Please keep monitoring temperatures and adjusting throughout the day.

Upload photo or BMS record: {{uploadUrl}}`,

  warning: `You have not uploaded compliance documentation (photo or BMS record) for the message sent {{hoursAgo}} hours ago.

Please upload immediately. Failure to comply may void your guarantee.

Upload link: {{uploadUrl}}`,
};

export function isMessageTemplateType(
  value: string,
): value is MessageTemplateType {
  return (MESSAGE_TEMPLATE_TYPES as readonly string[]).includes(value);
}

export function resolveTemplateType(
  alertType: string,
  temperatureData: Record<string, unknown> | null | undefined,
  stableThresholdF: number = 2,
): MessageTemplateType {
  const td = temperatureData ?? {};

  if (alertType === "sudden_fluctuation") {
    const current = Number(td.currentTemp);
    const future = Number(td.futureTemp);
    if (!Number.isNaN(current) && !Number.isNaN(future)) {
      return future >= current ? "alert_increase" : "alert_decrease";
    }
    const signed = Number(td.change ?? td.temperatureChange ?? 0);
    return signed >= 0 ? "alert_increase" : "alert_decrease";
  }

  if (alertType === "daily_summary") {
    const change = Number(td.temperatureChange ?? 0);
    if (Math.abs(change) < stableThresholdF) {
      return "daily_summary_stable";
    }
    return change > 0 ? "daily_summary_increase" : "daily_summary_decrease";
  }

  return "daily_summary_stable";
}

export function messageTypeForAlert(
  alertType: string,
): "alert" | "daily_summary" {
  return alertType === "sudden_fluctuation" ? "alert" : "daily_summary";
}

export function emailSubjectForTemplate(
  templateType: MessageTemplateType,
): string {
  switch (templateType) {
    case "alert_increase":
    case "alert_decrease":
      return "Special Temperature Setting Alert";
    case "daily_summary_stable":
    case "daily_summary_increase":
    case "daily_summary_decrease":
      return "Daily Temperature Setting Message";
    case "warning":
      return "Compliance Warning";
    default:
      return "Temperature Message";
  }
}
