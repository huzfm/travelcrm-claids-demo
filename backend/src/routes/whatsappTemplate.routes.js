import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
} from '../controllers/whatsappTemplate.controller.js';

const router = express.Router();

router.use(authenticate);
// Templates are inserted straight from the WhatsApp composer.
router.use(requirePermission('whatsapp_templates', 'whatsapp'));

// Routes - Admin and Manager only
router.get('/', getWhatsAppTemplates);
router.post('/', requirePermission('whatsapp_templates.create'), createWhatsAppTemplate);
router.patch('/:id', requirePermission('whatsapp_templates.edit'), updateWhatsAppTemplate);
router.delete('/:id', requirePermission('whatsapp_templates.delete'), deleteWhatsAppTemplate);

export default router;
