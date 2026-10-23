/**
 * User WhatsApp Controller - Per-user, manager, and admin WhatsApp management
 *
 * Endpoints:
 * - User: /my/* (connect, disconnect, status, QR)
 * - Manager: /manager/team (team WhatsApp status)
 * - Admin: /admin/* (all users, bulk operations)
 *
 * IMPORTANT: This is for user personal WhatsApp instances.
 * The central instance (CENTRAL_WA_INSTANCE_NAME) is for OTP/2FA - DO NOT TOUCH.
 */

import prisma from '../config/prisma.js';
import {
  setupUserInstance,
  getUserInstanceStatus,
  getUserQRCode as getUserQRCodeFromService,
  refreshUserQRCode as refreshUserQRCodeFromService,
  disconnectUserInstance,
  deleteUserInstance,
  getAllInstances,
  restartUserInstance,
  bulkCreateMissingInstances,
} from '../services/user-evolution.service.js';
import { getCentralInstanceName, isCentralInstance } from '../utils/instanceGuard.js';
import { getInstanceStatus } from '../services/user-evolution.service.js';

// ============================================================
// USER ENDPOINTS
// ============================================================

/**
 * Get current user's WhatsApp status
 * GET /api/v1/whatsapp/my/status
 */
export const getUserWhatsAppStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const status = await getUserInstanceStatus(userId);

    if (!status.success) {
      return res.status(500).json({
        success: false,
        error: status.error,
      });
    }

    // Get user record with relevant fields
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        evolutionInstanceName: true,
        evolutionStatus: true,
        evolutionPhoneNumber: true,
        evolutionCreatedAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        isSetup: !!user?.evolutionInstanceName,
        instanceName: user?.evolutionInstanceName || null,
        status: status.state,
        phone: status.phone || user?.evolutionPhoneNumber || null,
        createdAt: user?.evolutionCreatedAt || null,
      },
    });
  } catch (error) {
    console.error('Get user WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp status',
    });
  }
};

/**
 * Setup user's WhatsApp instance
 * POST /api/v1/whatsapp/my/setup
 */
export const setupUserWhatsApp = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has an instance
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        evolutionInstanceName: true,
        evolutionStatus: true,
      },
    });

    if (existing?.evolutionInstanceName) {
      return res.status(400).json({
        success: false,
        error: 'You already have a WhatsApp instance setup',
        data: {
          instanceName: existing.evolutionInstanceName,
          status: existing.evolutionStatus,
        },
      });
    }

    const result = await setupUserInstance(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'WhatsApp instance created successfully',
      data: {
        instanceName: result.instanceName,
        state: result.state,
      },
    });
  } catch (error) {
    console.error('Setup user WhatsApp error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup WhatsApp instance',
    });
  }
};

/**
 * Get QR code for user's WhatsApp instance
 * GET /api/v1/whatsapp/my/qr
 */
export const getUserQRCode = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await getUserQRCodeFromService(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    if (result.alreadyConnected) {
      return res.json({
        success: true,
        data: {
          qrCode: null,
          message: 'Already connected',
          phone: result.phone,
          alreadyConnected: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        qrCode: result.qrCode,
        pairingCode: result.pairingCode,
        alreadyConnected: false,
      },
    });
  } catch (error) {
    console.error('Get user QR code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code',
    });
  }
};

/**
 * Refresh QR code for user's WhatsApp instance
 * POST /api/v1/whatsapp/my/qr/refresh
 */
export const refreshUserQRCode = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await refreshUserQRCodeFromService(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        qrCode: result.qrCode,
        pairingCode: result.pairingCode,
        alreadyConnected: result.alreadyConnected || false,
      },
    });
  } catch (error) {
    console.error('Refresh user QR code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh QR code',
    });
  }
};

/**
 * Connect user's WhatsApp (setup + get QR in one step)
 * POST /api/v1/whatsapp/my/connect
 */
export const connectUserWhatsApp = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current user state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        evolutionInstanceName: true,
        evolutionStatus: true,
        evolutionPhoneNumber: true,
      },
    });

    // If already connected, return that info
    if (user?.evolutionStatus === 'connected' && user?.evolutionPhoneNumber) {
      return res.json({
        success: true,
        data: {
          qrCode: null,
          alreadyConnected: true,
          phone: user.evolutionPhoneNumber,
        },
      });
    }

    // If instance doesn't exist, create it first
    if (!user?.evolutionInstanceName) {
      const setupResult = await setupUserInstance(userId);
      if (!setupResult.success) {
        return res.status(500).json({
          success: false,
          error: setupResult.error,
        });
      }
    }

    // Get QR code
    const qrResult = await getUserQRCodeFromService(userId);

    if (!qrResult.success) {
      return res.status(500).json({
        success: false,
        error: qrResult.error,
      });
    }

    if (qrResult.alreadyConnected) {
      return res.json({
        success: true,
        data: {
          qrCode: null,
          message: 'Already connected',
          phone: qrResult.phone,
          alreadyConnected: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        qrCode: qrResult.qrCode,
        pairingCode: qrResult.pairingCode,
        alreadyConnected: false,
      },
    });
  } catch (error) {
    console.error('Connect user WhatsApp error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect WhatsApp',
    });
  }
};

/**
 * Disconnect user's WhatsApp instance
 * POST /api/v1/whatsapp/my/disconnect
 */
export const disconnectUserWhatsApp = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has an instance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { evolutionInstanceName: true },
    });

    if (!user?.evolutionInstanceName) {
      return res.status(400).json({
        success: false,
        error: 'You do not have a WhatsApp instance to disconnect',
      });
    }

    const result = await disconnectUserInstance(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully',
    });
  } catch (error) {
    console.error('Disconnect user WhatsApp error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect WhatsApp',
    });
  }
};

/**
 * Delete user's WhatsApp instance
 * POST /api/v1/whatsapp/my/delete
 */
export const deleteUserWhatsApp = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user has an instance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { evolutionInstanceName: true },
    });

    if (!user?.evolutionInstanceName) {
      return res.status(400).json({
        success: false,
        error: 'You do not have a WhatsApp instance to delete',
      });
    }

    const result = await deleteUserInstance(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: 'WhatsApp instance deleted successfully',
    });
  } catch (error) {
    console.error('Delete user WhatsApp error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete WhatsApp instance',
    });
  }
};

// ============================================================
// MANAGER ENDPOINTS
// ============================================================

/**
 * Get all users WhatsApp status in manager's branch
 * GET /api/v1/whatsapp/manager/team
 */
export const getManagerTeamWhatsApp = async (req, res) => {
  try {
    // Check if user is manager
    if (req.user.role !== 'MANAGER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Manager or Admin role required.',
      });
    }

    const branchId = req.user.branchId;

    // Get all users in this branch with their WhatsApp status
    const users = await prisma.user.findMany({
      where: {
        branchId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        evolutionInstanceName: true,
        evolutionStatus: true,
        evolutionPhoneNumber: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get current status from Evolution API for each user
    const usersWithStatus = await Promise.all(
      users.map(async user => {
        let currentState = user.evolutionStatus || 'disconnected';
        let currentPhone = user.evolutionPhoneNumber;

        if (user.evolutionInstanceName) {
          try {
            const status = await getInstanceStatus(user.evolutionInstanceName);
            if (status.success) {
              currentState = status.state;
              currentPhone = status.phone;
            }
          } catch {
            // Instance may not exist
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: currentState,
          phoneNumber: currentPhone,
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithStatus,
        total: usersWithStatus.length,
        connected: usersWithStatus.filter(u => u.status === 'open' || u.status === 'connected')
          .length,
        disconnected: usersWithStatus.filter(
          u => u.status === 'disconnected' || u.status === 'close'
        ).length,
      },
    });
  } catch (error) {
    console.error('Get manager team WhatsApp error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team WhatsApp status',
    });
  }
};

// ============================================================
// ADMIN ENDPOINTS
// ============================================================

/**
 * Get all instances across all branches (ADMIN only)
 * GET /api/v1/whatsapp/admin/all
 */
export const getAdminAllInstances = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    const { branchId } = req.query;

    // Build user query
    const userWhere = {
      evolutionInstanceName: { not: null },
    };

    if (branchId) {
      userWhere.branchId = branchId;
    }

    // Get all users with evolution instances
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        branchId: true,
        evolutionInstanceName: true,
        evolutionStatus: true,
        evolutionPhoneNumber: true,
        evolutionCreatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }],
    });

    // Get current status from Evolution API for each user
    const usersWithStatus = await Promise.all(
      users.map(async user => {
        let currentState = user.evolutionStatus || 'disconnected';
        let currentPhone = user.evolutionPhoneNumber;

        try {
          const status = await getInstanceStatus(user.evolutionInstanceName);
          if (status.success) {
            currentState = status.state;
            currentPhone = status.phone;
          }
        } catch {
          // Instance may not exist
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          branch: user.branch,
          instanceName: user.evolutionInstanceName,
          status: currentState,
          phoneNumber: currentPhone,
          createdAt: user.evolutionCreatedAt,
        };
      })
    );

    // Get all instances from Evolution API
    const evolutionResult = await getAllInstances();
    const evolutionInstanceNames = evolutionResult.success
      ? evolutionResult.instances.map(i => i.instanceName || i)
      : [];

    // Mark instances that exist in Evolution API
    const usersEnriched = usersWithStatus.map(user => ({
      ...user,
      existsInEvolution: evolutionInstanceNames.includes(user.instanceName),
    }));

    // Count stats
    const stats = {
      total: usersEnriched.length,
      connected: usersEnriched.filter(u => u.status === 'open' || u.status === 'connected').length,
      disconnected: usersEnriched.filter(u => u.status === 'disconnected' || u.status === 'close')
        .length,
      pending: usersEnriched.filter(u => !['open', 'disconnected', 'close'].includes(u.status))
        .length,
      missingInEvolution: usersEnriched.filter(u => !u.existsInEvolution).length,
    };

    res.json({
      success: true,
      data: {
        users: usersEnriched,
        stats,
      },
    });
  } catch (error) {
    console.error('Get admin all instances error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get all instances',
    });
  }
};

/**
 * Get central instance status (ADMIN only)
 * GET /api/v1/whatsapp/admin/central-instance
 */
export const getAdminCentralInstance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    const centralInstanceName = getCentralInstanceName();

    let status = 'unknown';
    let phone = null;
    let error = null;

    try {
      const result = await getInstanceStatus(centralInstanceName);
      if (result.success) {
        status = result.state;
        phone = result.phone;
      } else {
        error = result.error;
      }
    } catch {
      error = e.message;
    }

    res.json({
      success: true,
      data: {
        instanceName: centralInstanceName,
        status,
        phone,
        error,
        note: 'This instance is reserved for OTP/2FA. Do not modify.',
      },
    });
  } catch (error) {
    console.error('Get admin central instance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get central instance status',
    });
  }
};

/**
 * Get all users WhatsApp status for a specific branch (ADMIN only)
 * GET /api/v1/whatsapp/admin/branch/:branchId/users
 */
export const getAdminBranchUsers = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    const { branchId } = req.params;

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true },
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }

    // Get all users in this branch
    const users = await prisma.user.findMany({
      where: {
        branchId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        evolutionInstanceName: true,
        evolutionStatus: true,
        evolutionPhoneNumber: true,
        evolutionCreatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get current status from Evolution API
    const usersWithStatus = await Promise.all(
      users.map(async user => {
        let currentState = user.evolutionStatus || 'disconnected';
        let currentPhone = user.evolutionPhoneNumber;

        if (user.evolutionInstanceName) {
          try {
            const status = await getInstanceStatus(user.evolutionInstanceName);
            if (status.success) {
              currentState = status.state;
              currentPhone = status.phone;
            }
          } catch {
            // Instance may not exist
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          instanceName: user.evolutionInstanceName,
          status: currentState,
          phoneNumber: currentPhone,
          createdAt: user.evolutionCreatedAt,
        };
      })
    );

    res.json({
      success: true,
      data: {
        branch,
        users: usersWithStatus,
        total: usersWithStatus.length,
        connected: usersWithStatus.filter(u => u.status === 'open' || u.status === 'connected')
          .length,
        disconnected: usersWithStatus.filter(
          u => u.status === 'disconnected' || u.status === 'close'
        ).length,
      },
    });
  } catch (error) {
    console.error('Get admin branch users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get branch users',
    });
  }
};

/**
 * Delete any user's WhatsApp instance (ADMIN only)
 * DELETE /api/v1/whatsapp/admin/user/:userId
 */
export const deleteAdminUserInstance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    const { userId } = req.params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, evolutionInstanceName: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.evolutionInstanceName) {
      return res.status(400).json({
        success: false,
        error: 'User does not have a WhatsApp instance to delete',
      });
    }

    // Check if this is the central instance (GUARD)
    if (isCentralInstance(user.evolutionInstanceName)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete the central WhatsApp instance',
      });
    }

    const result = await deleteUserInstance(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: `WhatsApp instance for ${user.name} deleted successfully`,
    });
  } catch (error) {
    console.error('Delete admin user instance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user WhatsApp instance',
    });
  }
};

/**
 * Restart any user's WhatsApp instance (ADMIN only)
 * POST /api/v1/whatsapp/admin/user/:userId/restart
 */
export const restartAdminUserInstance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    const { userId } = req.params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, evolutionInstanceName: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.evolutionInstanceName) {
      return res.status(400).json({
        success: false,
        error: 'User does not have a WhatsApp instance to restart',
      });
    }

    // Check if this is the central instance (GUARD)
    if (isCentralInstance(user.evolutionInstanceName)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot restart the central WhatsApp instance',
      });
    }

    const result = await restartUserInstance(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: `WhatsApp instance for ${user.name} restarted successfully`,
    });
  } catch (error) {
    console.error('Restart admin user instance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart user WhatsApp instance',
    });
  }
};

/**
 * Bulk create missing instances (ADMIN only)
 * POST /api/v1/whatsapp/admin/bulk-create
 */
export const bulkCreateInstances = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.',
      });
    }

    const result = await bulkCreateMissingInstances();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Bulk create instances error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create instances',
    });
  }
};
