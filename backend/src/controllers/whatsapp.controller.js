import prisma from '../config/prisma.js';
import {
  createInstance,
  connectInstance,
  disconnectInstance,
  restartInstance,
  getInstanceStatus,
  sendOutboundMessage,
  processIncomingWebhook,
} from '../services/evolution-api.service.js';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';
import { extractPublicId, deleteMultipleFromCloudinary } from '../services/cloudinary.service.js';

export const verifyWebhook = (req, res) => {
  const token = req.query.webhookVerifyToken;
  const challenge = req.query.challenge;

  if (token === process.env.WHATSAPP_VERIFY_TOKEN) {
    // Webhook verified
    res.status(200).send(challenge || 'OK');
  } else {
    res.status(200).send('OK'); // Allow without token for Evolution API
  }
};

/**
 * Receive incoming webhook from Evolution API
 */
export const receiveWebhook = async (req, res) => {
  // Respond immediately
  res.status(200).send('OK');

  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Raw body:', JSON.stringify(req.body).substring(0, 500));
  console.log('=========================');

  // Process with retry logic (max 3 retries with exponential backoff)
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await processIncomingWebhook(req.body);
      return; // Success - exit
    } catch (error) {
      attempt++;
      console.error(`Webhook processing error (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt >= maxRetries) {
        console.error('Webhook processing failed after all retries, message may be lost');
        return;
      }

      // Exponential backoff: 1s, 2s, 4s
      await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
    }
  }
};

// ============================================================
// INSTANCE MANAGEMENT (ADMIN only)
// ============================================================

/**
 * Create/connect WhatsApp instance for a branch
 */
export const connectWhatsAppInstance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins can manage WhatsApp connections.',
      });
    }

    const { branchId } = req.body;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
      });
    }

    // Get branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true, whatsappInstanceName: true },
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }

    // Generate instance name if not exists
    let instanceName = branch.whatsappInstanceName;
    if (!instanceName) {
      const slug = branch.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      instanceName = `azees-${slug}`;
    }

    // Try to create instance first
    await createInstance(instanceName);

    // Get QR code
    const connectionResult = await connectInstance(instanceName);

    // Update branch with instance name
    await prisma.branch.update({
      where: { id: branchId },
      data: { whatsappInstanceName: instanceName },
    });

    res.json({
      success: true,
      data: {
        instanceName,
        qrCode: connectionResult.qrCode,
        pairingCode: connectionResult.pairingCode,
        message: connectionResult.alreadyConnected
          ? 'WhatsApp already connected'
          : 'QR code generated. Scan with your WhatsApp app.',
        alreadyConnected: connectionResult.alreadyConnected || false,
      },
    });
  } catch (error) {
    console.error('Connect instance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect WhatsApp',
    });
  }
};

/**
 * Disconnect WhatsApp instance
 */
export const disconnectBranchInstance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins can manage WhatsApp connections.',
      });
    }

    const { branchId } = req.body;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
      });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, whatsappInstanceName: true },
    });

    if (!branch?.whatsappInstanceName) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp instance not found for this branch',
      });
    }

    // Disconnect from Evolution API
    await disconnectInstance(branch.whatsappInstanceName);

    // Update branch
    await prisma.branch.update({
      where: { id: branchId },
      data: { whatsappConnected: false, whatsappPhoneNumber: null },
    });

    res.json({
      success: true,
      data: {
        instanceName: branch.whatsappInstanceName,
        message: 'WhatsApp disconnected successfully',
      },
    });
  } catch (error) {
    console.error('Disconnect instance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect WhatsApp',
    });
  }
};

/**
 * Restart WhatsApp instance
 */
export const restartBranchInstance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins can manage WhatsApp.',
      });
    }

    const { branchId } = req.body;
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
      });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, whatsappInstanceName: true },
    });

    if (!branch?.whatsappInstanceName) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp instance not found',
      });
    }

    await restartInstance(branch.whatsappInstanceName);

    res.json({
      success: true,
      data: {
        instanceName: branch.whatsappInstanceName,
        message: 'WhatsApp instance restarted',
      },
    });
  } catch (error) {
    console.error('Restart instance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to restart WhatsApp',
    });
  }
};

/**
 * Get WhatsApp status for all branches
 */
export const getAllBranchesStatus = async (req, res) => {
  try {
    // Get all active branches
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        country: true,
        whatsappInstanceName: true,
        whatsappConnected: true,
        whatsappPhoneNumber: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get real-time status from Evolution API for each branch
    const branchesWithStatus = await Promise.all(
      branches.map(async branch => {
        let connectionState = 'not_configured';

        if (branch.whatsappInstanceName) {
          try {
            const status = await getInstanceStatus(branch.whatsappInstanceName);
            connectionState = status.state || 'unknown';
          } catch {
            connectionState = 'error';
          }
        }

        return {
          id: branch.id,
          name: branch.name,
          country: branch.country,
          instanceName: branch.whatsappInstanceName,
          connected: branch.whatsappConnected && connectionState === 'open',
          whatsappNumber: branch.whatsappPhoneNumber,
          connectionState,
        };
      })
    );

    res.json({
      success: true,
      data: branchesWithStatus,
    });
  } catch (error) {
    console.error('Get all branches status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get branches status',
    });
  }
};

// ============================================================
// INBOX & CONVERSATIONS
// ============================================================

/**
 * Get unified inbox across ALL branches and users (ADMIN only)
 * Returns every active WhatsApp contact with branch and assigned user info
 * so admins can monitor the whole org from a single view.
 */
export const getAllInbox = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins can view the unified inbox.',
      });
    }

    const { branchId, userId, search } = req.query;
    const limit = parseInt(req.query.limit) || 100;

    const where = { isActive: true };
    if (branchId && branchId !== 'all') where.branchId = branchId;
    if (userId && userId !== 'all') where.userId = userId;

    const contacts = await prisma.whatsAppContact.findMany({
      where,
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        lead: {
          select: { id: true, name: true, phone: true, status: true, assignedTo: true },
        },
        branch: { select: { id: true, name: true } },
      },
    });

    let conversations = contacts.map(contact => ({
      contactId: contact.id,
      userId: contact.userId,
      userName: contact.user?.name || null,
      userEmail: contact.user?.email || null,
      leadId: contact.leadId,
      leadName: contact.lead?.name,
      lead: contact.lead,
      branchId: contact.branchId,
      branchName: contact.branch?.name,
      contactName: contact.contactName,
      contactNumber: contact.contactNumber,
      profilePicUrl: contact.profilePicUrl,
      lastMessage: contact.lastMessagePreview,
      lastMessageAt: contact.lastMessageAt,
      unreadCount: contact.unreadCount,
    }));

    if (search) {
      const q = search.toLowerCase();
      conversations = conversations.filter(
        c =>
          (c.contactName || '').toLowerCase().includes(q) ||
          c.contactNumber.toLowerCase().includes(q) ||
          (c.leadName || '').toLowerCase().includes(q) ||
          (c.userName || '').toLowerCase().includes(q) ||
          (c.branchName || '').toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      data: {
        conversations,
        totalUnread: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
        pagination: { limit },
      },
    });
  } catch (error) {
    console.error('Get all inbox error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get a conversation as ADMIN viewing across instances.
 * Returns messages from the contact's owner instance (whichever userId the contact belongs to)
 * so admins see the full history regardless of which user's WhatsApp instance the contact lives on.
 */
export const getAnyConversation = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins can view this conversation.',
      });
    }

    const { contactId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        lead: { select: { id: true, name: true, phone: true, status: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    // For the admin view, fetch messages using the contact's owner userId.
    // Fall back to the contact's own userId column when message-level userId is missing.
    const ownerUserId = contact.userId;
    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        contactNumber: contact.contactNumber,
        ...(ownerUserId ? { userId: ownerUserId } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip,
      include: { user: { select: { id: true, name: true } } },
    });

    res.json({
      success: true,
      data: {
        contact: {
          id: contact.id,
          contactName: contact.contactName,
          contactNumber: contact.contactNumber,
          profilePicUrl: contact.profilePicUrl,
          lastMessageAt: contact.lastMessageAt,
          lead: contact.lead,
        },
        ownerUser: contact.user,
        branch: contact.branch,
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Get any conversation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Get WhatsApp inbox (conversations list)
 */
export const getInbox = async (req, res) => {
  try {
    const { branchId } = req.query;
    const limit = parseInt(req.query.limit) || 50;

    console.log(`[getInbox] User: ${req.user.id} (${req.user.role}), branchId param: ${branchId}`);

    // Build filter based on user role
    // CRITICAL: Every user has their own WhatsApp instance - they must ONLY see their OWN contacts
    // The userId filter is MANDATORY for ALL roles to prevent data leakage between users
    let filter = { isActive: true };

    // MANDATORY: Filter by userId to ensure instance isolation
    // This is the critical fix for the WhatsApp data leak bug
    filter.userId = req.user.id;
    console.log(
      `[getInbox] CRITICAL FIX - filtering by userId: ${req.user.id} for ${req.user.role}`
    );

    // Admin can optionally filter by branchId within their own contacts
    if (req.user.role === 'ADMIN' && branchId && branchId !== 'all') {
      filter.branchId = branchId;
      console.log(`[getInbox] ADMIN with branchId filter: ${branchId}`);
    }

    // Get all contacts with last message (nulls last so contacts with messages appear first)
    const contacts = await prisma.whatsAppContact.findMany({
      where: filter,
      orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true },
        },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            assignedTo: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[getInbox] Found ${contacts.length} contacts for user ${req.user.id}`);

    // Transform to conversation format
    const conversations = contacts.map(contact => ({
      contactId: contact.id,
      userId: contact.userId,
      userName: contact.user?.name,
      leadId: contact.leadId,
      lead: contact.lead,
      branchId: contact.branchId,
      branchName: contact.branch?.name,
      contactName: contact.contactName,
      contactNumber: contact.contactNumber,
      profilePicUrl: contact.profilePicUrl,
      lastMessage: contact.lastMessagePreview,
      lastMessageAt: contact.lastMessageAt,
      unreadCount: contact.unreadCount,
    }));

    res.json({
      success: true,
      data: {
        conversations,
        totalUnread: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
        pagination: { limit },
      },
    });
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get conversation by contact ID
 */
export const getConversation = async (req, res) => {
  try {
    const { contactId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId },
      include: {
        user: {
          select: { id: true, name: true },
        },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Check access based on role
    // Each user has their own WhatsApp - Staff can see contacts they created OR legacy contacts (userId=null) in their branch
    if (req.user.role === 'STAFF') {
      if (contact.userId !== null && contact.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
      if (contact.userId === null && contact.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }
    if (req.user.role === 'MANAGER' && contact.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get messages - CRITICAL: filter by userId to ensure instance isolation
    // Prevents messages from OTHER users' WhatsApp instances from leaking
    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        contactNumber: contact.contactNumber,
        userId: req.user.id, // Only show messages from this user's WhatsApp instance
      },
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Mark messages as read
    await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { unreadCount: 0 },
    });

    res.json({
      success: true,
      data: {
        contact: {
          id: contact.id,
          contactName: contact.contactName,
          contactNumber: contact.contactNumber,
          profilePicUrl: contact.profilePicUrl,
          lastMessageAt: contact.lastMessageAt,
          lead: contact.lead,
        },
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get messages for a contact (alternative endpoint)
 */
export const getConversationByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Find contact by lead ID
    const contact = await prisma.whatsAppContact.findUnique({
      where: { leadId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'No WhatsApp conversation found for this lead',
      });
    }

    // Check access based on role
    if (req.user.role === 'STAFF') {
      if (contact.userId !== null && contact.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
      if (contact.userId === null && contact.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }
    if (req.user.role === 'MANAGER' && contact.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get lead info
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
      },
    });

    // Get messages - CRITICAL: filter by userId to ensure instance isolation
    // Prevents messages from OTHER users' WhatsApp instances from leaking
    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        contactNumber: contact.contactNumber,
        userId: req.user.id, // Only show messages from this user's WhatsApp instance
      },
      orderBy: { sentAt: 'desc' },
      take: limit,
      skip,
    });

    // Reset unread count - only for contacts owned by this user
    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: { unreadCount: 0 },
    });

    res.json({
      success: true,
      data: {
        lead,
        contact: {
          id: contact.id,
          contactName: contact.contactName,
          contactNumber: contact.contactNumber,
        },
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Get conversation by lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================================
// SEND MESSAGES
// ============================================================

/**
 * Send a WhatsApp message
 */
export const sendMessage = async (req, res) => {
  try {
    const { contactId, leadId, message, type, mediaUrl, documentUrl, fileName, caption, mediaType, mediaMimeType } = req.body;

    let contact = null;
    let lead = null;

    // Find contact or lead
    if (contactId) {
      contact = await prisma.whatsAppContact.findUnique({
        where: { id: contactId },
        include: { branch: true },
      });
      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found',
        });
      }

      // Check access based on role
      if (req.user.role === 'STAFF') {
        if (contact.userId !== null && contact.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }
        if (contact.userId === null && contact.branchId !== req.user.branchId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied',
          });
        }
      }
      if (req.user.role === 'MANAGER' && contact.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    } else if (leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { branch: true },
      });
      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
      }

      // Check access for MANAGER
      if (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      contact = await prisma.whatsAppContact.findFirst({
        where: { leadId },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Contact or lead is required',
      });
    }

    if (!message && !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Message or media is required',
      });
    }

    // IMPORTANT: Each user must have their own WhatsApp instance
    // Fetch from database as JWT doesn't include it
    const userRecord = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { evolutionInstanceName: true },
    });

    if (!userRecord?.evolutionInstanceName) {
      return res.status(400).json({
        success: false,
        error:
          'WhatsApp not connected. Please connect your WhatsApp in My WhatsApp settings first.',
      });
    }

    const instanceName = userRecord.evolutionInstanceName;
    const branchId = contact?.branchId || lead?.branchId || req.user.branchId;

    if (!instanceName) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp not configured',
      });
    }

    // Send message via Evolution API
    // Pass BOTH mediaUrl and documentUrl so sendOutboundMessage (which reads
    // options.documentUrl for the 'document' branch) receives the right value
    // regardless of which one the client sent.
    // Also normalize the dispatch type: if a media/document URL is present but
    // the client forgot to set `type`, infer it from the URL.
    let dispatchType = type;
    if (!dispatchType || dispatchType === 'text') {
      if (documentUrl || (fileName && (mediaUrl || documentUrl))) {
        dispatchType = 'document';
      } else if (mediaUrl) {
        dispatchType = 'media';
      } else {
        dispatchType = 'text';
      }
    }
    const result = await sendOutboundMessage(
      instanceName,
      contact?.contactNumber || lead?.phone,
      message,
      dispatchType,
      { mediaUrl, documentUrl, fileName, caption, mediaType }
    );

    // First message to a lead with no chat yet: open one in the sender's inbox,
    // or the message is saved but no inbox ever lists it.
    if (!contact && lead?.phone) {
      const normalizedPhone = lead.phone.replace(/\D/g, '');
      const remoteJid = `${normalizedPhone}@s.whatsapp.net`;
      contact =
        (await prisma.whatsAppContact.findFirst({ where: { userId: req.user.id, remoteJid } })) ||
        (await prisma.whatsAppContact.create({
          data: {
            userId: req.user.id,
            branchId,
            remoteJid,
            contactNumber: normalizedPhone,
            contactName: lead.name || null,
            isActive: true,
          },
        }));
      if (!contact.leadId) {
        // leadId is unique on contacts — only link when no other chat holds it.
        const linked = await prisma.whatsAppContact.findFirst({ where: { leadId: lead.id } });
        if (!linked) {
          contact = await prisma.whatsAppContact.update({
            where: { id: contact.id },
            data: { leadId: lead.id },
          });
        }
      }
    }

    // Save outbound message
    const whatsappMessage = await prisma.whatsAppMessage.create({
      data: {
        branchId,
        leadId: lead?.id || contact?.leadId || null,
        contactId: contact?.id || null,
        userId: req.user.id,
        remoteJid: contact
          ? `${contact.contactNumber}@s.whatsapp.net`
          : `${lead?.phone}@s.whatsapp.net`,
        contactName: contact?.contactName || lead?.name,
        contactNumber: contact?.contactNumber || lead?.phone,
        direction: 'OUTBOUND',
        messageType:
          type === 'media'
            ? 'IMAGE'
            : type === 'document'
              ? 'DOCUMENT'
              : type === 'video'
                ? 'VIDEO'
                : type === 'audio'
                  ? 'AUDIO'
                  : 'TEXT',
        textContent: message,
        caption: caption,
        mediaUrl: mediaUrl || documentUrl,
        fileName: fileName || null,
        mediaMimeType: mediaMimeType || null,
        waMessageId: result.waMessageId,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // Update contact last message; a new message brings a deleted chat back.
    if (contact) {
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: message?.substring(0, 100) || '[Media]',
          isActive: true,
        },
      });
    }

    // Log activity if linked to lead
    const linkedLeadId = lead?.id || contact?.leadId;
    if (linkedLeadId) {
      await prisma.leadActivity.create({
        data: {
          leadId: linkedLeadId,
          userId: req.user.id,
          type: 'WHATSAPP',
          description: `Outbound message: ${message?.substring(0, 100) || '[Media]'}`,
        },
      });

      // Audit log
      await createAuditLog({
        action: AuditAction.CREATE,
        entity: AuditEntity.WHATSAPP,
        entityId: whatsappMessage.id,
        userId: req.user.id,
        branchId,
        description: `Sent WhatsApp message`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    res.json({
      success: true,
      data: {
        message: whatsappMessage,
        waMessageId: result.waMessageId,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
};

/**
 * Send a message to a new number (creates contact if not exists)
 * POST /api/v1/whatsapp/send-to-number
 *
 * IMPORTANT: Each user must have their own WhatsApp instance.
 * Staff uses their own instance, not branch instance.
 */
export const sendMessageToNumber = async (req, res) => {
  try {
    const { phoneNumber, message, type, mediaUrl, documentUrl, fileName, caption, mediaType, mediaMimeType } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!message && !mediaUrl) {
      return res.status(400).json({
        success: false,
        error: 'Message or media is required',
      });
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    // IMPORTANT: User MUST have their own WhatsApp instance
    // Fetch from database as JWT doesn't include it
    const userRecord = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { evolutionInstanceName: true },
    });

    if (!userRecord?.evolutionInstanceName) {
      return res.status(400).json({
        success: false,
        error:
          'WhatsApp not connected. Please connect your WhatsApp in My WhatsApp settings first.',
      });
    }

    const instanceName = userRecord.evolutionInstanceName;

    // Send message via Evolution API
    // Pass BOTH mediaUrl and documentUrl so sendOutboundMessage (which reads
    // options.documentUrl for the 'document' branch) receives the right value.
    // Also normalize the dispatch type: if a media/document URL is present but
    // the client forgot to set `type`, infer it from the URL.
    let dispatchType = type;
    if (!dispatchType || dispatchType === 'text') {
      if (documentUrl || (fileName && (mediaUrl || documentUrl))) {
        dispatchType = 'document';
      } else if (mediaUrl) {
        dispatchType = 'media';
      } else {
        dispatchType = 'text';
      }
    }
    const result = await sendOutboundMessage(
      instanceName,
      normalizedPhone,
      message,
      dispatchType,
      { mediaUrl, documentUrl, fileName, caption, mediaType }
    );

    // Create or find contact (tied to this user's instance)
    const remoteJid = `${normalizedPhone}@s.whatsapp.net`;
    let contact = await prisma.whatsAppContact.findFirst({
      where: {
        userId: req.user.id,
        remoteJid,
      },
    });

    if (!contact) {
      contact = await prisma.whatsAppContact.create({
        data: {
          userId: req.user.id, // Always assign to the user who sent
          branchId: req.user.branchId,
          remoteJid,
          contactNumber: normalizedPhone,
          contactName: null,
          isActive: true,
        },
      });
    }

    // Create message record
    const whatsappMessage = await prisma.whatsAppMessage.create({
      data: {
        branchId: req.user.branchId,
        leadId: contact.leadId || null,
        contactId: contact.id,
        userId: req.user.id,
        remoteJid,
        contactName: null,
        contactNumber: normalizedPhone,
        direction: 'OUTBOUND',
        messageType:
          type === 'media'
            ? 'IMAGE'
            : type === 'document'
              ? 'DOCUMENT'
              : type === 'video'
                ? 'VIDEO'
                : type === 'audio'
                  ? 'AUDIO'
                  : 'TEXT',
        textContent: message,
        caption: caption,
        mediaUrl: mediaUrl || documentUrl,
        fileName: fileName || null,
        mediaMimeType: mediaMimeType || null,
        waMessageId: result.waMessageId,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // Update contact's last message; a new message brings a deleted chat back.
    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: message?.substring(0, 100) || '[Media]',
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: {
        message: whatsappMessage,
        waMessageId: result.waMessageId,
        contactId: contact.id,
      },
    });
  } catch (error) {
    console.error('Send message to number error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
};

// ============================================================
// BRANCH STATUS
// ============================================================

/**
 * Get WhatsApp status for a branch
 */
export const getBranchStatus = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        name: true,
        whatsappInstanceName: true,
        whatsappConnected: true,
        whatsappPhoneNumber: true,
        isActive: true,
      },
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }

    // Check branch access
    if (req.user.role !== 'ADMIN' && branch.id !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Get real-time status from Evolution API
    let connectionState = 'unknown';
    if (branch.whatsappInstanceName) {
      const status = await getInstanceStatus(branch.whatsappInstanceName);
      connectionState = status.state;
    }

    res.json({
      success: true,
      data: {
        branch: {
          id: branch.id,
          name: branch.name,
        },
        instanceName: branch.whatsappInstanceName,
        isConnected: branch.whatsappConnected,
        whatsappPhoneNumber: branch.whatsappPhoneNumber,
        connectionState,
      },
    });
  } catch (error) {
    console.error('Get branch status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================================
// LEAD LINKING
// ============================================================

/**
 * Link a WhatsApp contact to a lead
 */
export const linkContactToLead = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { leadId } = req.body;

    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && contact.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    // Check branch match
    if (lead.branchId !== contact.branchId && req.user.role !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'Lead must be in the same branch',
      });
    }

    // Unlink any existing lead from this contact first
    const existingContact = await prisma.whatsAppContact.findFirst({
      where: { leadId, id: { not: contactId } },
    });
    if (existingContact) {
      await prisma.whatsAppContact.update({
        where: { id: existingContact.id },
        data: { leadId: null },
      });
    }

    // Link contact to lead
    await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { leadId },
    });

    // Activity log
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user.id,
        type: 'NOTE',
        description: 'WhatsApp conversation linked',
      },
    });

    res.json({
      success: true,
      data: { contactId, leadId },
    });
  } catch (error) {
    console.error('Link contact to lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Create a lead from WhatsApp contact
 */
export const createLeadFromContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, email } = req.body;

    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && contact.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check if already linked
    if (contact.leadId) {
      return res.status(400).json({
        success: false,
        error: 'Contact is already linked to a lead',
      });
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name: name || contact.contactName || `WhatsApp Lead`,
        phone: contact.contactNumber,
        email: email,
        source: 'WHATSAPP',
        status: 'FRESH',
        branchId: contact.branchId,
        createdBy: req.user.id,
        // A lead STAFF or a MANAGER create is their own
        ...(req.user.role !== 'ADMIN' && { assignedTo: req.user.id }),
      },
    });

    // Link contact to lead
    await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { leadId: lead.id },
    });

    // Activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        userId: req.user.id,
        type: 'STATUS_CHANGE',
        description: 'Lead created from WhatsApp contact',
      },
    });

    res.json({
      success: true,
      data: { lead },
    });
  } catch (error) {
    console.error('Create lead from contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================================
// CHAT MANAGEMENT (Archive/Delete)
// ============================================================

/**
 * Archive a WhatsApp chat
 */
export const archiveChat = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && contact.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { isArchived: true },
    });

    res.json({
      success: true,
      message: 'Chat archived',
    });
  } catch (error) {
    console.error('Archive chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Unarchive a WhatsApp chat
 */
export const unarchiveChat = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Check access
    if (req.user.role !== 'ADMIN' && contact.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { isArchived: false },
    });

    res.json({
      success: true,
      message: 'Chat unarchived',
    });
  } catch (error) {
    console.error('Unarchive chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Delete a WhatsApp chat — the chat, its messages and their received media. ADMIN only (enforced by the route).
 */
export const deleteChat = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await prisma.whatsAppContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Hard delete: the chat and every message in it leave the database. Older
    // sends were saved without a contactId, so those are matched by number.
    const messageFilter = {
      OR: [
        { contactId },
        { contactId: null, userId: contact.userId, remoteJid: contact.remoteJid },
      ],
    };

    // Media received in this chat was copied into our Cloudinary folder.
    // Sent media can point at hotel or itinerary images still used elsewhere,
    // so only files under the WhatsApp folder are removed.
    const mediaMessages = await prisma.whatsAppMessage.findMany({
      where: { ...messageFilter, mediaUrl: { not: null } },
      select: { mediaUrl: true },
    });
    const mediaPublicIds = mediaMessages
      .map(m => extractPublicId(m.mediaUrl))
      .filter(id => id?.startsWith('travel-crm/whatsapp/'));

    await prisma.$transaction([
      prisma.whatsAppMessage.deleteMany({ where: messageFilter }),
      prisma.whatsAppContact.delete({ where: { id: contactId } }),
    ]);

    // After the rows are gone, so a Cloudinary hiccup never leaves a half-deleted chat.
    if (mediaPublicIds.length) {
      deleteMultipleFromCloudinary(mediaPublicIds).catch(error =>
        console.error('Delete chat: failed to remove media from Cloudinary:', error.message)
      );
    }

    res.json({
      success: true,
      message: 'Chat deleted',
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get archived chats
 */
export const getArchivedChats = async (req, res) => {
  try {
    // CRITICAL: Filter by userId to ensure instance isolation
    // This prevents archived chats from OTHER users' WhatsApp instances from leaking
    let filter = {
      isArchived: true,
      userId: req.user.id, // Only show archived chats from this user's WhatsApp instance
    };

    // Admin can optionally filter by branchId within their own contacts
    if (req.user.role === 'ADMIN') {
      // Already filtered by userId above
    } else if (req.user.role === 'MANAGER') {
      filter.branchId = req.user.branchId;
    } else {
      // STAFF - already filtered by userId above
    }

    const contacts = await prisma.whatsAppContact.findMany({
      where: filter,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, status: true },
        },
        branch: { select: { id: true, name: true } },
      },
    });

    const conversations = contacts.map(contact => ({
      contactId: contact.id,
      leadId: contact.leadId,
      lead: contact.lead,
      branchId: contact.branchId,
      branchName: contact.branch?.name,
      contactName: contact.contactName,
      contactNumber: contact.contactNumber,
      lastMessage: contact.lastMessagePreview,
      lastMessageAt: contact.lastMessageAt,
      unreadCount: contact.unreadCount,
    }));

    res.json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    console.error('Get archived chats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================================
// UNREAD COUNT
// ============================================================

/**
 * Get total unread count (for badge)
 */
export const getUnreadCount = async (req, res) => {
  try {
    // CRITICAL: Filter by userId to ensure instance isolation
    // This prevents unread counts from OTHER users' WhatsApp instances from leaking
    let whereClause = {
      isActive: true,
      unreadCount: { gt: 0 },
      userId: req.user.id, // Only count unread from this user's WhatsApp instance
    };

    // Admin can optionally filter by branchId within their own contacts
    if (req.user.role === 'ADMIN') {
      // Already filtered by userId above, no additional branch filter needed
    } else if (req.user.role === 'MANAGER') {
      whereClause.branchId = req.user.branchId;
    } else {
      // STAFF - already filtered by userId above
    }

    const contacts = await prisma.whatsAppContact.findMany({
      where: whereClause,
      select: { unreadCount: true },
    });

    const totalUnread = contacts.reduce((sum, c) => sum + c.unreadCount, 0);

    res.json({
      success: true,
      data: { totalUnread },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================================
// DIAGNOSTICS (ADMIN only)
// ============================================================

/**
 * WhatsApp diagnostics - check all connections and configuration
 */
export const getWhatsAppDiagnostics = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins can view diagnostics.',
      });
    }

    const results = {
      timestamp: new Date().toISOString(),
      checks: [],
    };

    // Check 1: Environment Variables
    results.checks.push({
      name: 'Environment Variables',
      status: process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY ? 'PASS' : 'FAIL',
      details: {
        EVOLUTION_API_URL: process.env.EVOLUTION_API_URL ? 'SET' : 'MISSING',
        EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY
          ? 'SET (****' + process.env.EVOLUTION_API_KEY.slice(-4) + ')'
          : 'MISSING',
        WEBHOOK_BASE_URL: process.env.WEBHOOK_BASE_URL ? 'SET' : 'MISSING',
      },
    });

    // Check 2: Evolution API Connection
    try {
      const evolutionUrl = `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`;
      const response = await fetch(evolutionUrl, {
        headers: { apikey: process.env.EVOLUTION_API_KEY },
        signal: AbortSignal.timeout,
      });
      const data = await response.json();

      results.checks.push({
        name: 'Evolution API Connection',
        status: response.ok ? 'PASS' : 'FAIL',
        details: {
          url: process.env.EVOLUTION_API_URL,
          httpStatus: response.status,
          instances: Array.isArray(data)
            ? data.map(i => ({
                name: i.instance?.instanceName || i.instanceName || 'unknown',
                state: i.instance?.state || i.state || 'unknown',
                owner: i.instance?.owner || i.owner || 'none',
              }))
            : 'Could not parse instances',
        },
      });
    } catch (err) {
      results.checks.push({
        name: 'Evolution API Connection',
        status: 'FAIL',
        details: {
          error: err.message,
          url: process.env.EVOLUTION_API_URL,
        },
      });
    }

    // Check 3: Branch WhatsApp Configuration
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        country: true,
        whatsappInstanceName: true,
        whatsappConnected: true,
        whatsappPhoneNumber: true,
      },
    });

    results.checks.push({
      name: 'Branch WhatsApp Config',
      status: branches.length > 0 ? 'PASS' : 'FAIL',
      details: {
        totalBranches: branches.length,
        withInstance: branches.filter(b => b.whatsappInstanceName).length,
        connected: branches.filter(b => b.whatsappConnected).length,
        branches: branches.map(b => ({
          name: b.name,
          country: b.country,
          instanceName: b.whatsappInstanceName || 'NOT SET',
          connected: b.whatsappConnected,
          number: b.whatsappPhoneNumber || 'none',
        })),
      },
    });

    // Check 4: Webhook URL
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/v1/whatsapp/webhook`;
    results.checks.push({
      name: 'Webhook URL Configuration',
      status: process.env.WEBHOOK_BASE_URL ? 'CONFIG OK' : 'FAIL',
      details: {
        configuredUrl: webhookUrl,
        note: 'This URL must be publicly accessible from Evolution API server.',
      },
    });

    // Check 5: WhatsApp Database Tables
    try {
      const [msgCount, contactCount, templateCount] = await Promise.all([
        prisma.whatsAppMessage.count(),
        prisma.whatsAppContact.count(),
        prisma.whatsAppTemplate.count(),
      ]);

      results.checks.push({
        name: 'WhatsApp Database Tables',
        status: 'PASS',
        details: {
          messages: msgCount,
          contacts: contactCount,
          templates: templateCount,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.checks.push({
        name: 'WhatsApp Database Tables',
        status: 'FAIL',
        details: { error: errorMessage },
      });
    }

    // Overall status
    const allPass = results.checks.every(c => c.status === 'PASS' || c.status === 'CONFIG OK');
    results.overallStatus = allPass ? 'HEALTHY' : 'ISSUES FOUND';

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run diagnostics',
    });
  }
};

// ============================================================
// STATISTICS (ADMIN only)
// ============================================================

/**
 * Get WhatsApp statistics for dashboard
 */
export const getWhatsAppStats = async (req, res) => {
  try {
    const { branchId, days = '7' } = req.query;
    const daysNum = parseInt(days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Build filter - CRITICAL: filter by userId to ensure instance isolation
    // This prevents stats from OTHER users' WhatsApp instances from leaking
    let filter = {
      userId: req.user.id, // Only show stats from this user's WhatsApp instance
      sentAt: { gte: startDate },
    };

    // Admin can optionally filter by branchId within their own contacts
    if (req.user.role === 'ADMIN' && branchId) {
      filter.branchId = branchId;
    } else if (req.user.role === 'MANAGER') {
      filter.branchId = req.user.branchId;
    }
    // STAFF - already filtered by userId above

    // Get message stats
    const [
      totalMessages,
      inboundMessages,
      outboundMessages,
      recentMessages,
      contacts,
      activeContacts,
    ] = await Promise.all([
      // Total messages
      prisma.whatsAppMessage.count({
        where: {
          ...filter,
        },
      }),
      // Inbound messages
      prisma.whatsAppMessage.count({
        where: {
          ...filter,
          direction: 'INBOUND',
        },
      }),
      // Outbound messages
      prisma.whatsAppMessage.count({
        where: {
          ...filter,
          direction: 'OUTBOUND',
        },
      }),
      // Recent messages for chart (grouped by date)
      prisma.whatsAppMessage.findMany({
        where: {
          ...filter,
        },
        select: {
          sentAt: true,
          direction: true,
        },
        orderBy: { sentAt: 'asc' },
      }),
      // Total contacts
      prisma.whatsAppContact.count({
        where: {
          userId: req.user.id,
          isActive: true,
          ...(req.user.role === 'MANAGER' ? { branchId: req.user.branchId } : {}),
          ...(req.user.role === 'ADMIN' && branchId ? { branchId } : {}),
        },
      }),
      // Active contacts (with messages in last 24h)
      prisma.whatsAppContact.count({
        where: {
          userId: req.user.id,
          isActive: true,
          lastMessageAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          ...(req.user.role === 'MANAGER' ? { branchId: req.user.branchId } : {}),
          ...(req.user.role === 'ADMIN' && branchId ? { branchId } : {}),
        },
      }),
    ]);

    // Total contacts (renamed from contacts for clarity)
    const totalContacts = contacts;

    // Group messages by date for chart
    const messagesByDate = {};
    const now = new Date();

    // Initialize all dates with zero
    for (let i = daysNum - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      messagesByDate[dateKey] = { date: dateKey, inbound: 0, outbound: 0, total: 0 };
    }

    // Count messages by date and direction
    recentMessages.forEach(msg => {
      const dateKey = msg.sentAt.toISOString().split('T')[0];
      if (messagesByDate[dateKey]) {
        if (msg.direction === 'INBOUND') {
          messagesByDate[dateKey].inbound++;
        } else {
          messagesByDate[dateKey].outbound++;
        }
        messagesByDate[dateKey].total++;
      }
    });

    const chartData = Object.values(messagesByDate);

    res.json({
      success: true,
      data: {
        stats: {
          totalMessages,
          inboundMessages,
          outboundMessages,
          totalContacts,
          activeContacts,
          avgMessagesPerDay: Math.round(totalMessages / daysNum),
        },
        chartData,
        period: `${daysNum} days`,
      },
    });
  } catch (error) {
    console.error('Get WhatsApp stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp statistics',
    });
  }
};

/**
 * Send a document (PDF) via WhatsApp
 * User selects file from local device, file is sent as base64 to backend
 */
export const sendDocumentMessage = async (req, res) => {
  try {
    const { phoneNumber, caption, fileName, base64Data } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    if (!base64Data) {
      return res.status(400).json({
        success: false,
        error: 'File data is required',
      });
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    // Get user's WhatsApp instance
    const userRecord = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { evolutionInstanceName: true },
    });

    if (!userRecord?.evolutionInstanceName) {
      return res.status(400).json({
        success: false,
        error:
          'WhatsApp not connected. Please connect your WhatsApp in My WhatsApp settings first.',
      });
    }

    const instanceName = userRecord.evolutionInstanceName;

    // Import the service function dynamically to avoid circular dependency
    const { sendOutboundMessage } = await import('../services/evolution-api.service.js');

    // Strip data URL prefix if present (e.g., "data:application/pdf;base64,...")
    let cleanBase64Data = base64Data;
    if (base64Data.startsWith('data:')) {
      const parts = base64Data.split(',');
      if (parts.length > 1) {
        cleanBase64Data = parts[1];
      }
    }

    // Send document via Evolution API
    const result = await sendOutboundMessage(
      instanceName,
      normalizedPhone,
      caption || '',
      'document',
      {
        documentUrl: cleanBase64Data, // pure base64 without prefix
        fileName: fileName || 'itinerary.pdf',
        caption: caption || '',
      }
    );

    // Create or find contact
    const remoteJid = `${normalizedPhone}@s.whatsapp.net`;
    let contact = await prisma.whatsAppContact.findFirst({
      where: {
        userId: req.user.id,
        remoteJid,
      },
    });

    if (!contact) {
      contact = await prisma.whatsAppContact.create({
        data: {
          userId: req.user.id,
          branchId: req.user.branchId,
          remoteJid,
          contactNumber: normalizedPhone,
          contactName: null,
          isActive: true,
        },
      });
    }

    // Create message record
    const whatsappMessage = await prisma.whatsAppMessage.create({
      data: {
        branchId: req.user.branchId,
        leadId: contact.leadId || null,
        contactId: contact.id,
        userId: req.user.id,
        remoteJid,
        contactName: null,
        contactNumber: normalizedPhone,
        direction: 'OUTBOUND',
        messageType: 'DOCUMENT',
        textContent: caption || '',
        mediaUrl: null,
        waMessageId: result.waMessageId,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    // Update contact's last message; a new message brings a deleted chat back.
    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: `[PDF: ${fileName || 'document'}]`,
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: {
        message: whatsappMessage,
        waMessageId: result.waMessageId,
        contactId: contact.id,
      },
    });
  } catch (error) {
    console.error('Send document message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send document',
    });
  }
};
