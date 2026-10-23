import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  Trip,
  TripsResponse,
  TripFilters,
  TripStats,
  RecordPaymentInput,
  PaymentsResponse,
} from '@/types/trip.types';

// Get all trips with filters
export function useTrips(filters: TripFilters = {}) {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== 'ALL') {
    params.append('status', filters.status);
  }
  if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
    params.append('paymentStatus', filters.paymentStatus);
  }
  if (filters.destination) {
    params.append('destination', filters.destination);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }
  if (filters.startDateFrom) {
    params.append('startDateFrom', filters.startDateFrom);
  }
  if (filters.startDateTo) {
    params.append('startDateTo', filters.startDateTo);
  }
  if (filters.endDateFrom) {
    params.append('endDateFrom', filters.endDateFrom);
  }
  if (filters.endDateTo) {
    params.append('endDateTo', filters.endDateTo);
  }

  const queryString = params.toString();
  const url = `trips${queryString ? `?${queryString}` : ''}`;

  return useQuery<TripsResponse>({
    queryKey: ['trips', filters],
    queryFn: async () => {
      try {
        const response = await api.get(url);
        return response.data;
      } catch (err: any) {
        throw err;
      }
    },
    // Keep showing the previous page/filter's trips while the next one loads,
    // instead of blanking the table on every filter change.
    placeholderData: keepPreviousData,
  });
}

// Get trip by ID
export function useTrip(id: string) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => api.get<TripsResponse>(`trips/${id}`).then(res => res.data),
    enabled: !!id,
  });
}

// Get trip stats
export function useTripStats(branchId?: string) {
  const url = branchId ? `trips/stats?branchId=${branchId}` : 'trips/stats';

  return useQuery<{ success: boolean; data: TripStats }>({
    queryKey: ['tripStats', branchId],
    queryFn: () => api.get(url).then(res => res.data),
  });
}

// Get upcoming trips
export function useUpcomingTrips(limit: number = 10) {
  return useQuery({
    queryKey: ['upcomingTrips', limit],
    queryFn: () => api.get<TripsResponse>(`trips/upcoming?limit=${limit}`).then(res => res.data),
  });
}

// Get payments for a specific trip
export function useTripPayments(tripId: string, enabled: boolean = true) {
  return useQuery<PaymentsResponse>({
    queryKey: ['tripPayments', tripId],
    queryFn: () => api.get(`trips/${tripId}/payments`).then(res => res.data),
    enabled: !!tripId && enabled,
  });
}

// Record a new payment
export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, data }: { tripId: string; data: RecordPaymentInput }) => {
      const res = await api.post(`trips/${tripId}/payments`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['tripPayments', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['tripStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Delete a payment
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, paymentId }: { tripId: string; paymentId: string }) => {
      const res = await api.delete(`trips/${tripId}/payments/${paymentId}`);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['tripPayments', variables.tripId] });
      queryClient.invalidateQueries({ queryKey: ['tripStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Update trip (partial update)
export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Trip> }) => {
      const res = await api.put(`trips/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['tripStats'] });
    },
  });
}
