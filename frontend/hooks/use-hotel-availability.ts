'use client';

import { useMemo } from 'react';
import type { Hotel } from '@/types/hotel.types';

export interface AvailabilityRange {
  startDate: Date;
  endDate: Date;
}

export interface HotelAvailability {
  hotel: Hotel;
  blocked: boolean;
  blockedDates: string[];
}

export function useHotelAvailability(
  hotels: Hotel[],
  range: AvailabilityRange | null,
  existingHotelIds: string[] = []
) {
  return useMemo<HotelAvailability[]>(() => {
    if (!hotels || hotels.length === 0) return [];

    if (!range) {
      return hotels.map(hotel => ({ hotel, blocked: false, blockedDates: [] }));
    }

    const usedIds = new Set(existingHotelIds);

    return hotels.map(hotel => {
      if (usedIds.has(hotel.id)) {
        return { hotel, blocked: true, blockedDates: [] };
      }

      // TODO (future): integrate backend availability API
      // GET /hotels/${hotel.id}/availability?start=${format(startDate,'yyyy-MM-dd')}&end=${format(endDate,'yyyy-MM-dd')}
      // Expected: { data: { bookedDates: string[] } }
      // Replace stubs below when API is available.

      const blockedDates: string[] = [];
      const blocked = false;

      return { hotel, blocked, blockedDates };
    });
  }, [hotels, range, existingHotelIds]);
}

export function useAvailableHotels(
  hotels: Hotel[],
  range: AvailabilityRange | null,
  existingHotelIds: string[] = []
) {
  const availability = useHotelAvailability(hotels, range, existingHotelIds);
  return useMemo(() => availability.filter(a => !a.blocked).map(a => a.hotel), [availability]);
}
