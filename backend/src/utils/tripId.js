/**
 * Generate a unique trip ID in format: TRIP-YYYYMMDD-XXXX
 */
export function generateTripId() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRIP-${dateStr}-${random}`;
}
