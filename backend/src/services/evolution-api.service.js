import prisma from '../config/prisma.js';
import { publish as publishRealtime } from './realtime.service.js';
/**
 * Evolution API Service - Comprehensive WhatsApp Integration
 *
 * Handles all communication with Evolution API v2 for multi-branch WhatsApp support.
 * Each branch can have its own WhatsApp instance connected via Evolution API.
 */

// Evolution API Configuration
// Trimmed: a stray space or newline pasted into the host's env panel turns
// every request into a 401 (or a bad URL) with nothing else to show for it.
const EVOLUTION_API_URL = (
  process.env.EVOLUTION_API_URL?.trim() || 'https://evolution.webinvolve.cloud'
).replace(/\/+$/, '');
const EVOLUTION_API_KEY = (process.env.EVOLUTION_API_KEY || '').trim();
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || '';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const getHeaders = () => ({
  apikey: EVOLUTION_API_KEY,
  'Content-Type': 'application/json',
});

/**
 * Make a request to Evolution API with timeout and error handling
 */
const evolutionRequest = async (endpoint, options = {}) => {
  const url = `${EVOLUTION_API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
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
      console.error('Evolution API error:', data);
      const errorMessage =
        data?.response?.message || data?.message || `Evolution API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);
    // 401/403 means API key issue — instance may already exist, or API has no permission to manage instances
    if (
      error.message.includes('401') ||
      error.message.includes('403') ||
      error.message.includes('Unauthorized')
    ) {
      console.log(
        `Evolution API error on ${endpoint}: may already exist or no permission:`,
        error.message
      );
      return { success: false, error: error.message, alreadyExists: true };
    }
    // Instance might already exist, which is fine
    if (error.message.includes('404') || error.message.includes('not found')) {
      console.log(`Evolution API error on ${endpoint}: not found:`, error.message);
      return { success: false, error: error.message, alreadyExists: false };
    }
    console.error(`Evolution API request failed for ${endpoint}:`, error.message);
    throw error;
  }
};

/**
 * Normalize phone number (remove WhatsApp domain and special characters)
 */
const normalizePhoneNumber = phone => {
  if (!phone) return '';
  return phone
    .replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@g\.us/gi, '')
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '');
};

/**
 * Get branch instance name (e.g., "azees-srinagar")
 */
export const getInstanceName = (branchId, branchSlug = '') => {
  if (branchSlug) {
    return `azees-${branchSlug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }
  return `branch_${branchId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
};

/**
 * Get first admin/manager user for a branch (for audit trails)
 */
const getFirstAdminUser = async _branchId => {
  const admin = await prisma.user.findFirst({
    where: {
      role: { in: ['ADMIN', 'MANAGER'] },
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return admin?.id || null;
};

// ============================================================
// INSTANCE MANAGEMENT
// ============================================================

/**
 * Create a new Evolution API instance for a branch
 */
export const createInstance = async instanceName => {
  try {
    const webhookUrl = WEBHOOK_BASE_URL
      ? `${WEBHOOK_BASE_URL.replace(/\/$/, '')}/api/v1/whatsapp/webhook`
      : null;

    const data = await evolutionRequest('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhook: webhookUrl
          ? {
              url: webhookUrl,
              events: [
                'MESSAGES_UPSERT',
                'CONNECTION_UPDATE',
                'MESSAGES_UPDATE',
                'MESSAGES_DELETE',
                'QRCODE_UPDATED',
              ],
            }
          : undefined,
      }),
    });
    return { success: true, data };
  } catch (error) {
    // Instance might already exist, which is fine
    console.log(`Instance ${instanceName} may already exist:`, error.message);
    return { success: false, error: error.message, alreadyExists: true };
  }
};

/**
 * Check instance connection status
 */
export const getInstanceStatus = async instanceName => {
  try {
    const data = await evolutionRequest(`/instance/connectionState/${instanceName}`, {
      method: 'GET',
    });

    return {
      success: true,
      instanceName,
      state: data?.instance?.state || data?.state || 'UNKNOWN',
      data,
    };
  } catch (error) {
    // Instance doesn't exist or other error
    if (error.message.includes('404') || error.message.includes('not found')) {
      return {
        success: false,
        instanceName,
        state: 'NOT_FOUND',
        error: 'Instance does not exist',
      };
    }
    return {
      success: false,
      instanceName,
      state: 'ERROR',
      error: error.message,
    };
  }
};

/**
 * Get QR code for connecting WhatsApp
 */
export const getQRCode = async instanceName => {
  try {
    // First check if already connected
    const status = await getInstanceStatus(instanceName);
    if (status.state === 'open') {
      return {
        success: true,
        qrCode: null,
        pairingCode: null,
        message: 'Already connected',
        alreadyConnected: true,
      };
    }

    // Request connection (returns QR code)
    const data = await evolutionRequest(`/instance/connect/${instanceName}`, {
      method: 'GET',
    });

    // Handle different QR code formats from Evolution API v2
    let qrCode = null;
    if (data?.base64) {
      // If base64 image is available, use it directly
      qrCode = data.base64;
    } else if (data?.code) {
      // If code is an array, join with comma
      qrCode = Array.isArray(data.code) ? data.code.join(',') : data.code;
    } else if (data?.qrcode) {
      qrCode = data.qrcode;
    }

    return {
      success: true,
      qrCode,
      pairingCode: data?.pairingCode,
      data,
    };
  } catch (error) {
    console.error('Get QR code error:', error);
    throw error;
  }
};

/**
 * Disconnect WhatsApp instance
 */
export const logoutInstance = async instanceName => {
  try {
    const data = await evolutionRequest(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });
    return { success: true, data };
  } catch (error) {
    console.error('Logout instance error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete WhatsApp instance completely
 */
export const deleteInstance = async instanceName => {
  try {
    const data = await evolutionRequest(`/instance/delete/${instanceName}`, {
      method: 'DELETE',
    });
    return { success: true, data };
  } catch (error) {
    console.error('Delete instance error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Restart WhatsApp instance connection
 */
export const restartInstance = async instanceName => {
  try {
    const data = await evolutionRequest(`/instance/restart/${instanceName}`, {
      method: 'PUT',
    });
    return { success: true, data };
  } catch (error) {
    console.error('Restart instance error:', error);
    return { success: false, error: error.message };
  }
};

// ============================================================
// MESSAGING
// ============================================================

/**
 * Send a text message to a WhatsApp number
 */
export const sendTextMessage = async (instanceName, to, text, quotedMessageId = null) => {
  try {
    const cleanNumber = normalizePhoneNumber(to);
    if (!cleanNumber) throw new Error('Invalid phone number');

    const payload = {
      number: cleanNumber,
      text: text,
    };

    // Add quoted message if provided
    if (quotedMessageId) {
      payload.quoted = { key: { id: quotedMessageId } };
    }

    const data = await evolutionRequest(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      waMessageId: data?.messages?.[0]?.key?.id || data?.key?.id,
      data,
    };
  } catch (error) {
    console.error('Send text message error:', error);
    throw error;
  }
};

/**
 * Send media (image, video, audio) to WhatsApp
 */
export const sendMediaMessage = async (
  instanceName,
  to,
  mediaUrl,
  caption = '',
  mediaType = 'image'
) => {
  try {
    const cleanNumber = normalizePhoneNumber(to);
    if (!cleanNumber) throw new Error('Invalid phone number');

    const payload = {
      number: cleanNumber,
      mediatype: mediaType,
      media: mediaUrl,
      caption: caption,
    };

    const data = await evolutionRequest(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      waMessageId: data?.messages?.[0]?.key?.id || data?.key?.id,
      data,
    };
  } catch (error) {
    console.error('Send media message error:', error);
    throw error;
  }
};

/**
 * Send document to WhatsApp
 */
export const sendDocument = async (instanceName, to, documentUrl, fileName, caption = '') => {
  try {
    const cleanNumber = normalizePhoneNumber(to);
    if (!cleanNumber) throw new Error('Invalid phone number');

    // Handle base64 data URL - strip the prefix if present
    let mediaValue = documentUrl;
    if (documentUrl.startsWith('data:')) {
      // Extract base64 part from data URL (e.g., "data:application/pdf;base64,...")
      const parts = documentUrl.split(',');
      if (parts.length > 1) {
        mediaValue = parts[1];
      }
    }

    const payload = {
      number: cleanNumber,
      mediatype: 'document',
      media: mediaValue,
      fileName: fileName,
      caption: caption,
    };

    const data = await evolutionRequest(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      waMessageId: data?.messages?.[0]?.key?.id || data?.key?.id,
      data,
    };
  } catch (error) {
    console.error('Send document error:', error);
    throw error;
  }
};

/**
 * Send a template message (as text)
 */
export const sendTemplateMessage = async (instanceName, to, templateText) => {
  // Templates are sent as regular text messages
  return sendTextMessage(instanceName, to, templateText);
};

// ============================================================
// MEDIA HANDLING
// ============================================================

/**
 * Download media from a WhatsApp message
 */
export const downloadMedia = async (instanceName, messageId) => {
  try {
    const data = await evolutionRequest(`/message/downloadMedia/${instanceName}/${messageId}`, {
      method: 'GET',
    });

    let buffer = null;
    if (data && typeof data === 'string') {
      buffer = Buffer.from(data, 'base64');
    } else if (data?.data) {
      buffer = Buffer.from(data.data, 'base64');
    } else if (data?.base64) {
      buffer = Buffer.from(data.base64, 'base64');
    } else {
      throw new Error('No media data received from Evolution API');
    }

    // Upload directly to Cloudinary
    const { url: mediaUrl } = await uploadToCloudinary(buffer, 'travel-crm/whatsapp');

    return {
      success: true,
      mediaUrl: mediaUrl,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.error('Download media error:', error);
    throw error;
  }
};

/**
 * Get contact's WhatsApp profile picture
 */
export const getProfilePicture = async (instanceName, remoteJid) => {
  try {
    const cleanJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;

    const data = await evolutionRequest(`/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number: cleanJid }),
    });

    return {
      success: true,
      profilePicUrl: data?.url || null,
      data,
    };
  } catch (error) {
    console.error('Get profile picture error:', error);
    return { success: false, profilePicUrl: null };
  }
};

// ============================================================
// WEBHOOK PROCESSING
// ============================================================

/**
 * Process incoming webhook from Evolution API
 */
export const processIncomingWebhook = async payload => {
  try {
    const event = payload.event;

    console.log(`=== WhatsApp Webhook ===`);
    console.log(`Event: ${event}`);
    console.log(`Instance: ${payload.instance}`);
    console.log(`Data: ${JSON.stringify(payload.data || payload).substring(0, 500)}`);
    console.log(`========================`);

    // Handle different event name formats (Evolution API v1 vs v2)
    const normalizedEvent = (event || '').toLowerCase().replace(/_/g, '.');

    if (normalizedEvent.includes('connection')) {
      return await handleConnectionUpdate(payload);
    } else if (normalizedEvent.includes('message') && normalizedEvent.includes('upsert')) {
      return await handleMessagesUpsert(payload);
    } else if (normalizedEvent.includes('message') && normalizedEvent.includes('delete')) {
      return await handleMessagesDelete(payload);
    } else if (normalizedEvent.includes('message') && normalizedEvent.includes('update')) {
      return await handleMessagesUpdate(payload);
    } else if (normalizedEvent.includes('qrcode')) {
      console.log(`QR code updated event received`);
      return { processed: true, event, skipped: 'qrcode_update' };
    } else {
      console.log(`Unhandled webhook event: ${event}`);
      return { processed: true, event, skipped: true };
    }
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Don't throw - we don't want to retry webhooks and lose messages
    // Log the error and return gracefully
    return { processed: false, error: error.message };
  }
};

/**
 * Handle new message received (MESSAGES_UPSERT)
 */
const handleMessagesUpsert = async payload => {
  // Evolution API v1 and v2 send data differently
  let data = payload.data || payload;

  // Handle array format (some versions send messages as array)
  if (Array.isArray(data)) {
    data = data[0];
  }

  if (!data || !data.key) {
    return { processed: false, error: 'Invalid message data' };
  }

  const messageKey = data.key;
  if (!messageKey) return { processed: false, error: 'No message key' };

  // Skip group messages
  const remoteJid = messageKey.remoteJid || '';
  if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
    console.log('Skipping group/status message');
    return { processed: true, skipped: 'group_or_status' };
  }

  // "Delete for everyone" arrives as its own message pointing at the original.
  // It is not a message to store — it removes the one it points at.
  const protocolMessage = (data.message || data.msg || {}).protocolMessage;
  if (protocolMessage && (protocolMessage.type === 'REVOKE' || protocolMessage.type === 0)) {
    return await deleteRevokedMessage(protocolMessage.key?.id);
  }

  // Extract message info
  const fromMe = messageKey.fromMe || false;
  const waMessageId = messageKey.id;
  const pushName = data.pushName || data.sender?.pushName || null;

  // Skip if already processed (idempotency)
  const existingMessage = await prisma.whatsAppMessage.findUnique({
    where: { waMessageId },
  });
  if (existingMessage) {
    console.log(`Message ${waMessageId} already processed, skipping`);
    return { processed: true, skipped: 'duplicate' };
  }

  // Find branch/user by instance name
  const instanceName = payload.instance;

  // First check for user-specific instance
  const userWithInstance = await prisma.user.findFirst({
    where: { evolutionInstanceName: instanceName },
  });

  let branchId;
  let userId = null;

  if (userWithInstance) {
    // This is a user-specific instance
    branchId = userWithInstance.branchId;
    userId = userWithInstance.id;
    console.log(
      `[Webhook] Processing message for user-specific instance: ${userWithInstance.name} (userId: ${userId})`
    );
  } else {
    // Fall back to branch instance
    const branch = await prisma.branch.findFirst({
      where: { whatsappInstanceName: instanceName },
    });

    if (!branch) {
      console.warn(`[Webhook] No branch found for instance: ${instanceName}`);
      return { processed: false, error: 'Branch not found' };
    }
    branchId = branch.id;
    console.log(
      `[Webhook] Processing message for branch instance: ${branch.name} (branchId: ${branchId}, userId: null)`
    );
  }

  // Parse message content - handle different Evolution API versions
  const messageContent = data.message || data.msg || {};
  let messageType = 'TEXT';
  let textContent;
  let caption = null;
  let mediaKey = null;
  let fileName = null;

  // Text message
  if (messageContent.conversation) {
    textContent = messageContent.conversation;
  } else if (messageContent.extendedTextMessage) {
    textContent = messageContent.extendedTextMessage.text;
    // Handle quoted message
    if (messageContent.extendedTextMessage.contextInfo?.quotedMessage) {
      // Quoted message is available but we can store the ID
    }
  } else if (messageContent.imageMessage) {
    messageType = 'IMAGE';
    textContent = messageContent.imageMessage.caption || '[Image]';
    caption = messageContent.imageMessage.caption;
    mediaKey = messageContent.imageMessage.mediaKey;
  } else if (messageContent.documentMessage) {
    messageType = 'DOCUMENT';
    textContent = messageContent.documentMessage.fileName || '[Document]';
    caption = messageContent.documentMessage.caption;
    fileName = messageContent.documentMessage.fileName;
    mediaKey = messageContent.documentMessage.mediaKey;
  } else if (messageContent.audioMessage) {
    messageType = 'AUDIO';
    textContent = '[Audio]';
    mediaKey = messageContent.audioMessage.mediaKey;
  } else if (messageContent.videoMessage) {
    messageType = 'VIDEO';
    textContent = messageContent.videoMessage.caption || '[Video]';
    caption = messageContent.videoMessage.caption;
    mediaKey = messageContent.videoMessage.mediaKey;
  } else if (messageContent.stickerMessage) {
    messageType = 'STICKER';
    textContent = '[Sticker]';
  } else if (messageContent.contactMessage) {
    messageType = 'CONTACT';
    textContent = messageContent.contactMessage.displayName || 'Contact shared';
  } else if (messageContent.locationMessage) {
    messageType = 'LOCATION';
    textContent = '[Location]';
  } else if (messageContent.reactionMessage) {
    messageType = 'REACTION';
    textContent = messageContent.reactionMessage.text || '[Reaction]';
  } else {
    // Try to extract any text content
    textContent = messageContent.text || messageContent.caption || '[Unsupported message type]';
  }

  // Extract clean phone number
  const contactNumber = normalizePhoneNumber(remoteJid);
  if (!contactNumber) {
    console.warn('No valid contact number found');
    return { processed: false, error: 'No valid contact number' };
  }

  // Determine direction
  const direction = fromMe ? 'OUTBOUND' : 'INBOUND';

  // Download media if present
  let mediaUrl = null;
  let mediaMimeType = null;
  if (mediaKey && !fromMe) {
    try {
      const mediaResult = await downloadMedia(instanceName, mediaKey);
      mediaUrl = mediaResult.mediaUrl;
      mediaMimeType = mediaResult.mimeType;
    } catch (err) {
      console.error('Failed to download media:', err);
    }
  }

  // Find or create WhatsApp contact (use userId for user-specific instances)
  let contact;

  if (userId) {
    // User-specific instance: use userId + remoteJid
    contact = await prisma.whatsAppContact.findFirst({
      where: { userId, remoteJid },
    });
  } else {
    // Branch instance: use branchId + remoteJid
    contact = await prisma.whatsAppContact.findFirst({
      where: { branchId, remoteJid },
    });
  }

  if (!contact) {
    contact = await prisma.whatsAppContact.create({
      data: {
        userId: userId || undefined,
        branchId: branchId,
        remoteJid: remoteJid,
        contactNumber: contactNumber,
        contactName: pushName !== 'Unknown' ? pushName : null,
        isActive: true,
      },
    });
  } else {
    // Update contact name if we got a new pushName
    if (pushName && pushName !== 'Unknown' && contact.contactName !== pushName) {
      contact = await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { contactName: pushName },
      });
    }
  }

  // Find or create lead
  let lead = null;
  if (contact.leadId) {
    lead = await prisma.lead.findUnique({ where: { id: contact.leadId } });
  }

  if (!lead) {
    // Try to find existing lead by phone number in this branch
    // Use last 10 digits for matching
    const phoneMatch = contactNumber.slice(-10);
    lead = await prisma.lead.findFirst({
      where: {
        phone: { endsWith: phoneMatch },
        branchId: branchId,
        deletedAt: null,
      },
    });
  }

  if (!lead && direction === 'INBOUND') {
    // Create new lead from WhatsApp contact
    const adminUserId = await getFirstAdminUser(branchId);
    lead = await prisma.lead.create({
      data: {
        name: pushName !== 'Unknown' ? pushName : `WhatsApp Lead (${contactNumber})`,
        phone: contactNumber,
        source: 'WHATSAPP',
        status: 'FRESH',
        branchId: branchId,
        createdBy: adminUserId,
      },
    });

    // Link contact to new lead
    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: { leadId: lead.id },
    });

    // Log activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: adminUserId,
        type: 'STATUS_CHANGE',
        description: 'Lead auto-created from WhatsApp message',
      },
    });
  } else if (lead && !contact.leadId) {
    // Link existing lead to contact
    // Check if lead is already linked to another contact (unique constraint on leadId)
    const existingContactWithLead = await prisma.whatsAppContact.findFirst({
      where: { leadId: lead.id, id: { not: contact.id } },
    });
    if (!existingContactWithLead) {
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { leadId: lead.id },
      });
    } else {
      console.log(`[Webhook] Lead ${lead.id} already linked to another contact, skipping link`);
    }
  }

  // Parse timestamp
  const timestamp = messageKey.timestamp
    ? new Date(parseInt(messageKey.timestamp) * 1000)
    : new Date();

  // Extract quoted message ID
  let quotedMessageId = null;
  if (messageContent.extendedTextMessage?.contextInfo?.quotedMessage?.key?.id) {
    quotedMessageId = messageContent.extendedTextMessage.contextInfo.quotedMessage.key.id;
  }

  // Create message record
  const whatsappMessage = await prisma.whatsAppMessage.create({
    data: {
      branchId: branchId,
      leadId: lead?.id || null,
      contactId: contact.id,
      userId: userId || (fromMe ? null : lead?.assignedTo || (await getFirstAdminUser(branchId))),
      remoteJid: remoteJid,
      contactName: pushName !== 'Unknown' ? pushName : null,
      contactNumber: contactNumber,
      direction: direction,
      messageType: messageType,
      textContent: textContent,
      caption: caption,
      mediaUrl: mediaUrl,
      mediaMimeType: mediaMimeType,
      fileName: fileName,
      waMessageId: waMessageId,
      quotedMessageId: quotedMessageId,
      isForwarded: messageContent.forwardingScore > 0 || false,
      status: direction === 'OUTBOUND' ? 'sent' : 'received',
      sentAt: timestamp,
    },
  });

  // Update contact's last message; a new message brings a deleted chat back.
  await prisma.whatsAppContact.update({
    where: { id: contact.id },
    data: {
      lastMessageAt: timestamp,
      lastMessagePreview: textContent?.substring(0, 100) || `[${messageType}]`,
      unreadCount: direction === 'INBOUND' ? { increment: 1 } : 0,
      isActive: true,
    },
  });

  // Log activity for inbound messages
  if (direction === 'INBOUND' && lead) {
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: userId || lead.assignedTo || (await getFirstAdminUser(branchId)),
        type: 'WHATSAPP',
        description: `WhatsApp: ${textContent?.substring(0, 100) || '[Media]'}`,
      },
    });
  }

  console.log(`Message ${waMessageId} processed: ${direction} from ${contactNumber}`);

  // Fan out a realtime event so connected clients update their inbox + chat
  // without waiting for the next polling cycle. Audience lets the SSE layer
  // skip events for users/branches that shouldn't see them.
  publishRealtime(
    'whatsapp:new_message',
    {
      contactId: contact.id,
      messageId: whatsappMessage.id,
      direction,
      branchId: branchId,
      leadId: lead?.id || null,
      contactName: whatsappMessage.contactName,
      contactNumber: whatsappMessage.contactNumber,
      textContent: whatsappMessage.textContent,
      messageType: whatsappMessage.messageType,
      mediaUrl: whatsappMessage.mediaUrl,
      sentAt: whatsappMessage.sentAt,
      status: whatsappMessage.status,
    },
    { branchId, userId }
  );

  return {
    processed: true,
    contactId: contact.id,
    leadId: lead?.id,
    messageId: whatsappMessage.id,
  };
};

/**
 * Handle connection status update (CONNECTION_UPDATE)
 */
const handleConnectionUpdate = async payload => {
  // Evolution API v1 and v2 send data differently
  let instanceName = payload.instance;
  let state = null;
  let user = null;

  // Handle different payload formats
  if (payload.data) {
    // Format: { instance: "name", data: { state: "open", user: "number" } }
    state = payload.data.state;
    user = payload.data.user;
  } else if (payload.state) {
    // Format: { instance: "name", state: "open" }
    state = payload.state;
    user = payload.user;
  } else if (payload.instance && typeof payload.instance === 'object') {
    // Format: { instance: { instanceName: "name", state: "open" } }
    const inst = payload.instance;
    instanceName = inst.instanceName || inst.instance?.instanceName || instanceName;
    state = inst.state || inst.instance?.state;
    user = inst.user || inst.instance?.user;
  }

  if (!instanceName) {
    console.warn(`No instance name in connection update payload`);
    return { processed: false, error: 'no instance name' };
  }

  console.log(`Connection update for instance ${instanceName}: state=${state}, user=${user}`);

  const isConnected = state === 'open';

  // Clean up the phone number if provided
  let phoneNumber = null;
  if (isConnected && user) {
    phoneNumber = user
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace(/[^0-9+]/g, '');
  }

  // First check for user-specific instance
  const userWithInstance = await prisma.user.findFirst({
    where: { evolutionInstanceName: instanceName },
  });

  if (userWithInstance) {
    // Update user-specific instance
    await prisma.user.update({
      where: { id: userWithInstance.id },
      data: {
        evolutionStatus: isConnected ? 'connected' : 'disconnected',
        evolutionPhoneNumber: phoneNumber,
      },
    });
    console.log(
      `WhatsApp ${isConnected ? 'connected' : 'disconnected'} for user: ${userWithInstance.name}${phoneNumber ? ` (${phoneNumber})` : ''}`
    );
    return {
      processed: true,
      userId: userWithInstance.id,
      connected: isConnected,
      state,
      phoneNumber,
    };
  }

  // Fall back to branch instance
  const branch = await prisma.branch.findFirst({
    where: { whatsappInstanceName: instanceName },
  });

  if (!branch) {
    console.warn(`No branch found for instance: ${instanceName}`);
    return { processed: false, error: 'branch not found' };
  }

  // Update branch WhatsApp connection status
  await prisma.branch.update({
    where: { id: branch.id },
    data: {
      whatsappConnected: isConnected,
      whatsappPhoneNumber: phoneNumber,
    },
  });

  console.log(
    `WhatsApp ${isConnected ? 'connected' : 'disconnected'} for branch: ${branch.name}${phoneNumber ? ` (${phoneNumber})` : ''}`
  );

  return {
    processed: true,
    branchId: branch.id,
    connected: isConnected,
    state,
    phoneNumber,
  };
};

/**
 * Remove a message the sender deleted for everyone in WhatsApp, so the CRM
 * does not keep text the other side has taken back. If it was the chat's
 * latest message, the inbox preview moves to the one before it.
 */
const deleteRevokedMessage = async waMessageId => {
  if (!waMessageId) return { processed: false, error: 'No message id to delete' };

  const stored = await prisma.whatsAppMessage.findUnique({
    where: { waMessageId },
    select: { id: true, contactId: true, branchId: true, userId: true },
  });
  if (!stored) return { processed: true, skipped: 'not_found', waMessageId };

  await prisma.whatsAppMessage.delete({ where: { id: stored.id } });

  if (stored.contactId) {
    const latest = await prisma.whatsAppMessage.findFirst({
      where: { contactId: stored.contactId },
      orderBy: { sentAt: 'desc' },
      select: { sentAt: true, textContent: true, messageType: true },
    });
    await prisma.whatsAppContact.update({
      where: { id: stored.contactId },
      data: {
        lastMessageAt: latest?.sentAt ?? null,
        lastMessagePreview: latest
          ? latest.textContent?.substring(0, 100) || `[${latest.messageType}]`
          : null,
      },
    });
  }

  console.log(`Message ${waMessageId} deleted for everyone — removed`);

  publishRealtime(
    'whatsapp:message_deleted',
    { messageId: stored.id, contactId: stored.contactId, waMessageId },
    { branchId: stored.branchId, userId: stored.userId }
  );

  return { processed: true, deleted: true, waMessageId };
};

/**
 * Handle a deleted message (MESSAGES_DELETE). Evolution sends the key either
 * wrapped (`data.key`) or flat (`data.id` / `data.keyId`), sometimes as a list.
 */
const handleMessagesDelete = async payload => {
  const items = Array.isArray(payload.data) ? payload.data : [payload.data || payload];
  const results = [];
  for (const item of items) {
    results.push(await deleteRevokedMessage(item?.key?.id || item?.keyId || item?.id));
  }
  return { processed: true, results };
};

/** Delivery status as WhatsApp reports it (numeric code or v2 name) -> ours. */
const STATUS_FROM_WEBHOOK = {
  2: 'sent',
  3: 'delivered',
  4: 'read',
  5: 'read',
  SERVER_ACK: 'sent',
  DELIVERY_ACK: 'delivered',
  READ: 'read',
  PLAYED: 'read',
};

/**
 * Handle message status updates (MESSAGES_UPDATE)
 */
const handleMessagesUpdate = async payload => {
  // Handle different data formats - could be array, object, or wrapped
  let updates = payload.data;
  if (!Array.isArray(updates)) {
    // If it's an object, check for array inside
    if (updates && typeof updates === 'object') {
      if (updates.updates && Array.isArray(updates.updates)) {
        updates = updates.updates;
      } else if (updates.list && Array.isArray(updates.list)) {
        updates = updates.list;
      } else {
        // Single update object - wrap in array
        updates = [updates];
      }
    } else {
      updates = [];
    }
  }

  const results = [];

  for (const update of updates) {
    // A revoke can also surface as a status flip to DELETED (Evolution v2's
    // flat shape), or as a REVOKE stub (messageStubType 1) on the older shape.
    const revokedId =
      update.status === 'DELETED'
        ? update.keyId || update.key?.id
        : update.update?.messageStubType === 1
          ? update.key?.id
          : null;
    if (revokedId) {
      results.push(await deleteRevokedMessage(revokedId));
      continue;
    }

    // Older payloads nest it: { key: { id }, update: { status: 3 } }.
    // Evolution v2 sends it flat: { keyId, status: 'DELIVERY_ACK' }.
    const waMessageId = update.key?.id || update.keyId;
    const rawStatus = update.update?.status ?? update.status;
    const status = STATUS_FROM_WEBHOOK[rawStatus];

    // Unknown or missing statuses are skipped rather than written as 'sent',
    // which would undo a tick the message already has.
    if (!waMessageId || !status) continue;

    try {
      const updated = await prisma.whatsAppMessage.updateMany({
        where: { waMessageId },
        data: { status },
      });

      results.push({
        waMessageId,
        status,
        updated: updated.count > 0,
      });

      if (updated.count > 0) {
        // Look up the contact + branch for proper audience scoping. We only
        // need to know the branch to deliver this event to the right people.
        const stored = await prisma.whatsAppMessage.findFirst({
          where: { waMessageId },
          select: {
            id: true,
            contactId: true,
            branchId: true,
            userId: true,
            contactNumber: true,
          },
        });
        if (stored) {
          publishRealtime(
            'whatsapp:status_update',
            {
              messageId: stored.id,
              contactId: stored.contactId,
              waMessageId,
              status,
            },
            { branchId: stored.branchId, userId: stored.userId }
          );
        }
      }
    } catch (error) {
      console.error('Failed to update message status:', error);
      results.push({
        waMessageId,
        error: error.message,
      });
    }
  }

  return { processed: true, results };
};

// ============================================================
// OUTBOUND MESSAGE WRAPPER
// ============================================================

/**
 * Send outbound message via WhatsApp
 * This is the main entry point for sending messages from the CRM
 */
export const sendOutboundMessage = async (
  instanceNameOrBranchId,
  to,
  message,
  type = 'text',
  options = {}
) => {
  // Determine if this is an instance name or branch ID
  let instanceName = instanceNameOrBranchId;

  // Check if it's a user instance first
  const userWithInstance = await prisma.user.findFirst({
    where: { evolutionInstanceName: instanceNameOrBranchId },
  });

  if (userWithInstance) {
    instanceName = userWithInstance.evolutionInstanceName;
  } else {
    // It's a branch ID or branch instance name
    const branch = await prisma.branch.findUnique({
      where: { id: instanceNameOrBranchId },
      select: { whatsappInstanceName: true, whatsappConnected: true },
    });

    if (branch) {
      instanceName = branch.whatsappInstanceName;
    }
  }

  if (!instanceName) {
    throw new Error('WhatsApp instance not found');
  }

  // Check connection status
  const status = await getInstanceStatus(instanceName);
  if (status.state !== 'open') {
    throw new Error(`WhatsApp not connected. Status: ${status.state}`);
  }

  // Send the message
  let result;
  const cleanNumber = normalizePhoneNumber(to);

  // If a media/document URL is present, force the correct dispatch even if
  // the caller passed type='text'. This protects us from clients that forget
  // to set the type when sending an attachment.
  const hasDocument = !!(options.documentUrl || (options.fileName && (options.mediaUrl || options.documentUrl)));
  const hasMedia = !!(options.mediaUrl && !hasDocument);
  const inferredType = hasDocument ? 'document' : hasMedia ? 'media' : type;

  switch (inferredType) {
    case 'media':
      result = await sendMediaMessage(
        instanceName,
        cleanNumber,
        options.mediaUrl,
        options.caption || message,
        options.mediaType || 'image'
      );
      break;
    case 'document':
      result = await sendDocument(
        instanceName,
        cleanNumber,
        options.documentUrl || options.mediaUrl,
        options.fileName || 'document.pdf',
        options.caption || message
      );
      break;
    case 'template':
      result = await sendTemplateMessage(instanceName, cleanNumber, message);
      break;
    default:
      result = await sendTextMessage(instanceName, cleanNumber, message, options.quotedMessageId);
  }

  return result;
};

// ============================================================
// QR CODE & INSTANCE CONNECT
// ============================================================

/**
 * Connect WhatsApp instance via QR code
 */
export const connectInstance = async instanceName => {
  try {
    // Check if instance already connected
    const status = await getInstanceStatus(instanceName);
    if (status.state === 'open') {
      return {
        success: true,
        qrCode: null,
        pairingCode: null,
        message: 'Instance already connected',
        alreadyConnected: true,
      };
    }

    // Get QR code
    const result = await getQRCode(instanceName);
    return result;
  } catch (error) {
    console.error('Connect instance error:', error);
    throw error;
  }
};

/**
 * Disconnect/logout WhatsApp instance
 */
export const disconnectInstance = async instanceName => {
  try {
    const data = await logoutInstance(instanceName);

    // Update branch status
    const branch = await prisma.branch.findFirst({
      where: { whatsappInstanceName: instanceName },
    });

    if (branch) {
      await prisma.branch.update({
        where: { id: branch.id },
        data: { whatsappConnected: false, whatsappPhoneNumber: null },
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error('Disconnect instance error:', error);
    return { success: false, error: error.message };
  }
};
