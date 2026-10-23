import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  destinationValidation,
  getAllDestinations,
  getDestinationTree,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination,
} from '../controllers/destination.controller.js';

const router = express.Router();

// Auth middleware for all routes
router.use(authenticate);
// Destinations are also browsed from inside the itinerary builder.
router.use(requirePermission('destinations', 'itineraries'));

// List destinations with pagination and filters
const canCreate = requirePermission('destinations.create');
const canEdit = requirePermission('destinations.edit');
const canDelete = requirePermission('destinations.delete');

// `/tree` must come before `/:id` so it is not matched as a destination id.
router.get('/tree', getDestinationTree);
router.get('/', getAllDestinations);

// Single destination routes
router.get('/:id', getDestinationById);
router.post('/', canCreate, destinationValidation, createDestination);
router.put('/:id', canEdit, destinationValidation, updateDestination);
router.delete('/:id', canDelete, deleteDestination);

export default router;
