/**
 * Backfill feature permissions.
 *
 * Handles two migrations, because permissions arrived in two stages:
 *
 * 1. Users created before permissions existed have an empty array. Deny-by-
 *    default would lock them out of everything, so they get the set that
 *    matched their role's old hard-coded access.
 *
 * 2. Users granted permissions before sub-permissions existed hold module keys
 *    only (`leads`, not `leads.delete`). Back then holding the module meant
 *    full use of it, so each module they hold is expanded to include all of its
 *    sub-permissions. Anything less would silently take abilities away.
 *
 * Both passes are idempotent — a second run changes nothing.
 *
 * Usage:  node scripts/backfill-permissions.js [--force] [--dry-run]
 *   --force    reset every user to their role's defaults, discarding custom sets
 *   --dry-run  report what would change without writing
 */

import prisma from '../src/config/prisma.js';
import {
  defaultPermissionsForRole,
  sanitizePermissions,
  childrenOf,
  PARENT_KEYS,
} from '../src/config/permissions.js';

const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

/**
 * A row is "legacy" when it holds modules but not a single sub-permission,
 * which is only possible for a set written before sub-permissions existed.
 *
 * The test is per user, not per module: a set that mentions any child at all was
 * written by the current picker, and expanding it would hand out abilities the
 * admin deliberately withheld. Judging module by module would misread a
 * deliberately view-only module as legacy.
 */
const isLegacySet = permissions => {
  const hasModuleWithChildren = permissions.some(key => childrenOf(key).length > 0);
  const hasAnyChild = permissions.some(key => key.includes('.'));
  return hasModuleWithChildren && !hasAnyChild;
};

/** Grant every sub-permission of each module held, as holding it used to mean. */
const expandLegacyModules = permissions => {
  const held = new Set(permissions);

  for (const parent of PARENT_KEYS) {
    if (held.has(parent)) childrenOf(parent).forEach(child => held.add(child));
  }

  return sanitizePermissions([...held]);
};

const run = async () => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, permissions: true },
    orderBy: { createdAt: 'asc' },
  });

  let granted = 0;
  let expanded = 0;
  let unchanged = 0;

  for (const user of users) {
    const current = sanitizePermissions(user.permissions || []);
    const hasCustom = current.length > 0;

    let next;
    let reason;

    if (force || !hasCustom) {
      next = defaultPermissionsForRole(user.role);
      reason = force ? 'reset to role defaults' : 'no permissions set';
    } else if (isLegacySet(current)) {
      next = expandLegacyModules(current);
      reason = 'expanded modules to sub-permissions';
    } else {
      // Configured with the current picker — leave exactly as the admin set it.
      next = current;
      reason = 'already uses sub-permissions';
    }

    if (JSON.stringify(next) === JSON.stringify(user.permissions)) {
      unchanged += 1;
      continue;
    }

    const addedCount = next.length - current.length;

    if (!dryRun) {
      await prisma.user.update({ where: { id: user.id }, data: { permissions: next } });
    }

    if (force || !hasCustom) granted += 1;
    else expanded += 1;

    console.log(
      `  ${dryRun ? '·' : '✓'} ${user.email} (${user.role}) — ${reason}: ` +
        `${current.length} → ${next.length} keys${addedCount > 0 ? ` (+${addedCount})` : ''}`
    );
  }

  console.log(
    `\n${dryRun ? 'Dry run — nothing written.' : 'Backfill complete.'} ` +
      `Granted defaults: ${granted}, expanded: ${expanded}, already correct: ${unchanged}.`
  );
};

run()
  .catch(error => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
