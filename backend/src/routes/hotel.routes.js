import express from 'express';
const router = express.Router();
import prisma from '../config/prisma.js';
import multer from 'multer';
import path from 'path';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  uploadHotelImage,
  deleteHotelImage,
  hotelValidation,
} from '../controllers/hotel.controller.js';

const MAX_IMAGE_BYTES = 500 * 1024;

// Multer for hotel images (memory storage - uploads directly to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  },
});

// Auth middleware for all routes
router.use(authenticate);
// Hotel records are also picked from inside the itinerary builder.
router.use(requirePermission('hotels', 'itineraries'));

// Images count as editing the record they hang off.
const canCreate = requirePermission('hotels.create');
const canEdit = requirePermission('hotels.edit');
const canDelete = requirePermission('hotels.delete');

// List hotels
router.get('/', getAllHotels);

// Single hotel routes
router.get('/:id', getHotelById);
router.post('/', canCreate, hotelValidation, createHotel);
router.put('/:id', canEdit, hotelValidation, updateHotel);
router.delete('/:id', canDelete, deleteHotel);

// Hotel image routes - only main branch can upload/delete
router.post(
  '/:id/images',
  canEdit,
  upload.single('image'),
  async (req, res, next) => {
    if (req.user.branchId !== 'branch-main') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    next();
  },
  uploadHotelImage
);
router.delete(
  '/:id/images/:imageIndex',
  canEdit,
  async (req, res, next) => {
    if (req.user.branchId !== 'branch-main') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    next();
  },
  deleteHotelImage
);

// Base64 image upload for new hotels
router.post('/:id/images/base64', canEdit, async (req, res) => {
  // Only main branch can upload images
  if (req.user.branchId !== 'branch-main') {
    return res.status(403).json({ success: false, error: 'Access denied' });
  }

  const { id } = req.params;
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({
      success: false,
      error: 'No image data provided',
    });
  }

  const base64Length = image.includes(',') ? image.slice(image.indexOf(',') + 1).length : image.length;
  const approxBytes = Math.ceil((base64Length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return res.status(413).json({
      success: false,
      error: 'File size too large',
    });
  }

  try {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found',
      });
    }

    const { uploadBase64ToCloudinary } = await import('../services/cloudinary.service.js');
    const { url } = await uploadBase64ToCloudinary(image, 'travel-crm/hotels');

    const images = [...(hotel.images || []), url];
    const updatedHotel = await prisma.hotel.update({
      where: { id },
      data: { images },
    });

    res.json({
      success: true,
      data: {
        imageUrl: url,
        images: updatedHotel.images,
      },
    });
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
    });
  }
});

export default router;
