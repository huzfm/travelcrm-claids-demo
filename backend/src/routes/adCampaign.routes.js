import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  linkLeadToCampaign,
  unlinkLeadFromCampaign,
  getCampaignStats,
  syncGoogleAds,
  syncMetaAds,
  getGoogleAuthUrl,
  googleAuthCallback,
  getMetaAuthUrl,
  metaAuthCallback,
  getGoogleAccountAuthUrl,
  googleAccountCallback,
  getMetaAccountAuthUrl,
  metaAccountCallback,
  getConnectionStatus,
  getMetaConnection,
  resubscribeMetaPage,
  disconnectMeta,
  adCampaignValidation,
} from '../controllers/adCampaign.controller.js';

const router = express.Router();

// All routes require authentication and ADMIN role only
router.use(authenticate);
// Gated by the Connected Apps feature rather than the ADMIN role, so an admin can
// delegate ad-platform management to a manager. ADMIN bypasses the check.
router.use(requirePermission('ad_campaigns'));

// OAuth, campaign edits and spend syncs are separately grantable: connecting an
// ad account is a far bigger deal than reading the numbers it produces.
const canConnect = requirePermission('ad_campaigns.connect');
const canCreate = requirePermission('ad_campaigns.create');
const canEdit = requirePermission('ad_campaigns.edit');
const canDelete = requirePermission('ad_campaigns.delete');
const canSync = requirePermission('ad_campaigns.sync');

// Get all campaigns
router.get('/', getAllCampaigns);

// Get campaign stats for dashboard
router.get('/stats', getCampaignStats);

// Connection status - drives the "connected / reconnect needed" state in the UI
router.get('/connections/status', getConnectionStatus);

// Get auth URLs for OAuth
router.get('/auth/google', canConnect, getGoogleAuthUrl);
router.get('/auth/meta', canConnect, getMetaAuthUrl);

// OAuth callbacks
router.post('/auth/google/callback', canConnect, googleAuthCallback);
router.post('/auth/meta/callback', canConnect, metaAuthCallback);

// Account-level OAuth (simple connect)
router.get('/auth/google/account', canConnect, getGoogleAccountAuthUrl);
router.post('/auth/google/account/callback', canConnect, googleAccountCallback);
router.get('/auth/meta/account', canConnect, getMetaAccountAuthUrl);
router.post('/auth/meta/account/callback', canConnect, metaAccountCallback);

// Per-branch Meta connection: Pages, ad accounts, disconnect
router.get('/meta/connection', getMetaConnection);
router.post('/meta/pages/:pageId/subscribe', canConnect, resubscribeMetaPage);
router.delete('/meta/connection', canConnect, disconnectMeta);

// Get single campaign
router.get('/:id', getCampaignById);

// Create campaign
router.post('/', canCreate, adCampaignValidation, createCampaign);

// Update campaign
router.patch('/:id', canEdit, updateCampaign);

// Delete campaign
router.delete('/:id', canDelete, deleteCampaign);

// Sync ad platform data
router.post('/:id/sync/google', canSync, syncGoogleAds);
router.post('/:id/sync/meta', canSync, syncMetaAds);

// Link lead to campaign
router.post('/:id/leads', canEdit, linkLeadToCampaign);

// Unlink lead from campaign
router.delete('/:id/leads/:leadId', canEdit, unlinkLeadFromCampaign);

export default router;
