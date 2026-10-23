'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { FlightSegment } from '@/types/itinerary.types';

/** What the lookup endpoint fills in — never the agent's own fields (PNR, fare). */
export type LookedUpFlight = Pick<
  FlightSegment,
  | 'airline'
  | 'airlineCode'
  | 'flightNumber'
  | 'aircraft'
  | 'cabinClass'
  | 'departureAirport'
  | 'departureCode'
  | 'departureCity'
  | 'departureTerminal'
  | 'departureDate'
  | 'departureTime'
  | 'arrivalAirport'
  | 'arrivalCode'
  | 'arrivalCity'
  | 'arrivalTerminal'
  | 'arrivalDate'
  | 'arrivalTime'
  | 'durationMinutes'
  | 'stops'
  | 'baggage'
  | 'source'
  | 'provider'
  | 'fetchedAt'
>;

export interface FlightLookupResult {
  flight: LookedUpFlight;
  provider: string;
  /** True while the built-in sample provider is configured, not a live feed. */
  isMock: boolean;
}

/**
 * Which flight-data provider the backend is running. The builder uses this to
 * label sample data before the agent has looked anything up.
 */
export function useFlightProvider() {
  return useQuery({
    queryKey: ['flight-provider'],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: { provider: string; isMock: boolean };
      }>('/flights/provider');
      return response.data.data;
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

/** Looks a flight up by number and travel date. */
export function useFlightLookup() {
  return useMutation<FlightLookupResult, Error, { flightNumber: string; date: string }>({
    mutationFn: async ({ flightNumber, date }) => {
      const params = new URLSearchParams({ flightNumber, date });
      const response = await api.get<{ success: boolean; data: FlightLookupResult }>(
        `/flights/lookup?${params.toString()}`
      );
      return response.data.data;
    },
  });
}
