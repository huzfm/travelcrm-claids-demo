'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, ChevronRight, MapPin, Hotel, Car, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { useAuthContext } from '@/components/providers';
import type { Hotel as HotelType } from '@/types';
import type { Vehicle } from '@/types/vehicle.types';
import { DayCard } from './DayCard';
import { applyDayPatch, type DayBuilderData, type OptionBuilder } from '../types';

interface DayPlannerBuilderProps {
  days: DayBuilderData[];
  options?: OptionBuilder[];
  onChange: (days: DayBuilderData[]) => void;
  onOptionsChange?: (options: OptionBuilder[]) => void;
  travelers: number;
  onComplete: () => void;
  pricingData: unknown;
  onPricingChange: (data: unknown) => void;
  isMulti?: boolean;
}

export function DayPlannerBuilder({
  days,
  onChange,
  travelers,
  onComplete,
  isMulti = false,
}: DayPlannerBuilderProps) {
  const [expandedDay] = useState<number | null>(0);
  const { user } = useAuthContext();
  const isMainBranch = user?.branchId === 'branch-main';

  // Fetch all available hotels (only for main branch)
  const { data: hotelsData } = useQuery({
    queryKey: ['hotels-all-planner'],
    queryFn: async () => {
      const res = await api.get('/hotels?isActive=true&limit=100');
      return res.data.data.hotels as HotelType[];
    },
    enabled: isMainBranch,
  });
  const availableHotels = isMainBranch ? hotelsData || [] : [];

  // Fetch all available vehicles (only for main branch)
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-all-planner'],
    queryFn: async () => {
      const res = await api.get('/vehicles?isActive=true&limit=100');
      return res.data.data.vehicles as Vehicle[];
    },
    enabled: isMainBranch,
  });
  const availableVehicles = isMainBranch ? vehiclesData || [] : [];

  // Calculate progress (no pricing shown, just completion)
  const configuredDays = days.filter(
    d => d.hotelId || d.vehicleId || d.activities.length > 0
  ).length;
  const progressPercent = days.length > 0 ? (configuredDays / days.length) * 100 : 0;

  const handleDayChange = useCallback(
    (dayIndex: number, patch: Partial<DayBuilderData>) => {
      onChange(applyDayPatch(days, dayIndex, patch));
    },
    [days, onChange]
  );

  // Count what's been configured
  const hotelCount = days.filter(d => d.hotelId).length;
  const vehicleCount = days.filter(d => d.vehicleId).length;
  const activityCount = days.reduce((sum, d) => sum + d.activities.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {isMulti ? 'Plan Your Package Options' : 'Plan Your Trip'}
          </h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {days.length} Days
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {travelers} Travelers
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <Card className="bg-muted/30 border-0">
        <CardContent className="pt-4 pb-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {configuredDays} of {days.length} days completed
              </span>
              <Badge variant={progressPercent === 100 ? 'default' : 'outline'}>
                {Math.round(progressPercent)}%
              </Badge>
            </div>
            <Progress value={progressPercent} className="h-2" />

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div
                className={cn(
                  'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                  hotelCount > 0
                    ? 'bg-neutral-100 text-neutral-700'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Hotel className="h-3 w-3" />
                {hotelCount} hotels
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                  vehicleCount > 0
                    ? 'bg-neutral-100 text-neutral-700'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Car className="h-3 w-3" />
                {vehicleCount} vehicles
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                  activityCount > 0
                    ? 'bg-neutral-100 text-neutral-700'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Activity className="h-3 w-3" />
                {activityCount} activities
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner */}
      <Card className="bg-neutral-50 border-neutral-200">
        <CardContent className="py-3">
          <p className="text-sm text-neutral-800 flex items-center gap-2">
            <span className="bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded text-xs font-bold">
              i
            </span>
            No pricing here — you&apos;ll set room counts, meal plans, and pricing in the next step.
          </p>
        </CardContent>
      </Card>

      {/* Days list */}
      <div className="space-y-4">
        {days.map((day, dayIndex) => (
          <DayCard
            key={day.dayNumber}
            day={day}
            dayIndex={dayIndex}
            onChange={handleDayChange}
            availableHotels={availableHotels}
            availableVehicles={availableVehicles}
            travelers={travelers}
            defaultOpen={dayIndex === expandedDay}
            allDays={days}
          />
        ))}
      </div>

      {/* Continue button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onComplete} size="lg" className="gap-2 px-8">
          Continue to Pricing
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
