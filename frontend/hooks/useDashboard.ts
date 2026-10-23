import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  DashboardOverview,
  DueTripScope,
  DueTripsResponse,
  FollowUpSummary,
  SalesPeriod,
  SalesStats,
  TripTimings,
} from '@/types/dashboard.types';

/**
 * The dashboard loads every panel in a single /dashboard/overview call, then
 * each panel can refetch on its own when the user changes its filter (the
 * sales period toggle, the due-trips scope tabs).
 *
 * Recording or deleting a trip payment invalidates the `['dashboard']` query
 * group (see useTrips.ts / useTripFinance.ts), but React Query only
 * force-refetches an invalidated query immediately if it is currently
 * mounted — e.g. recording a payment from the Trips page, where the
 * Dashboard isn't mounted, just marks it stale. The app also disables
 * refetchOnWindowFocus globally (components/providers.tsx), so nothing was
 * left to pick that staleness up short of a hard reload. `refetchOnMount:
 * 'always'` guarantees a fresh fetch every time the Dashboard is opened, and
 * refetchOnWindowFocus here (overriding the global default) catches the case
 * where the Dashboard was already open and just regains focus/visibility.
 */

const REFRESH_MS = 60 * 1000;

const ALWAYS_FRESH = {
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: true,
};

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const res = await api.get('dashboard/overview');
      return res.data.data;
    },
    staleTime: 30 * 1000,
    refetchInterval: REFRESH_MS,
    ...ALWAYS_FRESH,
  });
}

export function useSalesStats(period: SalesPeriod, enabled = true) {
  return useQuery<SalesStats>({
    queryKey: ['dashboard', 'sales-stats', period],
    queryFn: async () => {
      const res = await api.get('dashboard/sales-stats', { params: { period } });
      return res.data.data;
    },
    staleTime: 30 * 1000,
    enabled,
    ...ALWAYS_FRESH,
  });
}

export function useFollowUpSummary() {
  return useQuery<FollowUpSummary>({
    queryKey: ['dashboard', 'followups'],
    queryFn: async () => {
      const res = await api.get('dashboard/followups');
      return res.data.data;
    },
    staleTime: 30 * 1000,
    ...ALWAYS_FRESH,
  });
}

export function useTripTimings() {
  return useQuery<TripTimings>({
    queryKey: ['dashboard', 'trip-timings'],
    queryFn: async () => {
      const res = await api.get('dashboard/trip-timings');
      return res.data.data;
    },
    staleTime: 30 * 1000,
    ...ALWAYS_FRESH,
  });
}

export function useDueTrips(scope: DueTripScope, enabled = true) {
  return useQuery<DueTripsResponse>({
    queryKey: ['dashboard', 'due-trips', scope],
    queryFn: async () => {
      const res = await api.get('dashboard/due-trips', { params: { scope } });
      return res.data.data;
    },
    staleTime: 30 * 1000,
    enabled,
    ...ALWAYS_FRESH,
  });
}
