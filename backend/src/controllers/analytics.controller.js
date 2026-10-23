import prisma from '../config/prisma.js';
import cacheService from '../services/cache.service.js';
const CACHE_TTL = {
  pipeline: 60, // 1 minute
  sources: 60, // 1 minute
  dashboard: 60, // 1 minute
  teamStats: 120, // 2 minutes
};

export const getPipeline = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const cacheKey = `pipeline:${req.user.id}:${branchId || ''}:${startDate || ''}:${endDate || ''}`;

    // Check cache
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const where = {
      deletedAt: null,
    };

    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId && req.user.role === 'ADMIN') {
      where.branchId = branchId;
    } else if (req.user.role === 'STAFF') {
      where.assignedTo = req.user.id;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const pipeline = {};
    leadsByStatus.forEach(item => {
      pipeline[item.status] = item._count;
    });

    const total = leadsByStatus.reduce((sum, item) => sum + item._count, 0);

    const result = {
      success: true,
      data: {
        pipeline,
        total,
        period: {
          startDate,
          endDate,
        },
      },
    };

    // Cache the result
    cacheService.set(cacheKey, result, CACHE_TTL.pipeline);

    res.json(result);
  } catch (error) {
    console.error('Get pipeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getSources = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const cacheKey = `sources:${req.user.id}:${branchId || ''}:${startDate || ''}:${endDate || ''}`;

    // Check cache
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const where = {
      deletedAt: null,
    };

    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId && req.user.role === 'ADMIN') {
      where.branchId = branchId;
    } else if (req.user.role === 'STAFF') {
      where.assignedTo = req.user.id;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where,
      _count: true,
    });

    const sources = {};
    leadsBySource.forEach(item => {
      sources[item.source] = item._count;
    });

    const total = leadsBySource.reduce((sum, item) => sum + item._count, 0);

    const result = {
      success: true,
      data: {
        sources,
        total,
        period: {
          startDate,
          endDate,
        },
      },
    };

    // Cache the result
    cacheService.set(cacheKey, result, CACHE_TTL.sources);

    res.json(result);
  } catch (error) {
    console.error('Get sources error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getConversion = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;

    const where = {
      deletedAt: null,
    };

    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId && req.user.role === 'ADMIN') {
      where.branchId = branchId;
    } else if (req.user.role === 'STAFF') {
      where.assignedTo = req.user.id;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalLeads, bookedLeads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({
        where: {
          ...where,
          status: 'WON',
        },
      }),
    ]);

    const conversionRate = totalLeads > 0 ? ((bookedLeads / totalLeads) * 100).toFixed(2) : 0;

    let monthlyData = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const months = [];
      let current = new Date(start.getFullYear(), start.getMonth(), 1);

      while (current <= end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);

        const [monthTotal, monthBooked] = await Promise.all([
          prisma.lead.count({
            where: {
              ...where,
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
          prisma.lead.count({
            where: {
              ...where,
              status: 'WON',
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            },
          }),
        ]);

        months.push({
          month: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
          total: monthTotal,
          booked: monthBooked,
          rate: monthTotal > 0 ? ((monthBooked / monthTotal) * 100).toFixed(2) : 0,
        });

        current.setMonth(current.getMonth() + 1);
      }

      monthlyData = months;
    }

    res.json({
      success: true,
      data: {
        totalLeads,
        bookedLeads,
        conversionRate: parseFloat(conversionRate),
        monthlyBreakdown: monthlyData,
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    console.error('Get conversion error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getTeamStats = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;

    const userWhere = {};

    if (req.user.role === 'MANAGER') {
      userWhere.branchId = req.user.branchId;
    } else if (branchId && req.user.role === 'ADMIN') {
      userWhere.branchId = branchId;
    }

    const leadWhere = {
      deletedAt: null,
    };

    if (req.user.role === 'MANAGER') {
      leadWhere.branchId = req.user.branchId;
    } else if (branchId && req.user.role === 'ADMIN') {
      leadWhere.branchId = branchId;
    } else if (req.user.role === 'STAFF') {
      leadWhere.assignedTo = req.user.id;
    }

    if (startDate || endDate) {
      leadWhere.createdAt = {};
      if (startDate) leadWhere.createdAt.gte = new Date(startDate);
      if (endDate) leadWhere.createdAt.lte = new Date(endDate);
    }

    const followUpWhere = {
      status: 'DONE',
    };

    if (req.user.role === 'MANAGER') {
      followUpWhere.lead = { branchId: req.user.branchId };
    }

    if (startDate || endDate) {
      followUpWhere.completedAt = {};
      if (startDate) followUpWhere.completedAt.gte = new Date(startDate);
      if (endDate) followUpWhere.completedAt.lte = new Date(endDate);
    }

    const users = await prisma.user.findMany({
      where: {
        ...userWhere,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Three grouped queries for the whole team, instead of three counts per user.
    const userIds = users.map(user => user.id);
    const [leadsByUser, followUpsByUser, wonByUser] = await Promise.all([
      prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { ...leadWhere, assignedTo: { in: userIds } },
        _count: { _all: true },
      }),
      prisma.followUp.groupBy({
        by: ['assignedTo'],
        where: { ...followUpWhere, assignedTo: { in: userIds } },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ['assignedTo'],
        where: { ...leadWhere, assignedTo: { in: userIds }, status: 'WON' },
        _count: { _all: true },
      }),
    ]);
    const countsBy = rows => new Map(rows.map(row => [row.assignedTo, row._count._all]));
    const leadsAssignedMap = countsBy(leadsByUser);
    const followUpsDoneMap = countsBy(followUpsByUser);
    const bookingsClosedMap = countsBy(wonByUser);

    const teamStats = users.map(user => ({
      user,
      stats: {
        leadsAssigned: leadsAssignedMap.get(user.id) || 0,
        followUpsDone: followUpsDoneMap.get(user.id) || 0,
        bookingsClosed: bookingsClosedMap.get(user.id) || 0,
      },
    }));

    res.json({
      success: true,
      data: {
        teamStats,
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getOfficeStats = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can view office statistics',
      });
    }

    const { startDate, endDate } = req.query;

    const leadWhere = {
      deletedAt: null,
    };

    if (startDate || endDate) {
      leadWhere.createdAt = {};
      if (startDate) leadWhere.createdAt.gte = new Date(startDate);
      if (endDate) leadWhere.createdAt.lte = new Date(endDate);
    }

    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        country: true,
      },
    });

    // Three grouped queries for all branches, instead of three counts per branch.
    const branchIds = branches.map(branch => branch.id);
    const [leadsByBranch, wonByBranch, usersByBranch] = await Promise.all([
      prisma.lead.groupBy({
        by: ['branchId'],
        where: { ...leadWhere, branchId: { in: branchIds } },
        _count: { _all: true },
      }),
      prisma.lead.groupBy({
        by: ['branchId'],
        where: { ...leadWhere, branchId: { in: branchIds }, status: 'WON' },
        _count: { _all: true },
      }),
      prisma.user.groupBy({
        by: ['branchId'],
        where: { branchId: { in: branchIds }, isActive: true },
        _count: { _all: true },
      }),
    ]);
    const countsBy = rows => new Map(rows.map(row => [row.branchId, row._count._all]));
    const totalLeadsMap = countsBy(leadsByBranch);
    const bookedLeadsMap = countsBy(wonByBranch);
    const activeUsersMap = countsBy(usersByBranch);

    const officeStats = branches.map(branch => {
      const totalLeads = totalLeadsMap.get(branch.id) || 0;
      const bookedLeads = bookedLeadsMap.get(branch.id) || 0;
      return {
        branch,
        stats: {
          totalLeads,
          bookedLeads,
          conversionRate: totalLeads > 0 ? ((bookedLeads / totalLeads) * 100).toFixed(2) : 0,
          activeUsers: activeUsersMap.get(branch.id) || 0,
        },
      };
    });

    res.json({
      success: true,
      data: {
        officeStats,
        period: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    console.error('Get office stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getRevenue = async (req, res) => {
  try {
    const { branchId, startDate, endDate } = req.query;

    const where = {};

    if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId && req.user.role === 'ADMIN') {
      where.branchId = branchId;
    } else if (req.user.role === 'STAFF') {
      where.branchId = req.user.branchId;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const payments = await prisma.tripPayment.findMany({
      where,
      select: {
        amount: true,
        paymentDate: true,
        paymentMode: true,
        branchId: true,
        branch: { select: { name: true } },
        itinerary: { select: { lead: { select: { name: true } } } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const revenueByBranch = await prisma.tripPayment.groupBy({
      by: ['branchId'],
      where,
      _sum: { amount: true },
    });

    // One lookup for every branch name, instead of one query per branch.
    const revenueBranches = await prisma.branch.findMany({
      where: { id: { in: revenueByBranch.map(item => item.branchId) } },
      select: { id: true, name: true },
    });
    const branchNames = new Map(revenueBranches.map(branch => [branch.id, branch.name]));
    const branchRevenueData = revenueByBranch.map(item => ({
      branchName: branchNames.get(item.branchId) || 'Unknown',
      total: item._sum.amount || 0,
    }));

    const revenueByMode = await prisma.tripPayment.groupBy({
      by: ['paymentMode'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    let monthlyTrend = [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let current = new Date(start.getFullYear(), start.getMonth(), 1);

      while (current <= end) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);

        const monthPayments = await prisma.tripPayment.aggregate({
          where: { ...where, paymentDate: { gte: monthStart, lte: monthEnd } },
          _sum: { amount: true },
          _count: true,
        });

        monthlyTrend.push({
          month: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`,
          monthName: current.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
          total: monthPayments._sum.amount || 0,
          count: monthPayments._count,
        });

        current.setMonth(current.getMonth() + 1);
      }
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        paymentCount: payments.length,
        revenueByBranch: branchRevenueData,
        revenueByMode: revenueByMode.map(m => ({
          mode: m.paymentMode,
          total: m._sum.amount || 0,
          count: m._count,
        })),
        monthlyTrend,
        recentPayments: payments.slice(0, 10).map(p => ({
          amount: p.amount,
          date: p.paymentDate,
          mode: p.paymentMode,
          branch: p.branch?.name,
          lead: p.itinerary?.lead?.name,
        })),
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
