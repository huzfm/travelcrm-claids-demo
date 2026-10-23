import prisma from '../config/prisma.js';
export const checkDuplicate = async (branchId, phone, email) => {
  try {
    const normalizedPhone = phone ? phone.trim() : null;
    const normalizedEmail = email ? email.trim().toLowerCase() : null;

    if (!normalizedPhone && !normalizedEmail) {
      return {
        isDuplicate: false,
        existingLeadId: null,
      };
    }

    const whereConditions = [];

    if (normalizedPhone) {
      whereConditions.push({
        phone: normalizedPhone,
        branchId: branchId,
        deletedAt: null,
      });
    }

    if (normalizedEmail) {
      whereConditions.push({
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
        branchId: branchId,
        deletedAt: null,
      });
    }

    if (whereConditions.length === 0) {
      return {
        isDuplicate: false,
        existingLeadId: null,
      };
    }

    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: whereConditions,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
      },
    });

    if (existingLead) {
      return {
        isDuplicate: true,
        existingLeadId: existingLead.id,
        existingLead: existingLead,
      };
    }

    return {
      isDuplicate: false,
      existingLeadId: null,
    };
  } catch (error) {
    console.error('Duplicate check error:', error);
    throw error;
  }
};

const ruleUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  branchId: true,
};

/**
 * Picks the next assignee from a set of rules using priority tiers + round-robin.
 *
 * - Only rules whose user is still active are considered.
 * - The lowest priority number wins: every rule at that number forms the top tier,
 *   and lower tiers only get leads once nobody in the tier above is available.
 * - Within the tier, the rule assigned least recently (never-assigned first) gets
 *   the lead, so users sharing a priority take turns.
 *
 * The cursor update is conditional on the value we read, so two leads arriving
 * at once don't both land on the same user; the loser just re-reads and retries.
 */
const pickRoundRobin = async where => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const rules = await prisma.assignmentRule.findMany({
      where: { ...where, isActive: true, user: { isActive: true } },
      orderBy: [
        { priority: 'asc' },
        { lastAssignedAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
      ],
      include: { user: { select: ruleUserSelect } },
    });

    const rule = rules[0];
    if (!rule) return null;

    const claimed = await prisma.assignmentRule.updateMany({
      where: { id: rule.id, lastAssignedAt: rule.lastAssignedAt },
      data: { lastAssignedAt: new Date() },
    });

    if (claimed.count === 1 || attempt === 2) {
      return { user: rule.user, branchId: rule.branchId };
    }
  }
  return null;
};

export const findAutoAssignee = async (branchId, source, options = {}) => {
  try {
    const { allowCrossBranch = false } = options;

    // First, try the rules for this source in the same branch
    const match = await pickRoundRobin({ branchId, source });
    if (match) return match;

    // Fallback: any active rule in the same branch, whatever its source
    const fallback = await pickRoundRobin({ branchId });
    if (fallback) return fallback;

    // For admin with cross-branch enabled, search all branches
    if (allowCrossBranch) {
      const crossBranch = await pickRoundRobin({ source });
      if (crossBranch) return crossBranch;
    }

    // Find oldest active staff in the same branch
    const staffMember = await prisma.user.findFirst({
      where: {
        branchId: branchId,
        role: 'STAFF',
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (staffMember) {
      return {
        user: staffMember,
        branchId: staffMember.branchId,
      };
    }

    // Find oldest manager in the same branch
    const manager = await prisma.user.findFirst({
      where: {
        branchId: branchId,
        role: 'MANAGER',
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return manager ? { user: manager, branchId: manager.branchId } : null;
  } catch (error) {
    console.error('Auto-assign error:', error);
    return null;
  }
};
