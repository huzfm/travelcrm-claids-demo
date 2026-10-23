/**
 * Backfill script: run AFTER `npm run db:push`.
 *
 * Every itinerary is now a trip, so every itinerary needs a unique tripId to be
 * searchable. Older rows created before tripId was assigned on every create path
 * are filled in here.
 *
 * Usage: node scripts/backfill-trip-ids.js
 */
import { PrismaClient } from '@prisma/client';
import generateTripId from '../src/utils/tripIdGenerator.js';

const prisma = new PrismaClient();

const run = async () => {
  const missing = await prisma.itinerary.findMany({
    where: { tripId: null },
    select: { id: true },
  });

  console.log(`[backfill] ${missing.length} itineraries without a tripId`);

  let filled = 0;
  for (const { id } of missing) {
    // tripId is random, so retry on the (rare) unique collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await prisma.itinerary.update({
          where: { id },
          data: { tripId: generateTripId() },
        });
        filled++;
        break;
      } catch (err) {
        if (err.code !== 'P2002' || attempt === 4) {
          console.error(`[backfill] failed for ${id}:`, err.message);
        }
      }
    }
  }

  console.log(`[backfill] done, ${filled} tripIds assigned`);
};

run()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
