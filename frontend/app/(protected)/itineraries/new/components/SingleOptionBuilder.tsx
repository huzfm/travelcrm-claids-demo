'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Calendar,
  Users,
  Hotel,
  Car,
  Activity,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { getCurrencySymbol } from '@/data/currencies';
import { useMasterDestinationId } from '@/hooks/use-master-destination';
import type { Hotel as HotelType } from '@/types';
import type { Vehicle } from '@/types/vehicle.types';
import { DayCard } from './DayCard';
import {
  applyDayPatch,
  calculateCostBreakdown,
  isDayConfigured,
  type DayBuilderData,
} from '../types';

interface SingleOptionBuilderProps {
  days: DayBuilderData[];
  onChange: (days: DayBuilderData[]) => void;
  travelers: number;
  onSave: () => void;
  isSaving: boolean;
  /** Currency picked in step 1; the running total is shown in it. */
  currency?: string;
  /** Master destination from step 1; scopes each day's hotel picker to it. */
  destinationId?: string;
  destination?: string;
  /** Which of each day's sections to show. Defaults to both. */
  sections?: Array<'hotel' | 'vehicle'>;
  /** Overrides the heading and the footer button's label for a focused step. */
  heading?: string;
  nextLabel?: string;
}

function StatPill({
  icon: Icon,
  value,
  label,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        active ? 'border-primary/30 bg-primary/5' : 'border-dashed bg-muted/30'
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-bold tabular-nums">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function SingleOptionBuilder({
  days,
  onChange,
  travelers,
  onSave,
  isSaving,
  currency = 'INR',
  destinationId,
  destination,
  sections = ['hotel', 'vehicle'],
  heading = 'Build Your Itinerary',
  nextLabel = 'Continue to Day Details',
}: SingleOptionBuilderProps) {
  const masterDestinationId = useMasterDestinationId(destinationId, destination);
  // A token so every day card reacts to each click, even two in a row.
  const [openSignal, setOpenSignal] = useState<{ open: boolean; token: number }>({
    open: false,
    token: 0,
  });
  const [allOpen, setAllOpen] = useState(false);

  // Fetch all available hotels
  const { data: hotelsData } = useQuery({
    queryKey: ['hotels-all-new'],
    queryFn: async () => {
      const res = await api.get('/hotels?isActive=true&limit=100');
      return res.data.data.hotels as HotelType[];
    },
  });
  const availableHotels: typeof hotelsData = hotelsData || [];

  // Fetch all available vehicles
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-all-new'],
    queryFn: async () => {
      const res = await api.get('/vehicles?isActive=true&limit=100');
      return res.data.data.vehicles as Vehicle[];
    },
  });
  const availableVehicles: typeof vehiclesData = vehiclesData || [];

  const stats = useMemo(() => {
    const configuredDays = days.filter(isDayConfigured).length;
    // The shared calculator the pricing step uses, so this estimate matches it.
    const costs = calculateCostBreakdown(days);
    const totalCost = costs.hotelCost + costs.vehicleCost + costs.activityCost;

    return {
      configuredDays,
      progressPercent: days.length > 0 ? (configuredDays / days.length) * 100 : 0,
      hotelCount: days.filter(d => d.hotelId).length,
      vehicleCount: days.filter(d => d.vehicleId).length,
      activityCount: days.reduce((sum, d) => sum + d.activities.length, 0),
      totalCost,
    };
  }, [days]);

  const handleDayChange = useCallback(
    (dayIndex: number, patch: Partial<DayBuilderData>) => {
      onChange(applyDayPatch(days, dayIndex, patch));
    },
    [days, onChange]
  );

  const toggleAll = () => {
    const next = !allOpen;
    setAllOpen(next);
    setOpenSignal(s => ({ open: next, token: s.token + 1 }));
  };

  const isComplete = stats.progressPercent === 100;
  const symbol = getCurrencySymbol(currency);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Overview */}
      <Card className="overflow-hidden hover:translate-y-0">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold sm:text-xl">{heading}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {days.length} day{days.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {travelers} traveller{travelers !== 1 ? 's' : ''}
                </span>
                {masterDestinationId && destination && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Hotels in {destination}
                  </span>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAll}
              className="shrink-0 gap-2"
            >
              {allOpen ? (
                <ChevronsDownUp className="h-4 w-4" />
              ) : (
                <ChevronsUpDown className="h-4 w-4" />
              )}
              {allOpen ? 'Collapse all' : 'Expand all'}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {stats.configuredDays} of {days.length} days planned
              </span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  isComplete ? 'text-neutral-600' : 'text-muted-foreground'
                )}
              >
                {Math.round(stats.progressPercent)}%
              </span>
            </div>
            <Progress value={stats.progressPercent} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatPill
              icon={Hotel}
              value={stats.hotelCount}
              label="hotels"
              active={stats.hotelCount > 0}
            />
            <StatPill
              icon={Car}
              value={stats.vehicleCount}
              label="vehicles"
              active={stats.vehicleCount > 0}
            />
            <StatPill
              icon={Activity}
              value={stats.activityCount}
              label="activities"
              active={stats.activityCount > 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Days */}
      <div className="space-y-3">
        {days.map((day, dayIndex) => (
          <DayCard
            key={day.dayNumber}
            day={day}
            dayIndex={dayIndex}
            onChange={handleDayChange}
            availableHotels={availableHotels}
            availableVehicles={availableVehicles}
            travelers={travelers}
            defaultOpen={dayIndex === 0}
            openSignal={openSignal}
            hideMealAndActivities={false}
            destinationId={masterDestinationId}
            destinationLabel={destination}
            sections={sections}
            isLastDay={days.length > 1 && dayIndex === days.length - 1}
            allDays={days}
          />
        ))}
      </div>

      {/* Footer — one save action, always reachable */}
      <Card className="border-primary/20 bg-primary/5 hover:translate-y-0">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Estimated cost so far</p>
            <p className="text-xl font-bold text-primary sm:text-2xl">
              {symbol}
              {stats.totalCost.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Rooms and margins come later, after the day details
            </p>
          </div>
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="lg"
            className="w-full gap-2 sm:w-auto sm:min-w-[200px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                {nextLabel}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
