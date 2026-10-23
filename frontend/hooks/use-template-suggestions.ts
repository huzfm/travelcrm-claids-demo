'use client';

import { useMemo } from 'react';
import { useItineraryTemplates, useTemplateUsage } from './useItineraries';
import {
  explainNoMatches,
  suggestTemplates,
  type NoMatchReason,
  type TemplateCandidate,
  type TemplateMatch,
  type TripContext,
} from '@/lib/itinerary-template-match';

function dayCountOf(daysJson: unknown): number {
  if (Array.isArray(daysJson)) return daysJson.length;
  if (typeof daysJson === 'string') {
    try {
      const parsed = JSON.parse(daysJson);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

function daysArrayOf(daysJson: unknown): unknown[] {
  if (Array.isArray(daysJson)) return daysJson;
  if (typeof daysJson === 'string') {
    try {
      const parsed = JSON.parse(daysJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function monthOf(date?: string | null): number | null {
  if (!date) return null;
  const month = new Date(date).getMonth();
  return Number.isNaN(month) ? null : month;
}

/**
 * Flattens the two kinds of template into one shape the scorer understands.
 *
 * `ItineraryTemplate` rows are the legacy library and carry far less — no
 * adults/children split, no cost. They deliberately leave those fields null
 * rather than guessing, so the scorer can abstain on them.
 */
function toCandidates(
  templates: Record<string, any>[],
  templateItineraries: Record<string, any>[],
  usage: Record<string, number> | undefined
): TemplateCandidate[] {
  // Until the counts land, every template abstains on the signal rather than
  // reporting a misleading zero.
  const usageOf = (id: string): number | null => (usage ? (usage[id] ?? 0) : null);
  const legacy: TemplateCandidate[] = templates.map(t => ({
    id: t.id,
    name: t.name || 'Untitled template',
    destination: t.destination || '',
    tripType: t.tripType ?? null,
    dayCount: dayCountOf(t.daysJson),
    totalTravelers: t.totalTravelers ?? null,
    adults: null,
    children: null,
    totalCost: null,
    currency: null,
    startMonth: monthOf(t.startDate),
    createdAt: t.createdAt ?? null,
    createdById: t.createdBy ?? null,
    createdByName: t.creator?.name ?? null,
    branchId: t.branchId ?? null,
    isGlobal: Boolean(t.isGlobal),
    usageCount: usageOf(t.id),
    source: 'template',
    daysJson: daysArrayOf(t.daysJson),
  }));

  const fromItineraries: TemplateCandidate[] = templateItineraries.map(t => ({
    id: t.id,
    name: t.templateName || t.title || 'Untitled template',
    destination: t.destination || '',
    tripType: t.tripType ?? null,
    dayCount: dayCountOf(t.daysJson),
    totalTravelers: t.totalTravelers ?? null,
    adults: t.adults ?? null,
    children: t.children ?? null,
    totalCost: t.totalCost ?? null,
    currency: t.currency ?? null,
    startMonth: monthOf(t.startDate),
    createdAt: t.createdAt ?? null,
    createdById: t.createdBy ?? null,
    createdByName: t.creator?.name ?? null,
    branchId: t.branchId ?? null,
    isGlobal: false,
    usageCount: usageOf(t.id),
    source: 'itinerary',
    daysJson: daysArrayOf(t.daysJson),
  }));

  return [...fromItineraries, ...legacy].filter(c => c.dayCount > 0 && c.destination);
}

/**
 * Templates worth offering for the trip being built, best first. Returns an
 * empty list rather than weak matches — a bad suggestion costs more attention
 * than no suggestion.
 */
export function useTemplateSuggestions(trip: TripContext | null): {
  suggestions: TemplateMatch[];
  isLoading: boolean;
  libraryCount: number;
  /** Populated only when there is nothing to suggest. */
  noMatchReason: NoMatchReason | null;
} {
  const { data, isLoading } = useItineraryTemplates();
  // Ranking does not wait on this: if the counts are slow or fail, the usage
  // signal simply abstains and the other seven still rank the library.
  const { data: usage } = useTemplateUsage();

  const candidates = useMemo(
    () => toCandidates(data?.templates || [], data?.templateItineraries || [], usage),
    [data, usage]
  );

  const suggestions = useMemo(
    () => (trip ? suggestTemplates(candidates, trip) : []),
    [candidates, trip]
  );

  const noMatchReason = useMemo(
    () => (trip && suggestions.length === 0 ? explainNoMatches(candidates, trip) : null),
    [candidates, trip, suggestions.length]
  );

  return { suggestions, isLoading, libraryCount: candidates.length, noMatchReason };
}
