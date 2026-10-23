import jwt from 'jsonwebtoken';
import { scopeRoleOf } from '../config/roles.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = {
        id: decoded.id,
        email: decoded.email,
        // Scoping everywhere reads ADMIN / MANAGER / STAFF; other roles are
        // mapped onto those here. The account's own role stays in accountRole.
        role: scopeRoleOf(decoded.role),
        accountRole: decoded.role,
        branchId: decoded.branchId,
        // Tokens live 24h, so these can be stale. Routes must gate on
        // requirePermission (which reads the database), not on this.
        tokenPermissions: decoded.permissions ?? null,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};
