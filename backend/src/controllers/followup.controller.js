import { body, validationResult } from 'express-validator';
import prisma from '../config/prisma.js';
import { createAuditLog, AuditAction, AuditEntity } from '../services/audit.service.js';

export const followUpValidation = [
  body('leadId').notEmpty().withMessage('Lead ID is required'),
  body('assignedTo').notEmpty().withMessage('Assigned user is required'),
  body('scheduledAt').isISO8601().withMessage('Valid scheduled date is required'),
  body('type')
    .optional()
    .isIn(['CALL', 'MEETING', 'VISIT', 'EMAIL', 'WHATSAPP', 'VIDEO_CALL', 'OTHER'])
    .withMessage('Valid type is required'),
  body('notes').optional().trim(),
];

export const getLeadFollowUps = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, branchId: true, assignedTo: true },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    // Role-based access control for viewing follow-ups of a specific lead
    if (req.user.role === 'STAFF') {
      // STAFF: can only see if they are assigned to the lead OR created the follow-up
      const followUpAccess = await prisma.followUp.findFirst({
        where: {
          leadId: id,
          OR: [{ assignedTo: req.user.id }, { createdBy: req.user.id }],
        },
      });
      if (!followUpAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    } else if (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    // ADMIN can access all

    const followUps = await prisma.followUp.findMany({
      where: { leadId: id },
      orderBy: { scheduledAt: 'desc' },
      include: {
        assignee: {
          select: { id: true, name: true, role: true },
        },
        creator: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      data: followUps,
    });
  } catch (error) {
    console.error('Get lead follow-ups error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getAllFollowUps = async (req, res) => {
  try {
    const { status, assignedTo, date, dateFrom, dateTo } = req.query;

    // Role-based access control:
    // ADMIN: sees all follow-ups (no filtering)
    // MANAGER: sees all follow-ups in their branch
    // STAFF: sees only follow-ups assigned to them OR created by them
    let where = {};

    if (req.user.role === 'STAFF') {
      // STAFF: assigned to them OR created by them
      where.OR = [{ assignedTo: req.user.id }, { createdBy: req.user.id }];
    } else if (req.user.role === 'MANAGER') {
      // MANAGER: all follow-ups in their branch
      where.lead = { branchId: req.user.branchId };
    }
    // ADMIN sees all - no additional filter needed

    if (status) {
      if (status === 'overdue') {
        where.status = 'OVERDUE';
      } else if (status === 'pending') {
        where.status = 'PENDING';
      } else if (status === 'done') {
        where.status = 'DONE';
      } else if (status === 'rescheduled') {
        where.status = 'RESCHEDULED';
      } else {
        where.status = status;
      }
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.scheduledAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        where.scheduledAt.gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.scheduledAt.lte = endDate;
      }
    } else if (date) {
      // Single day filter
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.scheduledAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
            branchId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        followUps,
        total: followUps.length,
      },
    });
  } catch (error) {
    console.error('Get all follow-ups error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getFollowUpById = async (req, res) => {
  try {
    const { id } = req.params;

    const followUp = await prisma.followUp.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
            branchId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found',
      });
    }

    // Role-based access control for viewing a specific follow-up
    if (req.user.role === 'STAFF') {
      if (followUp.assignedTo !== req.user.id && followUp.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    } else if (req.user.role === 'MANAGER' && followUp.lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    // ADMIN can access all

    res.json({
      success: true,
      data: { followUp },
    });
  } catch (error) {
    console.error('Get follow-up by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createFollowUp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { leadId, assignedTo, scheduledAt, type, notes, feedback } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { branch: true },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found. The lead may have been deleted or does not exist.',
      });
    }

    // Role-based access control for creating follow-ups
    if (req.user.role === 'STAFF') {
      // STAFF: can only create follow-ups for leads assigned to them OR leads they created
      if (lead.assignedTo !== req.user.id && lead.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - you can only create follow-ups for your assigned leads',
        });
      }
    } else if (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot create follow-ups for leads in other branches',
      });
    }
    // ADMIN can create for any lead

    const assignee = await prisma.user.findUnique({ where: { id: assignedTo } });
    if (!assignee) {
      return res.status(400).json({
        success: false,
        error: 'Assignee not found',
      });
    }

    if (req.user.role !== 'ADMIN' && assignee.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot assign to users in other branches',
      });
    }

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        assignedTo,
        createdBy: req.user.id,
        type: type || 'CALL',
        scheduledAt: new Date(scheduledAt),
        status: 'PENDING',
        notes,
        feedback,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: req.user.id,
        type: 'NOTE',
        description: `Follow-up scheduled for ${new Date(scheduledAt).toLocaleString()}`,
      },
    });

    // Create audit log for follow-up creation
    await createAuditLog({
      action: AuditAction.CREATE,
      entity: AuditEntity.FOLLOWUP,
      entityId: followUp.id,
      userId: req.user.id,
      branchId: lead.branchId,
      description: `Created follow-up for lead: ${lead.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: { followUp },
    });
  } catch (error) {
    console.error('Create follow-up error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt, status, notes, assignedTo, outcome, feedback } = req.body;

    const existing = await prisma.followUp.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found',
      });
    }

    // Role-based access control for updating follow-ups
    if (req.user.role === 'STAFF') {
      // STAFF: can only update follow-ups assigned to them OR created by them
      if (existing.assignedTo !== req.user.id && existing.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - you can only update your assigned follow-ups',
        });
      }
    } else if (req.user.role === 'MANAGER' && existing.lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    // ADMIN can update any follow-up

    const updateData = {};
    const activitiesToCreate = [];

    if (status) {
      updateData.status = status;

      if (status === 'DONE') {
        updateData.completedAt = new Date();

        const outcomeText = outcome ? ` (${outcome.replace(/_/g, ' ')})` : '';
        activitiesToCreate.push({
          leadId: existing.leadId,
          userId: req.user.id,
          type: 'CALL',
          description: `Follow-up completed${outcomeText}: ${notes || ''}`,
        });
      } else if (status === 'RESCHEDULED') {
        activitiesToCreate.push({
          leadId: existing.leadId,
          userId: req.user.id,
          type: 'NOTE',
          description: `Follow-up rescheduled from ${existing.scheduledAt.toLocaleString()}`,
        });
      }
    }

    if (outcome) updateData.outcome = outcome;
    if (feedback !== undefined) updateData.feedback = feedback;

    if (scheduledAt) {
      updateData.scheduledAt = new Date(scheduledAt);
      if (status !== 'DONE' && existing.status !== 'RESCHEDULED') {
        updateData.status = 'RESCHEDULED';
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (assignedTo && assignedTo !== existing.assignedTo) {
      updateData.assignedTo = assignedTo;

      const newAssignee = await prisma.user.findUnique({
        where: { id: assignedTo },
        select: { id: true, name: true },
      });

      const oldAssignee = await prisma.user.findUnique({
        where: { id: existing.assignedTo },
        select: { id: true, name: true },
      });

      activitiesToCreate.push({
        leadId: existing.leadId,
        userId: req.user.id,
        type: 'NOTE',
        description: `Follow-up reassigned from ${oldAssignee?.name || 'Unknown'} to ${newAssignee?.name || 'Unknown'}`,
      });
    }

    const followUp = await prisma.followUp.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (activitiesToCreate.length > 0) {
      await prisma.leadActivity.createMany({
        data: activitiesToCreate,
      });
    }

    // Create audit log for follow-up update
    await createAuditLog({
      action: AuditAction.UPDATE,
      entity: AuditEntity.FOLLOWUP,
      entityId: id,
      userId: req.user.id,
      branchId: existing.lead.branchId,
      oldData: existing,
      newData: followUp,
      description: `Updated follow-up for lead: ${existing.lead.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: { followUp },
    });
  } catch (error) {
    console.error('Update follow-up error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getFollowUpDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Build where clause based on role
    const baseWhere = {
      scheduledAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    };

    // ADMIN sees all; MANAGER sees branch; STAFF sees only their own
    let staffWhere = {};
    let managerWhere = {};

    if (req.user.role === 'STAFF') {
      staffWhere = { assignedTo: userId };
    } else if (req.user.role === 'MANAGER') {
      managerWhere = { lead: { branchId: req.user.branchId } };
    }
    // ADMIN sees all - no additional filter

    const [todaysPending, overdue, upcoming] = await Promise.all([
      prisma.followUp.findMany({
        where: {
          ...baseWhere,
          ...(req.user.role === 'STAFF' ? staffWhere : {}),
          ...(req.user.role === 'MANAGER' ? managerWhere : {}),
          status: 'PENDING',
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          assignee: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.followUp.count({
        where: {
          ...(req.user.role === 'STAFF' ? { assignedTo: userId } : {}),
          ...(req.user.role === 'MANAGER' ? { lead: { branchId: req.user.branchId } } : {}),
          status: 'OVERDUE',
        },
      }),
      prisma.followUp.findMany({
        where: {
          scheduledAt: {
            gt: endOfToday,
            lte: nextWeek,
          },
          ...(req.user.role === 'STAFF' ? staffWhere : {}),
          ...(req.user.role === 'MANAGER' ? managerWhere : {}),
          status: { in: ['PENDING', 'RESCHEDULED'] },
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        todaysPending: {
          count: todaysPending.length,
          items: todaysPending,
        },
        overdue: {
          count: overdue,
        },
        upcoming: {
          count: upcoming.length,
          items: upcoming,
        },
      },
    });
  } catch (error) {
    console.error('Get follow-up dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// DELETE FOLLOW-UP
// ============================================
export const deleteFollowUp = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.followUp.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found',
      });
    }

    // Role-based access control for deleting follow-ups
    if (req.user.role === 'STAFF') {
      // STAFF: can only delete follow-ups assigned to them OR created by them
      if (existing.assignedTo !== req.user.id && existing.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - you can only delete your assigned follow-ups',
        });
      }
    } else if (req.user.role === 'MANAGER' && existing.lead.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }
    // ADMIN can delete any follow-up

    await prisma.followUp.delete({
      where: { id },
    });

    // Create audit log for follow-up deletion
    await createAuditLog({
      action: AuditAction.DELETE,
      entity: AuditEntity.FOLLOWUP,
      entityId: id,
      userId: req.user.id,
      branchId: existing.lead.branchId,
      oldData: existing,
      description: `Deleted follow-up for lead: ${existing.lead.name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      data: { message: 'Follow-up deleted successfully' },
    });
  } catch (error) {
    console.error('Delete follow-up error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// ============================================
// CALENDAR VIEW - Get follow-ups for calendar
// ============================================
export const getFollowUpCalendar = async (req, res) => {
  try {
    const { start, end, assignedTo, branchId } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Start and end dates are required',
      });
    }

    const where = {
      scheduledAt: {
        gte: new Date(start),
        lte: new Date(end),
      },
    };

    // Role-based filtering for calendar view
    if (req.user.role === 'STAFF') {
      // STAFF: sees follow-ups assigned to them OR created by them
      where.OR = [{ assignedTo: req.user.id }, { createdBy: req.user.id }];
    } else if (req.user.role === 'MANAGER') {
      // MANAGER: all follow-ups in their branch
      where.lead = { branchId: req.user.branchId };
    } else if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (branchId && req.user.role === 'ADMIN') {
      where.lead = { branchId };
    }

    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000); // Max 1000 per request
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await prisma.followUp.count({ where });

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: limit,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by date for calendar view
    const calendarData = followUps.map(fu => ({
      id: fu.id,
      title: `${fu.type}: ${fu.lead.name}`,
      start: fu.scheduledAt,
      end: fu.completedAt || fu.scheduledAt,
      type: fu.type,
      status: fu.status,
      lead: fu.lead,
      assignee: fu.assignee,
      notes: fu.notes,
    }));

    res.json({
      success: true,
      data: {
        events: calendarData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get follow-up calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
