'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { LeadSource } from '@/types';

export interface AssignmentRule {
  id: string;
  branchId: string;
  userId: string;
  source: LeadSource;
  priority: number;
  isActive: boolean;
  lastAssignedAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string };
  branch?: { id: string; name: string };
}

export function useAssignmentRules(branchId?: string) {
  return useQuery({
    queryKey: ['assignment-rules', branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      const response = await api.get<{ data: AssignmentRule[] }>('/assignment-rules', { params });
      return response.data.data;
    },
  });
}

export function useCreateAssignmentRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      assignees: { userId: string; priority: number }[];
      source: string;
      branchId?: string;
    }) => {
      const response = await api.post<{ data: AssignmentRule[] }>('/assignment-rules', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
    },
  });
}

export function useUpdateAssignmentRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AssignmentRule> }) => {
      const response = await api.patch<{ data: AssignmentRule }>(`/assignment-rules/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
    },
  });
}

export function useDeleteAssignmentRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assignment-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-rules'] });
    },
  });
}
