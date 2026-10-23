/**
 * Integrity checks for the permission system.
 *
 * The catalog in src/config/permissions.js is the source of truth; the frontend
 * copy is generated from it. This script verifies that the generated file is
 * current and that nothing in either codebase references a key that does not
 * exist — a typo in a guard denies access silently, which is the failure mode
 * worth spending a script on.
 *
 * Usage:  node scripts/check-permission-sync.js
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { FEATURES, FEATURE_KEYS, PARENT_KEYS, childrenOf } from '../src/config/permissions.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(here, '..');
const REPO = path.resolve(BACKEND, '..');
const FRONTEND = path.join(REPO, 'frontend');

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok && detail) console.log(`     ${detail}`);
};

// 1. The generated frontend catalog must match the backend one.
try {
  execFileSync('node', [path.join(here, 'generate-frontend-permissions.js'), '--check'], {
    stdio: 'pipe',
  });
  check(`generated frontend catalog is current (${FEATURE_KEYS.length} keys)`, true);
} catch (error) {
  check(
    'generated frontend catalog is current',
    false,
    String(error.stderr || error.message).trim() || 'run `pnpm permissions:generate`'
  );
}

// 2. Catalog shape: every sub-permission is namespaced under its module.
const badlyNamed = FEATURES.flatMap(f =>
  f.children.filter(c => !c.key.startsWith(`${f.key}.`)).map(c => `${c.key} (under ${f.key})`)
);
check(
  'sub-permissions are namespaced under their module',
  badlyNamed.length === 0,
  badlyNamed.join(', ')
);

const duplicates = FEATURE_KEYS.filter((k, i) => FEATURE_KEYS.indexOf(k) !== i);
check('no duplicate keys', duplicates.length === 0, duplicates.join(', '));

/** Every .js/.ts/.tsx file under a directory, skipping node_modules. */
const walk = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return /\.(js|ts|tsx)$/.test(entry.name) ? [full] : [];
  });

// 3. Every key named by a backend guard must exist.
const badGuards = [];
const guardedKeys = new Set();
for (const file of walk(path.join(BACKEND, 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  for (const match of src.matchAll(/requirePermission\(([^)]*)\)/gs)) {
    const keys = [...match[1].matchAll(/'([^']+)'/g)].map(k => k[1]);
    if (keys.length === 0) {
      badGuards.push(`${path.relative(REPO, file)}: requirePermission() with no feature key`);
      continue;
    }
    for (const key of keys) {
      guardedKeys.add(key);
      if (!FEATURE_KEYS.includes(key)) {
        badGuards.push(`${path.relative(REPO, file)}: unknown key '${key}'`);
      }
    }
  }
}
// userHasPermission() in controllers takes the same keys.
for (const file of walk(path.join(BACKEND, 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  for (const match of src.matchAll(/userHasPermission\([^,]+,\s*'([^']+)'\)/g)) {
    guardedKeys.add(match[1]);
    if (!FEATURE_KEYS.includes(match[1])) {
      badGuards.push(`${path.relative(REPO, file)}: unknown key '${match[1]}'`);
    }
  }
}
check('every backend guard key exists', badGuards.length === 0, badGuards.join('\n     '));

// 4. Same for the sidebar, the route map and the dashboard widget map.
const frontendRefs = [];
const readIfExists = p => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

const sidebar = readIfExists(path.join(FRONTEND, 'components/layout/sidebar.tsx'));
const navKeys = [...sidebar.matchAll(/permission: '([a-z_.]+)'/g)].map(m => m[1]);

const helpers = readIfExists(path.join(FRONTEND, 'lib/permissions.ts'));
const routeKeys = [...helpers.matchAll(/prefix: '[^']+', permission: '([a-z_.]+)'/g)].map(
  m => m[1]
);

const dashboard = readIfExists(path.join(FRONTEND, 'app/(protected)/dashboard/page.tsx'));
const widgetKeys = [...dashboard.matchAll(/: '(dashboard\.[a-z_]+)'/g)].map(m => m[1]);

for (const [label, keys] of [
  ['sidebar', navKeys],
  ['route map', routeKeys],
  ['dashboard widget map', widgetKeys],
]) {
  for (const key of keys) {
    if (!FEATURE_KEYS.includes(key)) frontendRefs.push(`${label}: unknown key '${key}'`);
  }
}
check(
  `frontend keys exist (${navKeys.length} nav, ${routeKeys.length} routes, ${widgetKeys.length} widgets)`,
  frontendRefs.length === 0,
  frontendRefs.join('\n     ')
);

// 5. Every dashboard widget sub-permission should be wired to a widget.
const dashboardChildren = childrenOf('dashboard').filter(k => k !== 'dashboard.search');
const unwiredWidgets = dashboardChildren.filter(k => !widgetKeys.includes(k));
check(
  'every dashboard sub-permission maps to a widget',
  unwiredWidgets.length === 0,
  `unwired: ${unwiredWidgets.join(', ')}`
);

// Warnings: a toggle nothing enforces does nothing, which is worth knowing but
// is not always a bug (a module may be gated only in the UI for now).
//
// A module whose sub-permissions are all guarded is itself enforced, because
// holding a sub-permission requires its module — so it is not "unenforced".
const isCoveredByChildren = key => {
  const children = childrenOf(key);
  return children.length > 0 && children.every(child => guardedKeys.has(child));
};

const unenforced = FEATURE_KEYS.filter(
  k => !guardedKeys.has(k) && !k.startsWith('dashboard.') && !isCoveredByChildren(k)
);
if (unenforced.length) {
  console.log(`WARN no backend guard: ${unenforced.join(', ')}`);
}
const unlinked = PARENT_KEYS.filter(k => !navKeys.includes(k));
if (unlinked.length) {
  console.log(`WARN no sidebar entry: ${unlinked.join(', ')}`);
}

console.log(
  failures === 0
    ? `\nPermission system is consistent — ${PARENT_KEYS.length} modules, ${FEATURE_KEYS.length - PARENT_KEYS.length} sub-permissions.`
    : `\n${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
