import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAuditLogsHandler,
  exportAuditLogsHandler,
  getLeadAuditTrailHandler,
} from '../controllers/audit.controller.js';

const router = Router();

router.use(authenticate);
router.use(requirePermission('audit_logs'));

// GET /api/v1/audit - List audit logs
router.get('/', getAuditLogsHandler);

// GET /api/v1/audit/export - Export audit logs to CSV
router.get('/export', requirePermission('audit_logs.export'), exportAuditLogsHandler);

// GET /api/v1/audit/lead/:leadId - Get audit trail for a specific lead
router.get('/lead/:leadId', getLeadAuditTrailHandler);

export default router;
