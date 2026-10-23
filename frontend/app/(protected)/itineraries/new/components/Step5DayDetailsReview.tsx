'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ChevronRight,
  Hotel,
  Car,
  MapPin,
  Activity,
  Plus,
  X,
  Palmtree,
  Coffee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CopyReservationButton } from '@/components/itinerary/copy-reservation-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DestinationSelector,
  type SelectedDestination,
} from '@/components/destinations/destination-selector';
import { useMasterDestinationId } from '@/hooks/use-master-destination';
import { useAuthContext } from '@/components/providers';
import { usePdfSettings } from '@/hooks/useSettings';
import { getCurrencySymbol } from '@/data/currencies';
import type { DayBuilderData, OptionBuilder, ActivityItem, DayType } from '../types';
import { generateId } from '../types';
import {
  groupHotelStays,
  type HotelStayGroup,
  type ReservationGuest,
  type ReservationCompany,
} from '../utils/reservationEmail';

/**
 * Which of a day's sections to show. Omitted (the default, used by the
 * edit-itinerary flow) shows Destination + Hotel + Vehicle + Activities
 * together exactly as before. The new-itinerary wizard passes one value to
 * dedicate a whole step to just that concern, across every day.
 */
export type DayDetailsFocusSection = 'destination' | 'hotel' | 'vehicle';

/** The day type toggle — lifted out of DayCard.tsx so the focused "destination
 *  & activities" step can set it without pulling in DayCard's hotel/vehicle UI. */
function DayTypeToggle({
  day,
  onChange,
}: {
  day: DayBuilderData;
  onChange: (patch: Partial<DayBuilderData>) => void;
}) {
  return (
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
              onClick={() => onChange({ dayType: type })}
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
  );
}


// ─── Small shared pieces ──────────────────────────────────────────────────────

function DestinationDotIndicator() {
  return (
    <span className="relative mr-1 inline-flex">
      <span className="flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
    </span>
  );
}

/** Icon, label and a rule — separates the parts of one day. */
function DetailSection({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        {count != null && count > 0 && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
            {count}
          </Badge>
        )}
      </div>
      {children}
    </section>
  );
}

/** A read-only fact row: what was chosen back in the planner. */
function ReadOnlyFacts({ title, facts }: { title: string; facts: string[] }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
      <p className="text-sm font-medium">{title}</p>
      {facts.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {facts.map((fact, idx) => (
            <span key={idx}>{fact}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Nothing was picked for this part of a rest day. */
function EmptySlot({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-red-300 bg-red-50/60 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-red-500">{icon}</span>
        <div>
          <p className="text-[13px] font-medium text-red-700">{title}</p>
          <p className="mt-0.5 text-[12px] text-red-600">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Section Header Component (multi-option editor) ───────────────────────────
function DestinationSectionHeader() {
  return (
    <div className="mb-3">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <MapPin className="h-3 w-3" /> Destination
      </p>
      <div className="mt-1.5 h-px bg-border/60" />
    </div>
  );
}

// ─── Leisure Day Message Box ───────────────────────────────────────────────────
interface LeisureMessageProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function LeisureMessage({ icon, title, subtitle }: LeisureMessageProps) {
  return <EmptySlot icon={icon} title={title} subtitle={subtitle} />;
}

// ─── Leisure Day Badge for Collapsed Header ──────────────────────────────────
function LeisureDayBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
      <Palmtree className="h-3 w-3" />
      Leisure
    </span>
  );
}

// ─── Collapsed Badge with Destination ─────────────────────────────────────────
function DestinationBadge({ name }: { name: string }) {
  const truncated = name.length > 12 ? name.slice(0, 12) + '…' : name;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      <MapPin className="h-3 w-3" />
      {truncated}
    </span>
  );
}

// ─── Single Option Day Detail Editor ───────────────────────────────────────────

function SingleDayEditor({
  day,
  _dayIndex,
  onChange,
  masterDestinationId,
  masterDestinationName,
  currency,
  focusSection,
  stay,
  tripId,
  guest,
  company,
}: {
  day: DayBuilderData;
  _dayIndex: number;
  onChange: (patch: Partial<DayBuilderData>) => void;
  masterDestinationId?: string;
  masterDestinationName?: string;
  currency: string;
  focusSection?: DayDetailsFocusSection;
  /** Set only on the first night of a hotel stay — shows the copy button. */
  stay?: HotelStayGroup;
  tripId?: string;
  guest?: ReservationGuest;
  company?: ReservationCompany;
}) {
  const showDestination = !focusSection || focusSection === 'destination';
  const showHotel = !focusSection || focusSection === 'hotel';
  const showVehicle = !focusSection || focusSection === 'vehicle';
  const showActivities = !focusSection || focusSection === 'destination';
  const [expanded, setExpanded] = useState(false);

  const selectedDestination: SelectedDestination | null = day.destinationId
    ? {
        id: day.destinationId,
        name: day.location || day.destination || '',
        address: day.destinationAddress,
        highlights: day.destinationHighlights,
        shortDescription: day.destinationShortDescription,
        description: day.destinationDescription,
        amenities: day.destinationAmenities,
        bestTimeToVisit: day.destinationBestTimeToVisit,
        averageTemperature: day.destinationAverageTemperature,
        language: day.destinationLanguage,
        currency: day.destinationCurrency,
        timezone: day.destinationTimezone,
        thingsToKnow: day.destinationThingsToKnow,
      }
    : null;

  const handleDestinationChange = (dest: SelectedDestination | null) => {
    if (dest) {
      if (dest.id) {
        onChange({
          destinationId: dest.id,
          destination: dest.name,
          destinationAddress: dest.address,
          destinationHighlights: dest.highlights || [],
          destinationShortDescription: dest.shortDescription,
          destinationDescription: dest.description,
          destinationAmenities: dest.amenities,
          destinationBestTimeToVisit: dest.bestTimeToVisit,
          destinationAverageTemperature: dest.averageTemperature,
          destinationLanguage: dest.language,
          destinationCurrency: dest.currency,
          destinationTimezone: dest.timezone,
          destinationThingsToKnow: dest.thingsToKnow,
          location: dest.name,
        });
      } else {
        onChange({
          destinationId: undefined,
          destination: dest.name,
          destinationAddress: undefined,
          destinationHighlights: [],
          location: dest.name,
        });
      }
    } else {
      onChange({
        destinationId: undefined,
        destination: undefined,
        destinationAddress: undefined,
        destinationHighlights: [],
        location: '',
      });
    }
  };

  const hasDestination = !!day.destinationId;
  const destinationName = day.location || day.destination || '';
  const isLeisure = day.dayType === 'leisure';
  const symbol = getCurrencySymbol(currency);

  // Collapsed cards say what is already in the day, so a long trip can be
  // scanned without opening every one.
  const summary = [
    day.hotelName || null,
    day.vehicleName || null,
    day.activities.length > 0
      ? `${day.activities.length} activit${day.activities.length === 1 ? 'y' : 'ies'}`
      : null,
  ].filter(Boolean) as string[];

  const dayDate = day.date
    ? new Date(day.date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <Card
      className={cn(
        // Cards lift on hover by default; in a list that makes every row twitch.
        'overflow-hidden transition-colors hover:translate-y-0 hover:shadow-brand',
        expanded ? 'border-primary/40 hover:border-primary/40' : 'hover:border-border'
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center justify-between gap-3 p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:p-4',
          expanded ? 'bg-muted/40' : 'hover:bg-muted/30'
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
              isLeisure ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'
            )}
          >
            {isLeisure ? <Palmtree className="h-4 w-4" /> : day.dayNumber}
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                Day {day.dayNumber}
              </span>
              <p className="truncate text-sm font-semibold">
                {destinationName || (isLeisure ? 'Leisure Day' : 'Untitled day')}
              </p>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {[dayDate, ...summary].filter(Boolean).join(' · ') || 'Nothing added yet'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-1.5 sm:flex">
            {isLeisure ? (
              <LeisureDayBadge />
            ) : (
              <>
                {hasDestination && <DestinationBadge name={destinationName} />}
                {day.hotelId && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Hotel className="h-3 w-3" />
                  </Badge>
                )}
                {day.vehicleId && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Car className="h-3 w-3" />
                  </Badge>
                )}
                {day.activities.length > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Activity className="h-3 w-3" />
                    {day.activities.length}
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-90'
            )}
          />
        </div>
      </button>

      {expanded && (
        <div className="max-h-[32rem] space-y-4 overflow-y-auto border-t p-3 sm:p-4">
          {/* Day type — only in the dedicated destination & activities step;
              everywhere else it was already set there. */}
          {focusSection === 'destination' && <DayTypeToggle day={day} onChange={onChange} />}

          {/* Destination — the selector renders the full record once one is
              picked, so there is no separate read-only copy of it here. */}
          {showDestination && (
            <DetailSection title="Destination" icon={MapPin}>
              {isLeisure && !hasDestination && (
                <EmptySlot
                  icon={<span>📍</span>}
                  title="No destination"
                  subtitle="A free day with no fixed destination"
                />
              )}
              <DestinationSelector
                value={selectedDestination}
                onChange={handleDestinationChange}
                placeholder={`Day ${day.dayNumber} — search destination…`}
                showAddressInput={true}
                parentId={masterDestinationId}
                parentName={masterDestinationName}
              />
              {isLeisure && (
                <div className="space-y-1.5 pt-1">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Client guidelines
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">
                      shown in PDF
                    </span>
                  </Label>
                  <textarea
                    className="min-h-[88px] w-full resize-y rounded-lg border bg-background p-3 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Recommended restaurants, spa tips, nearby attractions…"
                    value={day.leisureGuidelines || ''}
                    onChange={e => onChange({ leisureGuidelines: e.target.value })}
                    rows={4}
                  />
                </div>
              )}
            </DetailSection>
          )}

          {/* Hotel — chosen back in the planner, shown here for context */}
          {showHotel && (
            <DetailSection title="Hotel" icon={Hotel}>
              {day.hotelId ? (
                <div className="space-y-2">
                  <ReadOnlyFacts
                    title={day.hotelName}
                    facts={[
                      day.roomType ? `Room: ${day.roomType}` : '',
                      day.mealPlanLabel ? `Meal: ${day.mealPlanLabel}` : '',
                      day.roomCount > 0 ? `Rooms: ${day.roomCount}` : '',
                    ].filter(Boolean)}
                  />
                  {stay && (
                    <CopyReservationButton
                      stay={stay}
                      tripId={tripId}
                      currency={currency}
                      guest={guest || {}}
                      company={company || {}}
                    />
                  )}
                </div>
              ) : (
                <EmptySlot
                  icon={<span>🏨</span>}
                  title="No hotel"
                  subtitle={
                    isLeisure
                      ? 'No accommodation selected for this day'
                      : 'Add one in the day planner if this day needs a stay'
                  }
                />
              )}
            </DetailSection>
          )}

          {/* Vehicle */}
          {showVehicle && (
            <DetailSection title="Vehicle" icon={Car}>
              {day.vehicleId ? (
                <ReadOnlyFacts
                  title={day.vehicleName}
                  facts={[
                    day.vehicleType ? `Type: ${day.vehicleType}` : '',
                    day.ratePerDay > 0 ? `${symbol}${day.ratePerDay.toLocaleString()}/day` : '',
                    day.vehicleCount > 0 ? `Count: ${day.vehicleCount}` : '',
                  ].filter(Boolean)}
                />
              ) : (
                <EmptySlot
                  icon={<span>🚗</span>}
                  title="No vehicle"
                  subtitle={
                    isLeisure
                      ? 'No transport selected for this day'
                      : 'Add one in the day planner if this day needs transport'
                  }
                />
              )}
            </DetailSection>
          )}

          {/* Activities */}
          {showActivities && (
            <DetailSection title="Activities" icon={Activity} count={day.activities.length}>
              {day.activities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {day.activities.map((act, actIdx) => (
                    <div
                      key={act.id || actIdx}
                      className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 py-1.5 pl-2.5 pr-1.5 text-primary"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                        {actIdx + 1}
                      </span>
                      <span className="text-sm font-medium">{act.name}</span>
                      {act.cost !== undefined && act.cost > 0 && (
                        <span className="text-[10px] font-semibold text-neutral-600">
                          · {symbol}
                          {act.cost.toLocaleString()}
                        </span>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${act.name}`}
                        onClick={() => onChange(removeActivityPatch(day, actIdx))}
                        className="ml-0.5 rounded-full p-0.5 text-primary/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <ActivityForm onAdd={newAct => onChange(addActivityPatch(day, newAct))} />
            </DetailSection>
          )}
        </div>
      )}
    </Card>
  );
}

type MultiTabKey = 'destination' | 'hotel' | 'vehicle' | 'activities';

function MultiDayEditor({
  day,
  onChange,
  masterDestinationId,
  masterDestinationName,
  focusSection,
  currency,
  stay,
  tripId,
  guest,
  company,
}: {
  day: DayBuilderData;
  onChange: (patch: Partial<DayBuilderData>) => void;
  masterDestinationId?: string;
  masterDestinationName?: string;
  focusSection?: DayDetailsFocusSection;
  currency?: string;
  /** Set only on the first night of a hotel stay — shows the copy button. */
  stay?: HotelStayGroup;
  tripId?: string;
  guest?: ReservationGuest;
  company?: ReservationCompany;
}) {
  const [activeTab, setActiveTab] = useState<MultiTabKey>(focusSection ?? 'destination');
  const dayDate = day.date
    ? new Date(day.date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : `Day ${day.dayNumber}`;

  const selectedDestination: SelectedDestination | null = day.destinationId
    ? {
        id: day.destinationId,
        name: day.location || day.destination || '',
        address: day.destinationAddress,
        highlights: day.destinationHighlights,
        shortDescription: day.destinationShortDescription,
        description: day.destinationDescription,
        amenities: day.destinationAmenities,
        bestTimeToVisit: day.destinationBestTimeToVisit,
        averageTemperature: day.destinationAverageTemperature,
        language: day.destinationLanguage,
        currency: day.destinationCurrency,
        timezone: day.destinationTimezone,
        thingsToKnow: day.destinationThingsToKnow,
      }
    : null;

  const handleDestinationChange = (dest: SelectedDestination | null) => {
    if (dest) {
      if (dest.id) {
        onChange({
          destinationId: dest.id,
          destination: dest.name,
          destinationAddress: dest.address,
          destinationHighlights: dest.highlights || [],
          destinationShortDescription: dest.shortDescription,
          destinationDescription: dest.description,
          destinationAmenities: dest.amenities,
          destinationBestTimeToVisit: dest.bestTimeToVisit,
          destinationAverageTemperature: dest.averageTemperature,
          destinationLanguage: dest.language,
          destinationCurrency: dest.currency,
          destinationTimezone: dest.timezone,
          destinationThingsToKnow: dest.thingsToKnow,
          location: dest.name,
        });
      } else {
        onChange({
          destinationId: undefined,
          destination: dest.name,
          destinationAddress: undefined,
          destinationHighlights: [],
          location: dest.name,
        });
      }
    } else {
      onChange({
        destinationId: undefined,
        destination: undefined,
        destinationAddress: undefined,
        destinationHighlights: [],
        location: '',
      });
    }
  };

  const hasDestination = !!day.destinationId;
  const destinationName = day.location || day.destination || '';

  const allTabs: { key: MultiTabKey; label: string; icon: React.ReactNode; showDot?: boolean }[] =
    [
      { key: 'destination', label: 'Destination', icon: <MapPin className="h-3 w-3" /> },
      { key: 'hotel', label: 'Hotel', icon: <Hotel className="h-3 w-3" /> },
      { key: 'vehicle', label: 'Vehicle', icon: <Car className="h-3 w-3" /> },
      {
        key: 'activities',
        label: 'Activities',
        icon: <Activity className="h-3 w-3" />,
        showDot: day.activities.length > 0,
      },
    ];
  // Destination and activities travel together in the "destination &
  // activities" step; hotel and vehicle each get their own dedicated step.
  const visibleKeys: MultiTabKey[] | null =
    focusSection === 'destination'
      ? ['destination', 'activities']
      : focusSection === 'hotel'
        ? ['hotel']
        : focusSection === 'vehicle'
          ? ['vehicle']
          : null;
  const tabs = visibleKeys ? allTabs.filter(t => visibleKeys.includes(t.key)) : allTabs;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg shrink-0">
          {day.dayNumber}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base truncate">
            {destinationName || `Day ${day.dayNumber}`}
          </p>
          <p className="text-xs text-muted-foreground">{dayDate}</p>
        </div>
        {/* Destination badge / Leisure badge in header */}
        {day.dayType === 'leisure' ? (
          <LeisureDayBadge />
        ) : (
          hasDestination && <DestinationBadge name={destinationName} />
        )}
      </div>

      {tabs.length > 1 && (
        <div className="flex border-b overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.key === 'destination' && hasDestination && <DestinationDotIndicator />}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {focusSection === 'destination' && (
        <div className="border-b p-4">
          <DayTypeToggle day={day} onChange={onChange} />
        </div>
      )}

      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {activeTab === 'destination' && (
          <div className="space-y-4">
            <DestinationSectionHeader />

            {/* Selected Destination Info Card */}
            {day.destinationId ? (
              <div className="bg-[rgba(219,2,1,0.03)] border border-[rgba(219,2,1,0.12)] rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px]">{destinationName}</p>
                    {day.destinationAddress && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" /> {day.destinationAddress}
                      </p>
                    )}
                    {day.destinationShortDescription && (
                      <p className="text-xs text-muted-foreground bg-white/60 rounded p-2 mt-2">
                        {day.destinationShortDescription}
                      </p>
                    )}
                    {day.destinationHighlights && day.destinationHighlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {day.destinationHighlights.slice(0, 3).map((highlight, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded font-medium"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : day.dayType === 'leisure' ? (
              <div className="space-y-3">
                <LeisureMessage
                  icon={<span>📍</span>}
                  title="No Destination"
                  subtitle="Leisure day — free day with no fixed destination"
                />
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                    Client Guidelines
                    <span className="text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                      shown in PDF
                    </span>
                  </label>
                  <textarea
                    className="w-full border rounded-md p-3 text-sm resize-y min-h-[100px] bg-white"
                    placeholder="Add guidelines for the client (e.g., recommended restaurants, spa tips, nearby attractions)..."
                    value={day.leisureGuidelines || ''}
                    onChange={e => onChange({ leisureGuidelines: e.target.value })}
                    rows={4}
                  />
                  {day.leisureGuidelines && (
                    <p className="text-xs text-neutral-600 mt-1">✓ Guidelines saved</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-muted/20 rounded-lg border border-dashed border-muted">
                <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  No destination selected for this day
                </p>
              </div>
            )}

            {/* Destination Selector */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {hasDestination ? 'Change Destination' : 'Select Destination'}
              </p>
              <DestinationSelector
                value={selectedDestination}
                onChange={handleDestinationChange}
                placeholder={`Search destinations for Day ${day.dayNumber}...`}
                showAddressInput={true}
                className="w-full"
                parentId={masterDestinationId}
                parentName={masterDestinationName}
              />
            </div>

            {/* Additional Destination Details */}
            {day.destinationDescription && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-1 mb-1">
                  {hasDestination && <DestinationDotIndicator />}
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {day.destinationDescription}
                </p>
              </div>
            )}

            {day.destinationAmenities && day.destinationAmenities.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Amenities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {day.destinationAmenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 bg-neutral-50 text-neutral-700 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {day.destinationThingsToKnow && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-1">
                  Things to Know
                </p>
                <p className="text-sm text-red-800">{day.destinationThingsToKnow}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'hotel' && (
          <div>
            {day.hotelId ? (
              <div className="space-y-2">
                <p className="font-medium">{day.hotelName}</p>
                {day.hotelAddress && (
                  <p className="text-sm text-muted-foreground">{day.hotelAddress}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {day.roomType && (
                    <span className="text-muted-foreground">Room: {day.roomType}</span>
                  )}
                  {day.bedType && <span className="text-muted-foreground">Bed: {day.bedType}</span>}
                  {day.mealPlanLabel && (
                    <span className="text-muted-foreground">Meal: {day.mealPlanLabel}</span>
                  )}
                  {day.basePrice > 0 && (
                    <span className="text-muted-foreground">₹{day.basePrice}/night</span>
                  )}
                  {day.roomCount > 0 && (
                    <span className="text-muted-foreground">Rooms: {day.roomCount}</span>
                  )}
                </div>
                {stay && (
                  <CopyReservationButton
                    stay={stay}
                    tripId={tripId}
                    currency={currency || 'INR'}
                    guest={guest || {}}
                    company={company || {}}
                  />
                )}
              </div>
            ) : day.dayType === 'leisure' ? (
              <LeisureMessage
                icon={<span>🏨</span>}
                title="No Hotel"
                subtitle="Leisure day — no accommodation selected for this day"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No hotel selected</p>
            )}
          </div>
        )}

        {activeTab === 'vehicle' && (
          <div>
            {day.vehicleId ? (
              <div className="space-y-2">
                <p className="font-medium">{day.vehicleName}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {day.vehicleType && (
                    <span className="text-muted-foreground">Type: {day.vehicleType}</span>
                  )}
                  {day.ratePerDay > 0 && (
                    <span className="text-muted-foreground">₹{day.ratePerDay}/day</span>
                  )}
                  {day.vehicleCount > 0 && (
                    <span className="text-muted-foreground">Count: {day.vehicleCount}</span>
                  )}
                </div>
                {day.pickupPoint && (
                  <p className="text-sm text-muted-foreground mt-2">Pickup: {day.pickupPoint}</p>
                )}
                {day.dropPoint && (
                  <p className="text-sm text-muted-foreground">Drop: {day.dropPoint}</p>
                )}
              </div>
            ) : day.dayType === 'leisure' ? (
              <LeisureMessage
                icon={<span>🚗</span>}
                title="No Vehicle"
                subtitle="Leisure day — no transport selected for this day"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No vehicle selected</p>
            )}
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                Activities
                {day.activities.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {day.activities.length}
                  </Badge>
                )}
              </div>
            </div>

            {/* Activity list as tags */}
            {day.activities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {day.activities.map((act, actIdx) => (
                  <div
                    key={act.id || actIdx}
                    className="flex items-center gap-1.5 bg-primary/8 text-primary rounded-full pl-3 pr-1.5 py-1.5 border border-primary/20"
                  >
                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                      {actIdx + 1}
                    </div>
                    <span className="text-sm font-medium">{act.name}</span>
                    {act.cost !== undefined && act.cost > 0 && (
                      <span className="text-[10px] font-semibold text-neutral-600">
                        · ₹{act.cost}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onChange(removeActivityPatch(day, actIdx))}
                      className="text-primary/50 hover:text-red-500 ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new activity */}
            <ActivityForm onAdd={newAct => onChange(addActivityPatch(day, newAct))} />
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Activity ↔ day description sync ──────────────────────────────────────────
// Each added activity is written into the day description as its own line (the
// PDF renders the description as bullets), and taken back out when removed.

function addActivityPatch(day: DayBuilderData, act: ActivityItem): Partial<DayBuilderData> {
  const current = (day.description || '').trimEnd();
  return {
    activities: [...day.activities, act],
    description: current ? `${current}\n${act.name}` : act.name,
  };
}

function removeActivityPatch(day: DayBuilderData, index: number): Partial<DayBuilderData> {
  const removed = day.activities[index];
  const lines = (day.description || '').split('\n');
  const lineIdx = removed ? lines.findIndex(l => l.trim() === removed.name.trim()) : -1;
  return {
    activities: day.activities.filter((_, i) => i !== index),
    ...(lineIdx !== -1 && {
      description: lines.filter((_, i) => i !== lineIdx).join('\n'),
    }),
  };
}

// ─── Activity Form Component ──────────────────────────────────────────────────
function ActivityForm({ onAdd }: { onAdd: (act: ActivityItem) => void }) {
  const [name, setName] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      id: generateId(),
      name: name.trim(),
      description: '',
      time: '',
    });
    setName('');
  };

  return (
    <div className="flex gap-2">
      {/* Input renders inside its own wrapper div, so the wrapper is what grows. */}
      <div className="min-w-0 flex-1">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Add activity..."
          className="h-9 text-sm"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={!name.trim()}
        className="h-9 gap-1"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Main Step 5 Component ──────────────────────────────────────────────────

interface Step5DayDetailsReviewProps {
  mode: 'single' | 'multi';
  days: DayBuilderData[];
  options?: OptionBuilder[];
  onDaysChange: (days: DayBuilderData[]) => void;
  onOptionsChange?: (options: OptionBuilder[]) => void;
  onNext: () => void;
  isSaving: boolean;
  onBack: () => void;
  /** Master destination from step 1; each day picks from the places inside it. */
  destinationId?: string;
  destination?: string;
  /** Currency picked in step 1; day-level amounts are shown in it. */
  currency?: string;
  /** Narrows every day's card to just one concern. Omitted shows all of them. */
  focusSection?: DayDetailsFocusSection;
  /** For the hotel reservation email — set once the itinerary has been saved. */
  tripId?: string;
  clientName?: string;
  salutation?: string;
  adults?: number;
  childrenCount?: number;
}

const FOCUS_COPY: Record<DayDetailsFocusSection, { title: string; subtitle: string }> = {
  destination: {
    title: 'Destinations & Activities',
    subtitle: 'Link each day to a destination, set day type, and add activities',
  },
  hotel: {
    title: 'Review Hotels',
    subtitle: 'Confirm the hotel chosen for each day',
  },
  vehicle: {
    title: 'Review Transport',
    subtitle: 'Confirm the vehicle chosen for each day',
  },
};

export function Step5DayDetailsReview({
  mode,
  days,
  options,
  onDaysChange,
  onOptionsChange,
  onNext,
  isSaving,
  onBack,
  destinationId,
  destination,
  currency = 'INR',
  focusSection,
  tripId,
  clientName,
  salutation,
  adults,
  childrenCount,
}: Step5DayDetailsReviewProps) {
  const masterDestinationId = useMasterDestinationId(destinationId, destination);
  const copy = focusSection
    ? FOCUS_COPY[focusSection]
    : { title: 'Day Details', subtitle: 'Add day images, descriptions, and activities' };
  const [activeOptionIdx, setActiveOptionIdx] = useState(0);

  const { user } = useAuthContext();
  const { data: pdfSettings } = usePdfSettings();
  const guest: ReservationGuest = { salutation, clientName, adults, children: childrenCount };
  const company: ReservationCompany = useMemo(() => {
    const brandName = pdfSettings?.coverFooter?.companyName || user?.branch?.companyName || user?.branch?.name;
    const legalName = user?.branch?.companyName || brandName;
    return {
      brandName,
      legalName,
      address: user?.branch?.address || undefined,
      gst: pdfSettings?.coverFooter?.gst || undefined,
    };
  }, [pdfSettings, user]);

  const stayByDayNumber = useMemo(() => {
    const map = new Map<number, HotelStayGroup>();
    for (const stay of groupHotelStays(days)) {
      map.set(stay.firstDayNumber, stay);
    }
    return map;
  }, [days]);

  // Use ref to always get the current activeOptionIdx without stale closure
  const activeOptionIdxRef = useRef(activeOptionIdx);
  useEffect(() => {
    activeOptionIdxRef.current = activeOptionIdx;
  }, [activeOptionIdx]);

  const handleSingleDayChange = useCallback(
    (dayIndex: number, patch: Partial<DayBuilderData>) => {
      onDaysChange(prev => prev.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d)));
    },
    [onDaysChange]
  );

  const handleMultiDayChange = useCallback(
    (dayIndex: number, patch: Partial<DayBuilderData>) => {
      if (!options || !onOptionsChange) return;
      const currentIdx = activeOptionIdxRef.current;
      const newOptions = options.map((opt, optIdx) =>
        optIdx === currentIdx
          ? { ...opt, days: opt.days.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d)) }
          : opt
      );
      onOptionsChange(newOptions);
    },
    [options, onOptionsChange]
  );

  if (mode === 'single') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold">{copy.title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
            >
              Back
            </Button>
            <Button onClick={onNext} disabled={isSaving} className="flex-1 sm:flex-none">
              {isSaving ? 'Loading...' : 'Next'}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {days.map((day, i) => (
            <SingleDayEditor
              key={day.dayNumber}
              day={day}
              _dayIndex={i}
              onChange={patch => handleSingleDayChange(i, patch)}
              masterDestinationId={masterDestinationId}
              masterDestinationName={destination}
              currency={currency}
              focusSection={focusSection}
              stay={stayByDayNumber.get(day.dayNumber)}
              tripId={tripId}
              guest={guest}
              company={company}
            />
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} disabled={isSaving}>
              Back
            </Button>
            <Button onClick={onNext} disabled={isSaving}>
              {isSaving ? 'Loading...' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Multi-option mode
  const activeOption = options?.[activeOptionIdx];
  if (!activeOption) return null;
  const activeOptionStayByDayNumber = new Map<number, HotelStayGroup>();
  for (const stay of groupHotelStays(activeOption.days)) {
    activeOptionStayByDayNumber.set(stay.firstDayNumber, stay);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">{copy.title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {copy.subtitle}
            {!focusSection && ' for each option'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 sm:flex-none"
          >
            Back
          </Button>
          <Button onClick={onNext} disabled={isSaving} className="flex-1 sm:flex-none">
            {isSaving ? 'Loading...' : 'Next'}
          </Button>
        </div>
      </div>

      {/* Option tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options?.map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveOptionIdx(i)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg border transition-all text-center min-w-[80px] shrink-0',
              i === activeOptionIdx
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-muted hover:border-primary/30'
            )}
          >
            <span className="text-xs font-semibold">{opt.label || `Option ${i + 1}`}</span>
            <span className="text-[10px] text-muted-foreground">{opt.days.length} days</span>
          </button>
        ))}
      </div>

      {/* Days for active option */}
      <div className="space-y-3">
        {activeOption.days.map((day, i) => (
          <MultiDayEditor
            key={day.dayNumber}
            day={day}
            onChange={patch => handleMultiDayChange(i, patch)}
            masterDestinationId={masterDestinationId}
            masterDestinationName={destination}
            focusSection={focusSection}
            currency={currency}
            stay={activeOptionStayByDayNumber.get(day.dayNumber)}
            tripId={tripId}
            guest={guest}
            company={company}
          />
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={isSaving}>
            Back
          </Button>
          <Button onClick={onNext} disabled={isSaving}>
            {isSaving ? 'Loading...' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
