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

/** Normalize to E.164 for Twilio: strip spaces/dashes, ensure + prefix for US. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10 && /^[2-9]/.test(digits)) return `+1${digits}`;
  return phone.replace(/\s/g, '').replace(/^([0-9])/, '+$1');
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

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

export async function sendVerification(phone: string): Promise<SMSResult> {
  if (!client || !verifyServiceSid) {
    console.warn('Twilio Verify service not configured');
    return {
      success: false,
      error: 'Verify service not configured',
    };
  }

  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phone,
        channel: 'sms',
      });

    return {
      success: true,
      messageId: verification.sid,
    };
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to send verification code';
    console.error('Error sending verification:', msg);
    return {
      success: false,
      error: msg,
    };
  }
}

export async function checkVerification(
  phone: string,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  if (!client || !verifyServiceSid) {
    return {
      success: false,
      error: 'Verify service not configured',
    };
  }

  try {
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: phone,
        code: code,
      });

    return { success: check.status === 'approved' };
  } catch (error: any) {
    const msg = error?.message ?? 'Failed to verify code';
    console.error('Error checking verification:', msg);
    return {
      success: false,
      error: msg,
    };
  }
}
