import {
  extractUploadTokenFromUrl,
  parseMessagePlainText,
} from "@/lib/messageContent";

const SMS_MAX_LENGTH = 160;

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function uploadPageUrl(messageId: string): string {
  return `${appBaseUrl()}/upload?token=${encodeURIComponent(messageId)}`;
}

/** Token used when submitting the upload form (original alert for warnings). */
export function resolveUploadToken(content: string, messageId: string): string {
  const { uploadUrl } = parseMessagePlainText(content);
  return extractUploadTokenFromUrl(uploadUrl) || messageId;
}

/**
 * Returns the full SMS body content without truncation.
 */
export function formatSmsBody(
  content: string,
  messageId: string,
  maxLen = SMS_MAX_LENGTH,
): string {
  return content;
}