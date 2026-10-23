/**
 * WhatsApp Webhooks - Per-user instance webhook handler
 *
 * This route handles incoming webhooks from Evolution API for user-specific instances.
 * Webhooks notify us of connection status changes and QR code updates.
 *
 * IMPORTANT: This handles USER instances only.
 * The central instance (OTP/2FA) is handled separately.
 */

import { Router } from 'express';
import prisma from '../config/prisma.js';

const router = Router();

/**
 * Process webhook from Evolution API for a specific user
 * POST /api/v1/whatsapp/webhooks/:userId
 *
 * No auth required - Evolution API sends webhooks to this endpoint
 */
router.post('/whatsapp/:userId', async (req, res) => {
  const { userId } = req.params;
  const { event, instance, data } = req.body;

  // Always return 200 to acknowledge receipt
  res.status(200).send('OK');

  // Process asynchronously - don't block the response
  try {
    await processWebhook(userId, event, instance, data);
  } catch (error) {
    console.error(`Webhook processing error for user ${userId}:`, error.message);
  }
});

/**
 * Process webhook data
 */
const processWebhook = async (userId, event, instanceName, data) => {
  if (!instanceName) {
    console.log('Webhook: No instance name in payload');
    return;
  }

  console.log(`=== User WhatsApp Webhook ===`);
  console.log(`User: ${userId}`);
  console.log(`Event: ${event}`);
  console.log(`Instance: ${instanceName}`);
  console.log(`===========================`);

  // Normalize event name
  const normalizedEvent = (event || '').toLowerCase().replace(/_/g, '.');

  if (normalizedEvent.includes('connection')) {
    await handleConnectionUpdate(instanceName, data);
  } else if (normalizedEvent.includes('qrcode')) {
    await handleQRCodeUpdate(instanceName, data);
  }
};

/**
 * Handle connection status update
 */
const handleConnectionUpdate = async (instanceName, data) => {
  let state = null;
  let user = null;

  // Handle different payload formats from Evolution API
  if (data) {
    if (data.state) {
      state = data.state;
      user = data.user;
    } else if (data.instance?.state) {
      state = data.instance.state;
      user = data.instance.user;
    }
  }

  if (!state) {
    console.warn('Connection update: No state found in payload');
    return;
  }

  console.log(`Connection update: ${instanceName} -> ${state}`);

  // Find user by instance name
  const userRecord = await prisma.user.findFirst({
    where: { evolutionInstanceName: instanceName },
  });

  if (!userRecord) {
    console.warn(`No user found for instance: ${instanceName}`);
    return;
  }

  const isConnected = state === 'open';

  // Clean up the phone number if provided
  let phoneNumber = null;
  if (isConnected && user) {
    phoneNumber = String(user)
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace(/[^0-9+]/g, '');
  }

  // Map Evolution API state to our status
  const mappedState = isConnected ? 'connected' : 'disconnected';

  // Update user WhatsApp connection status
  await prisma.user.update({
    where: { id: userRecord.id },
    data: {
      evolutionStatus: mappedState,
      evolutionPhoneNumber: phoneNumber,
      evolutionQrCode: null, // Clear QR code after connection
    },
  });

  console.log(
    `User WhatsApp ${isConnected ? 'connected' : 'disconnected'}: ${userRecord.email}${phoneNumber ? ` (${phoneNumber})` : ''}`
  );
};

/**
 * Handle QR code update
 */
const handleQRCodeUpdate = async (instanceName, data) => {
  if (!instanceName) return;

  // Find user by instance name
  const userRecord = await prisma.user.findFirst({
    where: { evolutionInstanceName: instanceName },
  });

  if (!userRecord) {
    console.log(`QR update: No user found for instance ${instanceName}`);
    return;
  }

  // Extract QR code from payload - handle different formats
  let qrCode = null;

  if (data?.qrcode) {
    qrCode = data.qrcode;
  } else if (data?.code) {
    qrCode = Array.isArray(data.code) ? data.code.join(',') : data.code;
  } else if (data?.base64) {
    qrCode = data.base64;
  }

  // Store QR code in user record
  if (qrCode) {
    await prisma.user.update({
      where: { id: userRecord.id },
      data: {
        evolutionQrCode: qrCode,
      },
    });
    console.log(`QR code updated for user: ${userRecord.email}`);
  }
};

export default router;
