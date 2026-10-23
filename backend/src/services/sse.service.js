/**
import prisma from '../config/prisma.js';
 * SSE (Server-Sent Events) Service
 *
 * Provides real-time push notifications to connected clients.
 * Used for:
 * - New lead notifications
 * - Follow-up reminders
 * - Overdue alerts
 * - WhatsApp message notifications
 *
 * Clients connect via: GET /api/v1/notifications/stream
 * Events are sent with type: 'notification'
 */

// Active SSE connections
const clients = new Map(); // userId -> Set of response objects

/**
 * Add a client to the SSE stream
 */
export const addClient = (userId, res) => {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(res);

  console.log(`[SSE] Client connected: ${userId} (total: ${getTotalClients()})`);

  // Send initial connection event
  sendToClient(res, {
    type: 'connected',
    message: 'Connected to notification stream',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Remove a client from the SSE stream
 */
export const removeClient = (userId, res) => {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.delete(res);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }

  console.log(`[SSE] Client disconnected: ${userId} (total: ${getTotalClients()})`);
};

/**
 * Get total number of connected clients
 */
export const getTotalClients = () => {
  let total = 0;
  for (const userClients of clients.values()) {
    total += userClients.size;
  }
  return total;
};

/**
 * Send an event to a specific client
 */
const sendToClient = (res, data) => {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Client disconnected
  }
};

/**
 * Send a notification to a specific user
 */
export const sendToUser = (userId, notification) => {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) {
    return false;
  }

  const event = {
    type: 'notification',
    data: notification,
    timestamp: new Date().toISOString(),
  };

  for (const res of userClients) {
    sendToClient(res, event);
  }

  return true;
};

/**
 * Broadcast a notification to all connected clients
 */
export const broadcast = notification => {
  const event = {
    type: 'broadcast',
    data: notification,
    timestamp: new Date().toISOString(),
  };

  for (const [_userId, userClients] of clients.entries()) {
    for (const res of userClients) {
      sendToClient(res, event);
    }
  }
};

/**
 * Send notification to a user's manager
 */
export const notifyManager = async (branchId, notification) => {
  const manager = await prisma.user.findFirst({
    where: {
      branchId,
      role: 'MANAGER',
      isActive: true,
    },
  });

  if (manager) {
    return sendToUser(manager.id, notification);
  }

  return false;
};

/**
 * Send notification to all admins
 */
export const notifyAdmins = async notification => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
  });

  for (const admin of admins) {
    sendToUser(admin.id, notification);
  }
};

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export const NotificationTypes = {
  NEW_LEAD: 'new_lead',
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_ESCALATED: 'lead_escalated',
  FOLLOWUP_DUE: 'followup_due',
  FOLLOWUP_OVERDUE: 'followup_overdue',
  FOLLOWUP_ESCALATED: 'followup_escalated',
  WHATSAPP_MESSAGE: 'whatsapp_message',
  SYSTEM_ALERT: 'system_alert',
};

/**
 * Send a new lead notification
 */
export const notifyNewLead = async (lead, createdBy) => {
  const notification = {
    type: NotificationTypes.NEW_LEAD,
    title: 'New Lead',
    message: `${lead.name} was added as a new lead`,
    leadId: lead.id,
    leadName: lead.name,
    source: lead.source,
  };

  // Notify assigned user
  if (lead.assignedTo && lead.assignedTo !== createdBy) {
    sendToUser(lead.assignedTo, notification);
  }

  // Notify manager
  await notifyManager(lead.branchId, {
    ...notification,
    title: 'New Lead Assigned',
  });
};

/**
 * Send lead escalated notification
 */
export const notifyLeadEscalated = async (leadId, branchId, reason) => {
  const notification = {
    type: NotificationTypes.LEAD_ESCALATED,
    title: 'Lead Escalated',
    message: reason,
    leadId,
  };

  await notifyManager(branchId, notification);
  await notifyAdmins(notification);
};

/**
 * Send follow-up overdue notification
 */
export const notifyFollowUpOverdue = async followUp => {
  const notification = {
    type: NotificationTypes.FOLLOWUP_OVERDUE,
    title: 'Follow-up Overdue',
    message: `Follow-up for ${followUp.lead?.name || 'lead'} is overdue`,
    followUpId: followUp.id,
    leadId: followUp.leadId,
    leadName: followUp.lead?.name,
  };

  // Notify assigned user
  sendToUser(followUp.assignedTo, notification);

  // Notify manager
  await notifyManager(followUp.lead?.branchId, {
    ...notification,
    title: 'Team Follow-up Overdue',
  });
};

/**
 * Send follow-up escalated notification
 */
export const notifyFollowUpEscalated = async (followUp, hoursOverdue) => {
  const notification = {
    type: NotificationTypes.FOLLOWUP_ESCALATED,
    title: 'Follow-up Escalated',
    message: `Follow-up for ${followUp.lead?.name || 'lead'} is ${hoursOverdue}h overdue and escalated`,
    followUpId: followUp.id,
    leadId: followUp.leadId,
    priority: 'high',
  };

  await notifyAdmins(notification);
};

/**
 * Send WhatsApp message notification
 * CRITICAL: Only notify the owner of the WhatsApp instance that received the message
 * This prevents messages from leaking to other users' real-time streams
 */
export const notifyWhatsAppMessage = async (message, lead) => {
  const notification = {
    type: NotificationTypes.WHATSAPP_MESSAGE,
    title: 'WhatsApp Message',
    message: `${lead?.name || 'Unknown'}: ${message.textContent?.substring(0, 50) || '[Media]'}`,
    leadId: message.leadId,
    leadName: lead?.name,
    messageId: message.id,
    userId: message.userId, // Include for client-side routing
  };

  // CRITICAL: Only notify the user who owns this WhatsApp instance
  // This is the instance owner, NOT the lead assignee
  // The lead may be assigned to someone else, but the WhatsApp messages belong to the instance owner
  if (message.userId) {
    const sent = sendToUser(message.userId, notification);
    if (sent) {
      console.log(`[SSE] WhatsApp notification sent to instance owner: ${message.userId}`);
    }
  }

  // Also notify the lead's assigned user (if different from instance owner)
  if (lead?.assignedTo && lead.assignedTo !== message.userId) {
    sendToUser(lead.assignedTo, notification);
  }

  // Notify manager as well (if different from both)
  const manager = await prisma.user.findFirst({
    where: {
      branchId: message.branchId,
      role: 'MANAGER',
      isActive: true,
    },
  });
  if (manager && manager.id !== message.userId && manager.id !== lead?.assignedTo) {
    sendToUser(manager.id, notification);
  }
};
