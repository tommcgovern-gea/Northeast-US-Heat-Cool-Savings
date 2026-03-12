import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Normalize phone: remove spaces, ensure E.164. */
function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, '');
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  if (!client || !fromNumber) {
    console.warn('Twilio not configured, SMS not sent');
    return {
      success: false,
      error: 'SMS service not configured',
    };
  }

  const toNormalized = normalizePhone(to);
  const fromNormalized = normalizePhone(fromNumber);
  if (toNormalized === fromNormalized) {
    return {
      success: false,
      error: 'Cannot send SMS to the same number as the Twilio sender. Use a different recipient phone.',
    };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNormalized,
    });

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to send SMS';
    console.error('Error sending SMS:', msg);
    return {
      success: false,
      error: msg,
    };
  }
}

export function isSMSConfigured(): boolean {
  return !!(client && fromNumber);
}
