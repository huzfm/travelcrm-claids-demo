'use client';

import { Bed, Car, ChevronDown, MapPin, Palmtree, Sparkles, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import type { ItineraryDay } from '@/types/itinerary.types';

interface DayOverviewStripProps {
  day: ItineraryDay;
  formatDate: (date: string) => string;
  dayCost: number;
  currency?: string;
  isExpanded?: boolean;
}

/**
 * What a day contains, at a glance.
 *
 * Every chip is either filled in or greyed out, so a half-built day is obvious
 * without opening it.
 */
function Chip({
  icon: Icon,
  label,
  filled,
}: {
  icon: typeof Bed;
  label: string;
  filled: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-[11rem] items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        filled
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground/60 ring-1 ring-inset ring-border'
      )}
      title={label}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function DayOverviewStrip({
  day,
  formatDate,
  dayCost,
  currency = 'INR',
  isExpanded = false,
}: DayOverviewStripProps) {
  const isLeisure = day.dayType === 'leisure';
  const hasHotel = !!day.hotel;
  const hasVehicle = !!day.vehicleName;
  const mealCount = [day.meals?.breakfast, day.meals?.lunch, day.meals?.dinner].filter(
    Boolean
  ).length;
  const activityCount = day.activities?.length ?? 0;
  const place = day.destination || day.activitiesLocation;

  return (
    <div className="flex items-center gap-3 py-3.5">
      {/* Day number */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-sm font-bold shadow-sm',
          isLeisure ? 'bg-gold/20 text-gold-dark' : 'bg-primary text-primary-foreground'
        )}
      >
        {day.dayNumber}
      </div>

      {/* Title, date and contents */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-foreground">
            {day.title || `Day ${day.dayNumber}`}
          </span>
          {day.date && (
            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(day.date)}</span>
          )}
          {isLeisure && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold-dark">
              <Palmtree className="h-3 w-3" />
              Leisure
            </span>
          )}
        </div>

        {(day.description || place) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {place ? `${place}${day.description ? ' · ' : ''}` : ''}
            {day.description}
          </p>
        )}

        {/* Contents — the old markup hid this behind an `xs:` breakpoint that
            this project never defines, so it was invisible at every width. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {place && <Chip icon={MapPin} label={place} filled />}
          <Chip icon={Bed} label={hasHotel ? day.hotel! : 'No hotel'} filled={hasHotel} />
          <Chip
            icon={Car}
            label={hasVehicle ? day.vehicleName! : 'No transport'}
            filled={hasVehicle}
          />
          {mealCount > 0 && (
            <Chip
              icon={UtensilsCrossed}
              label={`${mealCount} meal${mealCount > 1 ? 's' : ''}`}
              filled
            />
          )}
          {activityCount > 0 && (
            <Chip
              icon={Sparkles}
              label={`${activityCount} activit${activityCount > 1 ? 'ies' : 'y'}`}
              filled
            />
          )}
        </div>
      </div>

      {/* Cost and the expand affordance */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {dayCost > 0 && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Day cost</p>
            <p className="text-sm font-semibold tabular-nums">{formatCurrency(dayCost, currency)}</p>
          </div>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </div>
    </div>
  );
}
