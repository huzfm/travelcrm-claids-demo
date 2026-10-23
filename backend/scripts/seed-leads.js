/**
 * Dev helper: add a batch of realistic-looking leads to the current database,
 * spread across the existing branches, staff, statuses and sources. Handy for
 * testing filters, pagination and scroll restoration on /leads.
 *
 * Usage: node scripts/seed-leads.js [count]   (default 100)
 *
 * Refuses to run unless DATABASE_URL points at localhost — this only ever
 * belongs in a local dev database.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COUNT = Number(process.argv[2]) || 100;

const FIRST_NAMES = [
  'Aamir', 'Sana', 'Rahul', 'Priya', 'Imran', 'Neha', 'Vikram', 'Ayesha', 'Arjun', 'Fatima',
  'Rohan', 'Zara', 'Karan', 'Meera', 'Faisal', 'Anjali', 'Siddharth', 'Nida', 'Aditya', 'Hina',
];
const LAST_NAMES = [
  'Khan', 'Sharma', 'Mir', 'Verma', 'Bhat', 'Gupta', 'Shah', 'Patel', 'Lone', 'Reddy',
  'Malik', 'Singh', 'Dar', 'Iyer', 'Wani', 'Mehta',
];
const DESTINATIONS = [
  'Kashmir', 'Gulmarg', 'Pahalgam', 'Sonamarg', 'Ladakh', 'Goa', 'Kerala', 'Manali',
  'Shimla', 'Dubai', 'Thailand', 'Bali', 'Maldives', 'Singapore',
];
const INTERNATIONAL = new Set(['Dubai', 'Thailand', 'Bali', 'Maldives', 'Singapore']);
const STATUSES = [
  'NEW', 'FRESH', 'FOLLOWUP', 'HOT', 'WARM', 'NOT_ANSWERING', 'WON',
  'NOT_INTERESTED', 'JUNK', 'SENT_VOICEMAIL', 'CALL_DECLINED', 'CALL_BACK_SCHEDULED',
];
const SOURCES = ['WEBSITE', 'WHATSAPP', 'WALKIN', 'SOCIAL', 'BULK_IMPORT', 'META_ADS', 'GOOGLE_ADS'];
const HOTEL_CATEGORIES = ['BUDGET', 'STANDARD', 'PREMIUM', 'LUXURY'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const PICKUP_POINTS = ['Srinagar Airport', 'Jammu Tawi', 'Delhi Airport', 'Hotel pickup', null];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const daysFromNow = days => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const run = async () => {
  const url = process.env.DATABASE_URL || '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('[seed-leads] DATABASE_URL is not a local database — refusing to seed.');
    process.exit(1);
  }

  const branches = await prisma.branch.findMany({ select: { id: true } });
  if (branches.length === 0) {
    console.error('[seed-leads] No branches found — run `npm run db:seed` first.');
    process.exit(1);
  }
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, branchId: true },
  });
  if (users.length === 0) {
    console.error('[seed-leads] No active users found — run `npm run db:seed` first.');
    process.exit(1);
  }

  // A timestamp suffix keeps phone numbers unique across repeated runs.
  const runTag = String(Date.now()).slice(-4);

  const leads = Array.from({ length: COUNT }, (_, i) => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const destination = pick(DESTINATIONS);
    const branchId = pick(branches).id;
    // Prefer staff from the lead's own branch, so branch-scoped users see them.
    const branchUsers = users.filter(u => u.branchId === branchId);
    const owner = pick(branchUsers.length ? branchUsers : users);
    const startIn = randInt(5, 120);
    const travelDateFrom = daysFromNow(startIn);
    const adults = randInt(1, 6);
    const children = randInt(0, 3);

    return {
      branchId,
      name: `${firstName} ${lastName}`,
      phone: `+9198${runTag}${String(i).padStart(4, '0')}`,
      email: Math.random() < 0.7 ? `${firstName}.${lastName}${i}@example.com`.toLowerCase() : null,
      source: pick(SOURCES),
      status: pick(STATUSES),
      destination,
      travelDateFrom,
      travelDateTo: daysFromNow(startIn + randInt(3, 10)),
      travelMonth: travelDateFrom.toISOString().slice(0, 7),
      numberOfPax: `${adults} adult${adults > 1 ? 's' : ''}${children ? ` ${children} kid${children > 1 ? 's' : ''}` : ''}`,
      childrenCount: children,
      budget: randInt(15, 300) * 1000,
      tripType: INTERNATIONAL.has(destination) ? 'INTERNATIONAL' : 'DOMESTIC',
      hotelCategory: pick(HOTEL_CATEGORIES),
      pickupPoint: pick(PICKUP_POINTS),
      score: randInt(0, 100),
      priority: pick(PRIORITIES),
      assignedTo: Math.random() < 0.85 ? owner.id : null,
      createdBy: owner.id,
      // Spread creation over the last 60 days so date filters have something to bite on.
      createdAt: daysFromNow(-randInt(0, 60)),
    };
  });

  const { count } = await prisma.lead.createMany({ data: leads });
  console.log(`[seed-leads] Created ${count} leads.`);
};

run()
  .catch(err => {
    console.error('[seed-leads] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
