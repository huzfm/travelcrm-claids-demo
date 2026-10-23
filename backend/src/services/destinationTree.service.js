import prisma from '../config/prisma.js';

/**
 * Destinations form a two-level tree.
 *
 *   Kashmir            <- master destination, parentId === null
 *     Gulmarg          <- destination inside it
 *     Sonmarg
 *     Pahalgam
 *   Delhi              <- master with nothing inside it yet
 *
 * A master is just a destination with no parent, so no extra column is needed to
 * say which rung a row sits on. Hotels point at either rung — "hotel in Kashmir"
 * and "hotel in Gulmarg" are both valid.
 */

/** Columns needed to render a destination and its breadcrumb in one go. */
export const destinationRefSelect = {
  select: {
    id: true,
    name: true,
    country: true,
    address: true,
    placeType: true,
    parentId: true,
    parent: { select: { id: true, name: true } },
  },
};

/** "Gulmarg, Kashmir" for a child, plain "Kashmir" for a master. */
export const destinationLabel = node => {
  if (!node) return '';
  return node.parent ? `${node.name}, ${node.parent.name}` : node.name;
};

/** "Kashmir > Gulmarg" — the breadcrumb form, used in lists and audit lines. */
export const destinationPath = node => {
  if (!node) return '';
  return node.parent ? `${node.parent.name} > ${node.name}` : node.name;
};

/**
 * The destination plus everything inside it, so filtering hotels by "Kashmir"
 * also returns the ones filed under Gulmarg. One query is enough — the tree is
 * only two deep.
 */
export const destinationScopeIds = async rootId => {
  const children = await prisma.destination.findMany({
    where: { parentId: rootId },
    select: { id: true },
  });
  return [rootId, ...children.map(child => child.id)];
};

/**
 * Check that `parentId` may take children: it must exist and be a master.
 * Returns `{ ok: false, error }` so callers can turn it straight into a 400.
 */
export const validateParent = async (parentId, client = prisma) => {
  if (!parentId) return { ok: true, parent: null };

  const parent = await client.destination.findUnique({
    where: { id: parentId },
    select: { id: true, name: true, parentId: true },
  });

  if (!parent) {
    return { ok: false, error: 'Parent destination not found' };
  }

  if (parent.parentId) {
    return {
      ok: false,
      error: `${parent.name} is already inside another destination. Destinations only nest one level deep.`,
    };
  }

  return { ok: true, parent };
};

/**
 * Re-derive the denormalised label on every hotel filed under `destinationId`.
 * Called after a rename or a move so hotel cards and PDFs never show a stale
 * place name.
 */
export const syncHotelLabels = async (tx, destinationId) => {
  const node = await tx.destination.findUnique({
    where: { id: destinationId },
    select: { id: true, name: true, parent: { select: { name: true } } },
  });
  if (!node) return;

  await tx.hotel.updateMany({
    where: { destinationId: node.id },
    data: { location: destinationLabel(node) },
  });
};

/** Shape a flat row list into masters with their children nested. */
export const buildDestinationTree = rows => {
  const byId = new Map();
  rows.forEach(row => byId.set(row.id, { ...row, children: [] }));

  const masters = [];
  byId.forEach(node => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node);
    } else {
      masters.push(node);
    }
  });

  const byName = (a, b) => a.name.localeCompare(b.name);
  masters.sort(byName);
  masters.forEach(master => master.children.sort(byName));

  return masters;
};

/**
 * Find or create `["Kashmir", "Gulmarg"]`, returning the deepest node with its
 * parent loaded. Used by hotel bulk import, where destinations arrive as text.
 *
 * Anything past the second name is ignored — the tree is two levels by design.
 */
export const ensureDestinationPath = async (names, client = prisma) => {
  const parts = names
    .map(name => String(name || '').trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return null;

  const [masterName, childName] = parts;

  let master = await client.destination.findFirst({
    where: { name: masterName, parentId: null },
    include: { parent: { select: { id: true, name: true } } },
  });

  if (!master) {
    master = await client.destination.create({
      // Import only supplies a name; the country can be filled in on the page.
      data: { name: masterName },
      include: { parent: { select: { id: true, name: true } } },
    });
  }

  if (!childName) return master;

  let child = await client.destination.findFirst({
    where: { name: childName, parentId: master.id },
    include: { parent: { select: { id: true, name: true } } },
  });

  if (!child) {
    child = await client.destination.create({
      data: {
        name: childName,
        address: `${childName}, ${masterName}`,
        parentId: master.id,
      },
      include: { parent: { select: { id: true, name: true } } },
    });
  }

  return child;
};

/**
 * Fields that only mean something for a destination inside a master. A master is
 * a grouping — "Kashmir" — so it carries just a name, a country and a place type.
 */
const DETAIL_FIELDS = {
  address: null,
  shortDescription: null,
  description: null,
  highlights: [],
  amenities: [],
  bestTimeToVisit: null,
  averageTemperature: null,
  language: null,
  currency: null,
  timezone: null,
  thingsToKnow: null,
  altNames: [],
};

const trimmed = value => {
  const text = String(value ?? '').trim();
  return text || null;
};

/**
 * Build the Prisma data for a create or an update, enforcing the master/inside
 * split rather than trusting whatever the client sent.
 *
 * `existing` is the current row on an update and `{}` on a create, so an omitted
 * field keeps its value instead of being cleared.
 */
export const buildDestinationData = ({ body, existing = {}, parentId }) => {
  const isMaster = !parentId;
  const pick = (key, fallback) =>
    body[key] !== undefined ? body[key] : (existing[key] ?? fallback);

  const data = {
    name: body.name !== undefined ? String(body.name).trim() : existing.name,
    parentId: parentId || null,
    placeType: pick('placeType', 'CITY') || 'CITY',
    isActive: pick('isActive', true),
  };

  if (isMaster) {
    // Promoting something to a master drops the place-level detail it no longer
    // has anywhere to show.
    return { ...data, ...DETAIL_FIELDS, country: trimmed(pick('country', null)) };
  }

  return {
    ...data,
    // The country lives on the master; the ones inside it inherit it.
    country: null,
    address: body.address !== undefined ? String(body.address).trim() : existing.address,
    shortDescription: trimmed(pick('shortDescription', null)),
    description: trimmed(pick('description', null)),
    highlights: pick('highlights', []),
    amenities: pick('amenities', []),
    bestTimeToVisit: trimmed(pick('bestTimeToVisit', null)),
    averageTemperature: trimmed(pick('averageTemperature', null)),
    language: trimmed(pick('language', null)),
    currency: trimmed(pick('currency', null)),
    timezone: trimmed(pick('timezone', null)),
    thingsToKnow: trimmed(pick('thingsToKnow', null)),
    altNames: pick('altNames', []),
  };
};
