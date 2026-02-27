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

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  if (!client || !fromNumber) {
    console.warn('Twilio not configured, SMS not sent');
    return {
      success: false,
      error: 'SMS service not configured',
    };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

export function isSMSConfigured(): boolean {
  return !!(client && fromNumber);
}
