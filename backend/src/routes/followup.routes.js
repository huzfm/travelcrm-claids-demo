import { Router } from 'express';
import {
  getAllFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getFollowUpDashboard,
  getFollowUpCalendar,
  followUpValidation,
} from '../controllers/followup.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// The dashboard and performance views summarise follow-ups, so they may read
// them; only the Follow-ups module may create or change one.
const canReadFollowUps = requirePermission('followups', 'dashboard', 'performance', 'leads');
const canCreateFollowUps = requirePermission('followups.create');
const canEditFollowUps = requirePermission('followups.edit');
const canDeleteFollowUps = requirePermission('followups.delete');

router.get('/', canReadFollowUps, getAllFollowUps);
router.get('/dashboard', canReadFollowUps, getFollowUpDashboard);
router.get('/calendar', canReadFollowUps, getFollowUpCalendar);
router.get('/:id', canReadFollowUps, getFollowUpById);

router.post('/', canCreateFollowUps, followUpValidation, createFollowUp);
router.patch('/:id', canEditFollowUps, updateFollowUp);
router.delete('/:id', canDeleteFollowUps, deleteFollowUp);

export default router;
