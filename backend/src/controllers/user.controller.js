import { body } from 'express-validator';
import { ASSIGNABLE_ROLES } from '../config/roles.js';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { validationResult } from 'express-validator';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';
import { toE164, phoneConflictWhere } from '../utils/phone.js';
import {
  FEATURES,
  ROLE_DEFAULT_PERMISSIONS,
  sanitizePermissions,
  unknownPermissions,
  defaultPermissionsForRole,
} from '../config/permissions.js';
import { invalidateUserPermissions } from '../services/permission.service.js';
import { deleteUserInstance } from '../services/user-evolution.service.js';
import { userHasPermission } from '../middleware/rbac.js';
import { extractPublicId, deleteFromCloudinary } from '../services/cloudinary.service.js';

/**
 * Drop a profile photo that has just been replaced or cleared. Best-effort: the
 * user's record is already saved, so a Cloudinary hiccup must not fail the
 * request — it only leaves one orphaned asset behind.
 */
const discardOldAvatar = async (oldUrl, newUrl) => {
  if (!oldUrl || oldUrl === newUrl) return;
  const publicId = extractPublicId(oldUrl);
  if (!publicId) return;
  try {
    await deleteFromCloudinary(publicId);
  } catch (error) {
    console.error('[discardOldAvatar] Failed to delete old avatar:', error.message);
  }
};

export const createUserValidation = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().isMobilePhone('any').withMessage('Valid phone number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(ASSIGNABLE_ROLES).withMessage('Valid role is required'),
  body('branchId').notEmpty().withMessage('Branch ID is required'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
];

/**
 * Feature catalog + role presets, so the admin UI renders the permission
 * picker from a single source of truth instead of a hard-coded copy.
 */
export const getPermissionCatalog = async (req, res) => {
  res.json({
    success: true,
    data: {
      features: FEATURES,
      roleDefaults: ROLE_DEFAULT_PERMISSIONS,
    },
  });
};

export const getAllUsers = async (req, res) => {
  try {
    const { branchId, role, isActive, includeAllStaff } = req.query;

    const where = {};

    // If includeAllStaff is true, ADMIN/MANAGER can see all staff in their branch
    // STAFF users can also see all branch staff for lead transfer purposes
    if (includeAllStaff === 'true') {
      // For transfers, allow seeing all branch staff (not just self)
      if (req.user.role === 'STAFF') {
        // Staff can only see staff in their own branch
        where.branchId = req.user.branchId;
      } else if (req.user.role === 'MANAGER') {
        where.branchId = req.user.branchId;
      }
      // ADMIN can see all users across branches when includeAllStaff=true
    } else if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (req.user.role === 'STAFF') {
      where.id = req.user.id;
    } else if (branchId) {
      where.branchId = branchId;
    }
    // ADMIN without branchId sees all users across branches

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isActive: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        users,
        total: users.length,
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'STAFF' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && req.user.id !== id) {
      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser || targetUser.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isActive: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
          },
        },
        _count: {
          select: {
            leadsAssigned: true,
            assignedFollowUps: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found. The user may have been deleted or does not exist.',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { name, email, phone, password, role, branchId, permissions, avatarUrl } = req.body;

    // Permissions are deny-by-default: an omitted list creates a user with the
    // role's suggested starting set, an explicit list is taken verbatim.
    const rejected = unknownPermissions(permissions);
    if (rejected.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Unknown feature permission: ${rejected.join(', ')}`,
      });
    }

    const grantedPermissions =
      permissions === undefined
        ? defaultPermissionsForRole(role)
        : sanitizePermissions(permissions);

    // Prevent creating ADMIN users - only one admin allowed
    if (role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Cannot create admin users. Only one admin is allowed.',
      });
    }

    // A non-admin who has been granted the Staff module can add staff, but only
    // STAFF, only in their own branch, and only with features they hold
    // themselves — so delegated administration can never escalate privileges.
    if (req.user.role !== 'ADMIN') {
      if (role !== 'STAFF') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can create managers',
        });
      }

      if (branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot create users in other branches',
        });
      }

      const ownPermissions = req.permissions || [];
      const escalated = grantedPermissions.filter(feature => !ownPermissions.includes(feature));
      if (escalated.length > 0) {
        return res.status(403).json({
          success: false,
          error: `You cannot grant features you do not have yourself: ${escalated.join(', ')}`,
        });
      }
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return res.status(400).json({
        success: false,
        error: 'Branch not found',
      });
    }

    const normalizedPhone = phone ? toE164(phone) : null;

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    if (normalizedPhone) {
      const phoneWhere = phoneConflictWhere(normalizedPhone);
      if (phoneWhere) {
        const existingPhone = await prisma.user.findFirst({ where: phoneWhere });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            error: 'Phone number already registered',
          });
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: normalizedPhone,
        passwordHash,
        role,
        branchId,
        permissions: grantedPermissions,
        avatarUrl: avatarUrl || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isActive: true,
        branchId: true,
        createdAt: true,
      },
    });

    // Create audit log for user creation
    await createAuditLog({
      action: AuditAction.CREATE,
      entity: AuditEntity.USER,
      entityId: user.id,
      userId: req.user.id,
      branchId,
      description: `Created user: ${user.name} (${user.role}) with ${grantedPermissions.length} feature(s): ${grantedPermissions.join(', ') || 'none'}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, isActive, branchId, password, permissions, avatarUrl } =
      req.body;

    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'User not found. The user may have been deleted or does not exist.',
      });
    }

    // PATCH /users/:id is not permission-gated, because every user must be able
    // to edit their own profile. Editing someone else is what needs the Staff
    // module — and for a non-admin, only staff in their own branch.
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      if (!(await userHasPermission(req.user, 'users.edit'))) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to edit other users',
        });
      }

      if (existing.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot edit users in other branches',
        });
      }

      if (existing.role !== 'STAFF') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can edit managers and admins',
        });
      }
    }

    const updateData = {};

    if (name) updateData.name = name;

    if (phone !== undefined) {
      updateData.phone = phone ? toE164(phone) : null;
    }

    // An empty string clears the photo; the old Cloudinary asset is removed
    // below, once the row has actually been updated.
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered',
        });
      }
      updateData.email = email;
    }

    if (updateData.phone) {
      const phoneWhere = phoneConflictWhere(updateData.phone);
      if (phoneWhere) {
        const phoneExists = await prisma.user.findFirst({
          where: { ...phoneWhere, id: { not: id } },
        });
        if (phoneExists) {
          return res.status(400).json({
            success: false,
            error: 'Phone number already registered',
          });
        }
      }
    }

    // Only an admin may change what features a user can reach — a user must not
    // be able to widen their own access by PATCHing their own record.
    if (permissions !== undefined) {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only admins can change feature permissions',
        });
      }

      const rejected = unknownPermissions(permissions);
      if (rejected.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Unknown feature permission: ${rejected.join(', ')}`,
        });
      }

      if (existing.role === 'ADMIN') {
        return res.status(400).json({
          success: false,
          error: 'Admins already have access to every feature.',
        });
      }

      updateData.permissions = sanitizePermissions(permissions);
    }

    if (req.user.role === 'ADMIN') {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (branchId) updateData.branchId = branchId;

      // Admin can change password without requiring old password
      if (password && password.length >= 6) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
        // Invalidate all refresh tokens for this user (force re-login)
        updateData.refreshToken = null;
        updateData.tokenVersion = { increment: 1 };
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        permissions: true,
        isActive: true,
        branchId: true,
        updatedAt: true,
      },
    });

    // Permission checks read through a short-lived cache; drop this user's entry
    // so a revoked feature stops working immediately rather than after the TTL.
    invalidateUserPermissions(id);

    if (updateData.avatarUrl !== undefined) {
      await discardOldAvatar(existing.avatarUrl, updateData.avatarUrl);
    }

    // Create audit log for user update
    await createAuditLog({
      action: AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: id,
      userId: req.user.id,
      branchId: user.branchId,
      oldData: existing,
      newData: user,
      description:
        updateData.permissions !== undefined
          ? `Updated user: ${user.name} — permissions set to: ${updateData.permissions.join(', ') || 'none'}`
          : `Updated user: ${user.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete your own account',
      });
    }

    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'User not found. The user may have been deleted or does not exist.',
      });
    }

    if (existing.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete admin users',
      });
    }

    if (req.user.role !== 'ADMIN' && existing.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete users in other branches',
      });
    }

    // Their work outlives them: leads, follow-ups, itineraries and payments
    // move to someone who carries on with it — the deleting user by default.
    const transferToId = req.query.transferTo || req.user.id;
    if (transferToId === id) {
      return res.status(400).json({
        success: false,
        error: "Choose someone other than the user being deleted to take over their work",
      });
    }
    const heir = await prisma.user.findUnique({
      where: { id: transferToId },
      select: { id: true, name: true, isActive: true, branchId: true },
    });
    if (!heir || !heir.isActive) {
      return res.status(400).json({
        success: false,
        error: 'The user taking over their work must be an active user',
      });
    }
    if (req.user.role !== 'ADMIN' && heir.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Their work can only go to someone in your branch',
      });
    }

    // Their personal WhatsApp number goes with them. Best effort: a missing or
    // unreachable instance must not block removing the account.
    if (existing.evolutionInstanceName) {
      try {
        await deleteUserInstance(id);
      } catch (error) {
        console.error('Delete user: could not remove WhatsApp instance:', error.message);
      }
    }

    const from = { equals: id };
    const to = heir.id;
    await prisma.$transaction([
      prisma.lead.updateMany({ where: { assignedTo: from }, data: { assignedTo: to } }),
      prisma.lead.updateMany({ where: { createdBy: from }, data: { createdBy: to } }),
      prisma.leadActivity.updateMany({ where: { userId: from }, data: { userId: to } }),
      prisma.followUp.updateMany({ where: { assignedTo: from }, data: { assignedTo: to } }),
      prisma.followUp.updateMany({ where: { createdBy: from }, data: { createdBy: to } }),
      prisma.itinerary.updateMany({ where: { createdBy: from }, data: { createdBy: to } }),
      prisma.itineraryDraft.updateMany({ where: { createdBy: from }, data: { createdBy: to } }),
      prisma.itineraryTemplate.updateMany({ where: { createdBy: from }, data: { createdBy: to } }),
      prisma.tripPayment.updateMany({ where: { recordedBy: from }, data: { recordedBy: to } }),
      prisma.paymentSchedule.updateMany({ where: { createdBy: from }, data: { createdBy: to } }),
      prisma.supplierPayable.updateMany({ where: { createdBy: from }, data: { createdBy: to } }),
      prisma.destination.updateMany({ where: { createdBy: from }, data: { createdBy: null } }),
      // Chats on their own number, then the number's contacts.
      prisma.whatsAppMessage.deleteMany({ where: { OR: [{ userId: from }, { contact: { userId: id } }] } }),
      prisma.whatsAppContact.deleteMany({ where: { userId: from } }),
      // Rules that route new leads to them would route leads to nobody.
      prisma.assignmentRule.deleteMany({ where: { userId: from } }),
      // The audit trail keeps who actually did it, rather than crediting the heir.
      prisma.$executeRaw`
        UPDATE audit_logs
        SET user_id = ${to},
            description = ${`[by deleted user ${existing.name}] `} || COALESCE(description, '')
        WHERE user_id = ${id}`,
      prisma.user.delete({ where: { id } }),
    ]);

    invalidateUserPermissions(id);

    // Create audit log for user deletion
    await createAuditLog({
      action: AuditAction.DELETE,
      entity: AuditEntity.USER,
      entityId: id,
      userId: req.user.id,
      branchId: existing.branchId,
      description: `Deleted user: ${existing.name} (${existing.role}); their work moved to ${heir.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: {
        message: 'User deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
