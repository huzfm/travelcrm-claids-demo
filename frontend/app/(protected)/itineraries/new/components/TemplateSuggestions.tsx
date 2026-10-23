'use client';

import { Sparkles, Calendar, Users, MapPin, Wand2, ChevronRight, PencilRuler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTemplateSuggestions } from '@/hooks/use-template-suggestions';
import {
  MAX_DAY_DELTA,
  type NoMatchReason,
  type TemplateCandidate,
  type TemplateMatch,
  type TripContext,
} from '@/lib/itinerary-template-match';

function confidenceLabel(score: number): { label: string; className: string } {
  if (score >= 0.8) return { label: 'Strong match', className: 'bg-neutral-100 text-neutral-700' };
  if (score >= 0.62) return { label: 'Good match', className: 'bg-primary/10 text-primary' };
  return { label: 'Close match', className: 'bg-muted text-muted-foreground' };
}

function SuggestionCard({
  match,
  onApply,
}: {
  match: TemplateMatch;
  onApply: (template: TemplateCandidate, match: TemplateMatch) => void;
}) {
  const { template, score, reasons } = match;
  const confidence = confidenceLabel(score);

  return (
    <Card className="flex flex-col overflow-hidden hover:translate-y-0 hover:border-primary/40">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{template.name}</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {template.destination}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              confidence.className
            )}
          >
            {Math.round(score * 100)}%
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {template.dayCount} day{template.dayCount === 1 ? '' : 's'}
          </span>
          {template.totalTravelers ? (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {template.totalTravelers}
            </span>
          ) : null}
          {template.createdByName ? (
            <span className="truncate">by {template.createdByName}</span>
          ) : null}
        </div>

        <ul className="flex-1 space-y-1">
          {reasons.slice(0, 4).map((reason, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <span className="min-w-0">{reason}</span>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          size="sm"
          className="w-full gap-2"
          onClick={() => onApply(template, match)}
        >
          <Wand2 className="h-3.5 w-3.5" />
          Use this template
        </Button>
      </CardContent>
    </Card>
  );
}

/** Says which gate emptied the list, so a blank area never looks like a bug. */
function whyNothing(reason: NoMatchReason, trip: TripContext): string {
  const { total, sameDestination, withinDuration } = reason;

  if (total === 0) {
    return 'No saved templates yet — save an itinerary as a template and it will be offered for similar trips.';
  }
  if (sameDestination === 0) {
    return `None of your ${total} saved template${total === 1 ? '' : 's'} are for ${trip.destination}.`;
  }
  if (withinDuration === 0) {
    return `${sameDestination} template${sameDestination === 1 ? '' : 's'} for ${trip.destination}, but none within ${MAX_DAY_DELTA} days of a ${trip.dayCount}-day trip.`;
  }
  return `${withinDuration} template${withinDuration === 1 ? '' : 's'} for ${trip.destination} were too different from this trip to suggest.`;
}

/**
 * The one-line note shown above the day planner when nothing matched. Empty
 * space reads as a broken feature, so it always says which gate emptied the
 * list rather than rendering nothing.
 */
export function TemplateNoMatchNote({ trip }: { trip: TripContext | null }) {
  const { suggestions, isLoading, noMatchReason } = useTemplateSuggestions(trip);

  if (!trip || isLoading || suggestions.length > 0 || !noMatchReason) return null;

  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{whyNothing(noMatchReason, trip)}</span>
    </p>
  );
}

/**
 * A step of its own between choosing the package mode and building the days:
 * start from a past itinerary that fits, or build from scratch.
 *
 * Only reached when there is something to offer — the caller checks first, so
 * an agent with no matching templates never sees an extra click.
 */
export function TemplateSuggestionPage({
  trip,
  onApply,
  onSkip,
}: {
  trip: TripContext | null;
  onApply: (template: TemplateCandidate, match: TemplateMatch) => void;
  onSkip: () => void;
}) {
  const { suggestions } = useTemplateSuggestions(trip);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-2 text-center">
        <div className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold sm:text-2xl">Start from a past itinerary?</h1>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">
          {suggestions.length} saved{' '}
          {suggestions.length === 1 ? 'itinerary matches' : 'itineraries match'} this trip
          {trip
            ? ` — ${trip.destination}, ${trip.dayCount} days, ${trip.totalTravelers} travellers`
            : ''}
          . Everything stays editable afterwards.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map(match => (
          <SuggestionCard key={match.template.id} match={match} onApply={onApply} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button type="button" variant="outline" size="lg" className="gap-2" onClick={onSkip}>
          <PencilRuler className="h-4 w-4" />
          Build the days from scratch
        </Button>
        {/* A div, not a p: Badge renders a div, which a <p> may not contain. */}
        <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[10px]">
            How
          </Badge>
          <span>
            Ranked by length, party size, trip type, children and season — only the same destination
            is considered.
          </span>
        </div>
      </div>
    </div>
  );
}
