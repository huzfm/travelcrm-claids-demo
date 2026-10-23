// The quote PDF's Terms section. Admins keep a library of sections in "Edit
// PDF" (terms, cancellation policy, supplement cost, bank details, ...), each a
// list of points, some marked default. While building an itinerary the agent
// picks which points go into that quote and can add their own; the choice is
// saved on the itinerary (`terms`) and printed as-is.
//
// Kept free of react-pdf imports so the settings page and the itinerary
// wizard can use it without pulling in the PDF renderer.

export interface TermsPoint {
  text: string;
  /** Pre-selected on itineraries that haven't picked their own terms. */
  isDefault: boolean;
}

export interface TermsCategory {
  title: string;
  points: TermsPoint[];
}

/** The "Edit PDF" library (stored as AppSetting.pdfTerms). */
export interface PDFTermsSettings {
  sections: TermsCategory[];
  /** Office address on the contact card that closes the Terms section. */
  address: string;
}

/** One printed section — a heading and its bullets. */
export interface TermsSection {
  title: string;
  items: string[];
}

const point = (text: string, isDefault = true): TermsPoint => ({ text, isDefault });

export const DEFAULT_PDF_TERMS: PDFTermsSettings = {
  sections: [
    {
      title: 'Terms & Conditions',
      points: [
        point(
          'As per the Government directive, foreigners are requested to produce their passport as photo identity proof and Indians can produce any govt approved photo identity such as Driving License/Pan Card/Voter ID card/Passport at the point of check-in at the hotel.'
        ),
        point('Tourist himself is responsible for carrying, shifting and taking care of their own luggage'),
        point('All Prices are in Indian Rupees and valid for Indian National'),
        point(
          'Rooms are subject to availability at the time of receiving firm booking. In case of non-availability of the mentioned hotels, similar kind/quality of hotels will be provided, which can change the above package cost.'
        ),
        point(
          '100% Advance shall have to be paid before departure out of which 50% has to be paid at the time of booking tour.'
        ),
      ],
    },
    {
      title: 'Cancellation Policy',
      points: [
        point('100% refund if informed within 06 hours'),
        point('75% refund if informed within 24 hours'),
        point('50% refund if informed within 48 hours'),
        point('No refund will be initiated, if exceeds 03 days'),
      ],
    },
    {
      title: 'Supplement Cost',
      points: [
        point('Pahalgam Inner line sightseeing charges @ 3000/- by Cab.'),
        point('Gondola tickets charges @ 2200/- per head up to 2nd Phase.'),
        point('Horse Ride at Gulmarg, Sonmarg & Pahalgam 1500 Per Person.'),
        point('ATV Bike Ride @ 800 - 1200 per bike for 01 Round at Gulmarg.'),
        point('Shikara ride at Srinagar on Dal lake @ 2000/- for 2 hours.'),
      ],
    },
    {
      title: 'Name on Account: Tripoday India Pvt Ltd',
      points: [
        point('Account Number: 923020027264737'),
        point('IFSC Code : UTIB0001994'),
        point('Bank Name : Axis Bank'),
      ],
    },
  ],
  address: '7 square Mall, shah Anwar colony, Srinagar, Jammu and Kashmir, India - 190014',
};

const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * Reads the stored library defensively. Also accepts the earlier shape where
 * a section held plain `items: string[]` (every point counted as default).
 */
export function normalizeTermsLibrary(raw: unknown): PDFTermsSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_PDF_TERMS;
  const value = raw as { sections?: unknown; address?: unknown };
  const sections = Array.isArray(value.sections)
    ? value.sections.map((section: any): TermsCategory => {
        const points: TermsPoint[] = Array.isArray(section?.points)
          ? section.points.map((p: any) => ({ text: str(p?.text), isDefault: !!p?.isDefault }))
          : Array.isArray(section?.items)
            ? section.items.map((text: unknown) => ({ text: str(text), isDefault: true }))
            : [];
        return { title: str(section?.title), points };
      })
    : [];
  return { sections, address: str(value.address) };
}

/** What an itinerary prints before anyone has picked: every default point. */
export function defaultTermsSelection(library: PDFTermsSettings): TermsSection[] {
  return library.sections
    .map(section => ({
      title: section.title,
      items: section.points.filter(p => p.isDefault && p.text.trim()).map(p => p.text.trim()),
    }))
    .filter(section => section.items.length > 0);
}

// ============================================================
// PER-ITINERARY SELECTION (Itinerary.terms)
// ============================================================

// The picked sections are saved as JSON in the existing `terms` text column;
// anything else in that column is free text from before the picker existed.
const SELECTION_VERSION = 2;

export type ItineraryTerms =
  | { kind: 'empty' }
  | { kind: 'selection'; sections: TermsSection[] }
  | { kind: 'legacy'; text: string };

export function parseItineraryTerms(raw?: string | null): ItineraryTerms {
  const text = (raw || '').trim();
  if (!text) return { kind: 'empty' };
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed?.version === SELECTION_VERSION && Array.isArray(parsed.sections)) {
        return {
          kind: 'selection',
          sections: parsed.sections.map((s: any) => ({
            title: str(s?.title),
            items: Array.isArray(s?.items) ? s.items.map(str).filter(Boolean) : [],
          })),
        };
      }
    } catch {
      // not ours — treat as free text
    }
  }
  return { kind: 'legacy', text };
}

export const serializeItineraryTerms = (sections: TermsSection[]): string =>
  JSON.stringify({
    version: SELECTION_VERSION,
    sections: sections
      .map(s => ({ title: s.title.trim(), items: s.items.map(i => i.trim()).filter(Boolean) }))
      .filter(s => s.title || s.items.length),
  });

/** Free text saved before the picker existed becomes its own section. */
export const LEGACY_TERMS_TITLE = 'Additional Terms';

const legacyLines = (text: string) =>
  text
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-*•●▪◦]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

/**
 * The sections an itinerary's terms resolve to — what both the PDF prints and
 * the wizard's picker starts from: its own pick, or the library defaults
 * (plus any pre-picker free text as an extra section).
 */
export function resolveItineraryTerms(
  raw: string | null | undefined,
  library: PDFTermsSettings
): TermsSection[] {
  const parsed = parseItineraryTerms(raw);
  if (parsed.kind === 'selection') return parsed.sections;
  const defaults = defaultTermsSelection(library);
  if (parsed.kind === 'legacy') {
    return [...defaults, { title: LEGACY_TERMS_TITLE, items: legacyLines(parsed.text) }];
  }
  return defaults;
}
