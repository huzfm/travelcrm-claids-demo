'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { AuditLog, AuditAction, AuditEntity } from '@/types';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entity?: AuditEntity;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  branchId?: string;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.entityId) params.append('entityId', filters.entityId);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.branchId) params.append('branchId', filters.branchId);

      const response = await api.get<{
        data: {
          logs: AuditLog[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        };
      }>('/audit', { params });
      return response.data.data;
    },
  });
}

export function useLeadAuditTrail(leadId: string) {
  return useQuery({
    queryKey: ['lead-audit-trail', leadId],
    queryFn: async () => {
      const response = await api.get<{ data: { logs: AuditLog[] } }>(`/audit/lead/${leadId}`);
      return response.data.data.logs;
    },
    enabled: !!leadId,
  });
}
