import prisma from '../config/prisma.js';
import {
  calendarDayWindow,
  zonedDayWindow,
  periodWindow,
  parseCalendarDate,
} from '../utils/dateWindows.js';

/**
 * Dashboard endpoints backing the operations overview:
 * sales stats, follow-ups, payments due in/out, trip starts/ends, and the
 * live-trips-with-due-payments list.
 *
 * All windows are resolved against the branch timezone of the requesting user,
 * so "today" means today where the branch is, not on the server.
 */

/** Trip scope for the requesting user. Mirrors buildBaseWhere in trip.controller.js. */
const tripScope = user => {
  const where = {
    isTemplate: false,
    OR: [{ leadId: null }, { lead: { deletedAt: null } }],
  };
  if (user.role === 'STAFF') where.createdBy = user.id;
  else if (user.role === 'MANAGER') where.branchId = user.branchId;
  return where;
};

/** Scope for rows that hang off a trip (schedules, payables). */
const childScope = (user, extra = {}) => {
  const where = { ...extra };
  if (user.role === 'STAFF') where.itinerary = { ...(where.itinerary || {}), createdBy: user.id };
  else if (user.role === 'MANAGER') where.branchId = user.branchId;
  return where;
};

/** Lead scope for the requesting user. */
const leadScope = user => {
  const where = { deletedAt: null };
  if (user.role === 'STAFF') where.assignedTo = user.id;
  else if (user.role === 'MANAGER') where.branchId = user.branchId;
  return where;
};

const resolveBranch = async user => {
  if (!user?.branchId) return { timezone: 'Asia/Kolkata', currency: 'INR' };
  const branch = await prisma.branch.findUnique({
    where: { id: user.branchId },
    select: { timezone: true, currency: true },
  });
  return {
    timezone: branch?.timezone || 'Asia/Kolkata',
    currency: branch?.currency || 'INR',
  };
};

const resolveTimezone = async user => (await resolveBranch(user)).timezone;

const fail = (res, label, error) => {
  console.error(`[dashboard:${label}] Error:`, error);
  res.status(500).json({
    success: false,
    error: `Failed to load ${label}`,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

/**
 * GET /dashboard/sales-stats?period=today|week|month
 * Cash actually received in the period, plus leads created, quotes raised
 * and conversions in the period.
 *
 * Revenue = cash received (like the "received" figure on /trips), not
 * booking value — staff record payments without ever flipping a trip's
 * lifecycle status to CONFIRMED, so gating revenue on that status showed
 * "Revenue: 0" next to real money collected the same day, which made no
 * sense. Scoping it to CONFIRMED trips would also hide instalments on trips
 * still in DRAFT. Excludes payments on trips that were cancelled, since that
 * money no longer represents a live booking.
 */
export const getSalesStats = async (req, res) => {
  try {
    const period = ['today', 'week', 'month'].includes(req.query.period)
      ? req.query.period
      : 'today';
    const { timezone, currency } = await resolveBranch(req.user);
    const { gte, lt } = periodWindow(period, timezone);

    const leadWhere = leadScope(req.user);
    const tripWhere = tripScope(req.user);

    const [leadsCount, quotesCount, convertedLeads, confirmedTrips, receivedAgg] =
      await Promise.all([
        // Leads created in the period
        prisma.lead.count({ where: { ...leadWhere, createdAt: { gte, lt } } }),

        // Quotes (itineraries) raised in the period
        prisma.itinerary.count({ where: { ...tripWhere, createdAt: { gte, lt } } }),

        // Leads that reached WON in the period
        prisma.lead.count({ where: { ...leadWhere, status: 'WON', updatedAt: { gte, lt } } }),

        // All trips currently confirmed, for the "bookings" count
        prisma.itinerary.aggregate({
          where: { ...tripWhere, status: 'CONFIRMED' },
          _count: { _all: true },
        }),

        // Cash actually received in the period. Excludes payments on trips
        // that were cancelled — that money no longer represents a live
        // booking, so it shouldn't read as revenue.
        prisma.tripPayment.aggregate({
          where: childScope(req.user, {
            paymentDate: { gte, lt },
            itinerary: { status: { not: 'CANCELLED' } },
          }),
          _sum: { amount: true },
        }),
      ]);

    res.json({
      success: true,
      data: {
        period,
        timezone,
        currency,
        from: gte,
        to: lt,
        revenue: receivedAgg._sum.amount || 0,
        leads: leadsCount,
        quotes: quotesCount,
        conversions: convertedLeads,
        bookings: confirmedTrips._count._all || 0,
        conversionRate:
          leadsCount > 0 ? Number(((convertedLeads / leadsCount) * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    fail(res, 'sales stats', error);
  }
};

/**
 * A follow-up still needing action.
 *
 * PENDING alone is not enough: the cron in cron.service.js flips anything past
 * its scheduled time to OVERDUE within 5 minutes, so filtering on PENDING would
 * make every past bucket read zero. RESCHEDULED is also still outstanding.
 * Only DONE and CANCELLED are closed.
 */
const OPEN_FOLLOWUP_STATUSES = ['PENDING', 'OVERDUE', 'RESCHEDULED'];

/**
 * GET /dashboard/followups
 * Open follow-ups: what is due now, plus today, yesterday and the next 7 days.
 */
export const getFollowUpSummary = async (req, res) => {
  try {
    const timezone = await resolveTimezone(req.user);

    const base = { status: { in: OPEN_FOLLOWUP_STATUSES } };
    if (req.user.role === 'STAFF') base.assignedTo = req.user.id;
    else if (req.user.role === 'MANAGER') base.lead = { branchId: req.user.branchId };

    const now = new Date();
    const today = zonedDayWindow(timezone, 0, 1, now);
    const yesterday = zonedDayWindow(timezone, -1, 1, now);
    const next7 = zonedDayWindow(timezone, 1, 7, now);

    const [dueCount, todayCount, todayRemainingCount, yesterdayCount, next7Count, overdueCount] =
      await Promise.all([
        // Due now: the scheduled moment has passed and nobody has actioned it.
        prisma.followUp.count({ where: { ...base, scheduledAt: { lte: now } } }),
        prisma.followUp.count({
          where: { ...base, scheduledAt: { gte: today.gte, lt: today.lt } },
        }),
        // Still ahead of the clock today
        prisma.followUp.count({ where: { ...base, scheduledAt: { gt: now, lt: today.lt } } }),
        prisma.followUp.count({
          where: { ...base, scheduledAt: { gte: yesterday.gte, lt: yesterday.lt } },
        }),
        prisma.followUp.count({
          where: { ...base, scheduledAt: { gte: next7.gte, lt: next7.lt } },
        }),
        // Carried over from before today
        prisma.followUp.count({ where: { ...base, scheduledAt: { lt: today.gte } } }),
      ]);

    res.json({
      success: true,
      data: {
        timezone,
        due: { count: dueCount, cleared: dueCount === 0 },
        today: { count: todayCount, cleared: todayCount === 0, remaining: todayRemainingCount },
        yesterday: { count: yesterdayCount, cleared: yesterdayCount === 0 },
        next7Days: { count: next7Count, cleared: next7Count === 0 },
        overdue: overdueCount,
      },
    });
  } catch (error) {
    fail(res, 'follow-up summary', error);
  }
};

/**
 * GET /dashboard/trip-timings
 * Trips starting today / yesterday / next 7 days and
 * ending today / tomorrow / previous 7 days.
 */
export const getTripTimings = async (req, res) => {
  try {
    const timezone = await resolveTimezone(req.user);
    // A cancelled trip is neither starting nor ending.
    const active = { ...tripScope(req.user), status: { not: 'CANCELLED' } };

    const win = (offset, span) => calendarDayWindow(timezone, offset, span);
    const countStart = ({ gte, lt }) =>
      prisma.itinerary.count({ where: { ...active, startDate: { gte, lt } } });
    const countEnd = ({ gte, lt }) =>
      prisma.itinerary.count({ where: { ...active, endDate: { gte, lt } } });

    const [startToday, startYesterday, startNext7, endToday, endTomorrow, endPrev7] =
      await Promise.all([
        countStart(win(0, 1)),
        countStart(win(-1, 1)),
        countStart(win(1, 7)),
        countEnd(win(0, 1)),
        countEnd(win(1, 1)),
        countEnd(win(-7, 7)),
      ]);

    res.json({
      success: true,
      data: {
        timezone,
        starting: { today: startToday, yesterday: startYesterday, next7Days: startNext7 },
        ending: { today: endToday, tomorrow: endTomorrow, prev7Days: endPrev7 },
      },
    });
  } catch (error) {
    fail(res, 'trip timings', error);
  }
};

const DAY_MS = 86400000;

/**
 * Where a trip sits relative to today in the branch timezone, counted in
 * calendar days: not started yet, which day it is on, or how long ago it ended.
 * Start/end are date-only columns (UTC midnight), so compare them against
 * today's UTC-midnight rather than the current instant.
 */
const tripProgress = (startDate, endDate, days, timezone) => {
  const empty = {
    phase: null,
    currentDay: null,
    totalDays: null,
    startsInDays: null,
    endedDaysAgo: null,
  };
  const start = parseCalendarDate(startDate);
  if (!start) return empty;

  let end = parseCalendarDate(endDate);
  if (!end && days > 0) end = new Date(start.getTime() + (days - 1) * DAY_MS);
  if (end && end < start) end = start;

  const today = calendarDayWindow(timezone, 0, 1).gte;
  const totalDays = end ? Math.round((end - start) / DAY_MS) + 1 : days || null;

  if (today < start) {
    return {
      ...empty,
      phase: 'upcoming',
      totalDays,
      startsInDays: Math.round((start - today) / DAY_MS),
    };
  }
  if (end && today > end) {
    return {
      ...empty,
      phase: 'ended',
      totalDays,
      endedDaysAgo: Math.round((today - end) / DAY_MS),
    };
  }
  return {
    ...empty,
    phase: 'ongoing',
    totalDays,
    currentDay: Math.round((today - start) / DAY_MS) + 1,
  };
};

/** Shape a trip row for the due-payments list. */
const toDueRow = (trip, timezone) => {
  const totalPaid = (trip.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const totalCost = trip.totalCost || 0;
  const days = Array.isArray(trip.daysJson) ? trip.daysJson.length : 0;

  const progress = tripProgress(trip.startDate, trip.endDate, days, timezone);

  const schedule = trip.paymentSchedules?.[0];

  return {
    id: trip.id,
    tripId: trip.tripId,
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.startDate,
    endDate: trip.endDate,
    nights: days > 0 ? days - 1 : 0,
    days,
    ...progress,
    adults: trip.adults,
    children: trip.children,
    totalTravelers: trip.totalTravelers,
    currency: trip.branch?.currency || 'INR',
    timezone,
    totalCost,
    totalPaid,
    // Rounded to the paisa so float leftovers (0.000001) don't read as a balance.
    balance: Math.max(0, Math.round((totalCost - totalPaid) * 100) / 100),
    lead: trip.lead
      ? { id: trip.lead.id, name: trip.lead.name, phone: trip.lead.phone, source: trip.lead.source }
      : null,
    nextDue: schedule
      ? {
          id: schedule.id,
          label: schedule.label,
          dueDate: schedule.dueDate,
          amount: schedule.amount,
          outstanding: Math.max(0, schedule.amount - (schedule.paidAmount || 0)),
        }
      : null,
  };
};

/**
 * GET /dashboard/due-trips?scope=live|ended_yesterday|starts_in_7_days|overdue
 * Trips in the given window that still have money outstanding.
 */
export const getDuePaymentTrips = async (req, res) => {
  try {
    const scopeName = [
      'live',
      'ended_yesterday',
      'starts_in_7_days',
      'overdue',
    ].includes(req.query.scope)
      ? req.query.scope
      : 'live';
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

    const timezone = await resolveTimezone(req.user);
    const where = { ...tripScope(req.user), status: { not: 'CANCELLED' } };
    const today = calendarDayWindow(timezone, 0, 1);
    const yesterday = calendarDayWindow(timezone, -1, 1);

    if (scopeName === 'live') {
      // Started on or before today and not finished yet.
      where.startDate = { lt: today.lt };
      where.endDate = { gte: today.gte };
    } else if (scopeName === 'ended_yesterday') {
      where.endDate = { gte: yesterday.gte, lt: yesterday.lt };
    } else if (scopeName === 'starts_in_7_days') {
      const next7 = calendarDayWindow(timezone, 1, 7);
      where.startDate = { gte: next7.gte, lt: next7.lt };
    } else {
      // Everything the other three windows miss: trips with no dates set
      // yet (common for a trip still being planned) and trips that finished
      // more than a day ago. Without this, a balance on either just vanishes
      // from the worklist instead of aging into it. Nested under AND rather
      // than assigned to `where.OR` directly, since tripScope() already put
      // its own OR (the lead-deleted check) on this object and a second
      // top-level `OR` key would silently clobber it.
      where.AND = [
        ...(where.AND || []),
        { OR: [{ startDate: null }, { endDate: null }, { endDate: { lt: yesterday.gte } }] },
      ];
    }

    const trips = await prisma.itinerary.findMany({
      where,
      orderBy: { startDate: 'asc' },
      // Over-fetch: "has an outstanding balance" is a sum across related rows,
      // so it cannot be expressed in this where clause and is filtered below.
      take: limit * 3,
      include: {
        lead: { select: { id: true, name: true, phone: true, source: true } },
        branch: { select: { currency: true } },
        payments: { select: { amount: true } },
        paymentSchedules: {
          where: { status: { in: ['PENDING', 'PARTIAL'] } },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
    });

    const rows = trips
      .map(t => toDueRow(t, timezone))
      .filter(t => t.balance > 0)
      .slice(0, limit);

    res.json({
      success: true,
      data: {
        scope: scopeName,
        timezone,
        trips: rows,
        totalDue: rows.reduce((sum, t) => sum + t.balance, 0),
        count: rows.length,
      },
    });
  } catch (error) {
    fail(res, 'due payment trips', error);
  }
};

/**
 * GET /dashboard/overview
 * Every panel in one round-trip so the dashboard does not fire five requests.
 * A panel that fails comes back as null rather than failing the whole response.
 */
export const getOverview = async (req, res) => {
  const collect = (handler, query) =>
    new Promise(resolve => {
      const scopedReq = { ...req, query: { ...req.query, ...query } };
      const capture = {
        json: payload => resolve(payload?.data ?? null),
        status: () => ({ json: () => resolve(null) }),
      };
      Promise.resolve(handler(scopedReq, capture)).catch(() => resolve(null));
    });

  try {
    const [salesStats, followUps, tripTimings, dueTrips] = await Promise.all([
      collect(getSalesStats),
      collect(getFollowUpSummary),
      collect(getTripTimings),
      // Matches the widget's default tab, so the first paint doesn't fire a
      // second request just to replace this with the same-shaped data.
      collect(getDuePaymentTrips, { scope: 'live' }),
    ]);

    res.json({
      success: true,
      data: { salesStats, followUps, tripTimings, dueTrips },
    });
  } catch (error) {
    fail(res, 'overview', error);
  }
};
