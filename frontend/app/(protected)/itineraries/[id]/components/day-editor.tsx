'use client';

import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayOverviewStrip } from './day-overview-strip';
import { DayDetailView } from './day-detail-view';
import { DaySectionDestination } from './day-section-destination';
import { DaySectionHotel } from './day-section-hotel';
import { DaySectionVehicle } from './day-section-vehicle';
import { DayExtras } from './day-extras';
import { DayCostSummary } from './day-cost-summary';
import type { HotelStayGroup, ReservationGuest, ReservationCompany } from '@/app/(protected)/itineraries/new/utils/reservationEmail';
import type { ItineraryDay } from '@/types/itinerary.types';

interface DayEditorProps {
  day: ItineraryDay;
  dayIndex: number;
  isExpanded: boolean;
  destination: string;
  travelers: number;
  currency?: string;
  readOnly?: boolean;
  onToggleExpand: () => void;
  onUpdateDay: (updates: Partial<ItineraryDay>) => void;
  formatDate: (date: string) => string;
  /** Set only on the first night of a hotel stay — shows the copy button. */
  stay?: HotelStayGroup;
  tripId?: string;
  guest?: ReservationGuest;
  company?: ReservationCompany;
}

export function DayEditor({
  day,
  dayIndex,
  isExpanded,
  destination,
  travelers,
  currency = 'INR',
  readOnly = false,
  onToggleExpand,
  onUpdateDay,
  formatDate,
  stay,
  tripId,
  guest,
  company,
}: DayEditorProps) {
  const rooms = day.numberOfRooms || 1;
  const extraBeds = day.extraBeds || 0;
  const childrenNoBed = day.childrenNoBed || 0;
  const roomPrice = day.selectedRoomType?.basePrice || 0;
  const extraBedPrice = day.selectedRoomType?.extraBedPrice || day.extraBedCost || 0;
  const childPrice = day.selectedRoomType?.childPrice || day.childWithoutBedCost || 0;
  const mealPlanPrice = day.selectedMealPlan?.pricePerNight || 0;
  const vehicleRate = day.vehicleRatePerDay || day.selectedVehicle?.ratePerDay || 0;
  const numVehicles = day.numberOfVehicles || 1;
  const activitiesCost = (day.activities ?? []).reduce((sum, act) => sum + (act.cost || 0), 0);
  // Room rates are per-night (per room), NOT per-person
  // Only meal plan cost is per person
  const hotelCost =
    roomPrice * rooms +
    extraBedPrice * extraBeds +
    childPrice * childrenNoBed +
    mealPlanPrice * rooms * travelers;
  const vehicleCost = vehicleRate * numVehicles;
  const dayCost = hotelCost + vehicleCost + activitiesCost;

  const isLeisure = day.dayType === 'leisure';

  return (
    <div
      id={`itinerary-day-${dayIndex}`}
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-shadow scroll-mt-24',
        isExpanded ? 'shadow-brand ring-1 ring-primary/15' : 'hover:shadow-brand'
      )}
    >
      {/* Collapsed header — the whole row toggles the day */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleExpand();
          }
        }}
        aria-expanded={isExpanded}
        className={cn(
          'flex cursor-pointer items-stretch transition-colors hover:bg-muted/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          isExpanded && 'bg-muted/30'
        )}
      >
        {/* Accent rail — leisure days read differently at a glance */}
        <span
          aria-hidden
          className={cn('w-1 shrink-0', isLeisure ? 'bg-gold/60' : 'bg-primary/60')}
        />
        <div className="min-w-0 flex-1 px-4">
          <DayOverviewStrip
            day={day}
            formatDate={formatDate}
            dayCost={dayCost}
            currency={currency}
            isExpanded={isExpanded}
          />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t bg-muted/20">
          <div className="px-4">
            {/* The editor sections start collapsed and their only toggle is
                disabled when read-only, so they can never be opened here —
                a view page gets a presentation built for reading instead. */}
            {readOnly ? (
              <DayDetailView
                day={day}
                travelers={travelers}
                currency={currency}
                stay={stay}
                tripId={tripId}
                guest={guest}
                company={company}
              />
            ) : (
              <>
                <DaySectionDestination
                  day={day}
                  destination={destination}
                  onUpdate={onUpdateDay}
                  readOnly={readOnly}
                />
                <DaySectionHotel
                  day={day}
                  destination={destination}
                  onUpdate={onUpdateDay}
                  readOnly={readOnly}
                />
                <DaySectionVehicle
                  day={day}
                  destination={destination}
                  onUpdate={onUpdateDay}
                  readOnly={readOnly}
                />
              </>
            )}
            <DayExtras day={day} currency={currency} />
          </div>

          <DayCostSummary day={day} travelers={travelers} dayCost={dayCost} currency={currency} />

          <div className="flex items-center justify-end border-t bg-muted/20 px-4 py-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronUp className="h-4 w-4" />
              Collapse day
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
