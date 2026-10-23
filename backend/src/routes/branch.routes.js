import { Router } from 'express';
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats,
  branchValidation,
} from '../controllers/branch.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// Branch records are reference data that most screens need (filters, currency,
// letterhead), so reads stay open to any signed-in user. Changing a branch
// requires the Branches module.
const canCreateBranches = requirePermission('branches.create');
const canEditBranches = requirePermission('branches.edit');
const canSeeBranchStats = requirePermission('branches.stats');

router.get('/', getAllBranches);
router.get('/:id', getBranchById);
router.get('/:id/stats', canSeeBranchStats, getBranchStats);

router.post('/', canCreateBranches, branchValidation, createBranch);
router.patch('/:id', canEditBranches, updateBranch);
router.delete('/:id', requireRole('ADMIN'), deleteBranch);

export default router;
