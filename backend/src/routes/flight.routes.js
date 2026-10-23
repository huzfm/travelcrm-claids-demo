import { Router } from 'express';
import {
  lookupFlightByNumber,
  getFlightProvider,
  flightLookupValidation,
} from '../controllers/flight.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);
// Flight lookup exists only to fill in an itinerary's flight section, so it rides
// on the itinerary permissions rather than owning a module of its own.
router.use(requirePermission('itineraries', 'itinerary_templates'));

router.get('/provider', getFlightProvider);
router.get('/lookup', flightLookupValidation, lookupFlightByNumber);

export default router;
