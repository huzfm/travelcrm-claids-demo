import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { TripLifecycleStatus } from '@/types/dashboard.types';

// ─── Trip lifecycle status ───────────────────────────────────────────────────

export function useUpdateTripStatus(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: TripLifecycleStatus) => {
      const res = await api.patch(`trips/${tripId}/status`, { status });
      return res.data.data;
    },
    onSuccess: () => {
      // The header's lifecycle badge and the dashboard's revenue figure both
      // read off this trip's status.
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
