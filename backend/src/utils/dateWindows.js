/**
 * Date-window helpers for the dashboard.
 *
 * Two kinds of windows are needed, and mixing them up produces off-by-one-day
 * bugs for branches outside UTC:
 *
 *  - calendarDayWindow() — for *date-only* columns (itinerary.startDate/endDate,
 *    paymentSchedule.dueDate, supplierPayable.dueDate). These are written from
 *    'YYYY-MM-DD' input, so they land on UTC midnight and carry no meaningful
 *    time-of-day. The window is UTC-midnight to UTC-midnight, but *which*
 *    calendar day it covers is resolved in the branch's timezone.
 *
 *  - zonedDayWindow() — for real instants (followUp.scheduledAt,
 *    tripPayment.paymentDate). The window is the true start/end of that day in
 *    the branch's timezone.
 */

const DEFAULT_TZ = 'Asia/Kolkata';

const safeTz = timeZone => {
  if (!timeZone) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return DEFAULT_TZ;
  }
};

/** Y/M/D of `date` as seen in `timeZone`. */
export const zonedDateParts = (date, timeZone) => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = fmt.format(date).split('-').map(Number);
  return { year, month, day };
};

/** Offset in ms between `timeZone` and UTC at the given instant. */
const tzOffsetMs = (date, timeZone) => {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz(timeZone),
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const p = fmt.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second)
  );
  return asUTC - date.getTime();
};

/**
 * Window over a *date-only* column.
 * `offsetDays` is relative to today in `timeZone` (0 = today, -1 = yesterday).
 * `spanDays` is how many days the window covers (default 1).
 */
export const calendarDayWindow = (timeZone, offsetDays = 0, spanDays = 1, now = new Date()) => {
  const { year, month, day } = zonedDateParts(now, timeZone);
  const gte = new Date(Date.UTC(year, month - 1, day + offsetDays, 0, 0, 0, 0));
  const lt = new Date(Date.UTC(year, month - 1, day + offsetDays + spanDays, 0, 0, 0, 0));
  return { gte, lt };
};

/** Window over a real timestamp column, in the branch's local day. */
export const zonedDayWindow = (timeZone, offsetDays = 0, spanDays = 1, now = new Date()) => {
  const tz = safeTz(timeZone);
  const { year, month, day } = zonedDateParts(now, tz);

  const boundary = extraDays => {
    const naive = Date.UTC(year, month - 1, day + extraDays, 0, 0, 0, 0);
    // Resolve twice so a DST shift between the guess and the real instant settles.
    let instant = new Date(naive - tzOffsetMs(new Date(naive), tz));
    instant = new Date(naive - tzOffsetMs(instant, tz));
    return instant;
  };

  return { gte: boundary(offsetDays), lt: boundary(offsetDays + spanDays) };
};

/** 'YYYY-MM-DD' for the branch's current day (useful for cache keys / labels). */
export const zonedToday = (timeZone, now = new Date()) => {
  const { year, month, day } = zonedDateParts(now, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Parse a 'YYYY-MM-DD' (or ISO) string into the UTC-midnight instant used for
 * date-only columns. Returns null for empty/unparseable input.
 */
export const parseCalendarDate = value => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const match = String(value)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
};

/** Start of the period for the Today / Week / Month sales-stats toggle. */
export const periodWindow = (period, timeZone, now = new Date()) => {
  switch (period) {
    case 'week':
      return zonedDayWindow(timeZone, -6, 7, now);
    case 'month':
      return zonedDayWindow(timeZone, -29, 30, now);
    case 'today':
    default:
      return zonedDayWindow(timeZone, 0, 1, now);
  }
};
