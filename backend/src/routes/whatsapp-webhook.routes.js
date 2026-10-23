/**
 * WhatsApp webhooks — mounted separately so they sit BEFORE any
 * auth/rate-limit middleware. Evolution API cannot send a Bearer token,
 * so these endpoints must always be reachable.
 *
 * - POST /api/v1/whatsapp/user-webhook  →  per-user instances
 * - POST /api/v1/whatsapp/webhook       →  branch-level instances
 */

import { Router } from 'express';
import { processIncomingWebhook } from '../services/evolution-api.service.js';

const router = Router();

const processUserWebhook = async (instanceName, event, data) => {
  if (!instanceName) {
    console.log('User webhook: No instance name in payload');
    return;
  }

  console.log(`=== User WhatsApp Webhook ===`);
  console.log(`Event: ${event}`);
  console.log(`Instance: ${instanceName}`);
  console.log(`===========================`);

  const normalizedEvent = (event || '').toLowerCase().replace(/_/g, '.');

  if (normalizedEvent.includes('connection')) {
    // Connection updates for per-user instances are handled elsewhere
    // (user-whatsapp.controller). Acknowledge and move on.
    return;
  } else if (normalizedEvent.includes('qrcode')) {
    return;
  } else if (
    (normalizedEvent.includes('message') && normalizedEvent.includes('upsert')) ||
    (normalizedEvent.includes('message') && normalizedEvent.includes('update'))
  ) {
    // MESSAGES_UPSERT (inbound + outbound echo) and MESSAGES_UPDATE
    // (delivered/read status) feed the same handler the branch-level
    // webhook uses, so the message is persisted, SSE fires, and the
    // dashboard updates without a refresh.
    await processIncomingWebhook({ event, instance: instanceName, data });
  }
};

// Per-user instance webhook. Always returns 200 quickly; processing is
// awaited but the response is already sent.
router.post('/user-webhook', async (req, res) => {
  const { event, instance, data } = req.body;
  res.status(200).send('OK');
  try {
    await processUserWebhook(instance, event, data);
  } catch (error) {
    console.error(`Webhook processing error:`, error);
  }
});

export default router;
