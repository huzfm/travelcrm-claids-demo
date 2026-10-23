// Shared look of the itinerary quote PDFs (single- and multi-option), copied
// from the client's reference quote: DejaVu Sans, dark-red titles on pink
// banners, a faint diagonal watermark, and an image strip as the footer.

import { Font, Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';

export const Q = {
  text: '#111827',
  label: '#4b5563',
  accent: '#991b1b',
  accentLine: '#dc2626',
  bannerBg: '#fecaca',
  border: '#e5e7eb',
  pageBg: '#f9fafb',
  white: '#ffffff',
  green: '#16a34a',
  note: '#854d0e',
  link: '#1e3a8a',
  star: '#eab308',
  // Barely darker than pageBg — present when you look for it, never competing with the text.
  watermark: '#f0f1f4',
};

export const FONT = 'DejaVuSans';

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

/** Page margin on every side; the footer strip sits inside the bottom one. */
export const PAGE_PAD = 18;
/** Height of the footer bar on content pages. */
export const FOOTER_HEIGHT = 30;

// ============================================================
// BUNDLED ASSETS (frontend/public)
// ============================================================

// In the browser the assets are fetched from this app's own origin. A Node
// render (no window) must point this at the public folder via setPdfAssetBase.
let assetBase: string | null = null;

export function setPdfAssetBase(base: string) {
  assetBase = base.replace(/\/$/, '');
}

export function pdfAsset(path: string): string {
  const base = assetBase ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${path}`;
}

// The cover and last page are uploads from "Edit PDF" only;
// the logo on the closing contact card is the one bundled image.
export const DEFAULT_ASSETS = {
  logo: '/pdf-assets/logo.jpg',
};

/** react-pdf throws on an unreadable image source, so only these are rendered. */
export const isImageSrc = (src?: string | null): src is string =>
  typeof src === 'string' && /^(https?:|data:|blob:)/i.test(src.trim());

let fontsRegistered = false;

/** Registers DejaVu Sans once; call before rendering a quote PDF. */
export function ensureQuoteFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({
    family: FONT,
    fonts: [
      { src: pdfAsset('/fonts/DejaVuSans.ttf') },
      { src: pdfAsset('/fonts/DejaVuSans-Bold.ttf'), fontWeight: 'bold' },
    ],
  });
  // react-pdf hyphenates long words by default; the reference never does.
  Font.registerHyphenationCallback(word => [word]);
}

// ============================================================
// PAGE STYLE + DECORATION
// ============================================================

/** Page style for the content pages; the bottom margin makes room for the footer bar. */
export const quotePageStyle = {
  fontFamily: FONT,
  fontSize: 10.5,
  color: Q.text,
  backgroundColor: Q.pageBg,
  paddingTop: PAGE_PAD - 1.3,
  // The reference lets content run to ~15pt above the footer.
  paddingBottom: PAGE_PAD + FOOTER_HEIGHT - 3,
  paddingHorizontal: PAGE_PAD,
};

export const watermarkText = (company?: string, tripId?: string | null): string => {
  if (company && tripId) return `${company} • Trip# ${tripId}`;
  return company || (tripId ? `Trip# ${tripId}` : '');
};

// Faint diagonal text repeated across the whole page, behind the content.
// Render it first inside <Page> so everything else paints on top.
export const PageWatermark = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        top: -250,
        left: -250,
        width: 1100,
        height: 1350,
        transform: 'rotate(-25deg)',
      }}
    >
      {Array.from({ length: 22 }).map((_, rowIdx) => (
        // One wide absolutely-positioned line per row — laying the repeats out
        // as flex siblings made react-pdf overlap them.
        <Text
          key={rowIdx}
          style={{
            position: 'absolute',
            top: rowIdx * 62,
            left: rowIdx % 2 === 0 ? 0 : -140,
            width: 2400,
            fontSize: 21,
            color: Q.watermark,
          }}
        >
          {Array.from({ length: 6 }).fill(`${text}  •  `).join('')}
        </Text>
      ))}
    </View>
  );
};

/** Pink bar with a red left edge, e.g. "Hotels / Accommodations". */
export const SectionBanner = ({ title, marginTop = 0 }: { title: string; marginTop?: number }) => (
  <View
    style={{
      marginTop,
      height: 35,
      justifyContent: 'center',
      backgroundColor: Q.bannerBg,
      borderLeftWidth: 6,
      borderLeftColor: Q.accentLine,
      borderTopRightRadius: 6,
      borderBottomRightRadius: 6,
      paddingLeft: 18,
    }}
  >
    <Text style={{ fontSize: 15, fontWeight: 'bold', color: Q.accent }}>{title}</Text>
  </View>
);

// ============================================================
// BULLETS
// ============================================================

const DotBullet = () => (
  <View
    style={{
      width: 3.7,
      height: 3.7,
      borderRadius: 1.85,
      backgroundColor: Q.text,
      marginLeft: 5.9,
      marginRight: 5.4,
      marginTop: 5.1,
    }}
  />
);

const SquareBullet = ({ color }: { color: string }) => (
  <View style={{ width: 6, height: 6, backgroundColor: color, marginRight: 12, marginTop: 5.7 }} />
);

export interface ListLayout {
  /** Left indent of every row (and the head), e.g. the day-badge column. */
  indent?: number;
  /** Space after the last row. */
  gap?: number;
}

/**
 * A bullet list whose optional `head` (a banner, heading or title) never
 * gets stranded at the bottom of a page — it is kept together with the first
 * item, while the rest of the list breaks across pages freely.
 *
 * Returns a fragment on purpose, so every row is a direct child of the page:
 * react-pdf squeezes a keep-together group nested two or more Views deep into
 * the space left on the page instead of moving it to the next one.
 */
const BulletList = ({
  items,
  bullet,
  head,
  indent = 0,
  gap = 0,
}: {
  items: string[];
  bullet: ReactNode;
  head?: ReactNode;
} & ListLayout) => {
  const row = (item: string, idx: number) => (
    <View
      key={idx}
      wrap={false}
      style={{
        flexDirection: 'row',
        paddingLeft: indent,
        marginBottom: idx === items.length - 1 ? 5.7 + gap : 5.7,
      }}
    >
      {bullet}
      <Text style={{ flex: 1, fontSize: 10.5, lineHeight: 1.58 }}>{item}</Text>
    </View>
  );
  return (
    <>
      <View wrap={false} style={{ marginBottom: items.length === 0 ? gap : 0 }}>
        {head ? <View style={{ paddingLeft: indent }}>{head}</View> : null}
        {items.length > 0 ? row(items[0], 0) : null}
      </View>
      {items.slice(1).map((item, idx) => row(item, idx + 1))}
    </>
  );
};

/** Round-dot bullet list — day descriptions, terms. */
export const DotList = ({
  items,
  head,
  ...layout
}: { items: string[]; head?: ReactNode } & ListLayout) => (
  <BulletList items={items} head={head} bullet={<DotBullet />} {...layout} />
);

/** Square-dot bullet list in a given color — inclusions (green), exclusions (red). */
export const SquareList = ({
  items,
  color,
  head,
  ...layout
}: {
  items: string[];
  color: string;
  head?: ReactNode;
} & ListLayout) => (
  <BulletList items={items} head={head} bullet={<SquareBullet color={color} />} {...layout} />
);

// ============================================================
// FORMATTING
// ============================================================

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const ordinal = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
};

/** "05 Jun 2026" */
export const formatShort = (value?: string | null): string => {
  const d = parseDate(value);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};

/** "05 June, 2026" */
export const formatLong = (value?: string | null): string => {
  const d = parseDate(value);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
};

/** "Friday 5th June, 2026" */
export const formatDayHeader = (value?: string | null): string => {
  const d = parseDate(value);
  if (!d) return '';
  return `${WEEKDAYS[d.getDay()]} ${ordinal(d.getDate())} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
};

/** "5th June" */
export const formatCheckIn = (value?: string | null): string => {
  const d = parseDate(value);
  if (!d) return '';
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]}`;
};

/** "18 Adults, 3 Children (12y, 10y, 6y)" */
export const formatPaxLong = (adults?: number, children?: number, ages?: number[]): string => {
  const parts: string[] = [];
  if (adults) parts.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`);
  if (children) {
    const list = (ages || []).filter(a => a != null).map(a => `${a}y`);
    parts.push(
      `${children} ${children === 1 ? 'Child' : 'Children'}${list.length ? ` (${list.join(', ')})` : ''}`
    );
  }
  return parts.join(', ');
};

/** "18A, 3C(12y,10y,6y)" */
export const formatPaxShort = (adults?: number, children?: number, ages?: number[]): string => {
  const parts: string[] = [];
  if (adults) parts.push(`${adults}A`);
  if (children) {
    const list = (ages || []).filter(a => a != null).map(a => `${a}y`);
    parts.push(`${children}C${list.length ? `(${list.join(',')})` : ''}`);
  }
  return parts.join(', ');
};

/** "1,90,600" — Indian digit grouping. */
export const formatAmount = (value?: number | string | null): string => {
  const n = Number(value) || 0;
  return Math.round(n).toLocaleString('en-IN');
};

/** Splits free text into one bullet per non-empty line, dropping typed bullet markers. */
export const toLines = (text?: string | null): string[] =>
  (text || '')
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-*•●▪◦]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

/** Accepts a string[] or JSON/newline text — how included/excluded/terms are stored. */
export const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(v => String(v).trim()).filter(Boolean);
  } catch {
    // plain text — fall through
  }
  return toLines(value);
};
