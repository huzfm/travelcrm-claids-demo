'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

interface AnalyticsResponse {
  success: boolean;
  data: {
    pipeline?: Record<string, number>;
    sources?: Record<string, number>;
    totalLeads?: number;
    bookedLeads?: number;
    conversionRate?: number;
    teamStats?: Array<{
      user: { id: string; name: string; role: string; branch: { name: string } };
      stats: { leadsAssigned: number; followUpsDone: number; bookingsClosed: number };
    }>;
  };
}

export function useAnalytics(dateRange?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', dateRange.from);
      if (dateRange?.to) params.append('endDate', dateRange.to);

      try {
        const [pipelineRes, sourcesRes, conversionRes, teamRes] = await Promise.all([
          api.get<AnalyticsResponse>('/analytics/pipeline', { params }),
          api.get<AnalyticsResponse>('/analytics/sources', { params }),
          api.get<AnalyticsResponse>('/analytics/conversion', { params }),
          api.get<AnalyticsResponse>('/analytics/team', { params }),
        ]);

        return {
          pipeline: pipelineRes.data.data,
          sources: sourcesRes.data.data,
          conversion: conversionRes.data.data,
          team: teamRes.data.data,
        };
      } catch (error) {
        console.error('Analytics fetch failed:', error);
        throw error;
      }
    },
  });
}
