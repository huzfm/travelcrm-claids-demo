import { Router } from 'express';
import {
  verifyWebhook,
  receiveWebhook,
  connectWhatsAppInstance,
  disconnectBranchInstance,
  restartBranchInstance,
  getAllBranchesStatus,
  getInbox,
  getConversation,
  getConversationByLead,
  sendMessage,
  sendMessageToNumber,
  getBranchStatus,
  linkContactToLead,
  createLeadFromContact,
  getUnreadCount,
  getWhatsAppDiagnostics,
  getWhatsAppStats,
  getAllInbox,
  getAnyConversation,
  archiveChat,
  unarchiveChat,
  deleteChat,
  getArchivedChats,
  sendDocumentMessage,
} from '../controllers/whatsapp.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';

const router = Router();

// Webhook - no auth required
router.get('/webhook', verifyWebhook);
router.post('/webhook', receiveWebhook);

// Apply auth to all other routes
router.use(authenticate);

// Guards are attached per route rather than with router.use() because
// /whatsapp/templates and /whatsapp/my/* are served by sibling routers mounted
// at the same path — a router-level guard here would reject them before they
// ever reached their own router.
const canUseWhatsApp = requirePermission('whatsapp', 'whatsapp_all');
const canUseAllInboxes = requirePermission('whatsapp_all');
const canSend = requirePermission('whatsapp.send');
const canArchive = requirePermission('whatsapp.archive');
const canConnect = requirePermission('whatsapp.connect');
const canLinkLeads = requirePermission('whatsapp.link_leads');

// Diagnostics (ADMIN only)
router.get('/diagnostics', canUseWhatsApp, getWhatsAppDiagnostics);

// Stats (ADMIN only)
router.get('/stats', canUseWhatsApp, getWhatsAppStats);

// Instance management (ADMIN only)
router.post('/connect', canConnect, connectWhatsAppInstance);
router.post('/disconnect', canConnect, disconnectBranchInstance);
router.post('/restart', canConnect, restartBranchInstance);

// All branches status (ADMIN only)
router.get('/all-branches-status', canUseAllInboxes, getAllBranchesStatus);

// Inbox & conversations
router.get('/inbox', canUseWhatsApp, getInbox);
router.get('/unread-count', canUseWhatsApp, getUnreadCount);
router.get('/conversations/lead/:leadId', canUseWhatsApp, getConversationByLead);
router.get('/conversations/:contactId', canUseWhatsApp, getConversation);

// Admin unified inbox (ADMIN only)
router.get('/admin/inbox', canUseAllInboxes, getAllInbox);
router.get('/admin/conversations/:contactId', canUseAllInboxes, getAnyConversation);

// Send messages
router.post('/send', canSend, sendMessage);
router.post('/send-to-number', canSend, sendMessageToNumber);
router.post('/send-document', canSend, sendDocumentMessage);

// Branch status
router.get('/branch/:branchId/status', canUseWhatsApp, getBranchStatus);

// Lead linking
router.post('/contacts/:contactId/link-lead', canLinkLeads, linkContactToLead);
router.post('/contacts/:contactId/create-lead', canLinkLeads, createLeadFromContact);

// Chat management
router.get('/archived', canArchive, getArchivedChats);
router.post('/contacts/:contactId/archive', canArchive, archiveChat);
router.post('/contacts/:contactId/unarchive', canArchive, unarchiveChat);
// Deleting a chat is ADMIN only — staff can never delete chats, not even their own.
router.delete('/contacts/:contactId', requireRole('ADMIN'), deleteChat);

export default router;
