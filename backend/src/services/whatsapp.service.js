/**
 * WhatsApp Service - Evolution API v2 Integration
 *
 * Evolution API v2 - Multi-tenant WhatsApp API Platform
 * Docs: https://doc.evolution-api.com
 *
 * Setup:
 * 1. Create an instance in Evolution API dashboard
 * 2. Link WhatsApp via QR code
 * 3. Configure webhook to: https://your-crm.com/api/v1/whatsapp/webhook
 * 4. Set environment variables (EVOLUTION_API_URL, EVOLUTION_API_KEY)
 */

import prisma from '../config/prisma.js';
import { LeadStatus } from '@prisma/client';

// Trimmed: a stray space or newline in the host's env panel turns every
// request into a 401 (or a bad URL).
const EVOLUTION_API_URL = (
  process.env.EVOLUTION_API_URL?.trim() || 'https://evolution.webinvolve.cloud'
).replace(/\/+$/, '');
const EVOLUTION_API_KEY = (process.env.EVOLUTION_API_KEY || '').trim();
const WHATSAPP_INSTANCE_NAME = process.env.WHATSAPP_INSTANCE_NAME || '';

const getHeaders = () => ({
  apikey: EVOLUTION_API_KEY,
  'Content-Type': 'application/json',
});

/**
 * Get Evolution API instance name.
 * Uses fixed instance name from env, or generates from branchId if not set.
 */
export const getInstanceName = branchId => {
  if (WHATSAPP_INSTANCE_NAME) {
    return WHATSAPP_INSTANCE_NAME;
  }
  return `branch_${branchId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
};

/**
 * Make a request to the Evolution API v2
 */
const evolutionRequest = async (endpoint, options = {}) => {
  const url = `${EVOLUTION_API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', data);
      throw new Error(
        data.response?.message || data.message || `Evolution API error: ${response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error(`Evolution API request failed for ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Create an instance (called automatically when needed)
 */
export const createInstance = async instanceName => {
  try {
    const data = await evolutionRequest('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
      }),
    });
    return { success: true, data };
  } catch (error) {
    console.error('Create instance error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get instance connection state
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
    return {
      success: false,
      instanceName,
      state: 'ERROR',
      error: error.message,
    };
  }
};

/**
 * Send a text message to a WhatsApp number
 */
export const sendTextMessage = async (instanceName, to, message) => {
  try {
    const cleanNumber = to.replace(/\D/g, '');

    const payload = {
      number: cleanNumber,
      text: message,
    };

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
 * Send a template message (for WhatsApp Business)
 */
export const sendTemplateMessage = async (instanceName, to, templateName, components = []) => {
  try {
    const cleanNumber = to.replace(/\D/g, '');

    const payload = {
      number: cleanNumber,
      template: {
        name: templateName,
        language: {
          code: 'en',
        },
        components: components.map(c => ({
          type: c.type || 'body',
          parameters: c.parameters || [],
        })),
      },
    };

    const data = await evolutionRequest(`/message/sendTemplateMessage/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      waMessageId: data?.messages?.[0]?.key?.id,
      data,
    };
  } catch (error) {
    console.error('Send template message error:', error);
    throw error;
  }
};

/**
 * Send a document/file to a WhatsApp number
 */
export const sendDocument = async (
  instanceName,
  to,
  documentUrl,
  caption = '',
  filename = 'document.pdf'
) => {
  try {
    const cleanNumber = to.replace(/\D/g, '');

    const payload = {
      number: cleanNumber,
      mediaUrl: documentUrl,
      caption: caption,
      fileName: filename,
      mimetype: 'application/pdf',
    };

    const data = await evolutionRequest(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      waMessageId: data?.messages?.[0]?.key?.id,
      data,
    };
  } catch (error) {
    console.error('Send document error:', error);
    throw error;
  }
};

/**
 * Download media from a WhatsApp message
 */
export const downloadMedia = async (instanceName, mediaKey) => {
  try {
    const data = await evolutionRequest(`/message/downloadMedia/${instanceName}/${mediaKey}`, {
      method: 'GET',
    });

    let buffer;

    if (data && typeof data === 'string') {
      buffer = Buffer.from(data, 'base64');
    } else if (data?.data) {
      buffer = Buffer.from(data.data, 'base64');
    } else if (data?.url) {
      // Download from URL first
      buffer = await downloadFileToBuffer(data.url);
    } else {
      throw new Error('No media data received from Evolution API');
    }

    // Upload to Cloudinary
    const { url } = await uploadToCloudinary(buffer, 'travel-crm/whatsapp');

    return {
      success: true,
      mediaUrl: url,
      mimeType: 'image/jpeg',
    };
  } catch (error) {
    console.error('Download media error:', error);
    throw error;
  }
};

const downloadFileToBuffer = url => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    let redirectCount = 0;
    const maxRedirects = 5;

    const fetchUrl = currentUrl => {
      if (redirectCount >= maxRedirects) {
        return reject(new Error('Too many redirects'));
      }

      protocol
        .get(currentUrl, response => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            redirectCount++;
            const location = response.headers.location;
            if (location) {
              return fetchUrl(location);
            }
            reject(new Error('Redirect without location'));
            return;
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode}`));
            return;
          }

          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
          response.on('error', reject);
        })
        .on('error', reject);
    };

    fetchUrl(url);
  });
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = async (instanceName, messageKey) => {
  try {
    const data = await evolutionRequest(`/message/markAsRead/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ key: messageKey }),
    });
    return data;
  } catch (error) {
    console.error('Mark message as read error:', error);
    return false;
  }
};

/**
 * Process incoming webhook from Evolution API v2
 *
 * Webhook payload structure:
 * {
 *   "event": "messages.upsert",
 *   "instance": "branch_xxx",
 *   "data": { ... }
 * }
 */
export const processIncomingWebhook = async payload => {
  try {
    const event = payload.event;

    // Only process incoming messages
    if (event !== 'messages.upsert') {
      return { processed: false, event };
    }

    const data = payload.data;
    if (!data) {
      return { processed: false };
    }

    const messageKey = data.key;
    const messageContent = data.message;

    if (!messageKey || !messageContent) {
      return { processed: false };
    }

    // Extract sender phone number
    const from = messageKey.remoteJid?.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const messageId = messageKey.id;
    const instanceName = payload.instance;

    if (!from || !instanceName) {
      return { processed: false };
    }

    // Find branch by WhatsApp number
    const branch = await prisma.branch.findFirst({
      where: { whatsappNumber: from },
    });

    if (!branch) {
      console.warn(`No branch found for number: ${from}`);
      return { processed: false, error: 'Branch not found' };
    }

    // Determine message type and content
    let messageType = 'TEXT';
    let content = null;
    let mediaKey = null;

    if (messageContent.conversation) {
      content = messageContent.conversation;
    } else if (messageContent.extendedTextMessage) {
      content = messageContent.extendedTextMessage.text;
    } else if (messageContent.imageMessage) {
      content = messageContent.imageMessage.caption || '[Image]';
      messageType = 'IMAGE';
      mediaKey = messageContent.imageMessage.mediaKey;
    } else if (messageContent.documentMessage) {
      content = messageContent.documentMessage.fileName || '[Document]';
      messageType = 'DOCUMENT';
      mediaKey = messageContent.documentMessage.mediaKey;
    } else if (messageContent.audioMessage) {
      content = '[Audio]';
      messageType = 'AUDIO';
    } else if (messageContent.videoMessage) {
      content = messageContent.videoMessage.caption || '[Video]';
      messageType = 'VIDEO';
      mediaKey = messageContent.videoMessage.mediaKey;
    } else if (messageContent.stickerMessage) {
      content = '[Sticker]';
      messageType = 'STICKER';
    } else {
      const textContent = messageContent?.conversation || messageContent?.extendedTextMessage?.text;
      content = textContent || '[Unsupported message type]';
    }

    const timestamp = messageKey.timestamp
      ? new Date(parseInt(messageKey.timestamp) * 1000)
      : new Date();

    // Download media if present
    let mediaPath = null;
    if (mediaKey) {
      try {
        const mediaResult = await downloadMedia(instanceName, mediaKey);
        mediaPath = mediaResult.mediaPath;
      } catch (err) {
        console.error('Failed to download media:', err);
      }
    }

    // Find or create lead
    let lead = await prisma.lead.findFirst({
      where: {
        phone: from,
        branchId: branch.id,
        deletedAt: null,
      },
    });

    if (!lead) {
      const contactName = data.pushName || `WhatsApp Lead (${from})`;

      lead = await prisma.lead.create({
        data: {
          name: contactName,
          phone: from,
          source: 'WHATSAPP',
          status: LeadStatus.FRESH,
          branchId: branch.id,
        },
      });

      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: await getFirstManagerOrAdmin(branch.id),
          type: 'STATUS_CHANGE',
          description: 'Lead created from WhatsApp message',
        },
      });
    }

    // Create message record
    await prisma.whatsappMessage.create({
      data: {
        branchId: branch.id,
        leadId: lead.id,
        userId: lead.assignedTo,
        remoteJid: messageKey?.remote || from,
        contactNumber: from,
        contactName: data.pushName || null,
        direction: 'INBOUND',
        messageType: messageType,
        textContent: content,
        mediaUrl: mediaPath,
        waMessageId: messageId,
        sentAt: timestamp,
      },
    });

    // Log as lead activity
    if (messageType === 'TEXT' && content) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: lead.assignedTo || (await getFirstManagerOrAdmin(branch.id)),
          type: 'WHATSAPP',
          description: `Incoming WhatsApp: ${content}`,
        },
      });
    }

    return {
      processed: true,
      leadId: lead.id,
      messageId,
      messageType,
    };
  } catch (error) {
    console.error('Process incoming webhook error:', error);
    throw error;
  }
};

/**
 * Get the first available admin for a branch
 */
const getFirstManagerOrAdmin = async _branchId => {
  const admin = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
      isActive: true,
    },
  });
  return admin?.id || null;
};

/**
 * Send an outbound message via WhatsApp
 * Only ADMIN role can send WhatsApp messages
 */
export const sendOutboundMessage = async (
  branchId,
  to,
  message,
  type = 'text',
  templateName = null,
  documentUrl = null,
  caption = null
) => {
  const instanceName = getInstanceName(branchId);

  try {
    let result;

    if (type === 'template' && templateName) {
      result = await sendTemplateMessage(instanceName, to, templateName);
    } else if (type === 'document' && documentUrl) {
      result = await sendDocument(
        instanceName,
        to,
        documentUrl,
        caption || message,
        'document.pdf'
      );
    } else {
      result = await sendTextMessage(instanceName, to, message);
    }

    return result;
  } catch (error) {
    console.error('Send outbound message error:', error);
    throw error;
  }
};

/**
 * Connect WhatsApp instance via QR code
 * Returns QR code data for the user to scan
 */
export const connectInstance = async instanceName => {
  try {
    // Check if instance already exists and is connected
    const status = await getInstanceStatus(instanceName);

    if (status.success && status.state === 'open') {
      return {
        success: true,
        qrCode: null,
        pairingCode: null,
        message: 'Instance already connected',
        alreadyConnected: true,
      };
    }

    // Instance exists but disconnected - request new connection
    const data = await evolutionRequest(`/instance/connect/${instanceName}`, {
      method: 'GET',
    });

    return {
      success: true,
      qrCode: data?.code || data?.qrcode,
      pairingCode: data?.pairingCode,
      data,
    };
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
    const data = await evolutionRequest(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });

    return { success: true, data };
  } catch (error) {
    console.error('Disconnect instance error:', error);
    throw error;
  }
};
