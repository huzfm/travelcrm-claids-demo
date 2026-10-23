'use client';

import { CalendarDays, Check, Layers, MapPin, Moon, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ItineraryOption } from '@/types';

interface Quote {
  label: string;
  description?: string;
  totalCost: number;
  features?: string[];
}

interface TripSummaryCardProps {
  daysCount: number;
  travelers: number;
  /** Pre-formatted total, e.g. "₹84,500". Empty when there is nothing to show. */
  budget?: string;
  startDate?: string;
  endDate?: string;
  formatDate: (date: string) => string;
  destination?: string;
  quotes?: Quote[];
  options?: ItineraryOption[];
  selectedQuoteIndex?: number;
  selectedOptionIndex?: number;
  onSelectQuote?: (index: number) => void;
  onSelectOption?: (index: number) => void;
}

/** One tile in the summary grid. */
function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
      <div
        className={cn(
          'mt-0.5 shrink-0 rounded-lg p-2',
          accent ? 'bg-gold/15 text-gold-dark' : 'bg-primary/10 text-primary'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function TripSummaryCard({
  daysCount,
  travelers,
  budget,
  startDate,
  endDate,
  formatDate,
  destination,
  quotes = [],
  options = [],
  selectedQuoteIndex,
  selectedOptionIndex,
  onSelectQuote,
  onSelectOption,
}: TripSummaryCardProps) {
  // Options take precedence over the legacy quotes when both are present.
  const displayOptions = options.length > 0 ? options : quotes;
  const hasMultiOptions = displayOptions.length > 1;
  const selectedIndex = options.length > 0 ? selectedOptionIndex : selectedQuoteIndex;
  const onSelect = options.length > 0 ? onSelectOption : onSelectQuote;

  const nights = Math.max(0, daysCount - 1);
  const withYear = (value: string) =>
    new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const dateRange = startDate
    ? endDate
      ? `${formatDate(startDate)} – ${withYear(endDate)}`
      : withYear(startDate)
    : 'Not set';

  return (
    <Card className="mb-6 overflow-hidden hover:translate-y-0">
      <CardContent className="p-4 sm:p-5">
        <div
          className={cn(
            'grid grid-cols-1 gap-3 sm:grid-cols-2',
            budget ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
          )}
        >
          <Stat icon={MapPin} label="Destination" value={destination || 'Not set'} />
          <Stat icon={CalendarDays} label="Dates" value={dateRange} />
          <Stat
            icon={Moon}
            label="Duration"
            value={`${daysCount} ${daysCount === 1 ? 'day' : 'days'}${
              nights > 0 ? ` · ${nights} ${nights === 1 ? 'night' : 'nights'}` : ''
            }`}
          />
          <Stat
            icon={Users}
            label="Travellers"
            value={`${travelers} ${travelers === 1 ? 'traveller' : 'travellers'}`}
          />
          {budget && <Stat icon={Wallet} label="Package total" value={budget} accent />}
        </div>

        {/* Package options — picking one re-renders the days below */}
        {hasMultiOptions && (
          <div className="mt-5 border-t pt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {options.length > 0 ? 'Package Options' : 'Pricing Options'}
              </span>
              <Badge variant="outline" className="font-normal">
                {displayOptions.length} available
              </Badge>
              <span className="text-xs text-muted-foreground">
                Select one to preview its days
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayOptions.map((opt, i) => {
                const isSelected = selectedIndex === i;
                const label =
                  'name' in opt ? opt.name : 'label' in opt ? opt.label : `Option ${i + 1}`;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelect?.(i)}
                    disabled={!onSelect}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative flex items-center justify-between gap-2 rounded-xl border-2 p-4 text-left transition-all',
                      onSelect ? 'cursor-pointer' : 'cursor-default',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-brand'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    <span
                      className={cn(
                        'truncate text-base font-semibold',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {label || `Option ${i + 1}`}
                    </span>

                    {/* Only the selected card says so — the others stay quiet */}
                    {isSelected && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                        <Check className="h-3 w-3" />
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
