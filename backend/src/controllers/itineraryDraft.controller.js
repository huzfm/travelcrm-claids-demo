import prisma from '../config/prisma.js';
import { seesAllItineraries } from '../middleware/rbac.js';

// Incomplete itineraries: the builder autosaves its state here from the moment
// step 1 is filled in, so leaving the page — or the device — loses nothing.
// Access follows the itinerary rules: STAFF their own, MANAGER their branch,
// ADMIN everything; `itineraries.view_all` (never STAFF) may read but not change them.

// The browser generates the id (so autosaves are idempotent upserts); keep it
// to something that is plainly an id.
const DRAFT_ID = /^[A-Za-z0-9_-]{8,64}$/;

const canChange = (user, draft) => {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'MANAGER') return draft.branchId === user.branchId;
  return draft.createdBy === user.id;
};

const canRead = async (user, draft) =>
  canChange(user, draft) || (await seesAllItineraries(user));

const listSelect = {
  id: true,
  title: true,
  clientName: true,
  destination: true,
  step: true,
  leadId: true,
  createdAt: true,
  updatedAt: true,
  lead: { select: { id: true, name: true, phone: true } },
  branch: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true } },
};

/** Pulls the list columns out of the wizard snapshot. */
const summarise = data => {
  const step1 = data && typeof data === 'object' ? data.step1Data : null;
  const clientName = typeof step1?.clientName === 'string' ? step1.clientName.trim() : '';
  const tripName = typeof step1?.tripName === 'string' ? step1.tripName.trim() : '';
  const destination = typeof step1?.destination === 'string' ? step1.destination.trim() : '';
  const rawStep = Number(data?.step);
  return {
    title:
      tripName ||
      (clientName ? `${clientName}'s Trip` : destination ? `Trip to ${destination}` : 'Untitled'),
    clientName: clientName || null,
    destination: destination || null,
    step: Number.isInteger(rawStep) && rawStep >= 1 && rawStep <= 10 ? rawStep : 1,
    leadId: typeof step1?.leadId === 'string' && step1.leadId ? step1.leadId : null,
  };
};

export const listItineraryDrafts = async (req, res) => {
  try {
    const { leadId, branchId } = req.query;
    const where = {};

    if (await seesAllItineraries(req.user)) {
      if (branchId) where.branchId = branchId;
    } else if (req.user.role === 'STAFF') {
      where.createdBy = req.user.id;
    } else if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }
    if (leadId) where.leadId = leadId;

    const drafts = await prisma.itineraryDraft.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: listSelect,
    });

    res.json({ success: true, data: { drafts } });
  } catch (error) {
    console.error('List itinerary drafts error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getItineraryDraft = async (req, res) => {
  try {
    const draft = await prisma.itineraryDraft.findUnique({
      where: { id: req.params.id },
      select: { ...listSelect, branchId: true, createdBy: true, data: true },
    });

    if (!draft) {
      return res.status(404).json({
        success: false,
        error: 'This incomplete itinerary no longer exists. It may have been finished or deleted.',
      });
    }
    if (!(await canRead(req.user, draft))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: { draft } });
  } catch (error) {
    console.error('Get itinerary draft error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/** Autosave: creates the draft on the first call, updates it after that. */
export const saveItineraryDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    if (!DRAFT_ID.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid draft id' });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'Draft data is required' });
    }

    const summary = summarise(data);

    // A lead the agent can't reach is dropped rather than failing the autosave.
    let lead = null;
    if (summary.leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: summary.leadId },
        select: { id: true, branchId: true },
      });
      if (!lead || (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId)) {
        lead = null;
      }
    }

    const existing = await prisma.itineraryDraft.findUnique({
      where: { id },
      select: { id: true, branchId: true, createdBy: true },
    });

    if (existing && !canChange(req.user, existing)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const fields = {
      title: summary.title,
      clientName: summary.clientName,
      destination: summary.destination,
      step: summary.step,
      leadId: lead?.id ?? null,
      data,
    };

    const draft = existing
      ? await prisma.itineraryDraft.update({ where: { id }, data: fields, select: listSelect })
      : await prisma.itineraryDraft.create({
          data: {
            id,
            ...fields,
            branchId: lead?.branchId || req.user.branchId,
            createdBy: req.user.id,
          },
          select: listSelect,
        });

    res.json({ success: true, data: { draft } });
  } catch (error) {
    console.error('Save itinerary draft error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteItineraryDraft = async (req, res) => {
  try {
    const draft = await prisma.itineraryDraft.findUnique({
      where: { id: req.params.id },
      select: { id: true, branchId: true, createdBy: true },
    });

    // Already gone — finishing the itinerary deletes it too — is not an error.
    if (!draft) return res.json({ success: true, data: { message: 'Draft deleted' } });

    if (!canChange(req.user, draft)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await prisma.itineraryDraft.delete({ where: { id: draft.id } });
    res.json({ success: true, data: { message: 'Draft deleted' } });
  } catch (error) {
    console.error('Delete itinerary draft error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
