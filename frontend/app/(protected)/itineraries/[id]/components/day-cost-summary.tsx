'use client';

import { Activity, Bed, Car } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import type { ItineraryDay } from '@/types/itinerary.types';

interface DayCostSummaryProps {
  day: ItineraryDay;
  travelers: number;
  /** Total for the day, computed by the caller so both views agree. */
  dayCost?: number;
  currency?: string;
}

export function DayCostSummary({
  day,
  travelers,
  dayCost = 0,
  currency = 'INR',
}: DayCostSummaryProps) {
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

  // Mirrors the day total in DayEditor: room rates are per room per night and
  // only the meal plan is charged per person.
  const hotelCost =
    roomPrice * rooms +
    extraBedPrice * extraBeds +
    childPrice * childrenNoBed +
    mealPlanPrice * rooms * travelers;
  const vehicleCost = vehicleRate * numVehicles;

  const lines = [
    hotelCost > 0 && {
      icon: Bed,
      label: rooms > 1 ? `Hotel (${rooms} rooms)` : 'Hotel',
      amount: hotelCost,
    },
    vehicleCost > 0 && {
      icon: Car,
      label: numVehicles > 1 ? `Vehicle (${numVehicles}x)` : 'Vehicle',
      amount: vehicleCost,
    },
    activitiesCost > 0 && { icon: Activity, label: 'Activities', amount: activitiesCost },
  ].filter(Boolean) as { icon: typeof Bed; label: string; amount: number }[];

  if (lines.length === 0) return null;

  const total = dayCost || lines.reduce((sum, line) => sum + line.amount, 0);

  return (
    <div className="border-t bg-muted/30 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {lines.map(line => (
            <span
              key={line.label}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <line.icon className="h-3.5 w-3.5" />
              {line.label}
              <span className="font-medium tabular-nums text-foreground">
                {formatCurrency(line.amount, currency)}
              </span>
            </span>
          ))}
        </div>
        <span className="text-sm font-semibold tabular-nums">
          Day total {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}
