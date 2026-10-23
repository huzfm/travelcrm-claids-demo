'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Branch } from '@/types';

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get<{ data: { branches: Branch[]; total: number } }>('/branches?isActive=true');
      return response.data.data.branches;
    },
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Branch>) => {
      const response = await api.post<{ data: Branch }>('/branches', data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Branch> }) => {
      const response = await api.patch<{ data: Branch }>(`/branches/${id}`, data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/branches/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
}
