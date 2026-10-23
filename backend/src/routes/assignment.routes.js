import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAssignmentRules,
  createAssignmentRule,
  updateAssignmentRule,
  deleteAssignmentRule,
} from '../controllers/assignment.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('assignment_rules'));

// Routes - Admin and Manager only
router.get('/', getAssignmentRules);
router.post('/', requirePermission('assignment_rules.create'), createAssignmentRule);
router.patch('/:id', requirePermission('assignment_rules.edit'), updateAssignmentRule);
router.delete('/:id', requirePermission('assignment_rules.delete'), deleteAssignmentRule);

export default router;
