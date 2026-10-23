/**
import prisma from '../config/prisma.js';
 * Central WhatsApp Service - For sending OTP and notification messages
 *
 * Uses a dedicated WhatsApp instance for system notifications like:
 * - Password reset codes
 * - Account alerts
 * - System notifications
 */

// import { PrismaClient } from '@prisma/client';

// Central WhatsApp Configuration
// Trimmed: a stray space or newline in the host's env panel turns every
// request into a 401 (or a bad URL).
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, '');
const EVOLUTION_API_KEY = (process.env.EVOLUTION_API_KEY || '').trim();
const CENTRAL_INSTANCE =
  process.env.CENTRAL_WHATSAPP_INSTANCE ||
  process.env.EVOLUTION_OTP_INSTANCE ||
  'centraltripodayinstance';
// const CENTRAL_WHATSAPP_NUMBER = process.env.CENTRAL_WHATSAPP_NUMBER || '';
const REQUEST_TIMEOUT = 30000; // 30 seconds

console.log(`Central WhatsApp Config:
  URL: ${EVOLUTION_API_URL}
  API Key: ${EVOLUTION_API_KEY ? EVOLUTION_API_KEY.substring(0, 8) + '...' : 'NOT SET'}
  Instance: ${CENTRAL_INSTANCE}
`);

const getHeaders = () => ({
  apikey: EVOLUTION_API_KEY,
  'Content-Type': 'application/json',
});

const evolutionRequest = async (endpoint, options = {}) => {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    console.log(`Evolution API Request: ${options.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error response:', data);
      throw new Error(
        data?.response?.message || data?.message || `Evolution API error: ${response.status}`
      );
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);
    console.error(`Evolution API request failed for ${endpoint}:`, error.message, error.cause || '');
    throw error;
  }
};

const normalizePhoneNumber = phone => {
  if (!phone) return '';
  let cleaned = phone
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@g\.us/gi, '')
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '');

  // If phone is 10 digits (like Indian mobile), add +91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  return cleaned;
};

/**
 * Check if central WhatsApp instance is connected
 */
export const isCentralConnected = async () => {
  try {
    const data = await evolutionRequest(`/instance/connectionState/${CENTRAL_INSTANCE}`, {
      method: 'GET',
    });
    const state = data?.instance?.state || data?.state || 'UNKNOWN';
    return state === 'open';
  } catch (error) {
    console.error('Central WhatsApp connection check failed:', error);
    return false;
  }
};

/**
 * Send OTP/reset code via WhatsApp
 * @param {string} phoneNumber - Phone number to send OTP to
 * @param {string} code - The OTP code
 * @param {string} type - Type of OTP (reset, verify, etc.)
 */
export const sendOTP = async (phoneNumber, code, type = 'reset') => {
  try {
    const cleanNumber = normalizePhoneNumber(phoneNumber);
    console.log('Cleaned phone number:', cleanNumber);
    if (!cleanNumber) {
      throw new Error('Invalid phone number');
    }

    let message = '';
    switch (type) {
      case 'reset':
        message = `Your password reset code is: *${code}*\n\nThis code expires in 15 minutes.\nIf you did not request this, please ignore this message.`;
        break;
      case 'verify':
        message = `Your verification code is: *${code}*\n\nThis code expires in 10 minutes.`;
        break;
      default:
        message = `Your code is: *${code}*\n\nThis code expires in 15 minutes.`;
    }

    console.log('Sending WhatsApp message via:', CENTRAL_INSTANCE);
    console.log('Message:', message.substring(0, 50) + '...');

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${CENTRAL_INSTANCE}`, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: cleanNumber,
        text: message,
      }),
    });

    const data = await response.json();
    console.log('WhatsApp API Response:', response.status, JSON.stringify(data));

    if (!response.ok) {
      const apiMessage = data?.response?.message ?? data?.message;
      const first = Array.isArray(apiMessage) ? apiMessage[0] : apiMessage;
      if (first && typeof first === 'object' && first.exists === false) {
        throw new Error(`Number ${first.number || cleanNumber} is not registered on WhatsApp`);
      }
      throw new Error(
        (typeof first === 'string' ? first : first && JSON.stringify(first)) ||
          `API error: ${response.status}`
      );
    }

    return {
      success: true,
      waMessageId: data?.messages?.[0]?.key?.id || data?.key?.id,
      data,
    };
  } catch (error) {
    // fetch's own error is just "fetch failed" — the actual DNS/connection
    // reason lives on .cause and is otherwise invisible in the logs.
    console.error('Send OTP failed:', error.message, error.cause || '');
    throw error;
  }
};

/**
 * Send notification message via WhatsApp
 */
export const sendNotification = async (phoneNumber, message) => {
  try {
    const cleanNumber = normalizePhoneNumber(phoneNumber);
    if (!cleanNumber) {
      throw new Error('Invalid phone number');
    }

    const data = await evolutionRequest(`/message/sendText/${CENTRAL_INSTANCE}`, {
      method: 'POST',
      body: JSON.stringify({
        number: cleanNumber,
        text: message,
      }),
    });

    return {
      success: true,
      waMessageId: data?.messages?.[0]?.key?.id || data?.key?.id,
      data,
    };
  } catch (error) {
    console.error('Send notification error:', error);
    throw error;
  }
};

/**
 * Get or create the central WhatsApp instance
 */
export const ensureCentralInstance = async () => {
  try {
    // Check if instance exists
    try {
      const status = await evolutionRequest(`/instance/connectionState/${CENTRAL_INSTANCE}`, {
        method: 'GET',
      });
      const state = status?.instance?.state || status?.state || 'UNKNOWN';
      if (state === 'open') {
        return { success: true, state: 'open', alreadyExists: true };
      }
    } catch (e) {
      // Instance doesn't exist, create it
      console.log(
        e.error?.response?.message ||
          e.message ||
          'Instance check failed, will attempt to create instance.'
      );
    }

    // Create instance
    const data = await evolutionRequest('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: CENTRAL_INSTANCE,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
      }),
    });

    return { success: true, state: 'creating', data };
  } catch (error) {
    console.error('Ensure central instance error:', error);
    return { success: false, error: error.message };
  }
};
