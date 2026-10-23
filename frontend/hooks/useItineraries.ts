'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Itinerary } from '@/types';

export function useItineraries(options?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['itineraries', options],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (options?.page) params.set('page', String(options.page));
        if (options?.limit) params.set('limit', String(options.limit));

        const response = await api.get<any>(`/itineraries?${params.toString()}`);
        const apiData = response.data;

        if (apiData && apiData.success === false) {
          throw new Error(apiData.error || 'Failed to fetch itineraries');
        }

        if (apiData && apiData.success && apiData.data) {
          return {
            itineraries: apiData.data.itineraries || [],
            pagination: apiData.data.pagination,
          };
        }
        if (Array.isArray(apiData)) {
          return { itineraries: apiData, pagination: null };
        }
        if (apiData && Array.isArray(apiData.data)) {
          return { itineraries: apiData.data, pagination: null };
        }
        return { itineraries: [], pagination: null };
      } catch (error: any) {
        if (error.response?.status === 401) {
        }
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error.response?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

/**
 * Fetch itineraries for a specific lead directly from the API
 * This filters at the backend level for better performance
 */
export function useBookedClients(options?: {
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ['booked-clients', options],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (options?.page) params.set('page', String(options.page));
        if (options?.limit) params.set('limit', String(options.limit));
        if (options?.search) params.set('search', options.search);
        if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
        if (options?.dateTo) params.set('dateTo', options.dateTo);

        const response = await api.get<any>(`/itineraries/booked-clients?${params.toString()}`);
        const apiData = response.data;

        if (apiData && apiData.success === false) {
          throw new Error(apiData.error || 'Failed to fetch booked clients');
        }

        if (apiData && apiData.success && apiData.data) {
          return {
            clients: apiData.data.clients || [],
            pagination: apiData.data.pagination,
          };
        }
        return { clients: [], pagination: null };
      } catch (error: any) {
        if (error.response?.status === 401) throw error;
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      if (error.response?.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export function useLeadItineraries(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-itineraries', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      try {
        const response = await api.get<any>(`/itineraries?leadId=${leadId}`);
        const apiData = response.data;

        if (apiData && apiData.success === false) {
          throw new Error(apiData.error || 'Failed to fetch lead itineraries');
        }

        // Handle different response formats
        if (apiData && apiData.data) {
          if (Array.isArray(apiData.data)) {
            return apiData.data;
          }
          if (apiData.data.itineraries && Array.isArray(apiData.data.itineraries)) {
            return apiData.data.itineraries;
          }
        }
        if (Array.isArray(apiData)) {
          return apiData;
        }
        return [];
      } catch (error: any) {
        console.error('Failed to fetch lead itineraries:', error);
        return [];
      }
    },
    enabled: !!leadId,
  });
}

export function useItineraryTemplates() {
  return useQuery({
    queryKey: ['itinerary-templates'],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: { templates: any[]; templateItineraries: any[]; total: number };
      }>('/itineraries/templates');
      const data = response.data.data;
      return {
        templates: data.templates || [],
        templateItineraries: data.templateItineraries || [],
        total: data.total || 0,
      };
    },
  });
}

export function useItinerary(id: string) {
  return useQuery({
    queryKey: ['itinerary', id],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: { itinerary: Itinerary } }>(
        `/itineraries/${id}`
      );
      const itinerary = response.data.data.itinerary;
      // Parse JSON string fields that may come from database
      if (itinerary && typeof itinerary.quotes === 'string') {
        try {
          itinerary.quotes = JSON.parse(itinerary.quotes);
        } catch {}
      }
      if (itinerary && typeof itinerary.options === 'string') {
        try {
          itinerary.options = JSON.parse(itinerary.options);
        } catch {}
      }
      // Parse daysJson if it's a string (comes from database as JSON string)
      if (itinerary && typeof itinerary.daysJson === 'string') {
        try {
          itinerary.daysJson = JSON.parse(itinerary.daysJson);
        } catch {}
      }
      return itinerary;
    },
    enabled: !!id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateItinerary() {
  return useMutation({
    // `draftId`: the incomplete itinerary this finishes; the server deletes it.
    mutationFn: async (data: Partial<Itinerary> & { draftId?: string }) => {
      const response = await api.post<{ success: boolean; data: { itinerary: Itinerary } }>(
        '/itineraries',
        data
      );
      return response.data.data.itinerary;
    },
  });
}

export function useBulkCreateFromTemplate() {
  return useMutation({
    mutationFn: async (data: { templateId: string; leadIds: string[]; titlePrefix?: string }) => {
      const response = await api.post<{
        success: boolean;
        data: {
          created: Array<{ leadId: string; leadName: string; itineraryId: string }>;
          failed: Array<{ leadId: string; leadName: string; error: string }>;
          totalRequested: number;
          totalCreated: number;
          totalFailed: number;
        };
      }>('/itineraries/bulk-from-template', data);
      return response.data.data;
    },
  });
}

export function useUpdateItinerary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Itinerary> }) => {
      const response = await api.patch<{ data: Itinerary }>(`/itineraries/${id}`, data);
      return response.data.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['lead-itineraries'] });
    },
  });
}

export function useGenerateItineraryPdf() {
  return useMutation({
    mutationFn: async (options: {
      id: string;
      type?: 'premium' | 'standard';
      hotelIds?: string[];
    }) => {
      const response = await api.post<{
        data: { pdfUrl: string; pdfPath: string; fileName?: string; version: number };
      }>(`/itineraries/${options.id}/pdf`, {
        type: options.type || 'premium',
        hotelIds: options.hotelIds || [],
      });
      return response.data.data;
    },
  });
}

export function useShareItinerary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      via,
      recipientPhone,
    }: {
      id: string;
      via?: string;
      recipientPhone?: string;
    }) => {
      const response = await api.post<{
        data: { message: string; sharedVia: string; shareUrl?: string };
      }>(`/itineraries/${id}/share`, {
        via,
        recipientPhone,
      });
      return response.data.data;
    },
    onSuccess: (_data, { id }) => {
      // Sharing sets `sharedVia` server-side, which flips the Draft/Shared
      // badge everywhere the itinerary is listed — the lead's itinerary tab
      // otherwise keeps showing "Draft" from its stale cache until the page
      // is reloaded.
      queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['lead-itineraries'] });
    },
  });
}

export function useSendDocumentMessage() {
  return useMutation({
    mutationFn: async ({
      phoneNumber,
      caption,
      fileName,
      base64Data,
    }: {
      phoneNumber: string;
      caption?: string;
      fileName?: string;
      base64Data: string;
    }) => {
      const response = await api.post<{
        data: { message: any; waMessageId: string; contactId: string };
      }>('/whatsapp/send-document', {
        phoneNumber,
        caption,
        fileName,
        base64Data,
      });
      return response.data.data;
    },
  });
}

export function useSaveAsTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const response = await api.post<{ data: { template: Itinerary } }>(
        `/itineraries/${id}/template`,
        { name }
      );
      return response.data.data.template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-templates'] });
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
    },
  });
}

export function useDeleteItineraryTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/itineraries/templates/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-templates'] });
    },
  });
}

export function useCreateFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      leadId,
      data,
    }: {
      templateId: string;
      leadId: string;
      data?: Partial<Itinerary>;
    }) => {
      const response = await api.post<{ success: boolean; data: { itinerary: Itinerary } }>(
        '/itineraries',
        { templateId, leadId, ...data }
      );
      return response.data.data.itinerary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
    },
  });
}

export function useDeleteItinerary() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/itineraries/${id}`);
      return id;
    },
  });
}

export function useToggleTemplateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      isTemplate,
      templateName,
    }: {
      id: string;
      isTemplate?: boolean;
      templateName?: string;
    }) => {
      const response = await api.patch<{ success: boolean; data: { itinerary: Itinerary } }>(
        `/itineraries/${id}/template`,
        { isTemplate, templateName }
      );
      return response.data.data.itinerary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-templates'] });
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
    },
  });
}

export function useRemoveTemplateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/itineraries/template-itinerary/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-templates'] });
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
    },
  });
}

/**
 * How many itineraries each saved template has produced, keyed by template id.
 *
 * A missing key means "never used" as far as the data shows; the suggestion
 * ranker treats an absent library-wide result as "unknown" and abstains, so a
 * failed fetch degrades to ranking without the signal rather than to zeros.
 */
export function useTemplateUsage() {
  return useQuery({
    queryKey: ['itinerary-template-usage'],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: { usage: Record<string, number> };
      }>('/itineraries/templates/usage');
      return response.data.data.usage || {};
    },
    // Counts move slowly and every wizard session reads them.
    staleTime: 5 * 60 * 1000,
  });
}
