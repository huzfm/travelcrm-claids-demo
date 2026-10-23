/**
 * Ranks saved itinerary templates against the trip being built.
 *
 * Pure and dependency-free on purpose: the wizard scores in the browser today,
 * but if the template library outgrows a single fetch this whole file moves to
 * the API behind `/itineraries/templates/suggest` unchanged.
 *
 * Shape of the model:
 *  - Two *gates* (destination, duration) reject candidates outright. A Kerala
 *    template must never surface on a Kashmir trip, and a 4-day template does
 *    not become a 12-day trip by padding.
 *  - Everything else is a weighted signal in 0..1. A signal returning `null`
 *    means "can't tell" — it drops out and the remaining weights renormalise,
 *    so a sparse legacy template isn't punished for fields it never had.
 */

export interface TemplateCandidate {
  id: string;
  name: string;
  destination: string;
  tripType?: string | null;
  /** Derived from `daysJson.length` — there is no day-count column. */
  dayCount: number;
  totalTravelers?: number | null;
  adults?: number | null;
  children?: number | null;
  totalCost?: number | null;
  currency?: string | null;
  /** Month the template's own trip started, 0–11. Drives the season signal. */
  startMonth?: number | null;
  createdAt?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  branchId?: string | null;
  isGlobal?: boolean;
  /** How often this template has been turned into an itinerary, when known. */
  usageCount?: number | null;
  source: 'template' | 'itinerary';
  daysJson: unknown[];
}

export interface TripContext {
  destination: string;
  dayCount: number;
  adults: number;
  children: number;
  totalTravelers: number;
  tripType?: string;
  /** `yyyy-MM-dd`. */
  startDate?: string;
  currentUserId?: string;
  branchId?: string;
}

export interface TemplateMatch {
  template: TemplateCandidate;
  /** 0..1. */
  score: number;
  /** Plain-language reasons, strongest first, for the UI to show. */
  reasons: string[];
  /** template.dayCount − trip.dayCount. Negative means the template is shorter. */
  dayDelta: number;
}

// ─── Tuning ──────────────────────────────────────────────────────────────────

/** How far a template's length may differ from the trip before it's rejected. */
export const MAX_DAY_DELTA = 2;

/** Below this, a suggestion is noise — better to show nothing. */
export const MIN_SCORE = 0.45;

export const MAX_SUGGESTIONS = 4;

/**
 * Relative importance of each signal. Duration leads because a template that is
 * the wrong length has to be reshaped, and reshaping is what loses the day
 * structure the agent wanted in the first place.
 */
export const WEIGHTS = {
  duration: 0.34,
  paxBand: 0.2,
  tripType: 0.16,
  children: 0.1,
  season: 0.08,
  usage: 0.06,
  recency: 0.03,
  ownership: 0.03,
} as const;

/**
 * What an absent signal is worth.
 *
 * Missing weight is filled with this rather than renormalised away. Without it,
 * a bare legacy template that can only answer "same length" scores a perfect
 * 1.0 on that one signal and ties a template that matches on everything —
 * sparseness would be rewarded. Slightly below even, because not knowing is
 * mildly bad news, not neutral.
 */
const NEUTRAL_PRIOR = 0.4;

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, weight) => sum + weight, 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalise(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

/**
 * Destinations are stored as labels, not ids — "Kashmir" on the trip,
 * "Gulmarg, Kashmir" on a template filed under a place inside it. Containment
 * either way catches both, which is what the master roll-up means here.
 */
export function destinationMatches(tripDestination: string, templateDestination: string): boolean {
  const trip = normalise(tripDestination);
  const template = normalise(templateDestination);
  if (!trip || !template) return false;
  if (trip === template) return true;
  return template.includes(trip) || trip.includes(template);
}

/**
 * Party size bands. Rooms and vehicles are sized by band, not headcount, so a
 * 3-traveller template fits a 4-traveller trip far better than the raw
 * difference suggests.
 */
export function paxBand(count?: number | null): number | null {
  if (!count || count < 1) return null;
  if (count <= 2) return 0;
  if (count <= 4) return 1;
  if (count <= 8) return 2;
  return 3;
}

/** Circular distance between two months, 0–6. */
function monthDistance(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 12 - raw);
}

// ─── Signals ─────────────────────────────────────────────────────────────────
//
// Each returns 0..1, or null when the data needed simply isn't there.

function durationScore(delta: number): number {
  const distance = Math.abs(delta);
  if (distance === 0) return 1;
  if (distance === 1) return 0.75;
  return 0.45;
}

function paxScore(template: TemplateCandidate, trip: TripContext): number | null {
  const templateBand = paxBand(template.totalTravelers);
  const tripBand = paxBand(trip.totalTravelers);
  if (templateBand === null || tripBand === null) return null;

  const gap = Math.abs(templateBand - tripBand);
  if (gap === 0) return 1;
  if (gap === 1) return 0.5;
  return 0;
}

function tripTypeScore(template: TemplateCandidate, trip: TripContext): number | null {
  const templateType = normalise(template.tripType);
  const tripType = normalise(trip.tripType);
  if (!templateType || !tripType) return null;
  return templateType === tripType ? 1 : 0;
}

/**
 * Whether children are along changes the whole shape of a trip. Only the
 * itinerary-backed templates record a child count, so legacy rows abstain.
 */
function childrenScore(template: TemplateCandidate, trip: TripContext): number | null {
  if (template.children === null || template.children === undefined) return null;
  return template.children > 0 === trip.children > 0 ? 1 : 0;
}

function seasonScore(template: TemplateCandidate, trip: TripContext): number | null {
  if (template.startMonth === null || template.startMonth === undefined) return null;
  if (!trip.startDate) return null;

  const tripMonth = new Date(trip.startDate).getMonth();
  if (Number.isNaN(tripMonth)) return null;

  const distance = monthDistance(template.startMonth, tripMonth);
  if (distance === 0) return 1;
  if (distance === 1) return 0.6;
  if (distance === 2) return 0.3;
  return 0;
}

/** Saturating: the difference between 0 and 3 uses matters, 20 and 30 doesn't. */
function usageScore(template: TemplateCandidate): number | null {
  if (template.usageCount === null || template.usageCount === undefined) return null;
  return Math.min(1, Math.log1p(template.usageCount) / Math.log(11));
}

function recencyScore(template: TemplateCandidate): number | null {
  if (!template.createdAt) return null;
  const age = Date.now() - new Date(template.createdAt).getTime();
  if (Number.isNaN(age)) return null;
  const halfYear = 180 * 24 * 60 * 60 * 1000;
  return Math.max(0, 1 - age / halfYear);
}

function ownershipScore(template: TemplateCandidate, trip: TripContext): number | null {
  if (trip.currentUserId && template.createdById === trip.currentUserId) return 1;
  if (trip.branchId && template.branchId === trip.branchId) return 0.6;
  if (template.isGlobal) return 0.4;
  return null;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Scores one template, or returns null when a gate rejects it.
 * Exported so the weights can be exercised directly in tests.
 */
export function scoreTemplate(
  template: TemplateCandidate,
  trip: TripContext
): TemplateMatch | null {
  // Gate 1 — wrong place.
  if (!destinationMatches(trip.destination, template.destination)) return null;

  // Gate 2 — too far from the right length to reshape sensibly.
  const dayDelta = template.dayCount - trip.dayCount;
  if (Math.abs(dayDelta) > MAX_DAY_DELTA) return null;
  if (template.dayCount < 1) return null;

  const signals: { key: keyof typeof WEIGHTS; score: number | null }[] = [
    { key: 'duration', score: durationScore(dayDelta) },
    { key: 'paxBand', score: paxScore(template, trip) },
    { key: 'tripType', score: tripTypeScore(template, trip) },
    { key: 'children', score: childrenScore(template, trip) },
    { key: 'season', score: seasonScore(template, trip) },
    { key: 'usage', score: usageScore(template) },
    { key: 'recency', score: recencyScore(template) },
    { key: 'ownership', score: ownershipScore(template, trip) },
  ];

  let weighted = 0;
  let answeredWeight = 0;
  for (const signal of signals) {
    if (signal.score === null) continue;
    weighted += WEIGHTS[signal.key] * signal.score;
    answeredWeight += WEIGHTS[signal.key];
  }
  if (answeredWeight === 0) return null;

  // Unanswered weight counts at the prior, so a template is measured against
  // the full model rather than only the parts it happens to fill in.
  const score = (weighted + (TOTAL_WEIGHT - answeredWeight) * NEUTRAL_PRIOR) / TOTAL_WEIGHT;

  return {
    template,
    score,
    reasons: buildReasons(template, trip, dayDelta),
    dayDelta,
  };
}

/** The "why this one" lines, strongest evidence first. */
function buildReasons(template: TemplateCandidate, trip: TripContext, dayDelta: number): string[] {
  const reasons: string[] = [];

  if (dayDelta === 0) {
    reasons.push(`Same ${template.dayCount}-day length`);
  } else {
    const nights = Math.abs(dayDelta);
    reasons.push(
      dayDelta > 0
        ? `${nights} day${nights === 1 ? '' : 's'} longer — will be trimmed`
        : `${nights} day${nights === 1 ? '' : 's'} shorter — free days added`
    );
  }

  if (tripTypeScore(template, trip) === 1 && template.tripType) {
    reasons.push(`Same trip type`);
  }

  if (paxScore(template, trip) === 1 && template.totalTravelers) {
    reasons.push(`Built for ${template.totalTravelers} travellers`);
  }

  if (childrenScore(template, trip) === 1 && trip.children > 0) {
    reasons.push('Includes children');
  }

  if (seasonScore(template, trip) === 1 && template.startMonth != null) {
    const month = new Date(2000, template.startMonth, 1).toLocaleString('en-GB', {
      month: 'long',
    });
    reasons.push(`Same season (${month})`);
  }

  if (template.usageCount && template.usageCount > 0) {
    reasons.push(`Used ${template.usageCount}×`);
  }

  return reasons;
}

/**
 * Why nothing was suggested — so the UI can say which gate emptied the list
 * instead of rendering a blank space that looks like a broken feature.
 */
export interface NoMatchReason {
  /** Templates in the library at all. */
  total: number;
  /** Of those, how many are for this trip's destination. */
  sameDestination: number;
  /** Of those, how many are close enough in length to reshape. */
  withinDuration: number;
}

export function explainNoMatches(
  candidates: TemplateCandidate[],
  trip: TripContext
): NoMatchReason {
  const sameDestination = candidates.filter(candidate =>
    destinationMatches(trip.destination, candidate.destination)
  );
  const withinDuration = sameDestination.filter(
    candidate => Math.abs(candidate.dayCount - trip.dayCount) <= MAX_DAY_DELTA
  );

  return {
    total: candidates.length,
    sameDestination: sameDestination.length,
    withinDuration: withinDuration.length,
  };
}

/** Ranks the whole library, dropping gated-out and low-confidence candidates. */
export function suggestTemplates(
  candidates: TemplateCandidate[],
  trip: TripContext,
  limit = MAX_SUGGESTIONS
): TemplateMatch[] {
  if (!trip.destination || trip.dayCount < 1) return [];

  return candidates
    .map(candidate => scoreTemplate(candidate, trip))
    .filter((match): match is TemplateMatch => match !== null && match.score >= MIN_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Equal fit: prefer the one that needs no reshaping at all.
      return Math.abs(a.dayDelta) - Math.abs(b.dayDelta);
    })
    .slice(0, limit);
}
