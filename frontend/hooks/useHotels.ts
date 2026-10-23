// Hotel API hooks

'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Hotel, HotelFilters } from '@/types';

export function useHotels(
  filters: HotelFilters = {},
  /** Set `enabled: false` to hold the request back until the list is needed. */
  options: { enabled?: boolean } = {}
) {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.category && filters.category !== 'ALL') params.append('category', filters.category);
  if (filters.stars) params.append('stars', String(filters.stars));
  // Matches the destination and everything inside it.
  if (filters.destinationId) params.append('destinationId', filters.destinationId);
  if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['hotels', filters],
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const queryString = params.toString();
      const url = queryString ? `/hotels?${queryString}` : '/hotels';
      const response = await api.get<{
        success: boolean;
        data: { hotels: Hotel[]; pagination: any };
      }>(url);
      return response.data.data;
    },
  });
}

export function useHotel(id: string) {
  return useQuery({
    queryKey: ['hotel', id],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Hotel }>(`/hotels/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hotel lookup for the pickers.
 *
 * `destinationId` scopes the results to one master destination. The API rolls
 * that up over the destinations inside it, so scoping to "Kashmir" also returns
 * hotels filed under Gulmarg or Pahalgam. A scope is enough on its own: with one
 * set the picker lists that destination's hotels before anything is typed.
 */
export function useHotelSearch(query: string, minChars = 2, destinationId?: string) {
  const hasQuery = query.length > 0 && query.length >= minChars;
  const enabled = hasQuery || Boolean(destinationId);

  return useQuery({
    queryKey: ['hotel-search', query, minChars, destinationId ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: destinationId ? '50' : '10' });
      if (query) params.set('search', query);
      if (destinationId) params.set('destinationId', destinationId);
      const response = await api.get<{ success: boolean; data: { hotels: Hotel[] } }>(
        `/hotels?${params.toString()}`
      );
      return response.data.data.hotels;
    },
    enabled,
  });
}
