'use client';

import { useState } from 'react';
import { Car, Palmtree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { VehicleAutocomplete } from '@/components/vehicles/vehicle-autocomplete';
import { getCurrencySymbol } from '@/data/currencies';
import type { Vehicle } from '@/types';
import { calculateCostBreakdown, type DayBuilderData } from '../types';

interface TransportPlannerProps {
  days: DayBuilderData[];
  onChange: (days: DayBuilderData[]) => void;
  onSave: () => void;
  isSaving: boolean;
  heading?: string;
  nextLabel?: string;
  /** Currency picked in step 1; the running total is shown in it. */
  currency?: string;
}

/**
 * Vehicle count box that can be cleared while typing. Snapping straight back
 * to 1 on every keystroke meant the field could never be emptied (or set to 0)
 * on a phone keyboard. The typed text is kept locally and committed when it's
 * a number; 0 turns transport off for that day.
 */
function CountInput({
  id,
  value,
  onCommit,
}: {
  id: string;
  value: number;
  onCommit: (count: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(String(value));
  }

  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={0}
      value={text}
      onChange={e => {
        setText(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (!Number.isNaN(n) && n > 0) onCommit(n);
      }}
      onBlur={() => {
        const n = parseInt(text, 10);
        if (Number.isNaN(n)) setText(String(value));
        else if (n <= 0) onCommit(0);
      }}
      className="h-8 w-16 text-sm"
    />
  );
}

/**
 * One vehicle for the whole trip, not a per-day picker: pick it once, then
 * just adjust how many are needed on any day that's different (default 1),
 * or turn transport off entirely for a day that doesn't need it.
 */
export function TransportPlanner({
  days,
  onChange,
  onSave,
  isSaving,
  heading = 'Choose Transport',
  nextLabel = 'Continue',
  currency = 'INR',
}: TransportPlannerProps) {
  const sharedVehicleName = days.find(d => d.vehicleId)?.vehicleName || '';
  const hasVehicle = Boolean(sharedVehicleName);
  const symbol = getCurrencySymbol(currency);
  // The shared calculator the pricing step uses, so the running total stays
  // consistent as the agent moves through the wizard.
  const costs = calculateCostBreakdown(days);
  const totalCost = costs.hotelCost + costs.vehicleCost + costs.activityCost;

  const applyVehicleToAllDays = (name: string, vehicle?: Vehicle) => {
    if (!vehicle) return;
    onChange(
      days.map(d => ({
        ...d,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name || name,
        vehicleType: vehicle.vehicleType || '',
        ratePerDay: vehicle.ratePerDay || 0,
        vehicleCount: d.vehicleCount > 0 ? d.vehicleCount : 1,
        // Vehicle photos are not wanted on itineraries, so none is captured.
        vehicleImage: null,
        _isManualVehicleEntry: false,
      }))
    );
  };

  const setPickupDrop = (field: 'pickupPoint' | 'dropPoint', value: string) => {
    const target = field === 'pickupPoint' ? 0 : days.length - 1;
    onChange(days.map((d, i) => (i === target ? { ...d, [field]: value } : d)));
  };

  const updateDayCount = (dayIndex: number, count: number) => {
    onChange(days.map((d, i) => (i === dayIndex ? { ...d, vehicleCount: count } : d)));
  };

  const setDayNeedsTransport = (dayIndex: number, needsTransport: boolean) => {
    const template = days.find(d => d.vehicleId);
    onChange(
      days.map((d, i) => {
        if (i !== dayIndex) return d;
        if (needsTransport && template) {
          return {
            ...d,
            vehicleId: template.vehicleId,
            vehicleName: template.vehicleName,
            vehicleType: template.vehicleType,
            ratePerDay: template.ratePerDay,
            vehicleCount: d.vehicleCount > 0 ? d.vehicleCount : 1,
          };
        }
        return { ...d, vehicleId: '', vehicleName: '', vehicleType: '', vehicleCount: 0 };
      })
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">{heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick one vehicle for the whole trip, then adjust the count on any day that needs
              more than one — or turn transport off for a day that doesn&apos;t need it.
            </p>
          </div>
          <VehicleAutocomplete value={sharedVehicleName} onChange={applyVehicleToAllDays} />

          {/* Trip-level pickup/drop — stored on the first and last day, which is
              where the booking PDF reads them from. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pickup-location" className="text-xs">
                Pickup location
              </Label>
              <Input
                id="pickup-location"
                value={days[0]?.pickupPoint || ''}
                onChange={e => setPickupDrop('pickupPoint', e.target.value)}
                placeholder="e.g. Srinagar Airport"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drop-location" className="text-xs">
                Drop location
              </Label>
              <Input
                id="drop-location"
                value={days[days.length - 1]?.dropPoint || ''}
                onChange={e => setPickupDrop('dropPoint', e.target.value)}
                placeholder="e.g. Srinagar Airport"
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {hasVehicle && (
        <Card>
          <CardContent className="space-y-2 p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-muted-foreground">Per-day count</h3>
            <div className="space-y-2">
              {days.map((day, i) => {
                const isLeisure = day.dayType === 'leisure';
                const dayLabel = (day.destination || day.location || '').trim();
                const needsTransport = Boolean(day.vehicleId);
                return (
                  <div
                    key={day.dayNumber}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Day {day.dayNumber}</span>
                        {isLeisure && (
                          <Badge variant="outline" className="gap-1 text-[10px]">
                            <Palmtree className="h-3 w-3" />
                            Leisure
                          </Badge>
                        )}
                      </div>
                      {dayLabel && (
                        <p className="truncate text-xs text-muted-foreground">{dayLabel}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={needsTransport}
                          onChange={e => setDayNeedsTransport(i, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-border"
                        />
                        Needs transport
                      </label>
                      {needsTransport && (
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor={`count-${day.dayNumber}`} className="text-xs">
                            Count
                          </Label>
                          <CountInput
                            id={`count-${day.dayNumber}`}
                            value={day.vehicleCount || 1}
                            onCommit={count =>
                              count === 0
                                ? setDayNeedsTransport(i, false)
                                : updateDayCount(i, count)
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5 hover:translate-y-0">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Car className="h-4 w-4" />
              {hasVehicle ? sharedVehicleName : 'No vehicle selected yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Estimated cost so far</p>
            <p className="text-xl font-bold text-primary sm:text-2xl">
              {symbol}
              {totalCost.toLocaleString()}
            </p>
          </div>
          <Button
            onClick={onSave}
            disabled={isSaving || !hasVehicle}
            size="lg"
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            {nextLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
