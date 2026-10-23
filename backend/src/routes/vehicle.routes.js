import express from 'express';
const router = express.Router();
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  getVehicleTypes,
  getVehicleCategories,
  vehicleValidation,
} from '../controllers/vehicle.controller.js';

// Auth middleware for all routes
router.use(authenticate);
// Vehicle records are also picked from inside the itinerary builder.
router.use(requirePermission('vehicles', 'itineraries'));

// List vehicles with pagination and filters
const canCreate = requirePermission('vehicles.create');
const canEdit = requirePermission('vehicles.edit');
const canDelete = requirePermission('vehicles.delete');

router.get('/', getAllVehicles);

// Search vehicles (for autocomplete)
router.get('/search', searchVehicles);

// Get vehicle types for dropdown
router.get('/types', getVehicleTypes);

// Get vehicle categories for dropdown
router.get('/categories', getVehicleCategories);

// Single vehicle routes
router.get('/:id', getVehicleById);
router.post('/', canCreate, vehicleValidation, createVehicle);
router.put('/:id', canEdit, vehicleValidation, updateVehicle);
router.delete('/:id', canDelete, deleteVehicle);

export default router;
