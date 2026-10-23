/**
 * File existing hotels under the destination tree.
 *
 * Every hotel predating the tree carries a free-text label like "Gulmarg",
 * "Dal Lake, Srinagar" or "Srinagar, Kashmir". Labels are written broadest-last,
 * so the last comma-separated part is the master destination and the first is
 * the one inside it. This reuses a matching destination where one already
 * exists and creates the rest.
 *
 *   node scripts/backfill-hotel-destinations.js            # apply
 *   node scripts/backfill-hotel-destinations.js --dry-run  # show the plan only
 *   node scripts/backfill-hotel-destinations.js --master "Kashmir"
 *
 * `--master` puts every single-word label under one master destination, which is
 * what you want when the whole hotel list is one region: "Gulmarg" then becomes
 * Kashmir > Gulmarg rather than a master of its own.
 *
 * Safe to re-run: hotels that already point at a destination are skipped.
 */
import prisma from '../src/config/prisma.js';
import { destinationLabel, ensureDestinationPath } from '../src/services/destinationTree.service.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const masterIndex = args.indexOf('--master');
const DEFAULT_MASTER = masterIndex !== -1 ? args[masterIndex + 1] : null;

/**
 * "Dal Lake, Srinagar" -> ["Srinagar", "Dal Lake"]
 * "Gulmarg" with --master Kashmir -> ["Kashmir", "Gulmarg"]
 * "Gulmarg" without --master -> ["Gulmarg"]  (becomes a master of its own)
 */
const toPath = label => {
  const parts = String(label || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  // Only two levels exist, so a long label keeps its broadest and narrowest parts.
  const ordered = parts.reverse();
  const path = ordered.length > 2 ? [ordered[0], ordered[ordered.length - 1]] : ordered;

  if (path.length === 1 && DEFAULT_MASTER && path[0] !== DEFAULT_MASTER) {
    return [DEFAULT_MASTER, path[0]];
  }

  return path;
};

async function main() {
  const hotels = await prisma.hotel.findMany({
    where: { destinationId: null },
    select: { id: true, name: true, location: true },
    orderBy: { location: 'asc' },
  });

  if (hotels.length === 0) {
    console.log('Nothing to do — every hotel already points at a destination.');
    return;
  }

  console.log(
    `${hotels.length} hotel(s) not yet filed.${DEFAULT_MASTER ? ` Master: "${DEFAULT_MASTER}".` : ''}${dryRun ? ' (dry run)' : ''}\n`
  );

  let filed = 0;
  const skipped = [];

  for (const hotel of hotels) {
    const path = toPath(hotel.location);

    if (!path) {
      skipped.push(`${hotel.name} — blank location`);
      continue;
    }

    if (dryRun) {
      console.log(`  ${hotel.name}: "${hotel.location}" -> ${path.join(' > ')}`);
      filed++;
      continue;
    }

    const node = await ensureDestinationPath(path);
    await prisma.hotel.update({
      where: { id: hotel.id },
      data: { destinationId: node.id, location: destinationLabel(node) },
    });

    console.log(`  ${hotel.name}: "${hotel.location}" -> ${path.join(' > ')}`);
    filed++;
  }

  console.log(`\n${dryRun ? 'Would file' : 'Filed'} ${filed} hotel(s).`);

  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length}:`);
    skipped.forEach(reason => console.log(`  - ${reason}`));
  }
}

main()
  .catch(error => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
