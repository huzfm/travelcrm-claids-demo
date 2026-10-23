'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { User } from '@/types';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<{ data: { users: User[]; total: number } }>('/users');
      return response.data.data.users;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await api.post<{ data: User }>('/users', data);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await api.patch<{ data: User }>(`/users/${id}`, data);
      return response.data.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', data.id] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<{ data: User }>(`/users/${id}`, { isActive: false });
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    /** `transferTo` takes over their leads and other work; the server defaults it to you. */
    mutationFn: async ({ id, transferTo }: { id: string; transferTo?: string }) => {
      await api.delete(`/users/${id}`, { params: transferTo ? { transferTo } : undefined });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });
}

/** A single user, for the edit page. */
export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await api.get<{ data: { user: User } }>(`/users/${id}`);
      return response.data.data.user;
    },
    enabled: Boolean(id),
  });
}
