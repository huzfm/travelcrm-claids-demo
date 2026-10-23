// Destination API hooks

'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Destination, DestinationFilters, DestinationNode } from '@/types';

/**
 * Drop every cached view of the destination tree, plus the hotels whose display
 * label is derived from it. Pages that write through `api` directly call this;
 * `useDeleteDestination` does it for you.
 */
export function useInvalidateDestinations() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['destinations'] });
    queryClient.invalidateQueries({ queryKey: ['destination'] });
    queryClient.invalidateQueries({ queryKey: ['destination-search'] });
    queryClient.invalidateQueries({ queryKey: ['destination-tree'] });
    queryClient.invalidateQueries({ queryKey: ['hotels'] });
  }, [queryClient]);
}

/**
 * Master destinations with the ones inside them nested. Backs the destinations
 * page, the hotel form picker and the hotel list filter.
 */
export function useDestinationTree(activeOnly = false) {
  return useQuery({
    queryKey: ['destination-tree', activeOnly],
    queryFn: async () => {
      const url = activeOnly ? '/destinations/tree?isActive=true' : '/destinations/tree';
      const response = await api.get<{ success: boolean; data: { tree: DestinationNode[] } }>(url);
      return response.data.data.tree;
    },
    // The tree changes rarely and several views read it.
    staleTime: 5 * 60 * 1000,
  });
}

export function useDestinations(filters: DestinationFilters = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  if (filters.placeType) params.append('placeType', filters.placeType);
  if (filters.parentId) params.append('parentId', filters.parentId);
  if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  return useQuery({
    queryKey: ['destinations', filters],
    queryFn: async () => {
      const queryString = params.toString();
      const url = queryString ? `/destinations?${queryString}` : '/destinations';
      const response = await api.get<{
        success: boolean;
        data: { destinations: Destination[]; pagination: any };
      }>(url);
      return response.data.data;
    },
  });
}

export function useDestination(id: string) {
  return useQuery({
    queryKey: ['destination', id],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: Destination }>(
        `/destinations/${id}`
      );
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useDestinationSearch(query: string, minChars = 2) {
  return useQuery({
    queryKey: ['destination-search', query, minChars],
    queryFn: async () => {
      if (!query || query.length < minChars) return [];
      const response = await api.get<{ success: boolean; data: { destinations: Destination[] } }>(
        `/destinations?search=${encodeURIComponent(query)}&limit=10`
      );
      return response.data.data.destinations || [];
    },
    enabled: query.length >= minChars,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

export function useDeleteDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message?: string; error?: string }>(
        `/destinations/${id}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination-search'] });
      queryClient.invalidateQueries({ queryKey: ['destination'] });
      queryClient.invalidateQueries({ queryKey: ['destination-tree'] });
      // Hotels carry a label derived from their destination.
      queryClient.invalidateQueries({ queryKey: ['hotels'] });
    },
  });
}

/**
 * The places inside one master destination, as full records (descriptions,
 * highlights) rather than the trimmed nodes the tree returns.
 *
 * The master itself is deliberately not included: a day belongs somewhere
 * specific — Gulmarg, Pahalgam — not to the region as a whole.
 */
export function useDestinationsInMaster(masterId?: string) {
  return useQuery({
    queryKey: ['destinations-in-master', masterId],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: { destinations: Destination[] };
      }>(`/destinations?parentId=${masterId}&isActive=true&limit=100`);
      return response.data.data.destinations || [];
    },
    enabled: !!masterId,
    // The destination tree changes rarely and every day card reads this.
    staleTime: 5 * 60 * 1000,
  });
}
