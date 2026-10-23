import { body } from 'express-validator';
import XLSX from 'xlsx';
import prisma from '../config/prisma.js';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';
import { validationResult } from 'express-validator';
import { checkDuplicate, findAutoAssignee } from '../utils/duplicateCheck.js';
import { LeadStatus } from '@prisma/client';
import fs from 'fs';
import {
  verifyMetaSignature,
  fetchLeadFromGraph,
  mapLeadFields,
  resolveCampaign,
  findPage,
} from '../services/meta-ads.service.js';

// Lead visibility: only ADMIN sees every lead. MANAGER and STAFF see only the
// leads assigned to them.
const ownLeadsWhere = user => (user.role === 'ADMIN' ? {} : { assignedTo: user.id });
const canAccessLead = (user, lead) => user.role === 'ADMIN' || lead.assignedTo === user.id;

export const leadValidation = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('phone').notEmpty().trim().withMessage('Phone is required'),
  body('email').optional(),
  body('source')
    .isIn(['WEBSITE', 'WHATSAPP', 'WALKIN', 'SOCIAL', 'BULK_IMPORT', 'META_ADS', 'GOOGLE_ADS'])
    .withMessage('Valid source is required'),
  body('destination').optional(),
  body('travelDateFrom').optional().isISO8601().withMessage('Invalid travel date from'),
  body('travelDateTo').optional().isISO8601().withMessage('Invalid travel date to'),
  body('travelMonth').optional(),
  body('numberOfPax')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Number of pax is required'),
  body('budget')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('tripType').optional(),
  body('hotelCategory').optional(),
  body('pickupPoint').optional(),
  body('childrenCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Children count must be 0 or more'),
  body('priority').optional(),
  // branchId is only required for ADMINs who need to specify a branch
  body('branchId').optional().notEmpty().withMessage('Branch ID cannot be empty'),
];

export const getAllLeads = async (req, res) => {
  try {
    const {
      status,
      source,
      assignedTo,
      assignedToId,
      branchId,
      search,
      page = 1,
      limit = 20,
      analytics,
    } = req.query;

    const where = {
      deletedAt: null,
    };

    if (req.user.role !== 'ADMIN') {
      Object.assign(where, ownLeadsWhere(req.user));
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (status && status !== 'ALL' && analytics !== 'true') {
      where.status = status;
    } else if (status === 'ALL' && analytics !== 'true') {
      where.status = { in: ['WON', 'QUOTE_SENT'] };
    }
    if (source && source !== 'ALL') where.source = source;
    // The leads page sends assignedToId; older callers send assignedTo.
    const assigneeFilter = req.user.role === 'ADMIN' ? assignedToId || assignedTo : null;
    if (assigneeFilter === 'UNASSIGNED') where.assignedTo = null;
    else if (assigneeFilter && assigneeFilter !== 'ALL') where.assignedTo = assigneeFilter;

    // Created-date range. Support multiple param naming conventions.
    const fromDate = req.query.from || req.query.startDate || req.query.dateFrom;
    const toDate = req.query.to || req.query.endDate || req.query.dateTo;
    const dateFilter = {};
    if (fromDate) dateFilter.gte = new Date(fromDate + 'T00:00:00.000Z');
    if (toDate) dateFilter.lte = new Date(toDate + 'T23:59:59.999Z');
    if (Object.values(dateFilter).some(d => isNaN(d.getTime()))) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    if (search) {
      // AND, not a plain where.OR — for STAFF, where.OR already holds the
      // "assigned to or created by me" restriction, and overwriting it would
      // let a search return every branch's matching leads.
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Analytics mode - return all leads without pagination
    if (analytics === 'true') {
      // summary=true: just the counts the Analytics page charts, grouped in the
      // database instead of shipping every lead row to the browser to count.
      if (req.query.summary === 'true') {
        const [byStatusRows, bySourceRows] = await Promise.all([
          prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } }),
          prisma.lead.groupBy({ by: ['source'], where, _count: { _all: true } }),
        ]);
        const toCounts = (rows, key) =>
          Object.fromEntries(rows.map(row => [row[key] ?? 'UNKNOWN', row._count._all]));
        return res.json({
          success: true,
          data: {
            total: byStatusRows.reduce((sum, row) => sum + row._count._all, 0),
            byStatus: toCounts(byStatusRows, 'status'),
            bySource: toCounts(bySourceRows, 'source'),
          },
        });
      }

      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          source: true,
          assignedTo: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.json({
        success: true,
        data: {
          leads,
          total: leads.length,
        },
      });
    }

    // Capped so a single request can't pull the whole table with its relations.
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: {
            select: { id: true, name: true },
          },
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
          creator: {
            select: { id: true, name: true },
          },
          duplicateLead: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              followUps: true,
              itineraries: true,
              activities: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        leads,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get all leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        branch: {
          select: { id: true, name: true, country: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
        duplicateLead: {
          select: { id: true, name: true, phone: true },
        },
        duplicates: {
          select: { id: true, name: true, phone: true },
        },
        followUps: {
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true,
            type: true,
            scheduledAt: true,
            status: true,
            outcome: true,
            notes: true,
            feedback: true,
            assignedTo: true,
            createdAt: true,
          },
        },
        itineraries: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            destination: true,
            version: true,
            pdfPath: true,
            createdAt: true,
          },
        },
        whatsappMessages: {
          orderBy: { sentAt: 'desc' },
          take: 50,
          select: {
            id: true,
            direction: true,
            messageType: true,
            textContent: true,
            sentAt: true,
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    // Only ADMIN sees every lead; everyone else only the leads assigned to them.
    if (!canAccessLead(req.user, lead)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: { lead },
    });
  } catch (error) {
    console.error('Get lead by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createLead = async (req, res) => {
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
      phone,
      email,
      source,
      branchId: providedBranchId,
      assignedTo,
      destination,
      travelDateFrom,
      travelDateTo,
      travelMonth,
      numberOfPax,
      budget,
      tripType,
      hotelCategory,
      pickupPoint,
      childrenCount,
      priority,
    } = req.body;

    // Determine the branchId based on role
    let branchId;
    if (req.user.role === 'ADMIN') {
      // ADMIN can specify any branchId
      branchId = providedBranchId || req.user.branchId;
    } else if (req.user.role === 'MANAGER') {
      // MANAGER can only create in their own branch
      if (providedBranchId && providedBranchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot create leads in other branches',
        });
      }
      branchId = req.user.branchId;
    } else {
      // STAFF can only create in their own branch (auto-assigned from session)
      branchId = req.user.branchId;
    }

    // Assignment rules only route leads an ADMIN adds. A lead STAFF add is always
    // their own (any assignedTo they send is ignored); a MANAGER's is theirs unless
    // they pick someone.
    let finalAssignedTo = req.user.role === 'STAFF' ? req.user.id : assignedTo;
    let finalBranchId = branchId;

    if (!finalAssignedTo && req.user.role === 'MANAGER') {
      finalAssignedTo = req.user.id;
    }

    if (!finalAssignedTo) {
      // Try to find auto-assignee based on source rules
      const autoAssignResult = await findAutoAssignee(branchId, source, {
        allowCrossBranch: req.user.role === 'ADMIN',
      });
      if (autoAssignResult?.user) {
        finalAssignedTo = autoAssignResult.user.id;
        finalBranchId = autoAssignResult.branchId || branchId;
      } else {
        // Default to the creator if no rule matches
        finalAssignedTo = req.user.id;
      }
    }

    const duplicateResult = await checkDuplicate(finalBranchId, phone, email);

    let createdLead;

    if (duplicateResult.isDuplicate) {
      createdLead = await prisma.lead.create({
        data: {
          name,
          phone,
          email,
          source,
          status: LeadStatus.FRESH,
          branchId: finalBranchId,
          assignedTo: finalAssignedTo,
          createdBy: req.user.id,
          duplicateOf: duplicateResult.existingLeadId,
          destination,
          travelDateFrom: travelDateFrom ? new Date(travelDateFrom) : undefined,
          travelDateTo: travelDateTo ? new Date(travelDateTo) : undefined,
          travelMonth,
          numberOfPax: numberOfPax || '1',
          budget,
          tripType,
          hotelCategory,
          pickupPoint,
          childrenCount: childrenCount || 0,
          priority,
        },
        include: {
          branch: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true, role: true } },
          duplicateLead: { select: { id: true, name: true, phone: true } },
        },
      });
    } else {
      createdLead = await prisma.lead.create({
        data: {
          name,
          phone,
          email,
          source,
          status: LeadStatus.FRESH,
          branchId: finalBranchId,
          assignedTo: finalAssignedTo,
          createdBy: req.user.id,
          destination,
          travelDateFrom: travelDateFrom ? new Date(travelDateFrom) : undefined,
          travelDateTo: travelDateTo ? new Date(travelDateTo) : undefined,
          travelMonth,
          numberOfPax: numberOfPax || '1',
          budget,
          tripType,
          hotelCategory,
          pickupPoint,
          childrenCount: childrenCount || 0,
          priority,
        },
        include: {
          branch: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    }

    await prisma.leadActivity.create({
      data: {
        leadId: createdLead.id,
        userId: req.user.id,
        type: 'STATUS_CHANGE',
        description: 'Lead created',
      },
    });

    if (duplicateResult.isDuplicate) {
      await prisma.leadActivity.create({
        data: {
          leadId: createdLead.id,
          userId: req.user.id,
          type: 'NOTE',
          description: `Marked as duplicate of ${duplicateResult.existingLead?.name || 'existing lead'}`,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        lead: createdLead,
        duplicateWarning: duplicateResult.isDuplicate
          ? {
              isDuplicate: true,
              originalLeadId: duplicateResult.existingLeadId,
            }
          : null,
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditAction.CREATE,
      entity: AuditEntity.LEAD,
      entityId: createdLead.id,
      userId: req.user.id,
      branchId,
      description: `Created lead: ${createdLead.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      source,
      status,
      assignedTo,
      score,
      qualification,
      destination,
      travelDateFrom,
      travelDateTo,
      travelMonth,
      numberOfPax,
      budget,
      tripType,
      hotelCategory,
      pickupPoint,
      childrenCount,
      priority,
      branchId,
    } = req.body;

    const existing = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    // Only ADMIN can update any lead; everyone else only the leads assigned to them.
    if (!canAccessLead(req.user, existing)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Manager can only update leads in their branch
    if (req.user.role === 'MANAGER' && existing.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Staff can fully manage the details of a lead assigned to them, but not
    // reassign it (that goes through the audited Transfer flow), change its
    // source, or move it to another branch — those stay Admin/Manager-only.
    if (req.user.role === 'STAFF') {
      const allowedFields = [
        'name',
        'phone',
        'email',
        'status',
        'score',
        'qualification',
        'notes',
        'destination',
        'travelDateFrom',
        'travelDateTo',
        'travelMonth',
        'numberOfPax',
        'budget',
        'tripType',
        'hotelCategory',
        'pickupPoint',
        'childrenCount',
        'priority',
      ];
      const updateKeys = Object.keys(req.body);
      const disallowed = updateKeys.filter(k => !allowedFields.includes(k));
      if (disallowed.length > 0) {
        return res.status(403).json({
          success: false,
          error: `Staff cannot update: ${disallowed.join(', ')}`,
        });
      }
    }

    const updateData = {};
    const activitiesToCreate = [];

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (source !== undefined) updateData.source = source;
    if (score !== undefined) updateData.score = parseInt(score) || 0;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (destination !== undefined) updateData.destination = destination;
    if (travelDateFrom !== undefined)
      updateData.travelDateFrom = travelDateFrom ? new Date(travelDateFrom) : null;
    if (travelDateTo !== undefined)
      updateData.travelDateTo = travelDateTo ? new Date(travelDateTo) : null;
    if (travelMonth !== undefined) updateData.travelMonth = travelMonth;
    if (numberOfPax !== undefined) updateData.numberOfPax = numberOfPax || '1';
    if (budget !== undefined) updateData.budget = parseFloat(budget) || null;
    if (tripType !== undefined) updateData.tripType = tripType;
    if (hotelCategory !== undefined) updateData.hotelCategory = hotelCategory;
    if (pickupPoint !== undefined) updateData.pickupPoint = pickupPoint;
    if (childrenCount !== undefined) updateData.childrenCount = parseInt(childrenCount) || 0;
    if (priority !== undefined) updateData.priority = priority;

    // Admin can transfer lead to a different branch
    if (req.user.role === 'ADMIN' && branchId !== undefined && branchId !== existing.branchId) {
      const oldBranch = await prisma.branch.findUnique({
        where: { id: existing.branchId },
        select: { name: true },
      });
      const newBranch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { name: true },
      });
      updateData.branchId = branchId;
      activitiesToCreate.push({
        leadId: id,
        userId: req.user.id,
        type: 'TRANSFER',
        description: `Lead transferred from ${oldBranch?.name || existing.branchId} to ${newBranch?.name || branchId}`,
      });
    }

    if (assignedTo !== undefined && assignedTo !== existing.assignedTo) {
      // Validate the new assignee exists and is active
      const newAssignee = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { id: true, name: true, branchId: true, isActive: true },
      });

      if (!newAssignee) {
        return res.status(400).json({
          success: false,
          error: 'Invalid assignee',
        });
      }

      if (!newAssignee.isActive) {
        return res.status(400).json({
          success: false,
          error: 'Cannot assign to inactive user',
        });
      }

      // For MANAGER, assignee must be in the same branch
      if (req.user.role === 'MANAGER' && newAssignee.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot assign to users in other branches',
        });
      }

      // For ADMIN, if assigning to a different branch, also update the lead's branch
      if (req.user.role === 'ADMIN' && newAssignee.branchId !== existing.branchId) {
        const oldBranch = await prisma.branch.findUnique({
          where: { id: existing.branchId },
          select: { name: true },
        });
        const newBranch = await prisma.branch.findUnique({
          where: { id: newAssignee.branchId },
          select: { name: true },
        });
        updateData.branchId = newAssignee.branchId;
        activitiesToCreate.push({
          leadId: id,
          userId: req.user.id,
          type: 'TRANSFER',
          description: `Lead transferred from ${oldBranch?.name || existing.branchId} to ${newBranch?.name || newAssignee.branchId} when assigning to ${newAssignee.name}`,
        });
      }

      updateData.assignedTo = assignedTo;

      activitiesToCreate.push({
        leadId: id,
        userId: req.user.id,
        type: 'ASSIGNMENT',
        description: `Lead reassigned from ${existing.assignee?.name || 'Unassigned'} to ${newAssignee.name || 'Unassigned'}`,
      });
    }

    if (status !== undefined && status !== existing.status) {
      updateData.status = status;
      activitiesToCreate.push({
        leadId: id,
        userId: req.user.id,
        type: 'STATUS_CHANGE',
        description: `Status changed from ${existing.status} to ${status}`,
      });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        branch: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (activitiesToCreate.length > 0) {
      await prisma.leadActivity.createMany({
        data: activitiesToCreate,
      });
    }

    res.json({
      success: true,
      data: { lead },
    });

    // Create audit log for update
    await createAuditLog({
      action: AuditAction.UPDATE,
      entity: AuditEntity.LEAD,
      entityId: id,
      userId: req.user.id,
      branchId: lead.branchId,
      oldData: existing,
      newData: lead,
      description: `Updated lead: ${lead.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    // Only ADMIN can delete leads
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete leads',
      });
    }

    const existing = await prisma.lead.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    if (req.user.role === 'MANAGER' && existing.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Create audit log for delete
    await createAuditLog({
      action: AuditAction.DELETE,
      entity: AuditEntity.LEAD,
      entityId: id,
      userId: req.user.id,
      branchId: existing.branchId,
      description: `Deleted lead: ${existing.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: {
        message: 'Lead soft deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const bulkDeleteLeads = async (req, res) => {
  try {
    // Only ADMIN can delete leads — same restriction as the single-lead delete.
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete leads',
      });
    }

    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one lead id is required',
      });
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true, branchId: true },
    });

    if (leads.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No matching leads found',
      });
    }

    const now = new Date();
    await prisma.lead.updateMany({
      where: { id: { in: leads.map(l => l.id) } },
      data: { deletedAt: now },
    });

    await Promise.all(
      leads.map(lead =>
        createAuditLog({
          action: AuditAction.DELETE,
          entity: AuditEntity.LEAD,
          entityId: lead.id,
          userId: req.user.id,
          branchId: lead.branchId,
          description: `Deleted lead: ${lead.name}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        })
      )
    );

    res.json({
      success: true,
      data: {
        message: `${leads.length} lead${leads.length === 1 ? '' : 's'} deleted successfully`,
        deletedCount: leads.length,
        deletedIds: leads.map(l => l.id),
      },
    });
  } catch (error) {
    console.error('Bulk delete leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const bulkImportLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const { branchId: providedBranchId } = req.body;

    // Determine the branchId based on role
    let branchId;
    if (req.user.role === 'ADMIN') {
      if (providedBranchId) {
        branchId = providedBranchId;
      } else {
        // Auto-assign to the first branch for ADMIN
        const firstBranch = await prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!firstBranch) {
          return res.status(400).json({
            success: false,
            error: 'No branch found. Please create a branch first.',
          });
        }
        branchId = firstBranch.id;
      }
    } else if (req.user.role === 'MANAGER') {
      if (providedBranchId && providedBranchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot import leads to other branches',
        });
      }
      branchId = req.user.branchId;
    } else {
      // STAFF can only import to their own branch
      branchId = req.user.branchId;
    }

    const results = [];
    const errors = [];
    let created = 0;
    let duplicates = 0;

    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    // Real XLSX files start with PK (ZIP format)
    const isRealXlsx = buffer[0] === 0x50 && buffer[1] === 0x4b;

    if (isRealXlsx) {
      const workbook = XLSX.read(filePath, { type: 'file', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      results.push(...XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]));
    } else {
      // Treat as CSV regardless of extension (.xlsx or .csv)
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', row => results.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    }

    fs.unlinkSync(filePath);

    for (const row of results) {
      try {
        const name = String(row.name || row.Name || '').trim();
        const phone = String(row.phone || row.Phone || '').trim();
        const email = String(row.email || row.Email || '').trim() || null;
        const source = String(row.source || row.Source || 'BULK_IMPORT').toUpperCase();

        if (!name || !phone) {
          errors.push(`Row skipped: missing name or phone - ${JSON.stringify(row)}`);
          continue;
        }

        const duplicateResult = await checkDuplicate(branchId, phone, email);

        let lead;

        if (duplicateResult.isDuplicate) {
          duplicates++;
          lead = await prisma.lead.findUnique({
            where: { id: duplicateResult.existingLeadId },
          });
        } else {
          const sourceMap = {
            INSTAGRAM: 'SOCIAL',
            FACEBOOK: 'SOCIAL',
            REFERRAL: 'WALKIN',
            PHONE: 'WALKIN',
            WALK_IN: 'WALKIN',
          };
          const mappedSource =
            sourceMap[source] ||
            (['WEBSITE', 'WHATSAPP', 'WALKIN', 'SOCIAL', 'BULK_IMPORT', 'META_ADS', 'GOOGLE_ADS'].includes(
              source
            )
              ? source
              : 'BULK_IMPORT');

          // Assignment rules only route an ADMIN's import; anyone else's imported
          // leads are their own. ADMIN rules may assign across branches.
          const autoAssignResult =
            req.user.role === 'ADMIN'
              ? await findAutoAssignee(branchId, mappedSource, { allowCrossBranch: true })
              : null;

          // Use the assignee from the rule (may be from different branch)
          const leadAssignee = autoAssignResult?.user?.id || req.user.id;
          // Use the branch from the rule if it should be different
          const finalBranchId = autoAssignResult?.branchId || branchId;

          const destination = String(row.destination || row.Destination || '').trim() || undefined;
          const travelDateFrom = row.travelDateFrom
            ? new Date(String(row.travelDateFrom))
            : undefined;
          const travelDateTo = row.travelDateTo ? new Date(String(row.travelDateTo)) : undefined;
          const travelMonth = String(row.travelMonth || row.TravelMonth || '').trim() || undefined;
          const numberOfPax = String(row.numberOfPax || row.NumberOfPax || row.pax || '1');
          const budget =
            row.budget !== undefined && row.budget !== '' ? Number(row.budget) : undefined;
          const tripType = String(row.tripType || row.TripType || '').trim() || undefined;
          const hotelCategory =
            String(row.hotelCategory || row.HotelCategory || '').trim() || undefined;
          const pickupPoint = String(row.pickupPoint || row.PickupPoint || '').trim() || undefined;
          const childrenCount = Number(row.childrenCount || row.ChildrenCount || 0);
          const score = Number(row.score || row.Score || 0);
          const qualification =
            String(row.qualification || row.Qualification || '').trim() || undefined;
          const priority = String(row.priority || row.Priority || '').trim() || undefined;

          lead = await prisma.lead.create({
            data: {
              name,
              phone,
              email,
              source: mappedSource,
              status: LeadStatus.FRESH,
              branchId: finalBranchId,
              assignedTo: leadAssignee,
              createdBy: req.user.id,
              duplicateOf: duplicateResult.isDuplicate ? duplicateResult.existingLeadId : null,
              destination,
              travelDateFrom,
              travelDateTo,
              travelMonth,
              numberOfPax,
              budget,
              tripType,
              hotelCategory,
              pickupPoint,
              childrenCount,
              score,
              qualification,
              priority,
            },
          });

          await prisma.leadActivity.create({
            data: {
              leadId: lead.id,
              userId: req.user.id,
              type: 'STATUS_CHANGE',
              description: 'Lead imported via bulk import',
            },
          });

          created++;
        }
      } catch (rowError) {
        errors.push(`Error processing row: ${JSON.stringify(row)} - ${rowError.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          created,
          duplicates,
          errors: errors.length,
          total: results.length,
        },
        errors: errors.slice(0, 100),
      },
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getLeadActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    if (!canAccessLead(req.user, lead)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      prisma.leadActivity.findMany({
        where: { leadId: id },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.leadActivity.count({ where: { leadId: id } }),
    ]);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get lead activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createLeadActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description } = req.body;

    const validTypes = ['NOTE', 'CALL', 'WHATSAPP', 'EMAIL'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Valid activity type is required',
      });
    }

    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required',
      });
    }

    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    if (!canAccessLead(req.user, lead)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: id,
        userId: req.user.id,
        type,
        description,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { activity },
    });
  } catch (error) {
    console.error('Create lead activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// BULK EXPORT - Export leads to CSV
// ============================================
export const bulkExportLeads = async (req, res) => {
  try {
    const {
      status,
      source,
      assignedTo,
      branchId,
      search,
      startDate,
      endDate,
      analytics,
      _format = 'csv',
    } = req.query;

    const where = {
      deletedAt: null,
    };

    // Role-based filtering
    if (req.user.role !== 'ADMIN') {
      Object.assign(where, ownLeadsWhere(req.user));
    } else if (branchId) {
      where.branchId = branchId;
    }

    // Apply filters
    if (status && status !== 'ALL' && analytics !== 'true') {
      where.status = status;
    } else if (status === 'ALL' && analytics !== 'true') {
      where.status = { in: ['WON', 'QUOTE_SENT'] };
    }
    if (source && source !== 'ALL') where.source = source;
    if (assignedTo) where.assignedTo = assignedTo;

    if (search) {
      // AND, not a plain where.OR — for STAFF, where.OR already holds the
      // "assigned to or created by me" restriction, and overwriting it would
      // let a search return every branch's matching leads.
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { name: true } },
        assignee: { select: { name: true, email: true } },
        creator: { select: { name: true } },
        _count: {
          select: {
            followUps: true,
            itineraries: true,
          },
        },
      },
    });

    // Generate CSV
    const headers = [
      'ID',
      'Name',
      'Phone',
      'Email',
      'Source',
      'Status',
      'Branch',
      'Assigned To',
      'Created By',
      'Follow-ups',
      'Itineraries',
      'Created At',
      'Last Updated',
    ];

    const rows = leads.map(lead => [
      lead.id,
      lead.name,
      lead.phone,
      lead.email || '',
      lead.source,
      lead.status,
      lead.branch?.name || '',
      lead.assignee?.name || 'Unassigned',
      lead.creator?.name || '',
      lead._count.followUps,
      lead._count.itineraries,
      lead.createdAt.toISOString(),
      lead.updatedAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_export_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Bulk export error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// DUPLICATE LEADS - Find potential duplicates
// ============================================
export const getDuplicateLeads = async (req, res) => {
  try {
    const { branchId, search } = req.query;

    let where = { deletedAt: null };

    // Role-based filtering
    if (req.user.role !== 'ADMIN') {
      Object.assign(where, ownLeadsWhere(req.user));
    } else if (branchId) {
      where.branchId = branchId;
    }

    // Find leads with similar phone or email
    let leads;
    if (search) {
      // Search mode - find similar leads to a specific search term
      leads = await prisma.lead.findMany({
        where: {
          ...where,
          OR: [
            { phone: { contains: search.replace(/\D/g, '') } },
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          branch: { select: { name: true } },
          assignee: { select: { name: true } },
          duplicates: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } else {
      // Find all leads that have duplicates marked
      leads = await prisma.lead.findMany({
        where: {
          ...where,
          OR: [{ duplicateOf: { not: null } }, { duplicates: { some: {} } }],
        },
        include: {
          branch: { select: { name: true } },
          assignee: { select: { name: true } },
          duplicateLead: { select: { id: true, name: true, phone: true } },
          duplicates: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({
      success: true,
      data: { leads, total: leads.length },
    });
  } catch (error) {
    console.error('Get duplicate leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// MERGE LEADS - Merge two leads into one
// ============================================
export const mergeLeads = async (req, res) => {
  try {
    const { primaryLeadId, secondaryLeadId } = req.body;

    if (!primaryLeadId || !secondaryLeadId) {
      return res.status(400).json({
        success: false,
        error: 'Both primary and secondary lead IDs are required',
      });
    }

    if (primaryLeadId === secondaryLeadId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot merge a lead with itself',
      });
    }

    // Get both leads
    const [primaryLead, secondaryLead] = await Promise.all([
      prisma.lead.findUnique({ where: { id: primaryLeadId } }),
      prisma.lead.findUnique({ where: { id: secondaryLeadId } }),
    ]);

    if (!primaryLead || !secondaryLead) {
      return res.status(404).json({
        success: false,
        error: 'One or both leads not found',
      });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN') {
      if (!canAccessLead(req.user, primaryLead) || !canAccessLead(req.user, secondaryLead)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }

    if (req.user.role === 'MANAGER') {
      if (
        primaryLead.branchId !== req.user.branchId ||
        secondaryLead.branchId !== req.user.branchId
      ) {
        return res.status(403).json({
          success: false,
          error: 'Cannot merge leads from other branches',
        });
      }
    }

    // Transfer all relationships from secondary to primary
    // 1. Update follow-ups
    await prisma.followUp.updateMany({
      where: { leadId: secondaryLeadId },
      data: { leadId: primaryLeadId },
    });

    // 2. Update itineraries
    await prisma.itinerary.updateMany({
      where: { leadId: secondaryLeadId },
      data: { leadId: primaryLeadId },
    });

    // 3. Update WhatsApp messages
    await prisma.whatsappMessage.updateMany({
      where: { leadId: secondaryLeadId },
      data: { leadId: primaryLeadId },
    });

    // 4. Update lead-to-tag relations
    await prisma.leadToTag.updateMany({
      where: { leadId: secondaryLeadId },
      data: { leadId: primaryLeadId },
    });

    // 5. Add activity log
    await prisma.leadActivity.create({
      data: {
        leadId: primaryLeadId,
        userId: req.user.id,
        type: 'NOTE',
        description: `Lead merged from "${secondaryLead.name}" (${secondaryLead.phone}). Secondary lead ID: ${secondaryLeadId}`,
      },
    });

    // Soft delete the secondary lead
    await prisma.lead.update({
      where: { id: secondaryLeadId },
      data: {
        deletedAt: new Date(),
        duplicateOf: primaryLeadId,
      },
    });

    // Get updated primary lead
    const updatedLead = await prisma.lead.findUnique({
      where: { id: primaryLeadId },
      include: {
        branch: { select: { name: true } },
        assignee: { select: { name: true } },
        _count: {
          select: {
            followUps: true,
            itineraries: true,
            activities: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        mergedLead: updatedLead,
        mergedFrom: { id: secondaryLeadId, name: secondaryLead.name },
      },
    });
  } catch (error) {
    console.error('Merge leads error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// LEAD TAGS - Management endpoints
// ============================================

// Get all tags for a branch
export const getLeadTags = async (req, res) => {
  try {
    let branchId = req.query.branchId;

    if (req.user.role === 'MANAGER') {
      branchId = req.user.branchId;
    } else if (!branchId && req.user.role === 'ADMIN') {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required for admin',
      });
    }

    const tags = await prisma.leadTag.findMany({
      where: { branchId },
      include: {
        _count: { select: { leadToTags: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: { tags },
    });
  } catch (error) {
    console.error('Get lead tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Create a new tag
export const createLeadTag = async (req, res) => {
  try {
    const { name, color = '#6366f1' } = req.body;

    let branchId = req.body.branchId;

    if (req.user.role === 'MANAGER') {
      branchId = req.user.branchId;
    } else if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Only managers and admins can create tags',
      });
    }

    if (!name || !branchId) {
      return res.status(400).json({
        success: false,
        error: 'Name and branch ID are required',
      });
    }

    const existing = await prisma.leadTag.findFirst({
      where: { branchId, name },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Tag with this name already exists in this branch',
      });
    }

    const tag = await prisma.leadTag.create({
      data: { branchId, name, color },
    });

    res.status(201).json({
      success: true,
      data: { tag },
    });
  } catch (error) {
    console.error('Create lead tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Assign tags to a lead
export const assignLeadTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body;

    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    // Check permissions
    if (!canAccessLead(req.user, lead)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Remove existing tags and add new ones
    await prisma.leadToTag.deleteMany({ where: { leadId: id } });

    if (tagIds && tagIds.length > 0) {
      await prisma.leadToTag.createMany({
        data: tagIds.map(tagId => ({
          leadId: id,
          tagId,
        })),
      });
    }

    const tags = await prisma.leadTag.findMany({
      where: { id: { in: tagIds || [] } },
    });

    res.json({
      success: true,
      data: { tags },
    });
  } catch (error) {
    console.error('Assign lead tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Get tags for a specific lead
export const getLeadTagsByLeadId = async (req, res) => {
  try {
    const { id } = req.params;

    const leadTags = await prisma.leadToTag.findMany({
      where: { leadId: id },
      include: {
        tag: true,
      },
    });

    res.json({
      success: true,
      data: { tags: leadTags.map(lt => lt.tag) },
    });
  } catch (error) {
    console.error('Get lead tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// TRANSFER LEAD - Staff can transfer to another staff in same branch
// ============================================
export const transferLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { newAssigneeId, reason } = req.body;

    if (!newAssigneeId) {
      return res.status(400).json({
        success: false,
        error: 'New assignee ID is required',
      });
    }

    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    // Check if the current user is staff and owns this lead
    if (req.user.role !== 'ADMIN') {
      if (!canAccessLead(req.user, lead)) {
        return res.status(403).json({
          success: false,
          error: 'You can only transfer leads assigned to you',
        });
      }
      // Cannot transfer to a different branch
    }

    // MANAGER can also transfer within their branch
    if (req.user.role === 'MANAGER') {
      if (lead.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }

    // Get the new assignee
    const newAssignee = await prisma.user.findUnique({
      where: { id: newAssigneeId },
      select: { id: true, name: true, branchId: true, role: true, isActive: true },
    });

    if (!newAssignee) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignee',
      });
    }

    if (!newAssignee.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to inactive user',
      });
    }

    // Check branch compatibility
    if (newAssignee.branchId !== lead.branchId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to user from a different branch',
      });
    }

    // Cannot transfer to self
    if (newAssigneeId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer to yourself',
      });
    }

    // Update the lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { assignedTo: newAssigneeId },
      include: {
        branch: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Create activity log with TRANSFER type
    await prisma.leadActivity.create({
      data: {
        leadId: id,
        userId: req.user.id,
        type: 'TRANSFER',
        description: `Lead transferred from ${lead.assignee?.name || 'Unassigned'} to ${newAssignee.name}${reason ? ` - Reason: ${reason}` : ''}`,
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditAction.UPDATE,
      entity: AuditEntity.LEAD,
      entityId: id,
      userId: req.user.id,
      branchId: lead.branchId,
      description: `Transferred lead "${lead.name}" from ${lead.assignee?.name || 'Unassigned'} to ${newAssignee.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: {
        lead: updatedLead,
        transferredFrom: lead.assignee?.name || 'Unassigned',
        transferredTo: newAssignee.name,
      },
    });
  } catch (error) {
    console.error('Transfer lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// DOWNLOAD LEAD TEMPLATE - Sample Excel for bulk import
// ============================================
export const downloadLeadTemplate = async (req, res) => {
  try {
    const template = [
      {
        name: 'John Smith',
        phone: '+1234567890',
        email: 'john@example.com',
        source: 'WEBSITE',
        status: 'NEW',
        destination: 'Paris, France',
        travelDateFrom: '2026-05-15',
        travelDateTo: '2026-05-20',
        travelMonth: '2026-05',
        numberOfPax: '2 adults',
        budget: '5000',
        tripType: 'INTERNATIONAL',
        hotelCategory: 'PREMIUM',
        pickupPoint: 'Airport',
        childrenCount: '0',
        priority: 'HIGH',
        notes: 'VIP customer, prefers window seats',
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 20 }, // name
      { wch: 15 }, // phone
      { wch: 25 }, // email
      { wch: 12 }, // source
      { wch: 10 }, // status
      { wch: 20 }, // destination
      { wch: 12 }, // travelDateFrom
      { wch: 12 }, // travelDateTo
      { wch: 10 }, // travelMonth
      { wch: 15 }, // numberOfPax
      { wch: 10 }, // budget
      { wch: 15 }, // tripType
      { wch: 12 }, // hotelCategory
      { wch: 15 }, // pickupPoint
      { wch: 10 }, // childrenCount
      { wch: 10 }, // priority
      { wch: 40 }, // notes
    ];

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=lead-import-template.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating lead template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template',
    });
  }
};

// ============================================
// WEBHOOK HANDLERS - For Google Ads & Meta Lead Forms
// ============================================

// Shared helper to create lead from webhook data
// Ad platform (AdCampaign.platform) -> the lead source its leads carry
const adLeadSource = platform => (platform === 'GOOGLE' ? 'GOOGLE_ADS' : 'META_ADS');

async function createLeadFromWebhook({
  name,
  phone,
  email,
  campaignId,
  branchId,
  adPlatform,
  additionalData = {},
}) {
  const source = adLeadSource(adPlatform);

  // Check for duplicate
  const duplicateResult = await checkDuplicate(branchId, phone, email);

  // Determine who created this lead (use system user if no user context)
  const systemUserId = await getSystemUserId(branchId);

  if (duplicateResult.isDuplicate) {
    // Return existing lead instead of creating new one
    const existingLead = await prisma.lead.findUnique({
      where: { id: duplicateResult.existingLeadId },
      select: { id: true, name: true, phone: true },
    });

    // Link to campaign if provided
    if (campaignId) {
      await prisma.adCampaignLead
        .create({
          data: {
            leadId: existingLead.id,
            campaignId,
          },
        })
        .catch(() => {
          // Ignore if already linked
        });

      // Mark the lead as coming from this ad platform
      await prisma.lead
        .update({
          where: { id: existingLead.id },
          data: { source },
        })
        .catch(() => {});
    }

    return {
      lead: existingLead,
      isDuplicate: true,
      action: 'linked',
    };
  }

  // Find auto assignee from the Meta Ads / Google Ads rules
  const assignee = (await findAutoAssignee(branchId, source))?.user;
  const createdBy = assignee?.id || systemUserId;

  // Create new lead
  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email: email || null,
      source,
      status: LeadStatus.FRESH,
      branchId,
      assignedTo: assignee?.id || null,
      createdBy: createdBy,
      destination: additionalData.destination || null,
      travelMonth: additionalData.travelMonth || null,
      numberOfPax: additionalData.numberOfPax || '1',
      budget: additionalData.budget || null,
      tripType: additionalData.tripType || null,
    },
  });

  // Create activity log
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: createdBy,
      type: 'STATUS_CHANGE',
      description: `Lead created via ${additionalData.platform || 'Ad Campaign'} webhook`,
    },
  });

  // Link to campaign if provided
  if (campaignId) {
    await prisma.adCampaignLead
      .create({
        data: {
          leadId: lead.id,
          campaignId,
        },
      })
      .catch(() => {
        // Ignore if already linked
      });
  }

  return { lead, isDuplicate: false, action: 'created' };
}

// Helper to get or create a system user for webhook-created leads
async function getSystemUserId(branchId) {
  try {
    // Look for any active manager or staff in the branch
    const user = await prisma.user.findFirst({
      where: {
        branchId,
        isActive: true,
        role: { in: ['MANAGER', 'STAFF'] },
      },
      orderBy: { createdAt: 'asc' },
    });
    return user?.id || 'system';
  } catch {
    return 'system';
  }
}

// Google Ads Lead Form Webhook
// POST /api/v1/leads/webhook/google
export const googleAdsWebhook = async (req, res) => {
  try {
    const payload = req.body || {};

    // Google Lead Forms authenticate by echoing back the key you typed into the
    // form's webhook settings. Zapier/Make cannot send it, so they use ?token=.
    const expectedKey = process.env.GOOGLE_ADS_WEBHOOK_KEY;
    // Was META_WEBHOOK_VERIFY_TOKEN - a copy-paste that let anyone holding the
    // Meta webhook secret post leads to the Google endpoint, and meant rotating
    // one platform's secret silently changed the other's.
    const expectedToken = process.env.GOOGLE_ADS_WEBHOOK_TOKEN;
    const suppliedKey = payload.google_key;
    const suppliedToken = req.query.token || req.headers['x-webhook-token'];

    const keyOk = expectedKey && suppliedKey === expectedKey;
    const tokenOk = expectedToken && suppliedToken === expectedToken;

    if (!keyOk && !tokenOk) {
      console.warn('[Google Ads Webhook] Rejected delivery with missing/invalid key');
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Google's test deliveries carry dummy data - acknowledge without storing.
    if (payload.is_test === true) {
      return res.status(200).json({ success: true, data: { message: 'Test payload acknowledged' } });
    }

    const leadData = extractGoogleLeadData(payload);

    if (!leadData.phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    // Google sends its own numeric campaign_id, which is not one of our cuids.
    // Match it against the campaign that was configured with it; fall back to an
    // explicit ?campaignId= for manually built URLs.
    let campaign = null;
    const googleIds = [payload.campaign_id, payload.adgroup_id, payload.form_id]
      .filter(Boolean)
      .map(String);

    if (googleIds.length > 0) {
      campaign = await prisma.adCampaign.findFirst({
        where: {
          platform: 'GOOGLE',
          OR: [{ googleCampaignId: { in: googleIds } }, { googleAccountId: { in: googleIds } }],
        },
        select: { id: true, branchId: true },
      });
    }

    const campaignId = campaign?.id || req.query.campaignId || null;
    let branchId = campaign?.branchId || req.query.branchId || payload.branch_id;

    if (!branchId) {
      branchId = await getDefaultBranchId();
      if (!branchId) {
        return res.status(400).json({
          success: false,
          error: 'No branch configured. Please specify branch_id.',
        });
      }
    }

    const result = await createLeadFromWebhook({
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      campaignId,
      branchId,
      adPlatform: 'GOOGLE',
      additionalData: { platform: 'Google Ads', ...leadData },
    });

    res.status(200).json({
      success: true,
      data: {
        leadId: result.lead?.id,
        action: result.action,
        isDuplicate: result.isDuplicate,
      },
    });
  } catch (error) {
    console.error('[Google Ads Webhook] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
};

/**
 * Google's column ids for the answers we care about. A Lead Form Extension sends
 *   user_column_data: [{ column_id: 'PHONE_NUMBER', string_value: '+91...' }, ...]
 * with built-in ids in caps; custom questions arrive under their own column_name.
 */
const GOOGLE_COLUMN_ALIASES = {
  name: ['FULL_NAME', 'FIRST_NAME'],
  lastName: ['LAST_NAME'],
  phone: ['PHONE_NUMBER'],
  email: ['EMAIL'],
  destination: ['DESTINATION', 'DESTINATION_CITY', 'CITY'],
  travelMonth: ['TRAVEL_MONTH', 'PREFERRED_DATE'],
  numberOfPax: ['NUMBER_OF_PAX', 'PARTY_SIZE'],
  budget: ['BUDGET', 'TRIP_BUDGET'],
  tripType: ['TRIP_TYPE', 'TRAVEL_TYPE'],
};

/**
 * Flatten Google's user_column_data array into a plain object so the same
 * alias lookup works for both native Google payloads and Zapier-flattened ones.
 */
function flattenGoogleColumns(payload) {
  const flat = { ...payload };

  for (const column of payload.user_column_data || []) {
    const value = column?.string_value ?? column?.value;
    if (value === undefined || value === null || value === '') continue;

    // Index under both the column id and the human-readable name, uppercased,
    // so custom questions ("Destination") resolve too.
    if (column.column_id) flat[String(column.column_id).toUpperCase()] = value;
    if (column.column_name) {
      flat[String(column.column_name).toUpperCase().replace(/\s+/g, '_')] = value;
    }
  }

  return flat;
}

// Helper to extract Google lead data from various formats
function extractGoogleLeadData(rawPayload) {
  const payload = flattenGoogleColumns(rawPayload);

  // Native Google payloads use the uppercase column ids; Zapier and hand-rolled
  // callers use lowercase field names. Check both.
  const pick = (aliases, ...fallbacks) => {
    for (const alias of aliases) {
      if (payload[alias]) return payload[alias];
    }
    for (const fallback of fallbacks) {
      if (fallback) return fallback;
    }
    return '';
  };

  const firstName = pick(
    GOOGLE_COLUMN_ALIASES.name,
    payload.name,
    payload.full_name,
    payload.fullName,
    payload.user_name,
    payload.first_name
  );
  const lastName = pick(GOOGLE_COLUMN_ALIASES.lastName, payload.last_name);
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();

  const phone = pick(
    GOOGLE_COLUMN_ALIASES.phone,
    payload.phone,
    payload.phone_number,
    payload.phoneNumber,
    payload.mobile
  );

  const email = pick(
    GOOGLE_COLUMN_ALIASES.email,
    payload.email,
    payload.email_address,
    payload.user_email
  );

  const destination = pick(
    GOOGLE_COLUMN_ALIASES.destination,
    payload.destination,
    payload.destination_city
  );

  const travelMonth = pick(
    GOOGLE_COLUMN_ALIASES.travelMonth,
    payload.travel_month,
    payload.preferred_date
  );

  const numberOfPax =
    pick(GOOGLE_COLUMN_ALIASES.numberOfPax, payload.number_of_pax, payload.party_size) || '1';

  const rawBudget = pick(GOOGLE_COLUMN_ALIASES.budget, payload.budget, payload.trip_budget);
  // Budgets often arrive as "50,000" or "₹50000+" - keep only the digits.
  const budgetDigits = rawBudget ? String(rawBudget).replace(/[^\d.]/g, '') : '';
  const budget = budgetDigits ? parseFloat(budgetDigits) : null;

  const tripType = pick(GOOGLE_COLUMN_ALIASES.tripType, payload.trip_type, payload.travel_type);

  return {
    name: name || 'Google Ads Lead',
    phone: String(phone).replace(/\D/g, ''), // Clean phone number
    email: email || null,
    destination: destination || null,
    travelMonth: travelMonth || null,
    numberOfPax: String(numberOfPax),
    budget: Number.isFinite(budget) ? budget : null,
    tripType: tripType || null,
  };
}

// Meta (Facebook/Instagram) Lead Form Webhook
// POST /api/v1/leads/webhook/meta
export const metaWebhook = async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];

  // Two kinds of caller reach this endpoint, and each is authenticated differently:
  //   1. Meta itself  - signs the body with the app secret.
  //   2. Zapier/Make  - cannot sign, so it must present the shared verify token.
  // Anything unsigned and untokened is rejected; this endpoint is public.
  if (signature) {
    if (!verifyMetaSignature(req.rawBody, signature)) {
      console.warn('[Meta Webhook] Rejected delivery with invalid signature');
      return res.status(403).json({ success: false, error: 'Invalid signature' });
    }
  } else {
    const token = req.query.token || req.headers['x-webhook-token'];
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (!expected || token !== expected) {
      console.warn('[Meta Webhook] Rejected unsigned delivery without a valid token');
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
  }

  const payload = req.body;
  const isMetaNative = Array.isArray(payload?.entry);

  // Meta retries (and eventually disables) a webhook that does not get a fast 200,
  // and it ignores the response body. Acknowledge first, then do the slow work:
  // fetching each lead from the Graph API takes far longer than Meta will wait.
  if (isMetaNative) {
    res.status(200).send('EVENT_RECEIVED');
    processMetaLeadgenPayload(payload).catch(error => {
      console.error('[Meta Webhook] Processing error:', error);
    });
    return;
  }

  // Zapier/Make/direct format - the caller already flattened the fields for us,
  // and expects a real result back.
  try {
    const leadData = extractMetaLeadData(payload);

    if (!leadData.phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
      });
    }

    const campaignId =
      payload.campaign_id || payload.campaignId || req.query.campaignId || null;

    let branchId = payload.branch_id || payload.branchId || req.query.branchId;
    if (!branchId) {
      branchId = await getDefaultBranchId();
      if (!branchId) {
        return res.status(400).json({
          success: false,
          error: 'No branch configured. Please specify branch_id.',
        });
      }
    }

    const result = await createLeadFromWebhook({
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      campaignId,
      branchId,
      adPlatform: 'META',
      additionalData: { platform: 'Meta Ads', ...leadData },
    });

    res.status(200).json({
      success: true,
      data: {
        leadId: result.lead?.id,
        action: result.action,
        isDuplicate: result.isDuplicate,
      },
    });
  } catch (error) {
    console.error('[Meta Webhook] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
};

/**
 * Handle a native Meta leadgen payload after it has been acknowledged.
 *
 * One delivery can batch several entries, each with several changes, so every
 * leadgen_id is resolved independently and one failure never blocks the rest.
 */
async function processMetaLeadgenPayload(payload) {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;

      const value = change.value || {};
      const leadgenId = value.leadgen_id;

      if (!leadgenId) {
        console.warn('[Meta Webhook] leadgen change without a leadgen_id, skipping');
        continue;
      }

      try {
        // Each customer's Page carries its own token and branch. Fall back to
        // the env token only for installs predating per-customer connections.
        const page = await findPage(value.page_id || entry.id);
        if (!page && !process.env.META_PAGE_ACCESS_TOKEN) {
          console.warn(
            `[Meta Webhook] Lead ${leadgenId} is for page ${value.page_id}, which no branch has connected, skipping`
          );
          continue;
        }

        // The webhook carries only IDs - the answers live behind the Graph API.
        const graphLead = await fetchLeadFromGraph(leadgenId, page?.accessToken);
        if (!graphLead) continue;

        const leadData = mapLeadFields(graphLead.field_data);

        if (!leadData.phone) {
          console.warn(`[Meta Webhook] Lead ${leadgenId} has no phone number, skipping`);
          continue;
        }

        // Meta's numeric IDs are not our cuids - map them onto a configured campaign.
        // Scoped to the Page's branch so one customer's campaign config can
        // never pull in another customer's leads.
        const campaign = await resolveCampaign(
          [value.ad_id, value.adgroup_id, value.campaign_id, graphLead.ad_id, graphLead.campaign_id],
          page?.branchId
        );

        const branchId =
          campaign?.branchId || page?.branchId || (await getDefaultBranchId());
        if (!branchId) {
          console.error(`[Meta Webhook] No branch configured, dropping lead ${leadgenId}`);
          continue;
        }

        const result = await createLeadFromWebhook({
          name: leadData.name,
          phone: leadData.phone,
          email: leadData.email,
          campaignId: campaign?.id || null,
          branchId,
          adPlatform: 'META',
          additionalData: { platform: 'Meta Ads', ...leadData },
        });

        console.log(
          `[Meta Webhook] Lead ${leadgenId} ${result.action} -> ${result.lead?.id}` +
            `${campaign ? ` (campaign ${campaign.id})` : ' (no campaign linked)'}`
        );
      } catch (error) {
        console.error(`[Meta Webhook] Failed to import lead ${leadgenId}:`, error.message);
      }
    }
  }
}

/**
 * Fall back to the oldest active branch when the caller does not name one.
 */
async function getDefaultBranchId() {
  const branch = await prisma.branch.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  return branch?.id || null;
}

// Helper to extract Meta lead data
function extractMetaLeadData(payload) {
  const name =
    payload.name ||
    payload.full_name ||
    payload.fullName ||
    `${payload.first_name || ''} ${payload.last_name || ''}`.trim() ||
    '';

  const phone =
    payload.phone || payload.phone_number || payload.phoneNumber || payload.mobile || '';

  const email = payload.email || payload.email_address || payload.email || '';

  const destination = payload.destination || payload.destination_city || '';

  const travelMonth = payload.travel_month || payload.travelMonth || '';

  const numberOfPax = payload.number_of_pax || payload.numberOfPax || payload.party_size || '1';

  const budget = payload.budget ? parseFloat(payload.budget) : null;

  const tripType = payload.trip_type || payload.tripType || '';

  return {
    name: name || 'Meta Lead',
    phone: phone.replace(/\D/g, ''),
    email: email || null,
    destination,
    travelMonth,
    numberOfPax: String(numberOfPax),
    budget,
    tripType,
  };
}

// Webhook verification endpoint for Meta
// GET /api/v1/leads/webhook/meta/verify
export const metaWebhookVerify = async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  // Fail closed. The old fallback was the literal string 'your-verify-token',
  // so an unconfigured deployment would happily complete Meta's verification
  // handshake for anyone who guessed the placeholder.
  if (!verifyToken) {
    console.error('[Meta Webhook] META_WEBHOOK_VERIFY_TOKEN is not set - refusing verification');
    return res.status(503).send('Webhook not configured');
  }

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    // Meta expects the bare challenge echoed back as plain text. Without an
    // explicit type Express labels a string response text/html.
    res.status(200).type('text/plain').send(String(challenge));
  } else {
    // Verification failed
    res.status(403).send('Forbidden');
  }
};

// List all leads from ad campaigns
// GET /api/v1/leads/webhook/campaigns/:campaignId
export const getCampaignLeads = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      include: {
        leads: {
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                status: true,
                createdAt: true,
                destination: true,
                budget: true,
              },
            },
          },
        },
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          platform: campaign.platform,
          status: campaign.status,
        },
        leads: campaign.leads.map(cl => cl.lead),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: campaign._count.leads,
          totalPages: Math.ceil(campaign._count.leads / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Get Campaign Leads] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign leads',
    });
  }
};
