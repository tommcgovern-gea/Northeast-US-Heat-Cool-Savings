export type AlertType = "SUDDEN" | "DAILY";
export type MessageStatus = "PENDING" | "SENT" | "FAILED";
export type MessageChannel = "EMAIL" | "SMS";

export interface AlertEvent {
  id: string;
  cityId: string;
  type: AlertType;
  triggerTempDelta: number | null; // for SUDDEN alerts
  forecastHighF: number | null;
  forecastLowF: number | null;
  createdAt: string;
}

export interface Message {
  id: string;
  alertEventId: string;
  buildingId: string;
  recipientId: string;
  channel: MessageChannel;
  status: MessageStatus;
  content: string;
  sentAt: string | null;
  createdAt: string;
}

export const mockAlertEvents: AlertEvent[] = [];
export const mockMessages: Message[] = [];
