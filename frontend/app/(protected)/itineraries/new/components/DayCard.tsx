'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Check, Hotel, Car, Activity, Sun, MapPin, Coffee } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DayHotelSection } from './DayHotelSection';
import { DayVehicleSection } from './DayVehicleSection';
import { DayActivitiesSection } from './DayActivitiesSection';
import { emptyHotelFields, isDayConfigured, type DayBuilderData, type DayType } from '../types';

interface DayCardProps {
  day: DayBuilderData;
  dayIndex: number;
  onChange: (dayIndex: number, patch: Partial<DayBuilderData>) => void;
  availableHotels?: Array<{
    id: string;
    name?: string;
    roomTypes?: Array<{
      name: string;
      bedType: string;
      basePrice: number;
      extraBedPrice?: number;
      childPrice?: number;
    }>;
    mealPlans?: Array<{ type: string; label: string; pricePerNight: number }>;
    pricePerNight?: number | null;
  }>;
  availableVehicles?: Array<{
    id: string;
    name?: string;
    vehicleType?: string;
    seatingCapacity?: number;
    ratePerDay?: number;
  }>;
  travelers?: number;
  defaultOpen?: boolean;
  /** Hide meal plan and activities sections (used in multi-option mode) */
  hideMealAndActivities?: boolean;
  /** Bumped by the builder's Expand all / Collapse all control. */
  openSignal?: { open: boolean; token: number };
  /** Master destination the trip is scoped to; limits the hotel picker. */
  destinationId?: string;
  destinationLabel?: string;
  /**
   * Which sections to show. Defaults to both, matching every existing caller
   * (e.g. the edit-itinerary flow) exactly. The new-itinerary wizard passes a
   * single-element array to dedicate a whole step to just hotels or just
   * vehicles, per day.
   */
  sections?: Array<'hotel' | 'vehicle'>;
  /**
   * Final day of a multi-day trip — the check-out day. It has no overnight
   * stay, so the hotel picker stays hidden unless the agent opts in.
   */
  isLastDay?: boolean;
  /** Every day of the trip, for picking the other nights at this day's hotel. */
  allDays?: DayBuilderData[];
}

// ─── Simple Destination Input ──────────────────────────────────────────────
function SimpleDestinationInput({
  day,
  onChange,
}: {
  day: DayBuilderData;
  onChange: (patch: Partial<DayBuilderData>) => void;
}) {
  return (
    <Input
      value={day.destination || day.location || ''}
      onChange={e =>
        onChange({
          destination: e.target.value,
          location: e.target.value,
          destinationId: '',
          destinationAddress: '',
          destinationHighlights: [],
          destinationShortDescription: '',
          destinationDescription: '',
          destinationAmenities: [],
          destinationBestTimeToVisit: '',
          destinationAverageTemperature: '',
          destinationLanguage: '',
          destinationCurrency: '',
          destinationTimezone: '',
          destinationThingsToKnow: '',
        })
      }
      placeholder="e.g. Arrival in Srinagar, Shikara ride"
      icon={<MapPin className="h-4 w-4" />}
      className="h-10"
    />
  );
}

// ─── Section divider ───────────────────────────────────────────────────────
function DaySection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      </div>
      {children}
    </section>
  );
}

// ─── Status chip shown on the collapsed header ─────────────────────────────
function StatusChip({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <span
      title={label}
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-medium',
        active
          ? 'border-neutral-200 bg-neutral-50 text-neutral-700'
          : 'border-dashed border-border text-muted-foreground/60'
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

export function DayCard({
  day,
  dayIndex,
  onChange,
  availableHotels,
  availableVehicles,
  travelers = 2,
  defaultOpen = false,
  hideMealAndActivities = false,
  openSignal,
  destinationId,
  destinationLabel,
  sections = ['hotel', 'vehicle'],
  isLastDay = false,
  allDays = [],
}: DayCardProps) {
  const showHotel = sections.includes('hotel');
  // Check-out day: no hotel by default. A hotel already on the day (e.g. from a
  // template or an edit) keeps the picker visible so it can still be changed.
  const [wantsLastDayHotel, setWantsLastDayHotel] = useState(false);
  const hotelOptional = isLastDay && !day.hotelId && !wantsLastDayHotel;
  const showVehicle = sections.includes('vehicle');
  // True for every existing caller (both sections requested, the default) —
  // false only in the new wizard's dedicated hotel-only / vehicle-only steps,
  // where day type, the day title, activities and notes are set elsewhere.
  const isFullDayView = sections.length === 2;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Follow the builder's Expand all / Collapse all, but only when it is
  // actually clicked — the token changes, the boolean alone may not, and the
  // day stays independently collapsible in between. Adjusting state during
  // render is React's documented answer here; an effect would paint the stale
  // state first and cost a second pass over every day in the trip.
  const [seenToken, setSeenToken] = useState(openSignal?.token);
  if (openSignal && openSignal.token !== seenToken) {
    setSeenToken(openSignal.token);
    setIsOpen(openSignal.open);
  }

  const handleChange = (patch: Partial<DayBuilderData>) => {
    onChange(dayIndex, patch);
  };

  const isLeisure = day.dayType === 'leisure';
  const dayDate = day.date ? format(new Date(day.date), 'EEE, MMM d') : null;
  const title = (day.destination || day.location || '').trim();
  const hasHotel = Boolean(day.hotelId);
  const hasVehicle = Boolean(day.vehicleId);
  // The check-out day has no overnight stay, so it isn't offered — unless it
  // is already ticked, so that tick can still be removed.
  const lastIndex = allDays.length - 1;
  const laterDays = allDays
    .map((other, index) => ({ other, index }))
    .filter(
      ({ other, index }) =>
        index > dayIndex &&
        (index < lastIndex || other.hotelFromDay === day.dayNumber)
    );
  const activityCount = day.activities.length;
  const isConfigured = isDayConfigured(day);

  // Collapsed cards show what's already picked, so a long trip can be scanned
  // without opening every day.
  const summary = [
    day.hotelName || null,
    day.vehicleName || null,
    activityCount > 0 ? `${activityCount} activit${activityCount === 1 ? 'y' : 'ies'}` : null,
  ].filter(Boolean) as string[];

  return (
    <Card
      className={cn(
        // Card lifts and re-shadows on hover by default; in a list of days that
        // makes every row twitch as the pointer travels down it.
        'transition-colors hover:translate-y-0 hover:shadow-brand',
        // Clipped only while collapsed, so the header's hover background stays
        // inside the rounded corners. Left open while expanded, or the hotel
        // picker's dropdown (an absolutely-positioned panel) gets cut off by
        // this card's own edge instead of floating over the rest of the page.
        !isOpen && 'overflow-hidden',
        isOpen
          ? 'border-primary/40 hover:border-primary/40'
          : isConfigured
            ? 'border-neutral-200 hover:border-neutral-200'
            : 'hover:border-border'
      )}
    >
      {/* Header — click to expand */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-3 rounded-t-xl p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:p-4',
          isOpen ? 'bg-muted/40' : 'hover:bg-muted/30'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors',
              isLeisure
                ? 'bg-red-100 text-red-700'
                : isConfigured
                  ? 'bg-neutral-500 text-white'
                  : 'bg-primary/10 text-primary'
            )}
          >
            {isLeisure ? (
              <Sun className="h-4 w-4" />
            ) : isConfigured ? (
              <Check className="h-4 w-4" />
            ) : (
              day.dayNumber
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                Day {day.dayNumber}
              </span>
              <p className="truncate text-sm font-semibold">
                {isLeisure ? 'Leisure Day' : title || 'Untitled day'}
              </p>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {[dayDate, ...summary].filter(Boolean).join(' · ') || 'Nothing planned yet'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-1 sm:flex">
            <StatusChip icon={Hotel} label="Hotel" active={hasHotel} />
            <StatusChip icon={Car} label="Vehicle" active={hasVehicle} />
            {!hideMealAndActivities && (
              <StatusChip
                icon={Activity}
                label={activityCount > 0 ? `${activityCount}` : 'Activities'}
                active={activityCount > 0}
              />
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="space-y-4 border-t p-3 sm:p-4">
          {/* Multi-night stays: pick the hotel once here and tick the other
              nights spent in it. Kept at the top so it's seen straight away. */}
          {showHotel && hasHotel && !day.hotelFromDay && laterDays.length > 0 && (
            <div className="space-y-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4 shrink-0 text-primary" />
                <p className="min-w-0 text-sm font-semibold">
                  Stay at <span className="text-primary">{day.hotelName}</span> on other nights too?
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {laterDays.map(({ other, index }) => {
                  const checked = other.hotelFromDay === day.dayNumber;
                  // A night already sharing another day's hotel, or one other
                  // nights share, has to be changed on its own card.
                  const lockedReason = checked
                    ? undefined
                    : other.hotelFromDay
                      ? `Already the same hotel as Day ${other.hotelFromDay}`
                      : allDays.some(d => d.hotelFromDay === other.dayNumber)
                        ? `Other nights share Day ${other.dayNumber}'s hotel`
                        : undefined;
                  return (
                    <label
                      key={other.dayNumber}
                      title={lockedReason}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        checked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-primary/30 bg-background text-foreground hover:border-primary/60',
                        lockedReason ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={Boolean(lockedReason)}
                        onChange={e =>
                          onChange(
                            index,
                            e.target.checked
                              ? { hotelFromDay: day.dayNumber }
                              : // Unticking takes the night off this hotel. Only
                                // the link used to be dropped, so the copied
                                // hotel stayed on the night (and in the price).
                                { hotelFromDay: undefined, ...emptyHotelFields() }
                          )
                        }
                        className="h-3.5 w-3.5 rounded border-border accent-current"
                      />
                      Day {other.dayNumber}
                      {other.date && (
                        <span className="font-normal opacity-75">
                          {format(new Date(other.date), 'MMM d')}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day type — segmented control. Hidden in a hotel-only/vehicle-only
              step: it's set once, in the destination & activities step. */}
          {isFullDayView && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Day Type</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {(['activity', 'leisure'] as DayType[]).map(type => {
                  const active = day.dayType === type;
                  const TypeIcon = type === 'activity' ? Activity : Coffee;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleChange({ dayType: type })}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        active
                          ? type === 'leisure'
                            ? 'bg-background text-red-700 shadow-sm'
                            : 'bg-background text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <TypeIcon className="h-3.5 w-3.5" />
                      {type === 'activity' ? 'Activity Day' : 'Leisure / Rest'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isFullDayView && !isLeisure && (
            <DaySection title="Day Title" icon={MapPin}>
              <SimpleDestinationInput day={day} onChange={handleChange} />
            </DaySection>
          )}

          {showHotel && (
            <DaySection title="Hotel" icon={Hotel}>
              {day.hotelFromDay ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary">
                      Same hotel as Day {day.hotelFromDay}
                    </p>
                    <p className="truncate text-sm font-medium">{day.hotelName}</p>
                    {(day.roomType || day.mealPlanLabel) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {[day.roomType, day.mealPlanLabel].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {/* Keeps the copied stay as a starting point to edit. */}
                  <button
                    type="button"
                    onClick={() => handleChange({ hotelFromDay: undefined })}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Change hotel
                  </button>
                </div>
              ) : hotelOptional ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5">
                  <p className="text-sm text-muted-foreground">Check-out day, no hotel needed</p>
                  <button
                    type="button"
                    onClick={() => setWantsLastDayHotel(true)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Add hotel
                  </button>
                </div>
              ) : (
                <DayHotelSection
                  day={day}
                  onChange={handleChange}
                  availableHotels={availableHotels}
                  hideMealPlan={hideMealAndActivities}
                  destinationId={destinationId}
                  destinationLabel={destinationLabel}
                />
              )}
            </DaySection>
          )}

          {showVehicle && (
            <DaySection title="Vehicle" icon={Car}>
              <DayVehicleSection
                day={day}
                onChange={handleChange}
                availableVehicles={availableVehicles}
                travelers={travelers}
                isLeisureDay={isLeisure}
              />
            </DaySection>
          )}

          {isFullDayView && !isLeisure && !hideMealAndActivities && (
            <DaySection title="Activities" icon={Activity}>
              <DayActivitiesSection
                activities={day.activities}
                onChange={acts => handleChange({ activities: acts })}
              />
            </DaySection>
          )}

          {isFullDayView && (
            <DaySection title="Notes" icon={Coffee}>
              <div className="grid gap-3 sm:grid-cols-2">
                {isLeisure && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                    <Textarea
                      value={day.description}
                      onChange={e => handleChange({ description: e.target.value })}
                      placeholder="e.g. Free day to explore at your own pace…"
                      className="min-h-[72px] text-sm"
                    />
                  </div>
                )}
                <div className={cn('space-y-1.5', !isLeisure && 'sm:col-span-2')}>
                  <Label className="text-xs text-muted-foreground">Internal notes (optional)</Label>
                  <Textarea
                    value={day.notes}
                    onChange={e => handleChange({ notes: e.target.value })}
                    placeholder="Anything the team should know about this day…"
                    className="min-h-[72px] text-sm"
                  />
                </div>
              </div>
            </DaySection>
          )}
        </div>
      )}
    </Card>
  );
}
