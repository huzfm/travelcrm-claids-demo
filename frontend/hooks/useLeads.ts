'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Lead, LeadFilters, Activity, FollowUp, LeadTag, DuplicateLead, User } from '@/types';

interface PaginationParams {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.source) params.append('source', filters.source);
      if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
      if (filters.search) params.append('search', filters.search);
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      const response = await api.get('/leads', { params });
      return response.data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const response = await api.get<{ data: { lead: Lead } }>(`/leads/${id}`);
      return response.data.data.lead;
    },
    enabled: !!id,
  });
}

export function useLeadActivities(leadId: string) {
  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      const response = await api.get<{
        data: { activities: Activity[]; pagination: PaginationParams };
      }>(`/leads/${leadId}/activities`);
      return response.data.data.activities;
    },
    enabled: !!leadId,
  });
}

export function useLeadFollowUps(leadId: string) {
  return useQuery({
    queryKey: ['lead-followups', leadId],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: FollowUp[] }>(
        `/leads/${leadId}/followups`
      );
      return response.data.data ?? [];
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Lead>) => {
      const response = await api.post<{ data: Lead }>('/leads', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Lead> & { assignedTo?: string | null };
    }) => {
      const response = await api.patch<{ data: Lead }>(`/leads/${id}`, data);
      return response.data.data;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['lead', id] });
      const previousLead = queryClient.getQueryData(['lead', id]);
      queryClient.setQueryData(['lead', id], (old: Lead | undefined) =>
        old ? { ...old, ...data } : old
      );
      return { previousLead };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousLead !== undefined) {
        queryClient.setQueryData(['lead', id], context.previousLead);
      }
    },
    onSuccess: updatedLead => {
      queryClient.setQueryData(['lead', updatedLead.id], updatedLead);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useAddActivity() {
  return useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: Partial<Activity> }) => {
      const response = await api.post<{ data: Activity }>(`/leads/${leadId}/activities`, data);
      return response.data.data;
    },
  });
}

export function useBulkImportLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post<{
        data: { summary: { created: number; duplicates: number; errors: number; total: number } };
      }>('/leads/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// ============================================
// NEW: Bulk Export
// ============================================
export function useBulkExportLeads() {
  return useMutation({
    mutationFn: async (
      filters: Partial<LeadFilters> & { startDate?: string; endDate?: string }
    ) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.source) params.append('source', filters.source);
      if (filters.search) params.append('search', filters.search);
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get('/leads/export', { params });
      return response.data;
    },
  });
}

// ============================================
// NEW: Lead Tags
// ============================================
export function useLeadTags(branchId?: string) {
  return useQuery({
    queryKey: ['lead-tags', branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      const response = await api.get<{ data: { tags: LeadTag[] } }>('/leads/tags', { params });
      return response.data.data.tags;
    },
  });
}

export function useCreateLeadTag() {
  return useMutation({
    mutationFn: async (data: { name: string; color?: string; branchId: string }) => {
      const response = await api.post<{ data: { tag: LeadTag } }>('/leads/tags', data);
      return response.data.data.tag;
    },
  });
}

export function useAssignLeadTags() {
  return useMutation({
    mutationFn: async ({ leadId, tagIds }: { leadId: string; tagIds: string[] }) => {
      const response = await api.post<{ data: { tags: LeadTag[] } }>(`/leads/${leadId}/tags`, {
        tagIds,
      });
      return response.data.data.tags;
    },
  });
}

export function useLeadTagsById(leadId: string) {
  return useQuery({
    queryKey: ['lead-tags-detail', leadId],
    queryFn: async () => {
      const response = await api.get<{ data: { tags: LeadTag[] } }>(`/leads/${leadId}/tags`);
      return response.data.data.tags;
    },
    enabled: !!leadId,
  });
}

// ============================================
// NEW: Duplicate Leads
// ============================================
export function useDuplicateLeads(search?: string, branchId?: string) {
  return useQuery({
    queryKey: ['duplicate-leads', search, branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (branchId) params.append('branchId', branchId);
      const response = await api.get<{ data: { leads: DuplicateLead[]; total: number } }>(
        '/leads/duplicates',
        { params }
      );
      return response.data.data;
    },
  });
}

export function useMergeLeads() {
  return useMutation({
    mutationFn: async ({
      primaryLeadId,
      secondaryLeadId,
    }: {
      primaryLeadId: string;
      secondaryLeadId: string;
    }) => {
      const response = await api.post<{
        data: { mergedLead: Lead; mergedFrom: { id: string; name: string } };
      }>('/leads/merge', {
        primaryLeadId,
        secondaryLeadId,
      });
      return response.data.data;
    },
  });
}

// ============================================
// TRANSFER LEAD - Staff can transfer to another staff in same branch
// ============================================
export function useTransferLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      newAssigneeId,
      reason,
    }: {
      leadId: string;
      newAssigneeId: string;
      reason?: string;
    }) => {
      const response = await api.post<{
        data: {
          lead: Lead;
          transferredFrom: string;
          transferredTo: string;
        };
      }>(`/leads/${leadId}/transfer`, {
        newAssigneeId,
        reason,
      });
      return response.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead', variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
// Get all branch staff for transfer dialog
export function useBranchStaff(branchId?: string) {
  return useQuery({
    queryKey: ['branch-staff', branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      params.append('includeAllStaff', 'true');
      const response = await api.get<{ data: { users: User[]; total: number } }>('/users', {
        params,
      });
      return response.data.data.users;
    },
    enabled: !!branchId,
  });
}

// ============================================
// DELETE LEAD - Admin only
// ============================================
export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      const response = await api.delete<{ success: boolean; data: { message: string } }>(
        `/leads/${leadId}`
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// ============================================
// BULK DELETE LEADS - Admin only
// ============================================
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.post<{
        success: boolean;
        data: { message: string; deletedCount: number; deletedIds: string[] };
      }>('/leads/bulk-delete', { ids });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

