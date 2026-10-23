import {
  FEATURES,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  type Feature,
  type FeatureKey,
} from '@/lib/permissions';
import type { User, UserRole } from '@/types';

/**
 * Everything the guide shows is derived from the live permission catalog rather
 * than written out by hand, so the page cannot drift from what the server
 * actually enforces when a feature is added or a role default changes.
 */

export const ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'STAFF', 'RESERVATION_MANAGER'];

export { ROLE_LABELS };

export const ROLE_BLURBS: Record<UserRole, string> = {
  ADMIN: 'Holds every feature in every branch. There can only be one.',
  MANAGER: 'Runs a single branch, including deletes, payments and reporting.',
  STAFF: 'Day-to-day selling in a single branch. Nothing destructive.',
  RESERVATION_MANAGER:
    'Central reservations desk: adds hotels and sees every itinerary, trip and payment in every branch.',
};

/** The permission set a role starts with, as a set for quick lookups. */
export const defaultSetForRole = (role: UserRole): Set<string> =>
  new Set(ROLE_DEFAULT_PERMISSIONS[role] ?? []);

/**
 * What the signed-in user actually holds. An admin bypasses every check, so
 * they are treated as holding the whole catalog rather than their stored list.
 */
export const grantedSetForUser = (
  user?: Pick<User, 'role' | 'permissions'> | null
): Set<string> => {
  if (!user) return new Set();
  if (user.role === 'ADMIN') return defaultSetForRole('ADMIN');
  return new Set(user.permissions ?? []);
};

export type CoverageState = 'full' | 'partial' | 'none';

export interface Coverage {
  state: CoverageState;
  /** Sub-permissions held, and how many the module has in total. */
  held: number;
  total: number;
}

/** How much of one module a permission set covers. */
export function coverageFor(granted: Set<string>, feature: Feature): Coverage {
  const total = feature.children.length;

  if (!granted.has(feature.key)) return { state: 'none', held: 0, total };
  if (total === 0) return { state: 'full', held: 0, total };

  const held = feature.children.filter(child => granted.has(child.key)).length;
  return { state: held === total ? 'full' : 'partial', held, total };
}

/** Short cell text for the role matrix: "Full", "3 of 9", "No access". */
export function coverageLabel(coverage: Coverage): string {
  if (coverage.state === 'none') return 'No access';
  if (coverage.state === 'full') return 'Full';
  return `${coverage.held} of ${coverage.total}`;
}

/** Modules grouped the way the permission picker groups them. */
export const GUIDE_GROUPS: { group: string; features: Feature[] }[] = FEATURES.reduce(
  (groups, feature) => {
    const existing = groups.find(g => g.group === feature.group);
    if (existing) existing.features.push(feature);
    else groups.push({ group: feature.group, features: [feature] });
    return groups;
  },
  [] as { group: string; features: Feature[] }[]
);

/** The dashboard's sub-permissions are one per panel, so the guide lists them. */
export const DASHBOARD_FEATURE = FEATURES.find(f => f.key === 'dashboard');

export const MODULE_COUNT = FEATURES.length;

export const isHeld = (granted: Set<string>, key: FeatureKey): boolean => granted.has(key);
