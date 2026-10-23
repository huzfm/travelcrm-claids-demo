/**
 * User WhatsApp Routes - Per-user WhatsApp instance management
 *
 * Endpoints:
 * - User routes: /my/* (connect, disconnect, status, QR)
 * - Manager routes: /manager/* (team WhatsApp status)
 * - Admin routes: /admin/* (all users, bulk operations)
 * - Webhooks: /webhooks/:userId (Evolution API callbacks)
 *
 * IMPORTANT: This handles USER instances only.
 * The central instance (OTP/2FA) is handled separately.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getUserWhatsAppStatus,
  setupUserWhatsApp,
  getUserQRCode,
  refreshUserQRCode,
  connectUserWhatsApp,
  disconnectUserWhatsApp,
  deleteUserWhatsApp,
  getManagerTeamWhatsApp,
  getAdminAllInstances,
  getAdminBranchUsers,
  deleteAdminUserInstance,
  restartAdminUserInstance,
  bulkCreateInstances,
  getAdminCentralInstance,
} from '../controllers/user-whatsapp.controller.js';

const router = Router();

// /user-webhook is mounted by ./whatsapp-webhook.routes.js BEFORE this
// router so it stays open to Evolution API. Do not redefine it here —
// doing so would conflict with the auth middleware below.

router.use(authenticate);

// Per-route guards: sibling routers share the /whatsapp mount, so a
// router-level guard here would reject their traffic too.
const canUseWhatsApp = requirePermission('whatsapp', 'whatsapp_all');
const canUseAllInboxes = requirePermission('whatsapp_all');

// User's own WhatsApp instance management. Every staff member runs their own
// number, so WhatsApp access alone is enough to set it up, scan its QR and
// unlink it. These handlers only ever act on req.user.id — nobody can touch
// another user's number through them. `whatsapp.connect` governs the branch's
// shared number (whatsapp.routes.js), not this.
router.get('/my/status', canUseWhatsApp, getUserWhatsAppStatus);
router.post('/my/setup', canUseWhatsApp, setupUserWhatsApp);
router.get('/my/qr', canUseWhatsApp, getUserQRCode);
router.post('/my/qr/refresh', canUseWhatsApp, refreshUserQRCode);
router.post('/my/connect', canUseWhatsApp, connectUserWhatsApp);
router.post('/my/disconnect', canUseWhatsApp, disconnectUserWhatsApp);
router.post('/my/delete', canUseWhatsApp, deleteUserWhatsApp);

// ============================================================
// MANAGER ROUTES - Manager role only
// ============================================================

router.get('/manager/team', canUseAllInboxes, getManagerTeamWhatsApp);

// ============================================================
// ADMIN ROUTES - Admin role only
// ============================================================

router.get('/admin/all', canUseAllInboxes, getAdminAllInstances);
router.get('/admin/central-instance', canUseAllInboxes, getAdminCentralInstance);
router.get('/admin/branch/:branchId/users', canUseAllInboxes, getAdminBranchUsers);
router.delete('/admin/user/:userId', canUseAllInboxes, deleteAdminUserInstance);
router.post('/admin/user/:userId/restart', canUseAllInboxes, restartAdminUserInstance);
router.post('/admin/bulk-create', canUseAllInboxes, bulkCreateInstances);

export default router;
