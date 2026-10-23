// Wipes every stored image across the CRM (hotels, vehicles, itineraries,
// templates, and the shared PDF settings) — both the DB references and the
// underlying Cloudinary files. Hotel photos are the only images the app
// still lets anyone upload (see the 500KB limit on /uploads/image and
// /hotels/:id/images); this clears everything that predates that decision.
//
// Does NOT touch travel-crm/avatars — user profile photos are unrelated.
//
// Usage:
//   node scripts/delete-all-images.js --dry-run
//   npm run delete:images -- --dry-run
//   npm run delete:images
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../src/config/prisma.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DRY_RUN = process.argv.includes('--dry-run');

const CLOUDINARY_PREFIXES = [
  'travel-crm/hotels',
  'travel-crm/vehicles',
  'travel-crm/destinations',
  'travel-crm/leads',
  'travel-crm/itinerary-covers',
  'travel-crm/itinerary-lastpage',
  'travel-crm/itinerary-days',
  'travel-crm/originals/migrated',
];

const IMAGE_KEY_RE = /image/i;

// Recursively clears any object key whose name contains "image" (hotelImage,
// vehicleImage, images, image, coverImage, imageUrl, ...) — string values
// become undefined (dropped), arrays become []. Returns { value, changed }.
function stripImages(value) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map(item => {
      const result = stripImages(item);
      if (result.changed) changed = true;
      return result.value;
    });
    return { value: next, changed };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const next = {};
    for (const [key, val] of Object.entries(value)) {
      if (IMAGE_KEY_RE.test(key)) {
        const isEmpty = Array.isArray(val) ? val.length === 0 : val == null;
        if (!isEmpty) changed = true;
        next[key] = Array.isArray(val) ? [] : undefined;
        continue;
      }
      const result = stripImages(val);
      if (result.changed) changed = true;
      next[key] = result.value;
    }
    return { value: next, changed };
  }

  return { value, changed: false };
}

const stats = {
  hotelsCleared: 0,
  vehiclesCleared: 0,
  itinerariesCleared: 0,
  templatesCleared: 0,
  settingsCleared: false,
  cloudinaryDeleted: {},
};

async function clearHotels() {
  const hotels = await prisma.hotel.findMany({
    select: { id: true, images: true },
  });
  const toClear = hotels.filter(h => Array.isArray(h.images) && h.images.length > 0);
  stats.hotelsCleared = toClear.length;
  if (DRY_RUN || toClear.length === 0) return;
  await prisma.hotel.updateMany({ data: { images: [] } });
}

async function clearVehicles() {
  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, images: true },
  });
  const toClear = vehicles.filter(v => Array.isArray(v.images) && v.images.length > 0);
  stats.vehiclesCleared = toClear.length;
  if (DRY_RUN || toClear.length === 0) return;
  await prisma.vehicle.updateMany({ data: { images: [] } });
}

async function clearItineraries() {
  const rows = await prisma.itinerary.findMany({
    select: { id: true, coverImage: true, daysJson: true, quotes: true, options: true },
  });

  for (const row of rows) {
    const updates = {};

    if (row.coverImage) updates.coverImage = null;

    const days = stripImages(row.daysJson);
    if (days.changed) updates.daysJson = days.value;

    for (const field of ['quotes', 'options']) {
      const raw = row[field];
      if (!raw) continue;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const result = stripImages(parsed);
      if (result.changed) updates[field] = JSON.stringify(result.value);
    }

    if (Object.keys(updates).length === 0) continue;

    stats.itinerariesCleared++;
    if (DRY_RUN) continue;
    await prisma.itinerary.update({ where: { id: row.id }, data: updates });
  }
}

async function clearTemplates() {
  const rows = await prisma.itineraryTemplate.findMany({
    select: { id: true, daysJson: true },
  });

  for (const row of rows) {
    const result = stripImages(row.daysJson);
    if (!result.changed) continue;

    stats.templatesCleared++;
    if (DRY_RUN) continue;
    await prisma.itineraryTemplate.update({
      where: { id: row.id },
      data: { daysJson: result.value },
    });
  }
}

async function clearAppSettings() {
  const settings = await prisma.appSetting.findUnique({ where: { id: 'singleton' } });
  if (!settings) return;

  const updates = {};
  if (settings.itineraryCoverImage) updates.itineraryCoverImage = null;

  if (settings.customLastPage) {
    const result = stripImages(settings.customLastPage);
    if (result.changed) updates.customLastPage = result.value;
  }

  if (Object.keys(updates).length === 0) return;

  stats.settingsCleared = true;
  if (DRY_RUN) return;
  await prisma.appSetting.update({ where: { id: 'singleton' }, data: updates });
}

async function deleteCloudinaryFolder(prefix) {
  if (DRY_RUN) {
    try {
      const result = await cloudinary.api.resources({ type: 'upload', prefix, max_results: 500 });
      stats.cloudinaryDeleted[prefix] = result.resources?.length || 0;
    } catch (err) {
      stats.cloudinaryDeleted[prefix] = `error: ${err.message}`;
    }
    return;
  }

  try {
    let totalDeleted = 0;
    // delete_resources_by_prefix handles pagination internally for most
    // accounts, but loop defensively in case a folder has more than one
    // batch's worth of assets left behind.
    for (let i = 0; i < 20; i++) {
      const result = await cloudinary.api.delete_resources_by_prefix(prefix);
      const deleted = Object.keys(result.deleted || {}).length;
      totalDeleted += deleted;
      if (deleted === 0) break;
    }
    stats.cloudinaryDeleted[prefix] = totalDeleted;
  } catch (err) {
    stats.cloudinaryDeleted[prefix] = `error: ${err.message}`;
  }
}

async function main() {
  console.log(`Deleting all images${DRY_RUN ? ' (dry run)' : ''}...\n`);

  await clearHotels();
  await clearVehicles();
  await clearItineraries();
  await clearTemplates();
  await clearAppSettings();

  for (const prefix of CLOUDINARY_PREFIXES) {
    await deleteCloudinaryFolder(prefix);
  }

  console.log('=== Summary ===');
  console.log(`Hotels cleared:      ${stats.hotelsCleared}`);
  console.log(`Vehicles cleared:    ${stats.vehiclesCleared}`);
  console.log(`Itineraries cleared: ${stats.itinerariesCleared}`);
  console.log(`Templates cleared:   ${stats.templatesCleared}`);
  console.log(`App settings cleared: ${stats.settingsCleared}`);
  console.log('\nCloudinary assets removed (or found, in dry-run):');
  for (const [prefix, count] of Object.entries(stats.cloudinaryDeleted)) {
    console.log(`  ${prefix}: ${count}`);
  }
}

main()
  .catch(err => {
    console.error('Deletion failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
