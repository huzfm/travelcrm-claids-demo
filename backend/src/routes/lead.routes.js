import { Router } from 'express';
import {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  bulkDeleteLeads,
  bulkImportLeads,
  bulkExportLeads,
  getLeadActivities,
  createLeadActivity,
  getDuplicateLeads,
  mergeLeads,
  getLeadTags,
  createLeadTag,
  assignLeadTags,
  getLeadTagsByLeadId,
  transferLead,
  leadValidation,
  downloadLeadTemplate,
  googleAdsWebhook,
  metaWebhook,
  metaWebhookVerify,
  getCampaignLeads,
} from '../controllers/lead.controller.js';
import { getLeadFollowUps } from '../controllers/followup.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { uploadLeads } from '../middleware/upload.js';
import { bulkRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// ============================================
// Webhook routes - NO authentication.
// These are called by Google / Meta / Zapier, which cannot send a Bearer token.
// They MUST stay above `router.use(authenticate)` below, or every delivery 401s.
// Meta posts are authenticated by X-Hub-Signature-256 inside the handler;
// Google posts are authenticated by the shared key in the payload.
// ============================================
router.get('/webhook/meta', metaWebhookVerify); // Meta sends hub.challenge to the callback URL itself
router.get('/webhook/meta/verify', metaWebhookVerify); // legacy path, kept for compatibility
router.post('/webhook/google', googleAdsWebhook);
router.post('/webhook/meta', metaWebhook);

// Everything below this line requires a logged-in user.
router.use(authenticate);

// Lead records feed several modules — dashboard widgets, performance reports and
// the booked-clients view all read them — so reads accept any of those
// features while anything that changes a lead needs the Leads module itself.
const canReadLeads = requirePermission(
  'leads',
  'booked_clients',
  'dashboard',
  'performance',
  'analytics',
  'itineraries',
  'whatsapp'
);
// Each mutation is gated by its own sub-permission, so an admin can let someone
// work leads without letting them delete, export or bulk-import.
const canCreateLeads = requirePermission('leads.create');
const canEditLeads = requirePermission('leads.edit');
const canDeleteLeads = requirePermission('leads.delete');
const canImportLeads = requirePermission('leads.import');
const canExportLeads = requirePermission('leads.export');
const canTransferLeads = requirePermission('leads.transfer');
const canMergeLeads = requirePermission('leads.merge');
const canManageTags = requirePermission('leads.tags');
const canLogActivity = requirePermission('leads.activities');

// Campaign leads route
router.get('/webhook/campaigns/:campaignId', canReadLeads, getCampaignLeads);

router.get('/', canReadLeads, getAllLeads);
router.get('/export', canExportLeads, bulkExportLeads);
router.get('/duplicates', canReadLeads, getDuplicateLeads);
router.get('/tags', canReadLeads, getLeadTags);

// Bulk import routes - MUST be before /:id to avoid being matched as lead ID
router.post('/bulk-import', canImportLeads, bulkRateLimiter, uploadLeads.single('file'), bulkImportLeads);
router.get('/template', canImportLeads, downloadLeadTemplate);
router.post('/bulk-delete', canDeleteLeads, bulkRateLimiter, bulkDeleteLeads);

router.get('/:id', canReadLeads, getLeadById);
router.get('/:id/activities', canReadLeads, getLeadActivities);
router.get('/:id/followups', canReadLeads, getLeadFollowUps);
router.get('/:id/tags', canReadLeads, getLeadTagsByLeadId);

router.post('/', canCreateLeads, leadValidation, createLead);
router.post('/merge', canMergeLeads, bulkRateLimiter, mergeLeads);
router.post('/tags', canManageTags, createLeadTag);
router.post('/:id/tags', canManageTags, assignLeadTags);
router.post('/:id/transfer', canTransferLeads, transferLead);

router.patch('/:id', canEditLeads, updateLead);
router.delete('/:id', canDeleteLeads, deleteLead);

router.post('/:id/activities', canLogActivity, createLeadActivity);

export default router;
