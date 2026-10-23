import prisma from '../config/prisma.js';

/**
 * Generate a unique trip ID
 * Format: TRIP-MMYYNN — month (2 digits), year (2 digits), then 2 random
 * digits, e.g. TRIP-102647 for October 2026.
 *
 * Trip IDs are unique, and two random digits only give 100 per month, so the
 * random part is picked from the numbers not yet used this month. Once all
 * 100 are taken it falls back to three random digits (TRIP-MMYYNNN) rather
 * than failing to create the itinerary.
 */
export default async function generateTripId() {
  // Month/year in India time, so a trip made just after midnight IST on the
  // 1st gets the new month even though the server clock (UTC) hasn't turned yet.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    month: '2-digit',
    year: '2-digit',
  }).formatToParts(new Date());
  const mm = parts.find(p => p.type === 'month').value;
  const yy = parts.find(p => p.type === 'year').value;
  const prefix = `TRIP-${mm}${yy}`;

  const existing = await prisma.itinerary.findMany({
    where: { tripId: { startsWith: prefix } },
    select: { tripId: true },
  });
  const used = new Set(existing.map(i => i.tripId));

  const pickFree = digits => {
    const max = 10 ** digits;
    const free = [];
    for (let n = 0; n < max; n++) {
      const id = `${prefix}${String(n).padStart(digits, '0')}`;
      if (!used.has(id)) free.push(id);
    }
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  };

  return pickFree(2) || pickFree(3) || `${prefix}${Date.now().toString().slice(-4)}`;
}
