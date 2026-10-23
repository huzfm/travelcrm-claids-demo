import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';
import {
  buildDestinationData,
  buildDestinationTree,
  destinationPath,
  syncHotelLabels,
  validateParent,
} from '../services/destinationTree.service.js';

export const destinationValidation = [
  body('name').notEmpty().trim().withMessage('Destination name is required'),
  // Omitted or null makes this a master destination; an id files it inside that master.
  body('parentId').optional({ nullable: true }),
  // A master is a grouping, so it needs a country and no address. A destination
  // inside one is a real place, so it needs an address and inherits the country.
  body('country')
    .custom((value, { req }) => {
      if (req.body.parentId) return true;
      if (typeof value === 'string' && value.trim()) return true;
      throw new Error('Country is required for a master destination');
    }),
  body('address')
    .custom((value, { req }) => {
      if (!req.body.parentId) return true;
      if (typeof value === 'string' && value.trim()) return true;
      throw new Error('Address is required');
    }),
  body('placeType')
    .optional()
    .isIn([
      'MOUNTAIN',
      'BEACH',
      'CITY',
      'DESERT',
      'FOREST',
      'HISTORICAL',
      'ADVENTURE',
      'RELIGIOUS',
      'OTHER',
    ])
    .withMessage('Valid place type is required'),
  body('shortDescription').optional(),
  body('description').optional(),
  body('highlights').optional().isArray().withMessage('Highlights must be an array'),
  body('amenities').optional().isArray().withMessage('Amenities must be an array'),
  body('bestTimeToVisit').optional(),
  body('averageTemperature').optional(),
  body('language').optional(),
  body('currency').optional(),
  body('timezone').optional(),
  body('thingsToKnow').optional(),
  body('altNames').optional().isArray().withMessage('Alt names must be an array'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

// The parent and the counts every list view needs to show the tree.
const treeInclude = {
  parent: { select: { id: true, name: true } },
  _count: { select: { children: true, hotels: true } },
};

const parseJsonFields = destination => ({
  ...destination,
  highlights:
    typeof destination.highlights === 'string'
      ? JSON.parse(destination.highlights || '[]')
      : destination.highlights || [],
  amenities:
    typeof destination.amenities === 'string'
      ? JSON.parse(destination.amenities || '[]')
      : destination.amenities || [],
  altNames:
    typeof destination.altNames === 'string'
      ? JSON.parse(destination.altNames || '[]')
      : destination.altNames || [],
});

// GET /api/v1/destinations
export const getAllDestinations = async (req, res) => {
  try {
    const { search, placeType, isActive, parentId, page = 1, limit = 20 } = req.query;

    const where = {};

    if (placeType) where.placeType = placeType;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    // `parentId=root` narrows to the master destinations only.
    if (parentId) where.parentId = parentId === 'root' ? null : parentId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        // Searching "Kashmir" should surface Gulmarg too.
        { parent: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [destinations, total] = await Promise.all([
      prisma.destination.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: treeInclude,
      }),
      prisma.destination.count({ where }),
    ]);

    // Parse JSON fields from Prisma Json type
    const parsedDestinations = destinations.map(parseJsonFields);

    res.json({
      success: true,
      data: {
        destinations: parsedDestinations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch destinations' });
  }
};

// GET /api/v1/destinations/tree
// Master destinations with the ones inside them nested — what the destinations
// page and the hotel form picker render.
export const getDestinationTree = async (req, res) => {
  try {
    const { isActive } = req.query;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rows = await prisma.destination.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        country: true,
        address: true,
        placeType: true,
        shortDescription: true,
        isActive: true,
        parentId: true,
        _count: { select: { children: true, hotels: true } },
      },
    });

    res.json({ success: true, data: { tree: buildDestinationTree(rows) } });
  } catch (error) {
    console.error('Error fetching destination tree:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch destination tree' });
  }
};

// GET /api/v1/destinations/:id
export const getDestinationById = async (req, res) => {
  try {
    const { id } = req.params;

    const destination = await prisma.destination.findUnique({
      where: { id },
      include: {
        ...treeInclude,
        children: { orderBy: { name: 'asc' }, include: treeInclude },
      },
    });

    if (!destination) {
      return res.status(404).json({
        success: false,
        error: 'Destination not found. It may have been deleted or does not exist.',
      });
    }

    res.json({ success: true, data: parseJsonFields(destination) });
  } catch (error) {
    console.error('Error fetching destination:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch destination' });
  }
};

// POST /api/v1/destinations
export const createDestination = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, parentId } = req.body;

    const parentCheck = await validateParent(parentId);
    if (!parentCheck.ok) {
      return res.status(400).json({ success: false, error: parentCheck.error });
    }

    const duplicate = await prisma.destination.findFirst({
      where: { name: name.trim(), parentId: parentId || null },
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: parentCheck.parent
          ? `"${name.trim()}" already exists inside ${parentCheck.parent.name}`
          : `"${name.trim()}" already exists as a master destination`,
      });
    }

    const destination = await prisma.destination.create({
      data: {
        ...buildDestinationData({ body: req.body, parentId }),
        createdBy: req.user.id,
        branchId: req.user.branchId,
      },
      include: treeInclude,
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.CREATE,
      entity: AuditEntity.DESTINATION,
      entityId: destination.id,
      description: `Created destination: ${destinationPath(destination)}`,
    });

    res.status(201).json({
      success: true,
      data: {
        ...destination,
        highlights: destination.highlights || [],
        amenities: destination.amenities || [],
        altNames: destination.altNames || [],
      },
    });
  } catch (error) {
    console.error('Error creating destination:', error);
    if (error.code === 'P2002') {
      return res
        .status(409)
        .json({ success: false, error: 'Destination with this name already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create destination' });
  }
};

// PUT /api/v1/destinations/:id
export const updateDestination = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;

    const existingDestination = await prisma.destination.findUnique({
      where: { id },
      include: treeInclude,
    });

    if (!existingDestination) {
      return res.status(404).json({
        success: false,
        error: 'Destination not found. It may have been deleted or does not exist.',
      });
    }

    const { name, parentId } = req.body;

    // `undefined` leaves the placement alone; `null` promotes it to a master.
    const nextParentId = parentId !== undefined ? parentId || null : existingDestination.parentId;
    const nextName = name !== undefined ? name.trim() : existingDestination.name;

    if (nextParentId === id) {
      return res.status(400).json({
        success: false,
        error: 'A destination cannot be placed inside itself',
      });
    }

    // A destination that already holds others is a master and has to stay one,
    // otherwise the move would push its children to a third level.
    if (nextParentId && existingDestination._count.children > 0) {
      return res.status(400).json({
        success: false,
        error: `${existingDestination.name} holds ${existingDestination._count.children} destination(s), so it has to stay a master destination.`,
      });
    }

    const parentCheck = await validateParent(nextParentId);
    if (!parentCheck.ok) {
      return res.status(400).json({ success: false, error: parentCheck.error });
    }

    const moved = nextParentId !== existingDestination.parentId;
    const renamed = nextName !== existingDestination.name;

    if (moved || renamed) {
      const duplicate = await prisma.destination.findFirst({
        where: { name: nextName, parentId: nextParentId, id: { not: id } },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: parentCheck.parent
            ? `"${nextName}" already exists inside ${parentCheck.parent.name}`
            : `"${nextName}" already exists as a master destination`,
        });
      }
    }

    const data = buildDestinationData({
      body: req.body,
      existing: existingDestination,
      parentId: nextParentId,
    });

    const destination = await prisma.$transaction(async tx => {
      const updated = await tx.destination.update({
        where: { id },
        data,
        include: treeInclude,
      });

      // A rename or a move changes the label hotels carry, so refresh them here
      // and for anything nested inside.
      if (moved || renamed) {
        await syncHotelLabels(tx, updated.id);
        const children = await tx.destination.findMany({
          where: { parentId: updated.id },
          select: { id: true },
        });
        for (const child of children) {
          await syncHotelLabels(tx, child.id);
        }
      }

      return updated;
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.UPDATE,
      entity: AuditEntity.DESTINATION,
      entityId: destination.id,
      description: `Updated destination: ${destinationPath(destination)}`,
    });

    res.json({
      success: true,
      data: {
        ...destination,
        highlights: destination.highlights || [],
        amenities: destination.amenities || [],
        altNames: destination.altNames || [],
      },
    });
  } catch (error) {
    console.error('Error updating destination:', error);
    res.status(500).json({ success: false, error: 'Failed to update destination' });
  }
};

// DELETE /api/v1/destinations/:id — Hard delete
//
// Refused while destinations or hotels still sit inside — removing "Kashmir" out
// from under Gulmarg is never what someone meant.
export const deleteDestination = async (req, res) => {
  try {
    const { id } = req.params;

    const existingDestination = await prisma.destination.findUnique({
      where: { id },
      include: treeInclude,
    });

    if (!existingDestination) {
      return res.status(404).json({
        success: false,
        error: 'Destination not found. It may have been deleted or does not exist.',
      });
    }

    if (existingDestination._count.children > 0) {
      return res.status(409).json({
        success: false,
        error: `${existingDestination.name} still holds ${existingDestination._count.children} destination(s). Delete or move those first.`,
      });
    }

    if (existingDestination._count.hotels > 0) {
      return res.status(409).json({
        success: false,
        error: `${existingDestination.name} still has ${existingDestination._count.hotels} hotel(s). Move those to another destination first.`,
      });
    }

    // Hard delete — remove the record entirely from the database
    await prisma.destination.delete({
      where: { id },
    });

    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: AuditAction.DELETE,
      entity: AuditEntity.DESTINATION,
      entityId: id,
      description: `Deleted destination: ${destinationPath(existingDestination)}`,
    });

    res.json({ success: true, message: 'Destination deleted successfully' });
  } catch (error) {
    console.error('Error deleting destination:', error);
    res.status(500).json({ success: false, error: 'Failed to delete destination' });
  }
};
