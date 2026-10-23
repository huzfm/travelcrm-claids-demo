import { Router } from 'express';
import {
  getPipeline,
  getSources,
  getConversion,
  getTeamStats,
  getOfficeStats,
  getRevenue,
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// Each report is gated by its own sub-permission. The dashboard's pipeline and
// team widgets read two of these endpoints, so those also accept the dashboard
// keys — otherwise the widgets would break for someone without Analytics.

router.get('/pipeline', requirePermission('analytics.pipeline', 'dashboard.pipeline', 'dashboard', 'performance'), getPipeline);
router.get('/sources', requirePermission('analytics.sources'), getSources);
router.get('/conversion', requirePermission('analytics.conversion'), getConversion);
router.get('/team', requirePermission('analytics.team', 'performance', 'dashboard'), getTeamStats);
router.get('/offices', requireRole('ADMIN'), getOfficeStats);
router.get('/revenue', requirePermission('analytics.revenue'), getRevenue);

export default router;
