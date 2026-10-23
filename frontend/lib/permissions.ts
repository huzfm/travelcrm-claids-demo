/**
 * Permission helpers for the UI.
 *
 * The catalog itself is generated from the backend — see ./permissions.generated.ts.
 * This file holds the parts that only the browser needs: which route needs which
 * feature, and the predicates the sidebar, pages and picker call.
 *
 * Nothing here is a security boundary. The API re-checks every request; this
 * only decides what is worth drawing.
 */

import type { User, UserRole } from '@/types';
import {
  FEATURES,
  ROLE_DEFAULT_PERMISSIONS,
  type Feature,
  type FeatureChild,
  type FeatureKey,
} from './permissions.generated';

export { FEATURES, ROLE_DEFAULT_PERMISSIONS };

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
  RESERVATION_MANAGER: 'Reservation Manager',
};

/** A role as people read it — "Reservation Manager", not RESERVATION_MANAGER. */
export const roleLabel = (role?: string | null): string =>
  role ? (ROLE_LABELS[role as UserRole] ?? role) : '';
export type { Feature, FeatureChild, FeatureKey };

/** Agency-wide visibility grants — ticked deliberately, never by cascade. */
export const OPT_IN_KEYS: Set<string> = new Set(
  FEATURES.flatMap(f => f.children.filter(c => c.optIn).map(c => c.key))
);

/** Module keys only, in catalog order. */
export const PARENT_KEYS: FeatureKey[] = FEATURES.map(f => f.key);

/** Every grantable key — modules and sub-permissions — in catalog order. */
export const FEATURE_KEYS: FeatureKey[] = FEATURES.flatMap(f => [
  f.key,
  ...f.children.map(c => c.key),
]);

const PARENT_OF = new Map<string, FeatureKey>(
  FEATURES.flatMap(f => f.children.map(c => [c.key as string, f.key] as const))
);

const CHILDREN_OF = new Map<string, FeatureKey[]>(
  FEATURES.map(f => [f.key as string, f.children.map(c => c.key)] as const)
);

export const parentOf = (key: string): FeatureKey | null => PARENT_OF.get(key) ?? null;

export const childrenOf = (key: string): FeatureKey[] => CHILDREN_OF.get(key) ?? [];

/** Catalog order, grouped for the permission picker. */
export const FEATURE_GROUPS: { group: string; features: Feature[] }[] = FEATURES.reduce(
  (groups, feature) => {
    const existing = groups.find(g => g.group === feature.group);
    if (existing) existing.features.push(feature);
    else groups.push({ group: feature.group, features: [feature] });
    return groups;
  },
  [] as { group: string; features: Feature[] }[]
);

/** Every key's label, modules and sub-permissions alike. */
export const FEATURE_LABELS: Record<string, string> = Object.fromEntries(
  FEATURES.flatMap(f => [
    [f.key, f.label] as const,
    ...f.children.map(c => [c.key, `${f.label}: ${c.label}`] as const),
  ])
);

type PermissionHolder = Pick<User, 'role'> & { permissions?: string[] | null };

/**
 * Admins hold everything. For everyone else a key must be granted, and a
 * sub-permission also needs its module — the same rule the server applies, so
 * the UI never offers something the API would refuse.
 */
export function hasPermission(
  user: PermissionHolder | null | undefined,
  feature: FeatureKey
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  const granted = user.permissions;
  if (!Array.isArray(granted) || !granted.includes(feature)) return false;

  const parent = parentOf(feature);
  return parent ? granted.includes(parent) : true;
}

/** True when the user holds at least one of the given features. */
export function hasAnyPermission(
  user: PermissionHolder | null | undefined,
  features: FeatureKey[]
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return features.some(feature => hasPermission(user, feature));
}

/**
 * Catalog order, unknown keys dropped, and sub-permissions whose module is
 * missing dropped too — mirrors the server's sanitize so the picker cannot
 * submit a set the server would silently trim.
 */
export function sanitizePermissions(permissions: string[]): FeatureKey[] {
  const requested = new Set(permissions);
  return FEATURE_KEYS.filter(key => {
    if (!requested.has(key)) return false;
    const parent = parentOf(key);
    return parent ? requested.has(parent) : true;
  });
}

/** Human-readable summary for the staff table. */
export function describePermissions(user: PermissionHolder): string {
  if (user.role === 'ADMIN') return 'All features';

  const granted = user.permissions ?? [];
  if (granted.length === 0) return 'No access';

  const modules = granted.filter(key => !key.includes('.')).length;
  if (granted.length === FEATURE_KEYS.length) return 'All features';

  return `${modules} of ${PARENT_KEYS.length} modules`;
}

/** The modules a user holds, by label — for the staff table tooltip. */
export function grantedModuleLabels(user: PermissionHolder): string[] {
  if (user.role === 'ADMIN') return ['All features'];
  return (user.permissions ?? [])
    .filter(key => !key.includes('.'))
    .map(key => FEATURE_LABELS[key] ?? key);
}

/**
 * Path -> feature required to open it.
 *
 * Most entries are prefixes, and the longest match wins so /itineraries/templates
 * is checked before /itineraries. An entry may instead carry a `pattern` for a
 * route with a dynamic segment, which is tested before the prefix list. Paths
 * absent from this list (e.g. /profile) are open to any signed-in user.
 */
type RoutePermission = { prefix: string; permission: FeatureKey };

const ROUTE_PATTERNS: { pattern: RegExp; permission: FeatureKey }[] = [
  // /users/<id>/edit — the page re-checks too, but this keeps the whole route
  // map in one place rather than scattering guards across pages.
  { pattern: /^\/users\/[^/]+\/edit\/?$/, permission: 'users.edit' },
];

const ROUTE_PERMISSIONS: RoutePermission[] = (
  [
    { prefix: '/dashboard', permission: 'dashboard' },
    { prefix: '/leads', permission: 'leads' },
    { prefix: '/followups', permission: 'followups' },
    { prefix: '/booked-clients', permission: 'booked_clients' },
    { prefix: '/booked', permission: 'booked_clients' },
    { prefix: '/itineraries/templates', permission: 'itinerary_templates' },
    { prefix: '/itineraries/pdf-settings', permission: 'pdf_settings' },
    { prefix: '/itineraries', permission: 'itineraries' },
    { prefix: '/trips', permission: 'trips' },
    { prefix: '/hotels', permission: 'hotels' },
    { prefix: '/vehicles', permission: 'vehicles' },
    { prefix: '/destinations', permission: 'destinations' },
    { prefix: '/admin/all-whatsapp', permission: 'whatsapp_all' },
    { prefix: '/whatsapp', permission: 'whatsapp' },
    { prefix: '/settings/whatsapp-templates', permission: 'whatsapp_templates' },
    { prefix: '/settings/assignment-rules', permission: 'assignment_rules' },
    { prefix: '/ad-campaigns', permission: 'ad_campaigns' },
    { prefix: '/analytics', permission: 'analytics' },
    { prefix: '/performance', permission: 'performance' },
    { prefix: '/branches', permission: 'branches' },
    { prefix: '/users/new', permission: 'users.create' },
    { prefix: '/users', permission: 'users' },
    { prefix: '/audit', permission: 'audit_logs' },
  ] as RoutePermission[]
).sort((a, b) => b.prefix.length - a.prefix.length);

/** The feature a path needs, or null when the path is open to everyone. */
export function permissionForRoute(pathname: string): FeatureKey | null {
  const pattern = ROUTE_PATTERNS.find(route => route.pattern.test(pathname));
  if (pattern) return pattern.permission;

  const match = ROUTE_PERMISSIONS.find(
    route => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  );
  return match ? match.permission : null;
}

export function canAccessRoute(
  user: PermissionHolder | null | undefined,
  pathname: string
): boolean {
  const required = permissionForRoute(pathname);
  if (!required) return true;
  return hasPermission(user, required);
}

/**
 * Where to send a user who has no access to the page they landed on — the first
 * sidebar destination they do hold, or their profile if they hold nothing.
 */
export function firstAccessibleRoute(user: PermissionHolder | null | undefined): string {
  if (!user) return '/login';
  if (user.role === 'ADMIN') return '/dashboard';

  const order: { href: string; permission: FeatureKey }[] = [
    { href: '/dashboard', permission: 'dashboard' },
    { href: '/leads', permission: 'leads' },
    { href: '/followups', permission: 'followups' },
    { href: '/booked-clients', permission: 'booked_clients' },
    { href: '/itineraries', permission: 'itineraries' },
    { href: '/whatsapp', permission: 'whatsapp' },
    { href: '/trips', permission: 'trips' },
    { href: '/analytics', permission: 'analytics' },
  ];

  const first = order.find(entry => hasPermission(user, entry.permission));
  return first ? first.href : '/profile';
}

/** Role presets, typed for the picker's preset buttons. */
export const defaultPermissionsForRole = (role: UserRole): FeatureKey[] => [
  ...(ROLE_DEFAULT_PERMISSIONS[role] ?? []),
];
