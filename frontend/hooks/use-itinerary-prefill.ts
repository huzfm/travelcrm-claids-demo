'use client';

import { useMemo } from 'react';
import { addDays } from 'date-fns';
import { useHotels } from './useHotels';
import { useVehicles } from './useVehicles';
import { useItineraries } from './useItineraries';
import { useLead } from './useLeads';
import type { Hotel } from '@/types/hotel.types';
import type { Vehicle } from '@/types/vehicle.types';
import type { Itinerary } from '@/types/itinerary.types';

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface TripContext {
  leadId?: string;
  destination?: string;
  startDate?: Date;
  endDate?: Date;
  tripType?: string;
  paxCount?: number;
  hotelCategory?: string;
}

// ─── Output Types ──────────────────────────────────────────────────────────────

export interface HotelPrefill {
  day: number;
  date: Date;
  suggestedHotels: Hotel[];
  suggestedRoomTypes: string[];
  suggestedMealPlans: string[];
  suggestedRoomCount: number;
  previousHotelIds: string[];
}

export interface VehiclePrefill {
  day: number;
  date: Date;
  suggestedVehicles: Vehicle[];
  suggestedVehicleTypes: string[];
  previousVehicleIds: string[];
}

export interface PrefillData {
  suggestedDestination?: string;
  suggestedTripType?: string;
  suggestedPaxCount?: number;
  hotelsByDay: HotelPrefill[];
  vehiclesByDay: VehiclePrefill[];
  commonNotes: string[];
  commonMarkup: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectHistoricalHotelIds(itineraries: Itinerary[]): string[] {
  const ids = new Set<string>();
  for (const itin of itineraries) {
    const days = Array.isArray(itin.daysJson) ? itin.daysJson : [];
    for (const day of days) {
      if (day.hotelId) ids.add(day.hotelId);
    }
  }
  return [...ids];
}

function collectHistoricalVehicleIds(itineraries: Itinerary[]): string[] {
  const ids = new Set<string>();
  for (const itin of itineraries) {
    const days = Array.isArray(itin.daysJson) ? itin.daysJson : [];
    for (const day of days) {
      if (day.vehicleId) ids.add(day.vehicleId);
    }
  }
  return [...ids];
}

function mostCommonRoomTypes(itineraries: Itinerary[], topN = 3): string[] {
  const freq: Record<string, number> = {};
  for (const itin of itineraries) {
    const days = Array.isArray(itin.daysJson) ? itin.daysJson : [];
    for (const day of days) {
      const rt = day.selectedRoomType as { name?: string } | undefined;
      if (rt?.name) freq[rt.name] = (freq[rt.name] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([name]) => name);
}

function mostCommonMealPlans(itineraries: Itinerary[], topN = 3): string[] {
  const freq: Record<string, number> = {};
  for (const itin of itineraries) {
    const days = Array.isArray(itin.daysJson) ? itin.daysJson : [];
    for (const day of days) {
      const mp = day.selectedMealPlan as { type?: string } | undefined;
      if (mp?.type) freq[mp.type] = (freq[mp.type] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([type]) => type);
}

function commonDestinations(itineraries: Itinerary[]): string[] {
  const freq: Record<string, number> = {};
  for (const itin of itineraries) {
    if (itin.destination) freq[itin.destination] = (freq[itin.destination] ?? 0) + 1;
  }
  return Object.entries(freq)
    .sort(([, a], [, b]) => b - a)
    .map(([dest]) => dest);
}

function collectNotes(itineraries: Itinerary[]): string[] {
  const notes: string[] = [];
  for (const itin of itineraries) {
    if (itin.notes?.trim()) notes.push(itin.notes.trim());
  }
  return [...new Set(notes)];
}

function averageMarkup(itineraries: Itinerary[]): number {
  const margins: number[] = [];
  for (const itin of itineraries) {
    const raw = (itin as unknown as Record<string, unknown>).quotes;
    if (!raw) continue;
    let quotes: Array<Record<string, unknown>> = [];
    if (typeof raw === 'string') {
      try {
        quotes = JSON.parse(raw);
      } catch {
        continue;
      }
    } else if (Array.isArray(raw)) {
      quotes = raw;
    } else {
      continue;
    }
    for (const q of quotes as Array<{ marginPercent?: number }>) {
      if (q.marginPercent != null && q.marginPercent > 0) margins.push(q.marginPercent);
    }
  }
  if (margins.length === 0) return 0;
  return margins.reduce((sum, m) => sum + m, 0) / margins.length;
}

function buildDayRange(
  startDate: Date | undefined,
  dayCount: number
): Array<{ day: number; date: Date }> {
  if (!startDate) {
    return Array.from({ length: dayCount }, (_, i) => ({ day: i + 1, date: new Date() }));
  }
  return Array.from({ length: dayCount }, (_, i) => ({ day: i + 1, date: addDays(startDate, i) }));
}

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useItineraryPrefill(context: TripContext) {
  const { leadId, destination, startDate, endDate, tripType, paxCount, hotelCategory } = context;

  const { data: lead } = useLead(leadId ?? '');

  const { data: historyResult, isLoading: historyLoading } = useItineraries();

  const leadItineraries = useMemo<Itinerary[]>(() => {
    if (!leadId || !historyResult) return [];
    const list = Array.isArray(historyResult) ? historyResult : (historyResult.itineraries ?? []);
    return (list as Itinerary[]).filter(it => it.leadId === leadId);
  }, [leadId, historyResult]);

  const hotelSearchTerm = destination ?? '';
  const { data: hotelsData, isLoading: hotelsLoading } = useHotels({
    search: hotelSearchTerm,
    category: (hotelCategory ?? 'ALL') as 'ALL' | 'BUDGET' | 'STANDARD' | 'PREMIUM' | 'LUXURY',
    isActive: true,
    limit: 50,
  });
  const allHotels: Hotel[] = (hotelsData as { hotels?: Hotel[] })?.hotels ?? [];

  const previousHotelIds = useMemo<string[]>(
    () => collectHistoricalHotelIds(leadItineraries),
    [leadItineraries]
  );

  const { vehicles: vehiclesData, loading: vehiclesLoading } = useVehicles({
    page: 1,
    limit: 50,
    filters: { isActive: true },
  });
  const allVehicles: Vehicle[] = (vehiclesData as unknown as Vehicle[]) ?? [];

  const previousVehicleIds = useMemo<string[]>(
    () => collectHistoricalVehicleIds(leadItineraries),
    [leadItineraries]
  );

  const commonRoomTypesList = useMemo<string[]>(
    () => mostCommonRoomTypes(leadItineraries),
    [leadItineraries]
  );
  const commonMealPlansList = useMemo<string[]>(
    () => mostCommonMealPlans(leadItineraries),
    [leadItineraries]
  );
  const commonDestList = useMemo<string[]>(
    () => commonDestinations(leadItineraries),
    [leadItineraries]
  );
  const commonNotesList = useMemo<string[]>(() => collectNotes(leadItineraries), [leadItineraries]);
  const avgMarkupVal = useMemo<number>(() => averageMarkup(leadItineraries), [leadItineraries]);

  const tripDuration = useMemo<number>(() => {
    if (startDate && endDate) {
      return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
    }
    if (leadItineraries.length > 0) {
      const last = leadItineraries[0];
      const days = Array.isArray(last.daysJson) ? last.daysJson : [];
      return days.length > 0 ? days.length : 3;
    }
    return 3;
  }, [startDate, endDate, leadItineraries]);

  const dayRange = useMemo<Array<{ day: number; date: Date }>>(
    () => buildDayRange(startDate, tripDuration),
    [startDate, tripDuration]
  );

  const hotelsByDay = useMemo<HotelPrefill[]>(() => {
    return dayRange.map(({ day, date }) => ({
      day,
      date,
      suggestedHotels: allHotels,
      suggestedRoomTypes: commonRoomTypesList,
      suggestedMealPlans: commonMealPlansList,
      suggestedRoomCount: paxCount ?? 1,
      previousHotelIds,
    }));
  }, [dayRange, allHotels, commonRoomTypesList, commonMealPlansList, paxCount, previousHotelIds]);

  const vehiclesByDay = useMemo<VehiclePrefill[]>(() => {
    return dayRange.map(({ day, date }) => ({
      day,
      date,
      suggestedVehicles: allVehicles,
      suggestedVehicleTypes: [],
      previousVehicleIds,
    }));
  }, [dayRange, allVehicles, previousVehicleIds]);

  const lastItin = leadItineraries[0];

  const prefillData = useMemo<PrefillData>(
    () => ({
      suggestedDestination:
        destination ?? lead?.destination ?? commonDestList[0] ?? lastItin?.destination,
      suggestedTripType: tripType ?? lead?.tripType ?? lastItin?.tripType,
      suggestedPaxCount:
        paxCount ??
        (lead?.numberOfPax ? parseInt(lead.numberOfPax) : undefined) ??
        lastItin?.totalTravelers,
      hotelsByDay,
      vehiclesByDay,
      commonNotes: commonNotesList,
      commonMarkup: avgMarkupVal,
    }),
    [
      destination,
      lead,
      tripType,
      paxCount,
      commonDestList,
      leadItineraries,
      hotelsByDay,
      vehiclesByDay,
      commonNotesList,
      avgMarkupVal,
    ]
  );

  const isLoading = historyLoading || hotelsLoading || vehiclesLoading;

  return {
    lead,
    leadItineraries,
    previousHotelIds,
    previousVehicleIds,
    commonRoomTypes: commonRoomTypesList,
    commonMealPlans: commonMealPlansList,
    allHotels,
    allVehicles,
    prefillData,
    isLoading,
  };
}
