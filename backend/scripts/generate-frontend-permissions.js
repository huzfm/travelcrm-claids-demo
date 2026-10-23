/**
 * Generates the frontend's copy of the permission catalog from the backend one.
 *
 * The catalog has to exist on both sides — the server enforces it, the browser
 * draws it — and keeping two hand-written copies in step is a losing game with
 * 97 keys. So the backend file in src/config/permissions.js is the single
 * source of truth, and this script writes frontend/lib/permissions.generated.ts
 * from it. The hand-written helpers live next door in permissions.ts and import
 * from the generated file.
 *
 * Usage:
 *   node scripts/generate-frontend-permissions.js           # write the file
 *   node scripts/generate-frontend-permissions.js --check   # fail if stale (CI)
 */

import fs from 'fs';
import path from 'path';
import prettier from 'prettier';
import { fileURLToPath } from 'url';
import { FEATURES, ROLE_DEFAULT_PERMISSIONS } from '../src/config/permissions.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(here, '../../frontend/lib/permissions.generated.ts');

const checkOnly = process.argv.includes('--check');

/** A single-quoted TS string literal. */
const q = value => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const allKeys = FEATURES.flatMap(f => [f.key, ...f.children.map(c => c.key)]);

const unionBlock = allKeys.map(key => `  | ${q(key)}`).join('\n');

const featuresBlock = FEATURES.map(feature => {
  const children =
    feature.children.length === 0
      ? '    children: [],'
      : [
          '    children: [',
          ...feature.children.map(
            child =>
              `      { key: ${q(child.key)}, label: ${q(child.label)}, description: ${q(child.description)}${
                child.optIn ? ', optIn: true' : ''
              } },`
          ),
          '    ],',
        ].join('\n');

  return [
    '  {',
    `    key: ${q(feature.key)},`,
    `    label: ${q(feature.label)},`,
    `    group: ${q(feature.group)},`,
    `    description: ${q(feature.description)},`,
    children,
    '  },',
  ].join('\n');
}).join('\n');

const presetBlock = role => ROLE_DEFAULT_PERMISSIONS[role].map(key => `    ${q(key)},`).join('\n');

const raw = `/**
 * AUTO-GENERATED — DO NOT EDIT.
 *
 * Written by backend/scripts/generate-frontend-permissions.js from
 * backend/src/config/permissions.js, which is the source of truth for the
 * permission catalog. To change a feature, edit that file and re-run:
 *
 *   cd backend && pnpm permissions:generate
 *
 * Hand-written helpers that build on this live in ./permissions.ts.
 */

export type FeatureKey =
${unionBlock};

export interface FeatureChild {
  key: FeatureKey;
  label: string;
  description: string;
  /** Widens what the user can see; not ticked when the module is ticked. */
  optIn?: boolean;
}

export interface Feature {
  key: FeatureKey;
  label: string;
  group: string;
  description: string;
  children: FeatureChild[];
}

export const FEATURES: Feature[] = [
${featuresBlock}
];

/** Suggested starting sets offered as presets when creating a user. */
export const ROLE_DEFAULT_PERMISSIONS: Record<
  'ADMIN' | 'MANAGER' | 'STAFF' | 'RESERVATION_MANAGER',
  FeatureKey[]
> = {
  ADMIN: [
${presetBlock('ADMIN')}
  ],
  MANAGER: [
${presetBlock('MANAGER')}
  ],
  STAFF: [
${presetBlock('STAFF')}
  ],
  RESERVATION_MANAGER: [
${presetBlock('RESERVATION_MANAGER')}
  ],
};
`;

// Run the result through Prettier using the frontend's own config, so a later
// `pnpm format` over the frontend cannot reformat the file and make --check
// report it as stale forever.
const prettierConfig = await prettier.resolveConfig(OUTPUT);
const output = await prettier.format(raw, {
  ...prettierConfig,
  filepath: OUTPUT,
  parser: 'typescript',
});

const existing = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : null;

if (checkOnly) {
  if (existing === output) {
    console.log(`Frontend catalog is up to date (${allKeys.length} keys).`);
    process.exit(0);
  }
  console.error(
    'Frontend permission catalog is stale.\n' +
      'Run `pnpm permissions:generate` in backend/ and commit the result.'
  );
  process.exit(1);
}

if (existing === output) {
  console.log(`No change — frontend catalog already matches (${allKeys.length} keys).`);
} else {
  fs.writeFileSync(OUTPUT, output);
  console.log(
    `Wrote ${path.relative(path.resolve(here, '../..'), OUTPUT)} — ` +
      `${FEATURES.length} modules, ${allKeys.length - FEATURES.length} sub-permissions.`
  );
}
