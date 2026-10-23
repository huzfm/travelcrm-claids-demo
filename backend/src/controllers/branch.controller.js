import { body } from 'express-validator';
import prisma from '../config/prisma.js';
import { validationResult } from 'express-validator';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';

const VALID_CURRENCIES = ['INR', 'MUR', 'MYR', 'USD', 'EUR', 'THB'];

export const branchValidation = [
  body('name').notEmpty().trim().withMessage('Branch name is required'),
  body('country').notEmpty().trim().withMessage('Country is required'),
  body('timezone').notEmpty().trim().withMessage('Timezone is required'),
  body('whatsappNumber').optional().trim(),
  body('currency')
    .optional()
    .isIn(VALID_CURRENCIES)
    .withMessage('Invalid currency. Must be one of: INR, MUR, MYR, USD, EUR, THB'),
  body('email').notEmpty().trim().isEmail().normalizeEmail().withMessage('Valid branch email is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('logoUrl').optional().trim(),
  body('companyName').optional().trim(),
  body('contactPerson').optional().trim(),
  body('workingHours').optional().isArray(),
  body('instagram').optional().trim(),
];

export const getAllBranches = async (req, res) => {
  try {
    const { isActive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            leads: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        branches,
        total: branches.length,
      },
    });
  } catch (error) {
    console.error('Get all branches error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            users: true,
            leads: true,
            itineraries: true,
          },
        },
      },
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found. It may have been deleted or does not exist.',
      });
    }

    res.json({
      success: true,
      data: { branch },
    });
  } catch (error) {
    console.error('Get branch by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createBranch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const {
      name,
      country,
      timezone,
      whatsappNumber,
      currency,
      email,
      phone,
      address,
      logoUrl,
      companyName,
      contactPerson,
      workingHours,
      instagram,
    } = req.body;

    if (whatsappNumber) {
      const existing = await prisma.branch.findUnique({
        where: { whatsappNumber },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp number already registered to another branch',
        });
      }
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        country,
        timezone,
        whatsappNumber,
        currency: currency && VALID_CURRENCIES.includes(currency) ? currency : 'INR',
        email,
        phone,
        address,
        logoUrl,
        companyName,
        contactPerson,
        workingHours: workingHours || [],
        instagram,
      },
    });

    // Create audit log for branch creation
    await createAuditLog({
      action: AuditAction.CREATE,
      entity: AuditEntity.BRANCH,
      entityId: branch.id,
      userId: req.user.id,
      branchId: branch.id,
      description: `Created branch: ${branch.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: { branch },
    });
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      country,
      timezone,
      whatsappNumber,
      isActive,
      currency,
      email,
      phone,
      address,
      logoUrl,
      companyName,
      contactPerson,
      workingHours,
      instagram,
    } = req.body;

    const existing = await prisma.branch.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found. It may have been deleted or does not exist.',
      });
    }

    if (whatsappNumber && whatsappNumber !== existing.whatsappNumber) {
      const duplicate = await prisma.branch.findUnique({
        where: { whatsappNumber },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp number already registered to another branch',
        });
      }
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        country: country !== undefined ? country : existing.country,
        timezone: timezone !== undefined ? timezone : existing.timezone,
        whatsappNumber: whatsappNumber !== undefined ? whatsappNumber : existing.whatsappNumber,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        currency:
          currency !== undefined
            ? VALID_CURRENCIES.includes(currency)
              ? currency
              : existing.currency
            : existing.currency,
        email: email !== undefined ? email : existing.email,
        phone: phone !== undefined ? phone : existing.phone,
        address: address !== undefined ? address : existing.address,
        logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
        companyName: companyName !== undefined ? companyName : existing.companyName,
        contactPerson: contactPerson !== undefined ? contactPerson : existing.contactPerson,
        workingHours: workingHours !== undefined ? workingHours : existing.workingHours,
        instagram: instagram !== undefined ? instagram : existing.instagram,
      },
    });

    // Create audit log for branch update
    await createAuditLog({
      action: AuditAction.UPDATE,
      entity: AuditEntity.BRANCH,
      entityId: id,
      userId: req.user.id,
      branchId: branch.id,
      oldData: existing,
      newData: branch,
      description: `Updated branch: ${branch.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: { branch },
    });
  } catch (error) {
    console.error('Update branch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.branch.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found. It may have been deleted or does not exist.',
      });
    }

    const branch = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    // Create audit log for branch deactivation
    await createAuditLog({
      action: AuditAction.DELETE,
      entity: AuditEntity.BRANCH,
      entityId: id,
      userId: req.user.id,
      branchId: existing.id,
      description: `Deactivated branch: ${existing.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: {
        message: 'Branch deactivated successfully',
        branch,
      },
    });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getBranchStats = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({ where: { id } });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found. It may have been deleted or does not exist.',
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalLeads, totalUsers, leadsByStatus, leadsThisMonth] = await Promise.all([
      prisma.lead.count({
        where: {
          branchId: id,
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          branchId: id,
          isActive: true,
        },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        where: {
          branchId: id,
          deletedAt: null,
        },
        _count: true,
      }),
      prisma.lead.count({
        where: {
          branchId: id,
          createdAt: { gte: startOfMonth },
          deletedAt: null,
        },
      }),
    ]);

    const statusCounts = {};
    leadsByStatus.forEach(s => {
      statusCounts[s.status] = s._count;
    });

    res.json({
      success: true,
      data: {
        totalLeads,
        totalUsers,
        leadsThisMonth,
        leadsByStatus: statusCounts,
      },
    });
  } catch (error) {
    console.error('Get branch stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
