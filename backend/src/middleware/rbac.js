import { getUserPermissions } from '../services/permission.service.js';
import { holdsFeature } from '../config/permissions.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

export const branchGuard = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
    });
  }

  const requestedBranchId = req.params.branchId || req.query.branchId || req.body.branchId;

  if (requestedBranchId) {
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (requestedBranchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own branch data.',
      });
    }
  } else {
    req.enforcedBranchId = req.user.branchId;
  }

  next();
};

export const applyBranchFilter = (req, prismaWhere = {}) => {
  if (req.user.role === 'ADMIN') {
    return prismaWhere;
  }

  return {
    ...prismaWhere,
    branchId: req.user.branchId,
  };
};

export const canAccessBranch = (user, branchId) => {
  if (user.role === 'ADMIN') {
    return true;
  }
  return user.branchId === branchId;
};

/**
 * Gate a route behind one or more feature permissions.
 *
 * Keys may be modules ('leads') or sub-permissions ('leads.delete'); a
 * sub-permission also requires its module. ADMIN bypasses every check. Everyone
 * else must hold at least one of the listed keys, so a user with no permissions
 * reaches nothing.
 *
 * Permissions are read from the database (short-cached) rather than the JWT so
 * that an admin's change takes effect without waiting for a token refresh.
 */
export const requirePermission = (...features) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    try {
      const resolved = await getUserPermissions(req.user.id);

      if (!resolved) {
        return res.status(403).json({
          success: false,
          error: 'Account is inactive or no longer exists.',
        });
      }

      if (resolved.role === 'ADMIN') {
        req.permissions = null; // null = unrestricted
        return next();
      }

      const granted = resolved.permissions || [];
      req.permissions = granted;

      if (features.length === 0 || features.some(feature => holdsFeature(granted, feature))) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to use this feature.',
        code: 'FEATURE_NOT_PERMITTED',
        requiredPermissions: features,
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed',
      });
    }
  };
};

/** Non-middleware check, for controllers that branch on a feature. */
export const userHasPermission = async (user, feature) => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const resolved = await getUserPermissions(user.id);
  if (!resolved) return false;
  if (resolved.role === 'ADMIN') return true;
  return holdsFeature(resolved.permissions || [], feature);
};

/**
 * `itineraries.view_all` lets a non-admin read every branch's itineraries — a
 * reservations desk books hotels for trips it did not build. A STAFF account
 * never gets that view, even if the permission is ticked: staff only ever see
 * the itineraries they created.
 */
export const seesAllItineraries = async user => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  const resolved = await getUserPermissions(user.id);
  if (!resolved || resolved.role === 'STAFF') return false;
  return resolved.role === 'ADMIN' || holdsFeature(resolved.permissions || [], 'itineraries.view_all');
};
