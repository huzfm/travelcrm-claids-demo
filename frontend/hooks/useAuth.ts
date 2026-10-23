'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { User } from '@/types';
import { useAuthContext } from '@/components/providers';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await api.get<{ data: User }>('/auth/me');
      return response.data.data;
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (data: Partial<User>) => {
      const response = await api.patch<{ data: User }>('/auth/profile', data);
      return response.data.data;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await api.post('/auth/change-password', data);
    },
  });
}

/**
 * Hook to check if current user is in the main branch
 * Main branch users see database prices; non-main branch users can set custom prices
 */
export function useIsMainBranch() {
  const { user } = useAuthContext();

  // Check branch.isMain flag first (set by backend when branch is eager-loaded)
  if (user?.branch && 'isMain' in user.branch) {
    return user.branch.isMain === true;
  }

  // Fallback: check if branchId matches main branch ID
  // This uses the hardcoded ID that matches the seed data
  const mainBranchId = 'branch-main';
  return user?.branchId === mainBranchId;
}
