import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAllTrips,
  getTripById,
  getTripStats,
  getUpcomingTrips,
  recordPayment,
  getTripPayments,
  deletePayment,
  uploadReceipt,
  updateTripStatus,
} from '../controllers/trip.controller.js';

const router = express.Router();

// Configure multer for file uploads (receipts)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticate);
// Trip, payment and payable data backs the booked-client views and dashboard.
router.use(requirePermission('trips', 'booked_clients', 'dashboard'));

// The money sections are separately grantable — someone can run trips without
// touching customer payments.
const canSetStatus = requirePermission('trips.status');
const canManagePayments = requirePermission('trips.payments');

// Get all trips with filtering
router.get('/', getAllTrips);

// Get trip stats/analytics
router.get('/stats', getTripStats);

// Get upcoming trips (next 30 days)
router.get('/upcoming', getUpcomingTrips);

// Get single trip by ID
router.get('/:id', getTripById);

// Set the trip lifecycle status (DRAFT / CONFIRMED / CANCELLED)
router.patch('/:id/status', canSetStatus, updateTripStatus);

// Payment routes
// Get all payments for a trip
router.get('/:id/payments', canManagePayments, getTripPayments);

// Record a new payment
router.post('/:id/payments', canManagePayments, recordPayment);

// Delete a payment
router.delete('/:id/payments/:paymentId', canManagePayments, deletePayment);

// Upload receipt for a payment
router.post('/:id/payments/:paymentId/receipt', canManagePayments, upload.single('receipt'), uploadReceipt);

export default router;
