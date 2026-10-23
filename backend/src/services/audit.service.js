/**
 * Audit Log Service
 * Tracks all system changes for compliance and debugging
 */

import prisma from '../config/prisma.js';

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
  MERGE: 'MERGE',
};

export const AuditEntity = {
  LEAD: 'LEAD',
  FOLLOWUP: 'FOLLOWUP',
  USER: 'USER',
  BRANCH: 'BRANCH',
  ITINERARY: 'ITINERARY',
  WHATSAPP: 'WHATSAPP',
  HOTEL: 'HOTEL',
  VEHICLE: 'VEHICLE',
  TRIP: 'TRIP',
  DESTINATION: 'DESTINATION',
};

/**
 * Create an audit log entry
 */
export const createAuditLog = async ({
  action,
  entity,
  entityId,
  userId,
  branchId = null,
  oldData = null,
  newData = null,
  description = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    return await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        userId,
        branchId,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
        description,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break main operations
  }
};

/**
 * Get audit logs with filters
 */
export const getAuditLogs = async ({
  page = 1,
  limit = 50,
  entity,
  entityId,
  userId,
  action,
  startDate,
  endDate,
  branchId,
}) => {
  const where = {};

  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (branchId) where.branchId = branchId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        branch: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/**
 * Get audit trail for a specific lead
 */
export const getLeadAuditTrail = async leadId => {
  return prisma.auditLog.findMany({
    where: {
      entity: 'LEAD',
      entityId: leadId,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });
};

/**
 * Export audit logs
 */
export const exportAuditLogs = async ({ startDate, endDate, entity, branchId }) => {
  const where = {};

  if (entity) where.entity = entity;
  if (branchId) where.branchId = branchId;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      branch: { select: { name: true } },
    },
  });

  // Convert to CSV format
  const headers = [
    'Date',
    'Action',
    'Entity',
    'Entity ID',
    'User',
    'Branch',
    'Description',
    'IP Address',
  ];
  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    log.action,
    log.entity,
    log.entityId,
    log.user?.name || 'System',
    log.branch?.name || '-',
    log.description || '',
    log.ipAddress || '',
  ]);

  return [headers, ...rows];
};
