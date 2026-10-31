/**
 * WhatsApp Configuration
 *
 * Separate configuration for TWO Evolution API instances:
 * - CHAT instance: Used for regular WhatsApp messaging (leads, notifications)
 * - OTP instance: Used ONLY for forgot password and authentication OTP
 *
 * IMPORTANT: OTP messages MUST always use EVOLUTION_OTP_INSTANCE
 * NEVER use EVOLUTION_CHAT_INSTANCE for OTP
 */

const WHATSAPP_CONFIG = {
  // Chat/Regular messaging instance - DO NOT use for OTP
  chat: {
    instanceName: process.env.EVOLUTION_CHAT_INSTANCE,
    description: 'Used for regular WhatsApp messaging',
  },

  // OTP/Authentication instance - ONLY use this for forgot password OTP
  otp: {
    instanceName: process.env.EVOLUTION_OTP_INSTANCE || 'centralclaidsstance',
    description: 'Used ONLY for OTP and forgot password',
  },

  // Shared API configuration
  baseUrl: process.env.EVOLUTION_API_URL || 'https://tools-evolution-api.jurdfw.easypanel.host/',
  apiKey: process.env.EVOLUTION_API_KEY || '',

  // Default timeout for API requests (30 seconds)
  requestTimeout: 30000,
};

export default WHATSAPP_CONFIG;
