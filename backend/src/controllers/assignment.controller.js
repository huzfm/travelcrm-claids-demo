import prisma from '../config/prisma.js';

export const getAssignmentRules = async (req, res) => {
  try {
    const { branchId } = req.query;

    let where = {};

    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    } else if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    const rules = await prisma.assignmentRule.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        branch: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ branchId: 'asc' }, { priority: 'asc' }],
    });

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('Get assignment rules error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createAssignmentRule = async (req, res) => {
  try {
    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { userId, source, branchId, priority = 1 } = req.body;

    // Several users can be added for one source in a single request:
    // assignees: [{ userId, priority }]. A bare userId still works.
    const assignees = Array.isArray(req.body.assignees)
      ? req.body.assignees
      : userId
        ? [{ userId, priority }]
        : [];

    if (!source || assignees.length === 0 || assignees.some(a => !a?.userId)) {
      return res.status(400).json({
        success: false,
        error: 'Source and at least one user are required',
      });
    }

    const userIds = assignees.map(a => a.userId);
    if (new Set(userIds).size !== userIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Each user can only be added once',
      });
    }

    // Determine branchId
    let finalBranchId;
    if (req.user.role === 'ADMIN') {
      finalBranchId = branchId || req.user.branchId;
    } else {
      finalBranchId = req.user.branchId;
    }

    // Verify users exist, are active and belong to the branch
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        error: 'User not found',
      });
    }

    if (users.some(u => !u.isActive)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot assign to inactive user',
      });
    }

    if (req.user.role !== 'ADMIN' && users.some(u => u.branchId !== req.user.branchId)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot assign to users in other branches',
      });
    }

    const existing = await prisma.assignmentRule.findMany({
      where: { branchId: finalBranchId, source, userId: { in: userIds } },
      include: { user: { select: { name: true } } },
    });

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Already has a rule for this source: ${existing.map(r => r.user.name).join(', ')}`,
      });
    }

    const rules = await prisma.$transaction(
      assignees.map(a =>
        prisma.assignmentRule.create({
          data: {
            branchId: finalBranchId,
            userId: a.userId,
            source,
            priority: parseInt(a.priority) || 1,
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
            branch: {
              select: { id: true, name: true },
            },
          },
        })
      )
    );

    // Single-user requests keep returning one rule, as before
    const rule = Array.isArray(req.body.assignees) ? rules : rules[0];

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Create assignment rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateAssignmentRule = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const existing = await prisma.assignmentRule.findUnique({
      where: { id },
      include: { branch: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    // Managers can only update rules in their branch
    if (req.user.role === 'MANAGER' && existing.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const { userId, source, priority, isActive } = req.body;

    const updateData = {};

    if (userId !== undefined) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'User not found',
        });
      }
      if (req.user.role !== 'ADMIN' && user.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot assign to users in other branches',
        });
      }
      updateData.userId = userId;
    }

    if (source !== undefined) updateData.source = source;
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (isActive !== undefined) updateData.isActive = isActive;

    const rule = await prisma.assignmentRule.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Update assignment rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteAssignmentRule = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const existing = await prisma.assignmentRule.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    if (req.user.role === 'MANAGER' && existing.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    await prisma.assignmentRule.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: { message: 'Rule deleted successfully' },
    });
  } catch (error) {
    console.error('Delete assignment rule error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
