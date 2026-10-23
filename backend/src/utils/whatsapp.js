/**
 * Generic WhatsApp Message Utility
 *
 * A flexible function that sends WhatsApp messages using ANY specified instance.
 * Used by both chat and OTP features - instance name is passed as parameter.
 *
 * IMPORTANT: This is a generic utility. For OTP messages specifically,
 * use otpWhatsapp.js which enforces using the OTP instance only.
 */

import WHATSAPP_CONFIG from '../config/whatsapp.config.js';

const { baseUrl, apiKey, requestTimeout } = WHATSAPP_CONFIG;

/**
 * Send WhatsApp message via specified instance
 *
 * @param {string} instanceName - The Evolution API instance name to use
 * @param {string} phoneNumber - Recipient phone number (with country code)
 * @param {string} message - Message text to send
 * @returns {Promise<{success: boolean, waMessageId?: string, data?: any}>}
 */
export const sendWhatsAppMessage = async (instanceName, phoneNumber, message) => {
  if (!instanceName) {
    throw new Error('Instance name is required');
  }

  if (!phoneNumber) {
    throw new Error('Phone number is required');
  }

  if (!message) {
    throw new Error('Message text is required');
  }

  // Normalize phone number - remove any non-numeric characters except leading +
  const cleanNumber = phoneNumber
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@g\.us/gi, '')
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '');

  console.log(`[WhatsApp] Sending message via instance: ${instanceName}`);
  console.log(`[WhatsApp] To: ${cleanNumber}`);

  const url = `${baseUrl}message/sendText/${instanceName}`;
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
      console.error('[WhatsApp] Send failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const waMessageId = data?.messages?.[0]?.key?.id || data?.key?.id;

    console.log(`[WhatsApp] Message sent successfully! ID: ${waMessageId}`);

    return {
      success: true,
      waMessageId,
      data,
    };
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[WhatsApp] Send error:`, error.message);
    throw error;
  }
};

/**
 * Check if a WhatsApp instance is connected
 *
 * @param {string} instanceName - The Evolution API instance name
 * @returns {Promise<boolean>} - true if connected, false otherwise
 */
export const checkInstanceConnection = async instanceName => {
  if (!instanceName) {
    throw new Error('Instance name is required');
  }

  const url = `${baseUrl}instance/connectionState/${instanceName}`;
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
      console.error(`[WhatsApp] Connection check failed for ${instanceName}:`, data);
      return false;
    }

    const state = data?.instance?.state || data?.state || 'UNKNOWN';
    return state === 'open';
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[WhatsApp] Connection check error:`, error.message);
    return false;
  }
};

/**
 * Get instance connection status with details
 *
 * @param {string} instanceName - The Evolution API instance name
 * @returns {Promise<{connected: boolean, state: string, details?: any}>}
 */
export const getInstanceStatus = async instanceName => {
  if (!instanceName) {
    throw new Error('Instance name is required');
  }

  const url = `${baseUrl}instance/connectionState/${instanceName}`;
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
        details: data,
      };
    }

    const state = data?.instance?.state || data?.state || 'UNKNOWN';

    return {
      connected: state === 'open',
      state,
      details: data,
    };
  } catch (error) {
    clearTimeout(timeout);
    console.error(`[WhatsApp] Status check error:`, error.message);
    return {
      connected: false,
      state: 'ERROR',
      details: { error: error.message },
    };
  }
};

export default {
  sendWhatsAppMessage,
  checkInstanceConnection,
  getInstanceStatus,
};
