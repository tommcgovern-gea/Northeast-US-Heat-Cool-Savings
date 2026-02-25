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
  uploadToken: string | null;
  tokenExpiresAt: string | null;
  uploadReceived: boolean;
  sentAt: string | null;
  createdAt: string;
}

export interface PhotoUpload {
  id: string;
  buildingId: string;
  messageId: string;
  alertEventId: string;
  uploadedAt: string;
  s3Url: string;
  isLate: boolean;
}

export const mockAlertEvents: AlertEvent[] = [
  {
    id: "test-event-1",
    cityId: "1",
    type: "SUDDEN",
    triggerTempDelta: 5,
    forecastHighF: 80,
    forecastLowF: 60,
    createdAt: new Date().toISOString()
  }
];
export const mockMessages: Message[] = [
  {
    id: "test-message-1",
    alertEventId: "test-event-1",
    buildingId: "1",
    recipientId: "test-recipient",
    channel: "EMAIL",
    status: "PENDING",
    content: "Please upload your photo. Token: valid-test-token-123",
    uploadToken: "valid-test-token-123",
    tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    uploadReceived: false,
    sentAt: null,
    createdAt: new Date().toISOString()
  }
];
export const mockPhotoUploads: PhotoUpload[] = [];
