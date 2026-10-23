// Multi-Option PDF Utility Functions - Duplicated for full isolation
// Do not import from single-option or any shared location

// Currency symbols mapping. INR uses "Rs. " instead of the ₹ glyph — the
// PDF's default Helvetica font has no glyph for U+20B9 and renders it as a
// stray character (a superscript "1") instead of the rupee sign.
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: 'Rs. ',
  MUR: '₨',
  MYR: 'RM',
  USD: '$',
  EUR: '€',
  THB: '฿',
};

export const getCurrencySymbol = (currency: string = 'INR'): string => {
  return CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS['INR'];
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

export const formatDateRange = (start: string, end: string): string => {
  if (!start) return '';
  if (!end) return formatShortDate(start);
  return `${formatShortDate(start)} — ${formatShortDate(end)}`;
};

// FIX 1: Consistent price formatting with currency symbol and null handling
export const formatINR = (amount: number | string | null | undefined): string => {
  const num = Number(amount) || 0;
  return num.toLocaleString('en-IN');
};

export const formatRupee = (
  amount: number | string | null | undefined,
  currency: string = 'INR'
): string => {
  const symbol = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS['INR'];
  return symbol + formatINR(amount);
};

export const formatPrice = (
  amount: number | undefined | null,
  currency: string = 'INR'
): string => {
  const symbol = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS['INR'];
  if (!amount && amount !== 0) return symbol + '0';
  return symbol + formatINR(amount);
};

export const parseArray = (val: unknown): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      const trimmed = val.trim();
      if (trimmed) {
        return trimmed
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
      return [];
    }
  }
  return [];
};

export const getDayOrdinal = (num: number): string => {
  const suffixes = ['TH', 'ST', 'ND', 'RD'];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
};

export const getDayOrdinalSuffix = (num: number): string => {
  const suffixes = ['TH', 'ST', 'ND', 'RD'];
  const v = num % 100;
  return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
};

// "1st", "2nd", "3rd" — lowercase ordinal used for hotel-stay night badges.
export const getDayOrdinalLower = (num: number): string =>
  `${num}${getDayOrdinalSuffix(num).toLowerCase()}`;

// "5th June" — check-in date with no year, matching the hotel card format.
export const formatCheckInDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'long' });
  return `${day}${getDayOrdinalSuffix(day).toLowerCase()} ${month}`;
};

// Strip bullet characters (leading or standalone) from each line of the text.
// Handles leading "- item", "* item", "• item", "· item", and also strips
// standalone "•", "·", "*", "-" tokens that appear anywhere on a line.
// Used to render the agent-entered day.description as a clean paragraph
// instead of preserving bullet markers from the source text.
export const stripBullets = (text: string | undefined | null): string => {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => {
      // 1) Strip a leading bullet marker and the whitespace after it.
      let stripped = line.replace(/^\s*(?:[-•*·▪◦▫])\s+/, '').trimStart();
      // 2) Strip any remaining standalone bullet token at the start (no text after).
      stripped = stripped.replace(/^\s*(?:[-•*·▪◦▫])\s*$/, '').trimStart();
      // 3) Strip inline standalone bullet tokens (e.g. "item  •  next item").
      stripped = stripped.replace(/\s+[-•*·▪◦▫]\s+/g, ' ');
      return stripped;
    })
    .join('\n');
};

// Rough per-day content height (in points), used to pack several days onto one
// page of the compact "Day Wise Itinerary" list instead of giving every day its
// own page. Bullet count is the main driver since everything else on the card
// (badge, date, title) is a fixed size.
interface DayHeightInput {
  dayType?: string;
  description?: string | null;
  destinationDescription?: string | null;
  notes?: string | null;
}

// Both constants intentionally sit a little above MultiOptionDayCard.tsx's real
// rendered size (badge/date/title/padding ≈67pt, a bullet line ≈13pt) — better
// to pack slightly fewer days per page than to underestimate and overflow.
const DAY_CARD_BASE_HEIGHT = 80; // badge/date/title + card padding & margin
const DAY_CARD_BULLET_HEIGHT = 22; // one bulleted description line
const DAY_CARD_NOTES_HEIGHT = 28;

const countBulletLines = (text?: string | null): number =>
  text ? stripBullets(text).split('\n').map(l => l.trim()).filter(Boolean).length : 0;

export const estimateDayCardHeight = (day: DayHeightInput): number => {
  if (day.dayType === 'leisure' && !day.description) return 85;
  const bulletLines = countBulletLines(day.description) + countBulletLines(day.destinationDescription);
  return (
    DAY_CARD_BASE_HEIGHT +
    bulletLines * DAY_CARD_BULLET_HEIGHT +
    (day.notes ? DAY_CARD_NOTES_HEIGHT : 0)
  );
};

// Greedily packs days onto pages under a height budget, matching the reference's
// continuous day list rather than one full A4 page per day. 650 leaves a margin
// below the ~677pt actually available under PDFHeaderSmall on an A4 page — see
// styles.page / styles.pageContent for the page's own padding.
//
// Cards render 2-per-row (see MultiOptionDaySection.tsx), so days are packed a
// row at a time — 3 rows/6 days per page — with each row's height taken as the
// taller of its pair, not the sum of both, since they sit side by side.
export const groupDaysIntoPages = <T extends DayHeightInput>(
  days: T[],
  maxPageHeight = 650,
  maxDaysPerPage = 6,
  columns = 2
): T[][] => {
  const pages: T[][] = [];
  let current: T[] = [];
  let currentHeight = 0;
  let row: T[] = [];
  let rowHeight = 0;

  const flushRow = () => {
    if (row.length === 0) return;
    if (
      current.length > 0 &&
      (currentHeight + rowHeight > maxPageHeight || current.length >= maxDaysPerPage)
    ) {
      pages.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(...row);
    currentHeight += rowHeight;
    row = [];
    rowHeight = 0;
  };

  for (const day of days) {
    row.push(day);
    rowHeight = Math.max(rowHeight, estimateDayCardHeight(day));
    if (row.length === columns) flushRow();
  }
  flushRow();
  if (current.length > 0) pages.push(current);
  return pages;
};

// Consecutive days at the same destination become one card ("Day 1 & 2"),
// the same way the hotel section turns nights 1-2 at one hotel into a single
// card. Unlike hotels, only ADJACENT days merge — a day trip elsewhere and
// back doesn't collapse the itinerary's chronological order into one card.
// Leisure days never merge; each keeps its own card.
interface DayGroupInput extends DayHeightInput {
  dayNumber: number;
  destination?: string | null;
}

const dayMergeKey = (day: DayGroupInput): string | null => {
  if (day.dayType === 'leisure') return null;
  const place = (day.destination || '').trim().toLowerCase();
  return place || null;
};

export const groupConsecutiveDaysByDestination = <T extends DayGroupInput>(days: T[]): T[][] => {
  const groups: T[][] = [];
  for (const day of days) {
    const key = dayMergeKey(day);
    const prevGroup = groups[groups.length - 1];
    const prevKey = prevGroup ? dayMergeKey(prevGroup[prevGroup.length - 1]) : null;
    if (key && prevGroup && key === prevKey) {
      prevGroup.push(day);
    } else {
      groups.push([day]);
    }
  }
  return groups;
};

// A small "Day N" sub-label sits above every merged day after the first.
const DAY_GROUP_LABEL_HEIGHT = 14;

// Same idea as estimateDayCardHeight, but for a merged group: the shared
// destination description is only ever shown once, while each day still
// contributes its own description/notes bullets.
export const estimateDayGroupHeight = (group: DayHeightInput[]): number => {
  if (group.length <= 1) return estimateDayCardHeight(group[0]);

  const sharedBullets = countBulletLines(group[0].destinationDescription) * DAY_CARD_BULLET_HEIGHT;
  const perDay = group.reduce(
    (sum, day, idx) =>
      sum +
      countBulletLines(day.description) * DAY_CARD_BULLET_HEIGHT +
      (day.notes ? DAY_CARD_NOTES_HEIGHT : 0) +
      (idx > 0 ? DAY_GROUP_LABEL_HEIGHT : 0),
    0
  );
  return DAY_CARD_BASE_HEIGHT + sharedBullets + perDay;
};

// Packs day-cards (each already a group of 1+ merged days) onto pages under a
// height budget — same greedy row-packing as groupDaysIntoPages, just sized
// per card (via estimateDayGroupHeight) instead of per single day.
export const groupDayCardsIntoPages = <T extends DayHeightInput>(
  dayGroups: T[][],
  maxPageHeight = 650,
  maxCardsPerPage = 6,
  columns = 2
): T[][][] => {
  const pages: T[][][] = [];
  let current: T[][] = [];
  let currentHeight = 0;
  let row: T[][] = [];
  let rowHeight = 0;

  const flushRow = () => {
    if (row.length === 0) return;
    if (
      current.length > 0 &&
      (currentHeight + rowHeight > maxPageHeight || current.length >= maxCardsPerPage)
    ) {
      pages.push(current);
      current = [];
      currentHeight = 0;
    }
    current.push(...row);
    currentHeight += rowHeight;
    row = [];
    rowHeight = 0;
  };

  for (const group of dayGroups) {
    row.push(group);
    rowHeight = Math.max(rowHeight, estimateDayGroupHeight(group));
    if (row.length === columns) flushRow();
  }
  flushRow();

  if (current.length > 0) pages.push(current);
  return pages;
};

// Day Wise Itinerary pagination — one entry per day (no merging), stacked one
// per row. The estimates run ~20% above the real entry height (badge/date/
// title ≈ 57pt vs 80 estimated), so 640 still leaves room for the "Day Wise
// Itinerary" banner and for bullets that wrap. Used by both the section and
// the page-count math in the document, so they always agree.
export const paginateDayEntries = <T extends DayHeightInput>(days: T[]): T[][][] =>
  groupDayCardsIntoPages(
    days.map(day => [day]),
    640,
    7,
    1
  );

// Pax breakdown shown on the cover page, e.g. "18A, 3C(12y, 5y, 16y)".
export const formatPaxSummary = (
  adults?: number | null,
  children?: number | null,
  childrenAges?: (number | null | undefined)[]
): string => {
  const parts: string[] = [];
  if (adults && adults > 0) parts.push(`${adults}A`);
  if (children && children > 0) {
    const ages = (childrenAges || []).filter((age): age is number => Number.isFinite(age));
    const ageSuffix = ages.length > 0 ? `(${ages.map(age => `${age}y`).join(', ')})` : '';
    parts.push(`${children}C${ageSuffix}`);
  }
  return parts.join(', ');
};

// Format amount with currency code text (no symbols)
export const formatINRText = (
  amount: number | string | null | undefined,
  currency: string = 'INR'
): string => {
  const num = Number(amount) || 0;
  return `${currency} ${num.toLocaleString('en-IN')}`;
};
