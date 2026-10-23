import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  createUserValidation,
  getPermissionCatalog,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

// Feature catalog for the permission picker — any authenticated user may read it
// so the frontend can label the permissions it already holds.
router.get('/permissions/catalog', getPermissionCatalog);

router.get('/', getAllUsers);
router.get('/:id', getUserById);

// Staff administration is gated by the feature rather than the role, so an admin
// can delegate it. Granting feature permissions themselves stays ADMIN-only —
// that check lives in updateUser.
router.post('/', requirePermission('users.create'), createUserValidation, createUser);
router.patch('/:id', updateUser);
router.delete('/:id', requirePermission('users.delete'), deleteUser);

export default router;
