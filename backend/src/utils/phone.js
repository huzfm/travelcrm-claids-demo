/**
 * Phone-number utilities used by user/auth controllers.
 *
 * Canonical stored form: E.164 with leading `+` (e.g. `+917006081111`).
 * Legacy rows may still exist without the leading `+`; callers should use
 * `phoneConflictWhere` for lookups so both forms are matched.
 */

/**
 * Normalize an arbitrary phone string to E.164 (with leading `+`).
 * Returns `null` for empty / fully non-numeric input.
 */
export function toE164(phone) {
  if (phone == null) return null;
  const digits = String(phone).trim().replace(/\D/g, '');
  return digits ? `+${digits}` : null;
}

/** Digits-only form of a phone, or `null` if empty. */
export function phoneDigits(phone) {
  if (phone == null) return null;
  const digits = String(phone).trim().replace(/\D/g, '');
  return digits || null;
}

/**
 * Prisma `where` fragment for matching a phone against either stored form
 * (with or without leading `+`). Pair with additional filters like
 * `id: { not: ... }` at the call site.
 */
export function phoneConflictWhere(phone) {
  const e164 = toE164(phone);
  if (!e164) return null;
  const digits = e164.slice(1);
  return {
    OR: [{ phone: digits }, { phone: e164 }],
  };
}
