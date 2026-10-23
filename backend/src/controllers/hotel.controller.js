import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';
import {
  destinationLabel,
  destinationRefSelect,
  destinationScopeIds,
} from '../services/destinationTree.service.js';
import {
  extractPublicId,
  uploadToCloudinary,
  deleteFromCloudinary,
} from '../services/cloudinary.service.js';

export const hotelValidation = [
  body('name').notEmpty().trim().withMessage('Hotel name is required'),
  body('category')
    .optional()
    .isIn(['BUDGET', 'STANDARD', 'PREMIUM', 'LUXURY'])
    .withMessage('Valid category is required'),
  body('stars').optional().isInt({ min: 1, max: 5 }).withMessage('Stars must be between 1 and 5'),
  // Either side is accepted: `destinationId` files the hotel under a destination,
  // `location` is the free-text label. A hotel needs at least one of them.
  body('destinationId').optional({ nullable: true }),
  body('location')
    .custom((value, { req }) => {
      if (req.body.destinationId) return true;
      if (typeof value === 'string' && value.trim()) return true;
      throw new Error('Location is required');
    }),
  body('address').optional(),
  body('city').optional(),
  body('state').optional(),
  body('country').optional(),
  body('zipCode').optional(),
  body('latitude').optional().isFloat().withMessage('Latitude must be a valid number'),
  body('longitude').optional().isFloat().withMessage('Longitude must be a valid number'),
  body('phone').optional(),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('website').optional(),
  body('amenities').optional().isArray().withMessage('Amenities must be an array'),
  body('pricePerNight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price per night must be a positive number'),
  body('currency')
    .optional()
    .isIn(['INR', 'MUR', 'MYR', 'USD', 'EUR', 'THB'])
    .withMessage('Invalid currency'),
  body('images').optional(),
  body('description').optional(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('roomTypes').optional().isArray().withMessage('roomTypes must be an array'),
  body('mealPlans').optional().isArray().withMessage('mealPlans must be an array'),
];

/**
 * Resolve the destination a write refers to and the label that goes with it.
 * Returns null when the id does not exist, so callers can 400 cleanly.
 */
const resolveDestination = async destinationId => {
  if (!destinationId) return { node: null };
  const node = await prisma.destination.findUnique({
    where: { id: destinationId },
    include: { parent: { select: { id: true, name: true } } },
  });
  if (!node) return null;
  return { node, label: destinationLabel(node) };
};

export const getAllHotels = async (req, res) => {
  try {
    const {
      search,
      category,
      stars,
      isActive,
      destinationId,
      page = 1,
      limit = 20,
      ids,
    } = req.query;

    const where = {};

    if (category) where.category = category;
    if (stars) where.stars = parseInt(stars);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (ids) {
      const idList = ids
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
      if (idList.length > 0) where.id = { in: idList };
    }

    // Picking "Kashmir" must also return hotels filed under Gulmarg and Pahalgam.
    if (destinationId) {
      where.destinationId = { in: await destinationScopeIds(destinationId) };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { destination: { name: { contains: search, mode: 'insensitive' } } },
        { destination: { parent: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { destination: destinationRefSelect },
      }),
      prisma.hotel.count({ where }),
    ]);

    // Parse JSON fields from Prisma Json type
    // Non-main branch users get roomTypes/mealPlans without pricing data
    const parsedHotels = hotels.map(h => {
      const base = { ...h };
      base.roomTypes = typeof h.roomTypes === 'string' ? JSON.parse(h.roomTypes || '[]') : h.roomTypes || [];
      base.mealPlans = typeof h.mealPlans === 'string' ? JSON.parse(h.mealPlans || '[]') : h.mealPlans || [];

      // Strip prices for non-main branches - they must add prices manually
      if (req.user.branchId !== 'branch-main') {
        base.pricePerNight = null;
        base.currency = null;
        base.roomTypes = base.roomTypes.map((rt) => ({
          name: rt.name,
          bedType: rt.bedType,
          basePrice: 0,
          extraBedPrice: 0,
          childPrice: 0,
        }));
        base.mealPlans = base.mealPlans.map((mp) => ({
          type: mp.type,
          label: mp.label,
          pricePerNight: 0,
        }));
      }
      return base;
    });

    res.json({
      success: true,
      data: {
        hotels: parsedHotels,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hotels',
    });
  }
};

export const getHotelById = async (req, res) => {
  try {
    const { id } = req.params;
    const isMainBranch = req.user.branchId === 'branch-main';

    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: { destination: destinationRefSelect },
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found. It may have been deleted or does not exist.',
      });
    }

    const rawRoomTypes = typeof hotel.roomTypes === 'string'
      ? JSON.parse(hotel.roomTypes || '[]')
      : hotel.roomTypes || [];
    const rawMealPlans = typeof hotel.mealPlans === 'string'
      ? JSON.parse(hotel.mealPlans || '[]')
      : hotel.mealPlans || [];

    const response = {
      id: hotel.id,
      name: hotel.name,
      category: hotel.category,
      stars: hotel.stars,
      location: hotel.location,
      destinationId: hotel.destinationId,
      destination: hotel.destination,
      address: hotel.address,
      city: hotel.city,
      state: hotel.state,
      country: hotel.country,
      zipCode: hotel.zipCode,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      phone: hotel.phone,
      email: hotel.email,
      website: hotel.website,
      amenities: hotel.amenities,
      images: hotel.images,
      description: hotel.description,
      isActive: hotel.isActive,
      createdAt: hotel.createdAt,
      updatedAt: hotel.updatedAt,
      roomTypes: [],
      mealPlans: [],
      pricePerNight: null,
      currency: null,
    };

    if (isMainBranch) {
      response.roomTypes = rawRoomTypes;
      response.mealPlans = rawMealPlans;
      response.pricePerNight = hotel.pricePerNight;
      response.currency = hotel.currency;
    } else {
      // Strip prices for non-main branches - they must add prices manually
      response.roomTypes = rawRoomTypes.map((rt) => ({
        name: rt.name,
        bedType: rt.bedType,
        basePrice: 0,
        extraBedPrice: 0,
        childPrice: 0,
      }));
      response.mealPlans = rawMealPlans.map((mp) => ({
        type: mp.type,
        label: mp.label,
        pricePerNight: 0,
      }));
      response.pricePerNight = null;
      response.currency = null;
    }

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching hotel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hotel',
    });
  }
};

export const createHotel = async (req, res) => {
  try {
    // Only main branch users can create hotels
    if (req.user.branchId !== 'branch-main') {
      return res.status(403).json({
        success: false,
        error: 'Only main branch users can create hotels',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      category,
      stars,
      location,
      destinationId,
      address,
      city,
      state,
      country,
      zipCode,
      latitude,
      longitude,
      phone,
      email,
      website,
      amenities,
      pricePerNight,
      currency,
      images,
      description,
      isActive,
      roomTypes,
      mealPlans,
    } = req.body;

    const resolved = await resolveDestination(destinationId);
    if (!resolved) {
      return res.status(400).json({ success: false, error: 'Destination not found' });
    }

    const hotel = await prisma.hotel.create({
      data: {
        name,
        category: category || 'STANDARD',
        stars: stars ? parseInt(stars) : 3,
        destinationId: resolved.node?.id || null,
        // A picked destination wins over whatever text came with the form, so the
        // label can never drift from the tree.
        location: resolved.node ? resolved.label : location,
        address,
        city,
        state,
        country,
        zipCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        phone,
        email,
        website,
        amenities: amenities || [],
        pricePerNight: pricePerNight ? parseFloat(pricePerNight) : null,
        currency:
          currency && ['INR', 'MUR', 'MYR', 'USD', 'EUR', 'THB'].includes(currency)
            ? currency
            : 'INR',
        images: images || [],
        description,
        isActive: isActive !== undefined ? isActive : true,
        roomTypes: roomTypes || [],
        mealPlans: mealPlans || [],
      },
      include: { destination: destinationRefSelect },
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.CREATE,
      entity: AuditEntity.HOTEL,
      entityId: hotel.id,
      description: `Created hotel: ${hotel.name}`,
    });

    res.status(201).json({
      success: true,
      data: {
        ...hotel,
        images: hotel.images || [],
        roomTypes: hotel.roomTypes || [],
        mealPlans: hotel.mealPlans || [],
      },
    });
  } catch (error) {
    console.error('Error creating hotel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create hotel',
    });
  }
};

export const updateHotel = async (req, res) => {
  // Only main branch users can update hotels
  if (req.user.branchId !== 'branch-main') {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
    });
  }

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const existingHotel = await prisma.hotel.findUnique({
      where: { id },
    });

    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found. It may have been deleted or does not exist.',
      });
    }

    const {
      name,
      category,
      stars,
      location,
      destinationId,
      address,
      city,
      state,
      country,
      zipCode,
      latitude,
      longitude,
      phone,
      email,
      website,
      amenities,
      pricePerNight,
      currency,
      images,
      description,
      isActive,
      roomTypes,
      mealPlans,
    } = req.body;

    // `undefined` leaves the link alone; `null` clears it back to a plain label.
    const nextDestinationId =
      destinationId !== undefined ? destinationId || null : existingHotel.destinationId;
    const resolved = await resolveDestination(nextDestinationId);
    if (!resolved) {
      return res.status(400).json({ success: false, error: 'Destination not found' });
    }

    const hotel = await prisma.hotel.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingHotel.name,
        category: category !== undefined ? category : existingHotel.category,
        stars: stars !== undefined ? parseInt(stars) : existingHotel.stars,
        destinationId: resolved.node?.id || null,
        location: resolved.node
          ? resolved.label
          : location !== undefined
            ? location
            : existingHotel.location,
        address: address !== undefined ? address : existingHotel.address,
        city: city !== undefined ? city : existingHotel.city,
        state: state !== undefined ? state : existingHotel.state,
        country: country !== undefined ? country : existingHotel.country,
        zipCode: zipCode !== undefined ? zipCode : existingHotel.zipCode,
        latitude: latitude !== undefined ? parseFloat(latitude) : existingHotel.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : existingHotel.longitude,
        phone: phone !== undefined ? phone : existingHotel.phone,
        email: email !== undefined ? email : existingHotel.email,
        website: website !== undefined ? website : existingHotel.website,
        amenities: amenities !== undefined ? amenities : existingHotel.amenities,
        pricePerNight:
          pricePerNight !== undefined ? parseFloat(pricePerNight) : existingHotel.pricePerNight,
        currency: currency !== undefined ? currency : existingHotel.currency,
        images: images !== undefined ? images : existingHotel.images,
        description: description !== undefined ? description : existingHotel.description,
        isActive: isActive !== undefined ? isActive : existingHotel.isActive,
        roomTypes: roomTypes !== undefined ? roomTypes : existingHotel.roomTypes,
        mealPlans: mealPlans !== undefined ? mealPlans : existingHotel.mealPlans,
      },
      include: { destination: destinationRefSelect },
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.HOTEL,
      entityId: hotel.id,
      description: `Updated hotel: ${hotel.name}`,
    });

    res.json({
      success: true,
      data: {
        ...hotel,
        images: hotel.images || [],
        roomTypes: hotel.roomTypes || [],
        mealPlans: hotel.mealPlans || [],
      },
    });
  } catch (error) {
    console.error('Error updating hotel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hotel',
    });
  }
};

export const deleteHotel = async (req, res) => {
  // Only main branch users can delete hotels
  if (req.user.branchId !== 'branch-main') {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
    });
  }

  try {
    const { id } = req.params;

    const existingHotel = await prisma.hotel.findUnique({
      where: { id },
    });

    if (!existingHotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found. It may have been deleted or does not exist.',
      });
    }

    // Delete hotel images from Cloudinary
    const images = existingHotel.images || [];
    for (const imageUrl of images) {
      const publicId = extractPublicId(imageUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    await prisma.hotel.delete({
      where: { id },
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.DELETE,
      entity: AuditEntity.HOTEL,
      entityId: id,
      description: `Deleted hotel: ${existingHotel.name}`,
    });

    res.json({
      success: true,
      message: 'Hotel deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting hotel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete hotel',
    });
  }
};

export const uploadHotelImage = async (req, res) => {
  try {
    const { id } = req.params;

    const hotel = await prisma.hotel.findUnique({
      where: { id },
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found. It may have been deleted or does not exist.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Upload to Cloudinary with optimization
    const { url } = await uploadToCloudinary(req.file.buffer, 'travel-crm/hotels');

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
    console.error('Error uploading hotel image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
    });
  }
};

export const deleteHotelImage = async (req, res) => {
  try {
    const { id, imageIndex } = req.params;

    const hotel = await prisma.hotel.findUnique({
      where: { id },
    });

    if (!hotel) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found. It may have been deleted or does not exist.',
      });
    }

    const images = [...(hotel.images || [])];
    const index = parseInt(imageIndex);

    if (index < 0 || index >= images.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image index',
      });
    }

    // Delete from Cloudinary if it's a Cloudinary URL
    const imageUrl = images[index];
    const publicId = extractPublicId(imageUrl);
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    images.splice(index, 1);

    const updatedHotel = await prisma.hotel.update({
      where: { id },
      data: { images },
    });

    res.json({
      success: true,
      data: {
        images: updatedHotel.images,
      },
    });
  } catch (error) {
    console.error('Error deleting hotel image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
    });
  }
};
