import prisma from '../config/prisma.js';
import { phoneDigits } from '../utils/phone.js';

/**
 * Global search behind the top-bar search box.
 *
 * Every itinerary is a trip, so a trip is findable by its tripId, title,
 * destination, or the customer's name / phone / email.
 */

const tripScope = user => {
  const where = {
    isTemplate: false,
    OR: [{ leadId: null }, { lead: { deletedAt: null } }],
  };
  if (user.role === 'STAFF') where.createdBy = user.id;
  else if (user.role === 'MANAGER') where.branchId = user.branchId;
  return where;
};

const leadScope = user => {
  const where = { deletedAt: null };
  if (user.role === 'STAFF') where.assignedTo = user.id;
  else if (user.role === 'MANAGER') where.branchId = user.branchId;
  return where;
};

/** GET /search?q=...&limit=8&types=trips,leads */
export const globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 25);

    if (q.length < 2) {
      return res.json({
        success: true,
        data: { query: q, trips: [], leads: [], total: 0 },
      });
    }

    const requested = (req.query.types || 'trips,leads')
      .toString()
      .split(',')
      .map(t => t.trim());
    const wantTrips = requested.includes('trips');
    const wantLeads = requested.includes('leads');

    // Phones are stored E.164, so compare digits only.
    const phone = phoneDigits(q) || '';
    const contains = { contains: q, mode: 'insensitive' };

    const tripOr = [
      { tripId: contains },
      { title: contains },
      { destination: contains },
      { lead: { name: contains } },
      { lead: { email: contains } },
    ];
    if (phone.length >= 4) tripOr.push({ lead: { phone: { contains: phone } } });

    const leadOr = [{ name: contains }, { email: contains }, { destination: contains }];
    if (phone.length >= 4) leadOr.push({ phone: { contains: phone } });

    const [trips, leads] = await Promise.all([
      wantTrips
        ? prisma.itinerary.findMany({
            where: { AND: [tripScope(req.user), { OR: tripOr }] },
            take: limit,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              tripId: true,
              title: true,
              destination: true,
              status: true,
              startDate: true,
              endDate: true,
              totalCost: true,
              lead: { select: { id: true, name: true, phone: true } },
              branch: { select: { currency: true } },
            },
          })
        : [],
      wantLeads
        ? prisma.lead.findMany({
            where: { AND: [leadScope(req.user), { OR: leadOr }] },
            take: limit,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              status: true,
              source: true,
              destination: true,
            },
          })
        : [],
    ]);

    const normalised = q.toLowerCase();

    // /trips/:id shows the booking whole — day plan, cash received,
    // instalments and supplier payables — so link there rather than at the
    // itinerary editor or a pre-filtered list.
    const tripResults = trips.map(t => ({
      ...t,
      currency: t.branch?.currency || 'INR',
      exact: (t.tripId || '').toLowerCase() === normalised,
      href: `/trips/${t.id}`,
    }));

    // Typing a full trip ID is unambiguous, so surface that row first.
    tripResults.sort((a, b) => Number(b.exact) - Number(a.exact));

    const exactTrip = tripResults.find(t => t.exact) || null;

    res.json({
      success: true,
      data: {
        query: q,
        trips: tripResults,
        leads: leads.map(l => ({ ...l, href: `/leads/${l.id}` })),
        total: tripResults.length + leads.length,
        // Set when the query *is* a trip ID; the client jumps straight there.
        exactMatch: exactTrip ? { type: 'trip', id: exactTrip.id, href: exactTrip.href } : null,
      },
    });
  } catch (error) {
    console.error('[globalSearch] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
