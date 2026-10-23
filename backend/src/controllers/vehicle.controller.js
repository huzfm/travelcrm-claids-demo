import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { extractPublicId, deleteFromCloudinary } from '../services/cloudinary.service.js';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';
export const vehicleValidation = [
  body('name').notEmpty().trim().withMessage('Vehicle name is required'),
  body('vehicleType')
    .optional()
    .isIn([
      'SEDAN',
      'SUV',
      'MUV',
      'MINI_BUS',
      'BUS',
      'TEMPO_TRAVELLER',
      'CAR',
      'VAN',
      'JEEP',
      'LIMOUSINE',
      'OTHER',
    ])
    .withMessage('Valid vehicle type is required'),
  body('category')
    .optional()
    .isIn(['ECONOMY', 'STANDARD', 'PREMIUM', 'LUXURY'])
    .withMessage('Valid category is required'),
  body('registrationNumber').notEmpty().trim().withMessage('Registration number is required'),
  body('seatingCapacity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Seating capacity must be between 1 and 100'),
  body('isAc').optional().isBoolean().withMessage('isAc must be a boolean'),
  body('ratePerKm')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rate per km must be a positive number'),
  body('ratePerDay')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rate per day must be a positive number'),
  body('minimumCharge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum charge must be a positive number'),
  body('currency')
    .optional()
    .isIn(['INR', 'MUR', 'MYR', 'USD', 'EUR', 'THB'])
    .withMessage('Invalid currency'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('description').optional(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

// Get all vehicles with search and filters
export const getAllVehicles = async (req, res) => {
  try {
    const {
      search,
      vehicleType,
      category,
      seatingCapacity,
      isAc,
      isActive,
      page = 1,
      limit = 20,
    } = req.query;
    const isMainBranch = req.user.branchId === 'branch-main';

    const where = {};

    if (vehicleType) where.vehicleType = vehicleType;
    if (category) where.category = category;
    if (isAc !== undefined) where.isAc = isAc === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (seatingCapacity) {
      where.seatingCapacity = {
        gte: parseInt(seatingCapacity),
      };
    }

    if (search) {
      const searchLower = search.toLowerCase();
      where.OR = [
        { name: { contains: searchLower, mode: 'insensitive' } },
        { brand: { contains: searchLower, mode: 'insensitive' } },
        { registrationNumber: { contains: searchLower, mode: 'insensitive' } },
        { baseLocation: { contains: searchLower, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicle.count({ where }),
    ]);

    // Non-main branch users cannot see pricing data
    const parsedVehicles = vehicles.map(v => {
      if (isMainBranch) return v;
      return {
        ...v,
        ratePerKm: null,
        ratePerDay: null,
        minimumCharge: null,
        currency: null,
      };
    });

    res.json({
      success: true,
      data: {
        vehicles: parsedVehicles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicles',
    });
  }
};

// Get single vehicle by ID
export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const isMainBranch = req.user.branchId === 'branch-main';

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found. It may have been deleted or does not exist.',
      });
    }

    const response = { ...vehicle };
    if (!isMainBranch) {
      response.ratePerKm = null;
      response.ratePerDay = null;
      response.minimumCharge = null;
      response.currency = null;
    }

    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle',
    });
  }
};

// Create new vehicle
export const createVehicle = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      brand,
      vehicleType,
      category,
      registrationNumber,
      vehicleNumber,
      seatingCapacity,
      isAc,
      driverName,
      driverPhone,
      driverLicense,
      features,
      ratePerKm,
      ratePerDay,
      minimumCharge,
      currency,
      baseLocation,
      serviceArea,
      description,
      isActive,
    } = req.body;

    // Check for duplicate registration number
    const existing = await prisma.vehicle.findFirst({
      where: {
        registrationNumber: registrationNumber.toUpperCase(),
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle with this registration number already exists',
      });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        brand: brand || null,
        vehicleType: vehicleType || 'SEDAN',
        category: category || 'STANDARD',
        registrationNumber: registrationNumber.toUpperCase(),
        vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase() : null,
        seatingCapacity: seatingCapacity ? parseInt(seatingCapacity) : 4,
        isAc: isAc !== undefined ? isAc : true,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        driverLicense: driverLicense || null,
        features: features || [],
        ratePerKm: ratePerKm ? parseFloat(ratePerKm) : null,
        ratePerDay: ratePerDay ? parseFloat(ratePerDay) : null,
        minimumCharge: minimumCharge ? parseFloat(minimumCharge) : null,
        currency:
          currency && ['INR', 'MUR', 'MYR', 'USD', 'EUR', 'THB'].includes(currency)
            ? currency
            : 'INR',
        baseLocation: baseLocation || null,
        serviceArea: serviceArea || null,
        description: description || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.CREATE,
      entity: AuditEntity.VEHICLE,
      entityId: vehicle.id,
      description: `Created vehicle: ${vehicle.name} (${vehicle.registrationNumber})`,
    });

    res.status(201).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create vehicle',
    });
  }
};

// Update vehicle
export const updateVehicle = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found. It may have been deleted or does not exist.',
      });
    }

    const {
      name,
      brand,
      vehicleType,
      category,
      registrationNumber,
      vehicleNumber,
      seatingCapacity,
      isAc,
      driverName,
      driverPhone,
      driverLicense,
      features,
      ratePerKm,
      ratePerDay,
      minimumCharge,
      currency,
      baseLocation,
      serviceArea,
      description,
      isActive,
    } = req.body;

    // Check for duplicate registration number (exclude current vehicle)
    if (registrationNumber) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          registrationNumber: registrationNumber.toUpperCase(),
          NOT: { id },
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Vehicle with this registration number already exists',
        });
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingVehicle.name,
        brand: brand !== undefined ? brand : existingVehicle.brand,
        vehicleType: vehicleType !== undefined ? vehicleType : existingVehicle.vehicleType,
        category: category !== undefined ? category : existingVehicle.category,
        registrationNumber:
          registrationNumber !== undefined
            ? registrationNumber.toUpperCase()
            : existingVehicle.registrationNumber,
        vehicleNumber:
          vehicleNumber !== undefined
            ? vehicleNumber?.toUpperCase()
            : existingVehicle.vehicleNumber,
        seatingCapacity:
          seatingCapacity !== undefined
            ? parseInt(seatingCapacity)
            : existingVehicle.seatingCapacity,
        isAc: isAc !== undefined ? isAc : existingVehicle.isAc,
        driverName: driverName !== undefined ? driverName : existingVehicle.driverName,
        driverPhone: driverPhone !== undefined ? driverPhone : existingVehicle.driverPhone,
        driverLicense: driverLicense !== undefined ? driverLicense : existingVehicle.driverLicense,
        features: features !== undefined ? features : existingVehicle.features,
        ratePerKm: ratePerKm !== undefined ? parseFloat(ratePerKm) : existingVehicle.ratePerKm,
        ratePerDay: ratePerDay !== undefined ? parseFloat(ratePerDay) : existingVehicle.ratePerDay,
        minimumCharge:
          minimumCharge !== undefined ? parseFloat(minimumCharge) : existingVehicle.minimumCharge,
        currency: currency !== undefined ? currency : existingVehicle.currency,
        baseLocation: baseLocation !== undefined ? baseLocation : existingVehicle.baseLocation,
        serviceArea: serviceArea !== undefined ? serviceArea : existingVehicle.serviceArea,
        description: description !== undefined ? description : existingVehicle.description,
        isActive: isActive !== undefined ? isActive : existingVehicle.isActive,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.VEHICLE,
      entityId: vehicle.id,
      description: `Updated vehicle: ${vehicle.name} (${vehicle.registrationNumber})`,
    });

    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update vehicle',
    });
  }
};

// Delete vehicle
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found. It may have been deleted or does not exist.',
      });
    }

    // Delete images from Cloudinary
    const images = vehicle.images || [];
    for (const imageUrl of images) {
      const publicId = extractPublicId(imageUrl);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.DELETE,
      entity: AuditEntity.VEHICLE,
      entityId: id,
      description: `Deleted vehicle: ${vehicle.name} (${vehicle.registrationNumber})`,
    });

    res.json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete vehicle',
    });
  }
};

// Get vehicle types for dropdown
export const getVehicleTypes = async (req, res) => {
  try {
    const types = [
      { value: 'SEDAN', label: 'Sedan' },
      { value: 'SUV', label: 'SUV' },
      { value: 'MUV', label: 'MUV (Multi-Utility Vehicle)' },
      { value: 'MINI_BUS', label: 'Mini Bus' },
      { value: 'BUS', label: 'Bus' },
      { value: 'TEMPO_TRAVELLER', label: 'Tempo Traveller' },
      { value: 'CAR', label: 'Car' },
      { value: 'VAN', label: 'Van' },
      { value: 'JEEP', label: 'Jeep' },
      { value: 'LIMOUSINE', label: 'Limousine' },
      { value: 'OTHER', label: 'Other' },
    ];

    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error('Error fetching vehicle types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle types',
    });
  }
};

// Get vehicle categories for dropdown
export const getVehicleCategories = async (req, res) => {
  try {
    const categories = [
      { value: 'ECONOMY', label: 'Economy' },
      { value: 'STANDARD', label: 'Standard' },
      { value: 'PREMIUM', label: 'Premium' },
      { value: 'LUXURY', label: 'Luxury' },
    ];

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching vehicle categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle categories',
    });
  }
};

// Search vehicles by destination/location
export const searchVehicles = async (req, res) => {
  try {
    const { q, vehicleType, minCapacity, maxPrice } = req.query;
    const isMainBranch = req.user.branchId === 'branch-main';

    const where = {
      isActive: true,
    };

    if (vehicleType) {
      where.vehicleType = vehicleType;
    }

    if (minCapacity) {
      where.seatingCapacity = {
        ...where.seatingCapacity,
        gte: parseInt(minCapacity),
      };
    }

    if (maxPrice) {
      where.ratePerDay = {
        lte: parseFloat(maxPrice),
      };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { baseLocation: { contains: q, mode: 'insensitive' } },
        { serviceArea: { contains: q, mode: 'insensitive' } },
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      take: 20,
      orderBy: { name: 'asc' },
    });

    // Non-main branch users cannot see pricing data
    const parsedVehicles = vehicles.map(v => {
      if (isMainBranch) return v;
      return {
        ...v,
        ratePerKm: null,
        ratePerDay: null,
        minimumCharge: null,
        currency: null,
      };
    });

    res.json({
      success: true,
      data: parsedVehicles,
    });
  } catch (error) {
    console.error('Error searching vehicles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search vehicles',
    });
  }
};
