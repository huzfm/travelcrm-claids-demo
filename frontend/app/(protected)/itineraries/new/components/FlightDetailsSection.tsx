'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlightsEditor } from '@/components/itinerary/flights-editor';
import { isFlightFilled } from '@/lib/flights';
import type { FlightSegment } from '@/types/itinerary.types';

export interface FlightDetailsSectionProps {
  flights: FlightSegment[];
  onChange: (flights: FlightSegment[]) => void;
  startDate?: string;
  endDate?: string;
  travelers?: number;
  currency?: string;
  onNext: () => void;
  onBack: () => void;
  isSaving?: boolean;
}

/** The builder's flight step: the shared editor plus this wizard's navigation. */
export function FlightDetailsSection({
  flights,
  onChange,
  startDate,
  endDate,
  travelers,
  currency = 'INR',
  onNext,
  onBack,
  isSaving = false,
}: FlightDetailsSectionProps) {
  const hasFlights = flights.some(isFlightFilled);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Flight Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add each flight by hand, or type a flight number and let the lookup fill it in. Flights
          are optional — skip this step if the client books their own.
        </p>
      </div>

      <FlightsEditor
        flights={flights}
        onChange={onChange}
        startDate={startDate}
        endDate={endDate}
        travelers={travelers}
        currency={currency}
      />

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSaving}>
          Back
        </Button>
        <Button onClick={onNext} disabled={isSaving} className="gap-2">
          {hasFlights ? 'Continue' : 'Skip flights'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
