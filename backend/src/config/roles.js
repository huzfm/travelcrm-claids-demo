/**
 * Account roles, and the role each one is scoped as when deciding whose data
 * it can see.
 *
 * Scoping code all over the API reads `req.user.role` as one of ADMIN /
 * MANAGER / STAFF, and much of it treats "neither STAFF nor MANAGER" as admin.
 * A role outside those three is therefore mapped to the closest of them here,
 * once, at token decode — so adding a role can never silently widen access.
 *
 * RESERVATION_MANAGER is scoped like STAFF. What lets it see every branch's
 * itineraries, trips and payments is its default permissions
 * (`itineraries.view_all`, `trips.view_all`), so an admin can still narrow it.
 */

export const ROLES = ['ADMIN', 'MANAGER', 'STAFF', 'RESERVATION_MANAGER'];

/** Roles an admin can assign; ADMIN is never created through the API. */
export const ASSIGNABLE_ROLES = ['MANAGER', 'STAFF', 'RESERVATION_MANAGER'];

const SCOPE_ROLE = {
  RESERVATION_MANAGER: 'STAFF',
};

/** The ADMIN / MANAGER / STAFF role used for data scoping. */
export const scopeRoleOf = role => SCOPE_ROLE[role] ?? role;
