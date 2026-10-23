import { Router } from 'express';
import {
  getAllItineraries,
  getBookedClients,
  getItineraryById,
  createItinerary,
  updateItinerary,
  shareItinerary,
  getTemplates,
  getTemplateUsage,
  createTemplate,
  deleteTemplate,
  saveAsTemplate,
  deleteItinerary,
  toggleTemplateStatus,
  deleteTemplateItinerary,
  debugHotelImages,
  itineraryValidation,
  bulkCreateFromTemplate,
  bulkCreateFromTemplateValidation,
} from '../controllers/itinerary.controller.js';
import {
  listItineraryDrafts,
  getItineraryDraft,
  saveItineraryDraft,
  deleteItineraryDraft,
} from '../controllers/itineraryDraft.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);
// Itinerary builder and the saved-template library share these endpoints, so the
// router accepts either module and each mutation carries its own sub-permission.
router.use(requirePermission('itineraries', 'itinerary_templates'));

const canCreate = requirePermission('itineraries.create');
const canEdit = requirePermission('itineraries.edit');
const canDelete = requirePermission('itineraries.delete');
const canShare = requirePermission('itineraries.share');
const canCreateTemplate = requirePermission('itinerary_templates.create');
const canEditTemplate = requirePermission('itinerary_templates.edit');
const canDeleteTemplate = requirePermission('itinerary_templates.delete');

router.get('/', getAllItineraries);
router.get('/booked-clients', getBookedClients);
router.get('/templates', getTemplates);
router.get('/templates/usage', getTemplateUsage);
// Incomplete itineraries the builder autosaves. Registered before `/:id`.
router.get('/drafts', listItineraryDrafts);
router.get('/drafts/:id', getItineraryDraft);
router.put('/drafts/:id', canCreate, saveItineraryDraft);
router.delete('/drafts/:id', canCreate, deleteItineraryDraft);
router.get('/:id', getItineraryById);
router.get('/:id/debug-images', debugHotelImages);

router.post('/', canCreate, itineraryValidation, createItinerary);
router.post('/templates', canCreateTemplate, createTemplate);
router.post('/bulk-from-template', canCreate, bulkCreateFromTemplateValidation, bulkCreateFromTemplate);
router.post('/:id/share', canShare, shareItinerary);
router.post('/:id/template', canCreateTemplate, saveAsTemplate);

router.patch('/:id', canEdit, updateItinerary);
router.patch('/:id/template', canEditTemplate, toggleTemplateStatus);

router.delete('/:id', canDelete, deleteItinerary);
router.delete('/templates/:id', canDeleteTemplate, deleteTemplate);
router.delete('/template-itinerary/:id', canDeleteTemplate, deleteTemplateItinerary);

export default router;
