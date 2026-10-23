import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';

const router = express.Router();

const IMAGE_FILE_FILTER = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
};

// Multer config for memory storage (direct Cloudinary upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: IMAGE_FILE_FILTER,
});

// POST /image is reached from the hotel form (manually-entered hotels), the PDF
// cover image and the custom Thank You page image. Files over 500KB are
// rejected outright (no server-side compression); the frontend enforces the
// same limit for instant feedback before the upload even starts.
const MAX_IMAGE_BYTES = 500 * 1024;

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: IMAGE_FILE_FILTER,
});

// Auth required for all upload routes
router.use(authenticate);

/**
 * Profile photo upload.
 *
 * Deliberately above the module gate below: every user may set their own photo,
 * including staff who hold no feature permissions at all. Whether they may
 * attach it to *someone else's* account is decided by PATCH /users/:id.
 */
router.post('/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { url } = await uploadToCloudinary(req.file.buffer, 'travel-crm/avatars', {
      public_id: `${uuidv4()}`,
      // Square crop focused on the face — avatars are always rendered in a circle.
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
    });

    res.json({ success: true, data: { url } });
  } catch (error) {
    console.error('[Upload Avatar] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload photo',
    });
  }
});

// Uploading is only ever reached from a module that stores the resulting URL, so
// holding one of those is the requirement — a user with no modules cannot push
// files into the Cloudinary account.
router.use(
  requirePermission(
    'itineraries',
    'itinerary_templates',
    'pdf_settings',
    'destinations',
    'hotels',
    'vehicles',
    'leads',
    'whatsapp',
    'branches'
  )
);

// Upload single image for itinerary day
router.post('/image', uploadImage.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const type = req.body.type || 'hotel';
    const folder = type === 'hotel' ? 'travel-crm/hotels' : 'travel-crm/itinerary-days';

    const { url } = await uploadToCloudinary(req.file.buffer, folder, {
      public_id: `${uuidv4()}-${req.file.originalname.replace(/\.[^.]+$/, '')}`,
    });

    res.json({
      success: true,
      data: {
        url,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('[Upload Image] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload image',
    });
  }
});

export default router;
