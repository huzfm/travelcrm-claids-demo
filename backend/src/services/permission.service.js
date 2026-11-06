/**
 * Resolves a user's effective feature permissions.
 *
 * Access tokens live for 24h, so the permissions baked into a JWT can be stale
 * for a whole day after an admin edits them. Enforcement therefore reads from
 * the database, behind a short-lived cache so it costs at most one query per
 * user per TTL. Admin edits bust the cache immediately.
 */

import prisma from '../config/prisma.js';
import cacheService from './cache.service.js';

const CACHE_TTL_SECONDS = 30;

const cacheKey = userId => `user-permissions:${userId}`;

export const getUserPermissions = async userId => {
  const cached = cacheService.get(cacheKey(userId));
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { permissions: true, isActive: true, role: true, tokenVersion: true },
  });

  if (!user || !user.isActive) return null;

  const permissions = user.role === 'ADMIN' ? null : user.permissions || [];
  const value = { role: user.role, permissions, tokenVersion: user.tokenVersion };
  cacheService.set(cacheKey(userId), value, CACHE_TTL_SECONDS);
  return value;
};

export const invalidateUserPermissions = userId => {
  cacheService.delete(cacheKey(userId));
};
