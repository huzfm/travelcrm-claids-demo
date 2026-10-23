import { Prisma } from '@prisma/client';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import prisma from '../config/prisma.js';
import { parseCalendarDate } from '../utils/dateWindows.js';
import { phoneDigits } from '../utils/phone.js';
import { syncSchedulesForTrip } from '../services/payment-allocation.service.js';
import { userHasPermission } from '../middleware/rbac.js';

/**
 * Trip Status based on travel dates
 */
export const TripStatus = {
  UPCOMING: 'UPCOMING',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  NO_DATE: 'NO_DATE',
};

/**
 * Payment Status based on total cost and payments
 */
export const PaymentStatus = {
  FULLY_PAID: 'FULLY_PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PENDING: 'PENDING',
  NO_COST: 'NO_COST',
};

/**
 * Calculate trip status based on start and end dates
 */
const calculateTripStatus = (startDate, endDate) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (!startDate) return TripStatus.NO_DATE;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = endDate ? new Date(endDate) : new Date(start);
  end.setHours(23, 59, 59, 999);

  if (now < start) return TripStatus.UPCOMING;
  if (now >= start && now <= end) return TripStatus.ONGOING;
  return TripStatus.COMPLETED;
};

/**
 * Calculate payment status based on total cost and total paid
 */
const calculatePaymentStatus = (totalCost, totalPaid) => {
  if (!totalCost || totalCost === 0) return PaymentStatus.NO_COST;
  if (!totalPaid || totalPaid === 0) return PaymentStatus.PENDING;
  if (totalPaid >= totalCost) return PaymentStatus.FULLY_PAID;
  return PaymentStatus.PARTIALLY_PAID;
};

/**
 * Enrich itinerary with trip status and calculated payment info
 */
const enrichItinerary = (itinerary, payments = [], daysCountOverride) => {
  const tripStatus = calculateTripStatus(itinerary.startDate, itinerary.endDate);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = itinerary.totalCost ? itinerary.totalCost - totalPaid : null;
  const paymentStatus = calculatePaymentStatus(itinerary.totalCost, totalPaid);

  return {
    ...itinerary,
    tripStatus,
    paymentStatus,
    totalPaid,
    balance: balance !== null && balance > 0 ? balance : 0,
    // The list query doesn't fetch daysJson (it can run tens of MB per trip —
    // see getAllTrips) and passes the count in separately instead.
    daysCount:
      daysCountOverride !== undefined
        ? daysCountOverride
        : Array.isArray(itinerary.daysJson)
          ? itinerary.daysJson.length
          : 0,
    payments: payments.map(p => ({
      id: p.id,
      amount: p.amount,
      paymentMode: p.paymentMode,
      paymentDate: p.paymentDate,
      referenceNumber: p.referenceNumber,
      receiptUrl: p.receiptUrl,
      notes: p.notes,
      recordedBy: p.recordedBy,
      recorder: p.recorder ? { id: p.recorder.id, name: p.recorder.name } : null,
    })),
  };
};

/**
 * `trips.view_all` lifts the role scope below to every branch — what a
 * reservations desk needs to work on bookings made by anyone. ADMIN always has it.
 */
const seesAllTrips = user => userHasPermission(user, 'trips.view_all');

/** Whether the user may open this trip: in their role scope, or sees all trips. */
export const canAccessTrip = async (user, trip) => {
  const inScope =
    !(user.role === 'STAFF' && trip.createdBy !== user.id) &&
    !(user.role === 'MANAGER' && trip.branchId !== user.branchId);
  return inScope || seesAllTrips(user);
};

/**
 * Build the base where clause for trip queries.
 *
 * Scoped by role: STAFF sees what they created, MANAGER sees their branch,
 * ADMIN — or anyone holding trips.view_all — sees everything.
 */
const buildBaseWhere = async user => {
  const where = {
    // An itinerary only becomes a trip once its lead is WON. Templates are
    // reusable blueprints, not trips.
    isTemplate: false,
    lead: { status: 'WON', deletedAt: null },
  };

  if (await seesAllTrips(user)) return where;

  if (user.role === 'STAFF') {
    where.createdBy = user.id;
  } else if (user.role === 'MANAGER') {
    where.branchId = user.branchId;
  }

  return where;
};

/**
 * Merge an extra condition into a where clause without clobbering the base
 * OR / AND that buildBaseWhere already set.
 */
export const andWhere = (where, ...conditions) => {
  const extra = conditions.filter(Boolean);
  if (!extra.length) return where;
  where.AND = [...(where.AND || []), ...extra];
  return where;
};

/**
 * Get all trips with filtering and pagination
 */
export const getAllTrips = async (req, res) => {
  try {
    const {
      status,
      lifecycleStatus,
      paymentStatus,
      destination,
      leadId,
      search,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      page = 1,
      limit = 50,
    } = req.query;

    const where = await buildBaseWhere(req.user);

    if (leadId) where.leadId = leadId;

    if (destination) {
      where.destination = { contains: destination, mode: 'insensitive' };
    }

    if (lifecycleStatus) where.status = lifecycleStatus;

    // startDate/endDate are date-only columns, so normalise the bounds to UTC
    // midnight instead of letting the server's timezone shift them a day.
    const startFrom = parseCalendarDate(startDateFrom);
    const startTo = parseCalendarDate(startDateTo);
    if (startFrom || startTo) {
      where.startDate = {};
      if (startFrom) where.startDate.gte = startFrom;
      if (startTo) where.startDate.lte = startTo;
    }

    const endFrom = parseCalendarDate(endDateFrom);
    const endTo = parseCalendarDate(endDateTo);
    if (endFrom || endTo) {
      where.endDate = {};
      if (endFrom) where.endDate.gte = endFrom;
      if (endTo) where.endDate.lte = endTo;
    }

    // Search wrapped in AND to preserve WON lead filter
    if (search) {
      const term = search.trim();
      const or = [
        { tripId: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { destination: { contains: term, mode: 'insensitive' } },
        { lead: { name: { contains: term, mode: 'insensitive' } } },
        { lead: { email: { contains: term, mode: 'insensitive' } } },
      ];

      // Phones are stored E.164, so match on digits only. Otherwise a number
      // typed the way people write it ("+91 98765 43210") never matches.
      const digits = phoneDigits(term);
      if (digits && digits.length >= 4) {
        or.push({ lead: { phone: { contains: digits } } });
      }

      andWhere(where, { OR: or });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [trips, total] = await Promise.all([
      prisma.itinerary.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { startDate: 'asc' },
        // The list/grid only ever reads these fields (see trips/page.tsx) — the
        // heavy JSON blobs (quotes, options, flightsJson, daysJson content) and
        // full payment detail belong to the trip detail and payment-history
        // views, which fetch them on their own. Trimming them here is what cut
        // this endpoint's load time down.
        select: {
          id: true,
          tripId: true,
          title: true,
          destination: true,
          startDate: true,
          endDate: true,
          totalCost: true,
          totalTravelers: true,
          leadId: true,
          pdfPath: true,
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              assignedTo: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              country: true,
              currency: true,
            },
          },
          // Amount is all the list needs (totalPaid sum, payment count badge).
          // Modes, dates and receipts are fetched on demand by the payment
          // history modal via GET /trips/:id/payments.
          payments: {
            select: { amount: true },
          },
        },
      }),
      prisma.itinerary.count({ where }),
    ]);

    // days_json can run tens of MB per trip (day photos are inlined as base64),
    // so the query above never selects it. Postgres can report just the array
    // length without the app ever receiving the blob — scoped to this page's
    // rows, not the whole table.
    const daysCountRows = trips.length
      ? await prisma.$queryRaw`
          SELECT id, CASE WHEN jsonb_typeof(days_json) = 'array'
                          THEN jsonb_array_length(days_json)
                          ELSE 0 END AS count
          FROM itineraries
          WHERE id IN (${Prisma.join(trips.map(t => t.id))})
        `
      : [];
    const daysCountById = new Map(daysCountRows.map(r => [r.id, Number(r.count)]));

    let enrichedTrips = trips.map(t => {
      try {
        return enrichItinerary(t, t.payments, daysCountById.get(t.id) ?? 0);
      } catch (err) {
        console.error('[getAllTrips] enrichItinerary failed for trip:', t.id, err);
        throw err;
      }
    });

    // tripStatus and paymentStatus are computed — filter in memory
    if (status) {
      enrichedTrips = enrichedTrips.filter(t => t.tripStatus === status);
    }
    if (paymentStatus) {
      enrichedTrips = enrichedTrips.filter(t => t.paymentStatus === paymentStatus);
    }

    const summary = {
      total: enrichedTrips.length,
      upcoming: enrichedTrips.filter(t => t.tripStatus === TripStatus.UPCOMING).length,
      ongoing: enrichedTrips.filter(t => t.tripStatus === TripStatus.ONGOING).length,
      completed: enrichedTrips.filter(t => t.tripStatus === TripStatus.COMPLETED).length,
      totalRevenue: enrichedTrips.reduce((sum, t) => sum + (t.totalCost || 0), 0),
      totalReceived: enrichedTrips.reduce((sum, t) => sum + (t.totalPaid || 0), 0),
      totalBalance: enrichedTrips.reduce((sum, t) => sum + (t.balance || 0), 0),
    };

    res.json({
      success: true,
      data: {
        trips: enrichedTrips,
        summary,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[getAllTrips] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trips',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get trip by ID with full details including payments
 */
export const getTripById = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await prisma.itinerary.findUnique({
      where: { id },
      include: {
        lead: {
          include: {
            assignee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        branch: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            recorder: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (!(await canAccessTrip(req.user, trip))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Follow-ups belong to the lead, not the trip, but the trip page is where
    // staff decide whether to chase a customer.
    const followUps = trip.leadId
      ? await prisma.followUp.findMany({
          where: { leadId: trip.leadId },
          orderBy: { scheduledAt: 'desc' },
          take: 10,
          include: { assignee: { select: { id: true, name: true } } },
        })
      : [];

    const enrichedTrip = enrichItinerary(trip, trip.payments);

    res.json({
      success: true,
      data: {
        ...enrichedTrip,
        followUps,
        finance: {
          totalCost: trip.totalCost || 0,
          totalPaid: enrichedTrip.totalPaid,
          balance: enrichedTrip.balance,
        },
      },
    });
  } catch (error) {
    console.error('[getTripById] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trip',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get trip stats
 */
export const getTripStats = async (req, res) => {
  try {
    const where = await buildBaseWhere(req.user);

    const trips = await prisma.itinerary.findMany({
      where,
      take: 1000, // Limit to prevent OOM on large datasets
      orderBy: { createdAt: 'desc' },
      // A bare `include` here previously pulled every scalar column — including
      // days_json, which can run tens of MB per trip (see getAllTrips) — for up
      // to 1000 rows on every /trips page load. Stats only ever read these.
      select: {
        startDate: true,
        endDate: true,
        totalCost: true,
        destination: true,
        payments: { select: { amount: true } },
      },
    });

    const enrichedTrips = trips.map(t => enrichItinerary(t, t.payments));

    const byStatus = {
      upcoming: enrichedTrips.filter(t => t.tripStatus === TripStatus.UPCOMING),
      ongoing: enrichedTrips.filter(t => t.tripStatus === TripStatus.ONGOING),
      completed: enrichedTrips.filter(t => t.tripStatus === TripStatus.COMPLETED),
      noDate: enrichedTrips.filter(t => t.tripStatus === TripStatus.NO_DATE),
    };

    // Revenue by month
    const revenueByMonth = {};
    byStatus.completed.forEach(trip => {
      if (trip.endDate) {
        const month = new Date(trip.endDate).toISOString().substring(0, 7);
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { count: 0, revenue: 0, received: 0 };
        }
        revenueByMonth[month].count++;
        revenueByMonth[month].revenue += trip.totalCost || 0;
        revenueByMonth[month].received += trip.totalPaid || 0;
      }
    });

    // Top destinations
    const destinationMap = {};
    enrichedTrips.forEach(trip => {
      const dest = trip.destination || 'Unknown';
      if (!destinationMap[dest]) {
        destinationMap[dest] = { count: 0, revenue: 0 };
      }
      destinationMap[dest].count++;
      destinationMap[dest].revenue += trip.totalCost || 0;
    });

    const topDestinations = Object.entries(destinationMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([destination, data]) => ({ destination, ...data }));

    res.json({
      success: true,
      data: {
        totalTrips: enrichedTrips.length,
        upcomingCount: byStatus.upcoming.length,
        ongoingCount: byStatus.ongoing.length,
        completedCount: byStatus.completed.length,
        noDateCount: byStatus.noDate.length,
        totalRevenue: enrichedTrips.reduce((sum, t) => sum + (t.totalCost || 0), 0),
        totalReceived: enrichedTrips.reduce((sum, t) => sum + (t.totalPaid || 0), 0),
        totalBalance: enrichedTrips.reduce((sum, t) => sum + (t.balance || 0), 0),
        fullyPaidCount: enrichedTrips.filter(t => t.paymentStatus === PaymentStatus.FULLY_PAID)
          .length,
        partiallyPaidCount: enrichedTrips.filter(
          t => t.paymentStatus === PaymentStatus.PARTIALLY_PAID
        ).length,
        pendingPaymentCount: enrichedTrips.filter(t => t.paymentStatus === PaymentStatus.PENDING)
          .length,
        revenueByMonth,
        topDestinations,
      },
    });
  } catch (error) {
    console.error('[getTripStats] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trip stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get upcoming trips (next 30 days)
 */
export const getUpcomingTrips = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const where = await buildBaseWhere(req.user);
    where.startDate = {
      gte: parseCalendarDate(now),
      lte: parseCalendarDate(thirtyDaysLater),
    };

    const trips = await prisma.itinerary.findMany({
      where,
      take: parseInt(limit),
      orderBy: { startDate: 'asc' },
      include: {
        lead: {
          select: { id: true, name: true, phone: true },
        },
        branch: {
          select: { name: true, currency: true },
        },
        payments: true,
      },
    });

    const enrichedTrips = trips.map(t => enrichItinerary(t, t.payments));

    res.json({ success: true, data: enrichedTrips });
  } catch (error) {
    console.error('[getUpcomingTrips] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming trips',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Record a payment for a trip
 */
export const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMode, paymentDate, referenceNumber, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0',
      });
    }

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!itinerary) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (!(await canAccessTrip(req.user, itinerary))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const currentTotalPaid = itinerary.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = (itinerary.totalCost || 0) - currentTotalPaid;
    if (amount > remaining && itinerary.totalCost > 0) {
      console.warn(
        `[recordPayment] Payment ${amount} exceeds remaining balance ${remaining} for trip ${id}`
      );
    }

    const payment = await prisma.tripPayment.create({
      data: {
        itineraryId: id,
        branchId: itinerary.branchId,
        amount: parseFloat(amount),
        paymentMode: paymentMode || 'CASH',
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        recordedBy: req.user.id,
      },
      include: {
        recorder: {
          select: { id: true, name: true },
        },
      },
    });

    // Cash received settles instalments oldest-due-first.
    const schedules = await syncSchedulesForTrip(id);

    res.status(201).json({ success: true, data: payment, schedules });
  } catch (error) {
    console.error('[recordPayment] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all payments for a trip
 */
export const getTripPayments = async (req, res) => {
  try {
    const { id } = req.params;

    const itinerary = await prisma.itinerary.findUnique({ where: { id } });

    if (!itinerary) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    if (!(await canAccessTrip(req.user, itinerary))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const payments = await prisma.tripPayment.findMany({
      where: { itineraryId: id },
      orderBy: { paymentDate: 'desc' },
      include: {
        recorder: {
          select: { id: true, name: true },
        },
      },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      data: {
        payments,
        totalPaid,
        totalCost: itinerary.totalCost || 0,
        balance: (itinerary.totalCost || 0) - totalPaid,
      },
    });
  } catch (error) {
    console.error('[getTripPayments] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete a payment
 */
export const deletePayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;

    const payment = await prisma.tripPayment.findUnique({
      where: { id: paymentId },
      include: { itinerary: true },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.itineraryId !== id) {
      return res.status(400).json({
        success: false,
        error: 'Payment does not belong to this trip',
      });
    }

    if (req.user.role === 'STAFF' && payment.itinerary.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if (req.user.role === 'MANAGER' && payment.itinerary.branchId !== req.user.branchId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await prisma.tripPayment.delete({ where: { id: paymentId } });

    // Removing cash can push instalments back to PARTIAL/PENDING.
    const schedules = await syncSchedulesForTrip(payment.itineraryId);

    res.json({ success: true, message: 'Payment deleted successfully', schedules });
  } catch (error) {
    console.error('[deletePayment] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Upload receipt for a payment
 */
export const uploadReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const payment = await prisma.tripPayment.findUnique({
      where: { id: paymentId },
      include: { itinerary: true },
    });

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (!(await canAccessTrip(req.user, payment.itinerary))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { url } = await uploadToCloudinary(req.file.buffer, 'travel-crm/receipts');

    const updated = await prisma.tripPayment.update({
      where: { id: paymentId },
      data: { receiptUrl: url },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[uploadReceipt] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload receipt',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export default {
  getAllTrips,
  getTripById,
  getTripStats,
  getUpcomingTrips,
  recordPayment,
  getTripPayments,
  deletePayment,
  uploadReceipt,
  TripStatus,
  PaymentStatus,
};

/**
 * Update a trip's lifecycle status (DRAFT / CONFIRMED / CANCELLED).
 *
 * This is deliberately separate from tripStatus, which is derived from the
 * travel dates and is not settable.
 */
export const updateTripStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of ${allowed.join(', ')}`,
      });
    }

    const trip = await prisma.itinerary.findUnique({
      where: { id },
      select: { id: true, branchId: true, createdBy: true },
    });

    if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
    if (!(await canAccessTrip(req.user, trip))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updated = await prisma.itinerary.update({
      where: { id },
      data: { status },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        payments: true,
      },
    });

    res.json({ success: true, data: enrichItinerary(updated, updated.payments) });
  } catch (error) {
    console.error('[updateTripStatus] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update trip status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
