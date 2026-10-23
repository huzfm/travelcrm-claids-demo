import prisma from '../config/prisma.js';

// ============================================================
// Cron Service - Background Jobs for Lead Management
// All jobs run on UTC timezone.
//
// Job Schedule:
// - Every 5 minutes  : Mark overdue follow-ups
// - Every 15 minutes: Lead aging & escalation
// - Daily 8 AM UTC   : Follow-up digest for all users
// - Daily midnight   : Media cleanup (messages > 30 days)
// ============================================================

import cron from 'node-cron';

// ============================================================
// CHUNKING UTILITY - Prevents "too many bind variables" error
// ============================================================
const CHUNK_SIZE = 5000;

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ============================================================
// FOLLOW-UP OVERDUE MARKER
// Runs every 5 minutes
// ============================================================

const markOverdueFollowUps = async () => {
  try {
    const now = new Date();

    const result = await prisma.followUp.updateMany({
      where: {
        scheduledAt: { lt: now },
        status: 'PENDING',
      },
      data: { status: 'OVERDUE' },
    });

    if (result.count > 0) {
      console.log(`[CRON] Marked ${result.count} follow-ups as OVERDUE`);

      // Log activity for each overdue follow-up
      const overdueFollowUps = await prisma.followUp.findMany({
        where: {
          scheduledAt: { lt: now, gte: new Date(now.getTime() - 5 * 60 * 1000) },
          status: 'OVERDUE',
        },
        select: { leadId: true, assignedTo: true, scheduledAt: true },
      });

      // One insert for all of them, instead of one query per follow-up.
      if (overdueFollowUps.length > 0) {
        await prisma.leadActivity.createMany({
          data: overdueFollowUps.map(fu => ({
            leadId: fu.leadId,
            userId: fu.assignedTo,
            type: 'NOTE',
            description: `Follow-up marked OVERDUE (scheduled: ${fu.scheduledAt.toLocaleString()})`,
          })),
        });
      }
    }
  } catch (error) {
    console.error('[CRON] Error marking overdue follow-ups:', error);
  }
};

// ============================================================
// FOLLOW-UP ESCALATION CHAIN
// Runs every 15 minutes
//
// Escalation rules:
// - Overdue 1h  -> Alert assigned agent
// - Overdue 4h  -> Notify manager
// - Overdue 24h -> Alert admin
// NOTE: Auto-reassignment removed - only manual transfers allowed via transferLead API
// ============================================================

const escalateOverdueFollowUps = async () => {
  try {
    const now = new Date();

    // Get all overdue follow-ups with their leads and assignees in ONE query
    const overdueFollowUps = await prisma.followUp.findMany({
      where: { status: 'OVERDUE' },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            branchId: true,
            assignedTo: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            branchId: true,
          },
        },
      },
    });

    if (overdueFollowUps.length === 0) return;

    // Pre-fetch all existing alerts in ONE query (avoid N+1)
    const _oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const _fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const leadIds = overdueFollowUps.map(fu => fu.leadId);

    // Chunk large arrays to prevent "too many bind variables" error
    const leadIdChunks = chunkArray(leadIds, CHUNK_SIZE);
    const existingAlertsChunks = await Promise.all(
      leadIdChunks.map(chunk =>
        prisma.leadActivity.findMany({
          where: {
            leadId: { in: chunk },
            OR: [
              { description: { contains: '[ESCALATION]' } },
              { description: { contains: '[ESCALATION] Auto-reassigned' } },
            ],
            createdAt: { gte: twentyFourHoursAgo },
          },
          select: { leadId: true, description: true, createdAt: true },
        })
      )
    );
    const existingAlerts = existingAlertsChunks.flat();

    // Pre-fetch all managers in ONE query (avoid N+1)
    const allBranchIds = [...new Set(overdueFollowUps.map(fu => fu.lead.branchId))];
    const managers = await prisma.user.findMany({
      where: {
        branchId: { in: allBranchIds },
        role: 'MANAGER',
        isActive: true,
      },
      select: { id: true, branchId: true, name: true },
    });

    // Group managers by branchId for quick lookup
    const managersByBranch = new Map();
    managers.forEach(m => {
      if (!managersByBranch.has(m.branchId)) {
        managersByBranch.set(m.branchId, []);
      }
      managersByBranch.get(m.branchId).push(m);
    });

    // Build alerts lookup map
    const alertsMap = new Map();
    existingAlerts.forEach(alert => {
      if (!alertsMap.has(alert.leadId)) {
        alertsMap.set(alert.leadId, new Set());
      }
      alertsMap.get(alert.leadId).add(alert.description.substring(0, 50));
    });

    // Batch create activities
    const activitiesToCreate = [];
    const logMessages = [];

    for (const fu of overdueFollowUps) {
      const overdueMs = now.getTime() - fu.scheduledAt.getTime();
      const overdueHours = overdueMs / (1000 * 60 * 60);
      const leadAlerts = alertsMap.get(fu.leadId) || new Set();

      // 1. Overdue by 1+ hour - Alert to agent
      if (overdueHours >= 1 && overdueHours < 4) {
        const hasAlert = [...leadAlerts].some(a => a.includes('[ESCALATION] Agent alert'));
        if (!hasAlert) {
          activitiesToCreate.push({
            leadId: fu.leadId,
            userId: fu.assignedTo,
            type: 'NOTE',
            description: `[ESCALATION] Follow-up overdue by ${Math.floor(overdueHours)}h - please address`,
          });
          logMessages.push(`[ESCALATION] Alerted agent for overdue follow-up: ${fu.lead.name}`);
        }
      }

      // 2. Overdue by 4+ hours - Notify manager
      if (overdueHours >= 4 && overdueHours < 24) {
        const hasAlert = [...leadAlerts].some(a => a.includes('[ESCALATION] Manager notified'));
        if (!hasAlert) {
          const branchManagers = managersByBranch.get(fu.lead.branchId) || [];
          const manager = branchManagers[0];
          if (manager) {
            activitiesToCreate.push({
              leadId: fu.leadId,
              userId: manager.id,
              type: 'NOTE',
              description: `[ESCALATION] Manager notified: Follow-up for ${fu.lead.name} is ${Math.floor(overdueHours)}h overdue. Assigned to: ${fu.assignee?.name || 'Unknown'}`,
            });
            logMessages.push(
              `[ESCALATION] Notified manager for overdue follow-up: ${fu.lead.name}`
            );
          }
        }
      }

      // Note: 24-48h escalation removed - only manual transfers allowed
    }

    // Batch insert all activities (single query instead of N queries)
    if (activitiesToCreate.length > 0) {
      await prisma.leadActivity.createMany({ data: activitiesToCreate });
    }

    // Log all messages at once
    logMessages.forEach(msg => console.log(msg));
    console.log(
      `[ESCALATION] Processed ${overdueFollowUps.length} overdue follow-ups, created ${activitiesToCreate.length} activities`
    );
  } catch (error) {
    console.error('[CRON] Error in follow-up escalation:', error);
  }
};

// ============================================================
// LEAD AGING & ESCALATION
// Runs every 15 minutes
//
// Rules:
// - Leads in FRESH status > 1h -> Alert assigned agent
// - Leads in FRESH status > 4h -> Notify manager
// NOTE: Auto-escalation removed. Only manual transfers allowed.
// Managers and admins can reassign leads through the UI or API.
// ============================================================

const processLeadAging = async () => {
  try {
    const now = new Date();

    // Get leads in FRESH status that haven't been touched in a while
    const _oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find stale FRESH leads in ONE query
    const staleLeads = await prisma.lead.findMany({
      where: {
        status: 'FRESH',
        deletedAt: null,
        createdAt: { lt: twentyFourHoursAgo },
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (staleLeads.length === 0) return;

    // Pre-fetch all existing alerts in ONE query (avoid N+1)
    const leadIds = staleLeads.map(l => l.id);

    // Chunk large arrays to prevent "too many bind variables" error
    const leadIdChunks = chunkArray(leadIds, CHUNK_SIZE);
    const existingAlertsChunks = await Promise.all(
      leadIdChunks.map(chunk =>
        prisma.leadActivity.findMany({
          where: {
            leadId: { in: chunk },
            OR: [
              { description: { contains: '[LEAD AGING]' } },
              { description: { contains: '[LEAD AGING] Auto-escalated' } },
            ],
            createdAt: { gte: fourHoursAgo },
          },
          select: { leadId: true, description: true },
        })
      )
    );
    const existingAlerts = existingAlertsChunks.flat();

    // Pre-fetch all managers in ONE query (avoid N+1)
    const allBranchIds = [...new Set(staleLeads.map(l => l.branchId))];
    const managers = await prisma.user.findMany({
      where: {
        branchId: { in: allBranchIds },
        role: 'MANAGER',
        isActive: true,
      },
      select: { id: true, branchId: true, name: true },
    });

    // Group managers by branchId for quick lookup
    const managersByBranch = new Map();
    managers.forEach(m => {
      if (!managersByBranch.has(m.branchId)) {
        managersByBranch.set(m.branchId, []);
      }
      managersByBranch.get(m.branchId).push(m);
    });

    // Build alerts lookup map
    const alertsMap = new Map();
    existingAlerts.forEach(alert => {
      if (!alertsMap.has(alert.leadId)) {
        alertsMap.set(alert.leadId, new Set());
      }
      alertsMap.get(alert.leadId).add(alert.description.substring(0, 50));
    });

    // Batch create activities
    const activitiesToCreate = [];
    const logMessages = [];

    for (const lead of staleLeads) {
      const ageMs = now.getTime() - lead.createdAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const leadAlerts = alertsMap.get(lead.id) || new Set();

      // 1. > 1 hour old - Alert to agent
      if (ageHours >= 1 && ageHours < 4) {
        const hasAlert = [...leadAlerts].some(a => a.includes('[LEAD AGING] Agent alert'));
        if (!hasAlert && lead.assignedTo) {
          activitiesToCreate.push({
            leadId: lead.id,
            userId: lead.assignedTo,
            type: 'NOTE',
            description: `[LEAD AGING] New lead awaiting contact for ${Math.floor(ageHours)}h - please reach out`,
          });
          logMessages.push(`[LEAD AGING] Alerted agent for stale lead: ${lead.name}`);
        }
      }

      // 2. > 4 hours old - Notify manager
      if (ageHours >= 4 && ageHours < 24) {
        const hasAlert = [...leadAlerts].some(a => a.includes('[LEAD AGING] Manager notified'));
        if (!hasAlert) {
          const branchManagers = managersByBranch.get(lead.branchId) || [];
          const manager = branchManagers[0];
          if (manager) {
            activitiesToCreate.push({
              leadId: lead.id,
              userId: manager.id,
              type: 'NOTE',
              description: `[LEAD AGING] Manager notified: New lead ${lead.name} hasn't been contacted in ${Math.floor(ageHours)}h`,
            });
            logMessages.push(`[LEAD AGING] Notified manager for stale lead: ${lead.name}`);
          }
        }
      }

      // NOTE: Auto-escalation removed - only manual transfers allowed via transferLead API
      // Managers and admins can manually reassign leads through the UI or API
    }

    // Batch insert all activities (single query instead of N queries)
    if (activitiesToCreate.length > 0) {
      await prisma.leadActivity.createMany({ data: activitiesToCreate });
    }

    // NOTE: No auto-updates to leads - only alerts are sent

    // Log all messages at once
    logMessages.forEach(msg => console.log(msg));
    console.log(
      `[LEAD AGING] Processed ${staleLeads.length} stale leads, created ${activitiesToCreate.length} activities`
    );
  } catch (error) {
    console.error('[CRON] Error in lead aging:', error);
  }
};

// ============================================================
// DAILY FOLLOW-UP DIGEST
// Runs daily at 8 AM UTC
// ============================================================

const sendDailyDigest = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, branch: { select: { name: true } } },
    });
    const userIds = users.map(user => user.id);

    // Two queries for everyone, instead of two per user.
    const [todaysFollowUps, overdueByUser] = await Promise.all([
      prisma.followUp.findMany({
        where: {
          assignedTo: { in: userIds },
          status: 'PENDING',
          scheduledAt: { gte: today, lt: tomorrow },
        },
        select: {
          assignedTo: true,
          scheduledAt: true,
          lead: { select: { name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.followUp.groupBy({
        by: ['assignedTo'],
        where: { assignedTo: { in: userIds }, status: 'OVERDUE' },
        _count: { _all: true },
      }),
    ]);

    const pendingByUser = new Map();
    for (const fu of todaysFollowUps) {
      if (!pendingByUser.has(fu.assignedTo)) pendingByUser.set(fu.assignedTo, []);
      pendingByUser.get(fu.assignedTo).push(fu);
    }
    const overdueCounts = new Map(overdueByUser.map(row => [row.assignedTo, row._count._all]));

    let totalPending = 0;
    let totalOverdue = 0;

    for (const user of users) {
      const pendingFollowUps = pendingByUser.get(user.id) || [];
      const overdueCount = overdueCounts.get(user.id) || 0;

      if (pendingFollowUps.length > 0 || overdueCount > 0) {
        console.log(
          `[DAILY DIGEST] ${user.name} (${user.email}) - Branch: ${user.branch?.name || 'Unknown'}`
        );
        console.log(`  Pending follow-ups today: ${pendingFollowUps.length}`);
        console.log(`  Overdue follow-ups: ${overdueCount}`);

        pendingFollowUps.forEach(fu => {
          console.log(`    - ${fu.lead.name} at ${fu.scheduledAt.toLocaleTimeString()}`);
        });
      }

      totalPending += pendingFollowUps.length;
      totalOverdue += overdueCount;
    }

    console.log(
      `[DAILY DIGEST SUMMARY] Total pending: ${totalPending} | Total overdue: ${totalOverdue}`
    );
  } catch (error) {
    console.error('[CRON] Error generating daily digest:', error);
  }
};

// ============================================================
// MEDIA CLEANUP
// Runs daily at midnight UTC
// Deletes media files from messages older than 30 days
// ============================================================

const cleanupOldMedia = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldMessages = await prisma.whatsappMessage.findMany({
      where: {
        sentAt: { lt: thirtyDaysAgo },
        mediaPath: { not: null },
      },
      select: {
        id: true,
        mediaPath: true,
      },
    });

    if (oldMessages.length > 0) {
      console.log(`[CRON] Found ${oldMessages.length} messages with media older than 30 days`);
      // Note: We don't delete from DB here, just log
      // Media deletion should be handled based on retention policy
    }
  } catch (error) {
    console.error('[CRON] Error in media cleanup:', error);
  }
};

// ============================================================
// START ALL CRON JOBS
// ============================================================

export const startCronJobs = () => {
  console.log('Starting cron jobs...');

  // Every 5 minutes: Mark overdue follow-ups
  cron.schedule('*/5 * * * *', markOverdueFollowUps, {
    timezone: 'UTC',
  });

  // Every 15 minutes: Lead aging & follow-up escalation
  cron.schedule(
    '*/15 * * * *',
    async () => {
      await escalateOverdueFollowUps();
      await processLeadAging();
    },
    {
      timezone: 'UTC',
    }
  );

  // Daily at 8 AM UTC: Follow-up digest
  cron.schedule('0 8 * * *', sendDailyDigest, {
    timezone: 'UTC',
  });

  // Daily at midnight UTC: Media cleanup scan
  cron.schedule('0 0 * * *', cleanupOldMedia, {
    timezone: 'UTC',
  });

  console.log('Cron jobs registered:');
  console.log('  */5 * * * *  - Mark overdue follow-ups');
  console.log('  */15 * * * * - Lead aging & escalation');
  console.log('  0 8 * * *    - Daily follow-up digest');
  console.log('  0 0 * * *    - Media cleanup scan');
};

export const stopCronJobs = () => {
  cron.stop();
  console.log('Cron jobs stopped');
};
