'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { FollowUp, FollowUpDashboard, CalendarEvent } from '@/types';

export function useFollowUps() {
  return useQuery({
    queryKey: ['followups'],
    queryFn: async () => {
      const response = await api.get<{ data: { followUps: FollowUp[]; total: number } }>(
        '/followups'
      );
      return response.data.data.followUps;
    },
  });
}

export function useFollowUpDashboard() {
  return useQuery({
    queryKey: ['followups-dashboard'],
    queryFn: async () => {
      const response = await api.get<{ data: FollowUpDashboard }>('/followups/dashboard');
      return response.data.data;
    },
  });
}

// ============================================
// NEW: Calendar View
// ============================================
export function useFollowUpCalendar(start: string, end: string, assignedTo?: string) {
  return useQuery({
    queryKey: ['followups-calendar', start, end, assignedTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('start', start);
      params.append('end', end);
      if (assignedTo) params.append('assignedTo', assignedTo);
      const response = await api.get<{ data: { events: CalendarEvent[]; total: number } }>(
        '/followups/calendar',
        { params }
      );
      return response.data.data.events;
    },
    enabled: !!start && !!end,
  });
}

export function useCreateFollowUp() {
  return useMutation({
    mutationFn: async (data: Partial<FollowUp>) => {
      const response = await api.post<{ data: FollowUp }>('/followups', data);
      return response.data.data;
    },
  });
}

export function useUpdateFollowUp() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FollowUp> }) => {
      const response = await api.patch<{ data: FollowUp }>(`/followups/${id}`, data);
      return response.data.data;
    },
  });
}

export function useMarkFollowUpDone() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: FollowUp }>(`/followups/${id}`, { status: 'DONE' });
      return response.data.data;
    },
  });
}

export function useRescheduleFollowUp() {
  return useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: string }) => {
      const response = await api.patch<{ data: FollowUp }>(`/followups/${id}`, { scheduledAt });
      return response.data.data;
    },
  });
}

export function useDeleteFollowUp() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/followups/${id}`);
      return response.data.data;
    },
  });
}
