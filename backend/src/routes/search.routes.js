import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { globalSearch } from '../controllers/search.controller.js';

const router = Router();

router.use(authenticate);
// Search spans trips and leads; holding any of these is enough to use it, and
// the controller scopes what comes back by role either way.
router.use(requirePermission('dashboard', 'trips', 'leads', 'booked_clients'));

router.get('/', globalSearch);

export default router;
