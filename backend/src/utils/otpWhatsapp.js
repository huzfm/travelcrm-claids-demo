/**
 * OTP WhatsApp Service
 *
 * Wrapper specifically for OTP (One-Time Password) messages.
 *
 * CRITICAL: This module ALWAYS uses EVOLUTION_OTP_INSTANCE.
 * NEVER uses the chat instance for OTP messages.
 *
 * This ensures:
 * 1. OTP traffic is isolated from regular messaging
 * 2. Better monitoring and debugging
 * 3. Consistent OTP delivery
 */

import WHATSAPP_CONFIG from '../config/whatsapp.config.js';

const { otp: otpConfig, baseUrl, apiKey, requestTimeout } = WHATSAPP_CONFIG;

const OTP_INSTANCE = otpConfig.instanceName;
const APP_NAME = process.env.APP_NAME || 'Claids Travel';

/**
 * Normalize phone number for WhatsApp
 */
const normalizePhone = phone => {
  if (!phone) return '';
  return phone
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@g\.us/gi, '')
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '');
};

/**
 * Send OTP message via WhatsApp
 *
 * @param {string} phoneNumber - Phone number to send OTP to (with country code)
 * @param {string} otp - The 6-digit OTP code
 * @returns {Promise<{success: boolean, waMessageId?: string, sentVia?: string}>}
 */
export const sendOTPMessage = async (phoneNumber, otp) => {
  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  if (!otp) {
    throw new Error('OTP code is required');
  }

  if (otp.length !== 6) {
    throw new Error('OTP must be 6 digits');
  }

  const cleanNumber = normalizePhone(phoneNumber);

  // CRITICAL: Always use OTP instance - never chat instance
  console.log(`[OTP WhatsApp] Sending OTP to: ${cleanNumber}`);
  console.log(`[OTP WhatsApp] Using instance: ${OTP_INSTANCE} (OTP ONLY - not chat)`);

  // Build OTP message
  const message = `*${APP_NAME}*\n\nYour OTP code is: *${otp}*\n\nValid for 10 minutes.\n\nDo not share this code with anyone.`;

  const url = `${baseUrl}message/sendText/${OTP_INSTANCE}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: cleanNumber,
        text: message,
      }),
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.response?.message || data?.message || `Evolution API error: ${response.status}`;
      console.error('[OTP WhatsApp] Send failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const waMessageId = data?.messages?.[0]?.key?.id || data?.key?.id;

    console.log(`[OTP WhatsApp] OTP sent successfully! ID: ${waMessageId}`);
    console.log(`[OTP WhatsApp] Instance used: ${OTP_INSTANCE}`);

    return {
      success: true,
      waMessageId,
      sentVia: OTP_INSTANCE, // Track which instance sent the OTP
    };
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[OTP WhatsApp] Send error:`, error.message);
    throw error;
  }
};

/**
 * Check if OTP WhatsApp instance is connected
 *
 * @returns {Promise<boolean>}
 */
export const isOTPInstanceConnected = async () => {
  const url = `${baseUrl}instance/connectionState/${OTP_INSTANCE}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        apikey: apiKey,
      },
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      console.error('[OTP WhatsApp] Connection check failed:', data);
      return false;
    }

    const state = data?.instance?.state || data?.state || 'UNKNOWN';
    const isConnected = state === 'open';

    console.log(
      `[OTP WhatsApp] Instance: ${OTP_INSTANCE}, State: ${state}, Connected: ${isConnected}`
    );

    return isConnected;
  } catch (error) {
    clearTimeout(timeout);
    console.error('[OTP WhatsApp] Connection check error:', error.message);
    return false;
  }
};

/**
 * Get OTP instance details
 *
 * @returns {Promise<{connected: boolean, state: string, instanceName: string}>}
 */
export const getOTPInstanceStatus = async () => {
  const url = `${baseUrl}instance/connectionState/${OTP_INSTANCE}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        apikey: apiKey,
      },
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      return {
        connected: false,
        state: 'ERROR',
        instanceName: OTP_INSTANCE,
        error: data,
      };
    }

    const state = data?.instance?.state || data?.state || 'UNKNOWN';

    return {
      connected: state === 'open',
      state,
      instanceName: OTP_INSTANCE,
      details: data,
    };
  } catch (error) {
    clearTimeout(timeout);
    console.error('[OTP WhatsApp] Status check error:', error.message);
    return {
      connected: false,
      state: 'ERROR',
      instanceName: OTP_INSTANCE,
      error: error.message,
    };
  }
};

export default {
  sendOTPMessage,
  isOTPInstanceConnected,
  getOTPInstanceStatus,
};
