import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getOverview,
  getSalesStats,
  getFollowUpSummary,
  getTripTimings,
  getDuePaymentTrips,
} from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('dashboard'));

// Everything in one call, for the dashboard's initial load
router.get('/overview', getOverview);

// Individual panels, for refreshing one card without refetching the rest
router.get('/sales-stats', getSalesStats);
router.get('/followups', getFollowUpSummary);
router.get('/trip-timings', getTripTimings);
router.get('/due-trips', getDuePaymentTrips);

export default router;
