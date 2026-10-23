'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { WhatsAppConversation } from '@/types';

// Re-export templates from separate file
export { useWhatsAppTemplates, useCreateWhatsAppTemplate } from './useWhatsAppTemplates';

/**
 * Get user's WhatsApp connection status
 */
// These queries are refreshed by useRealtimeWhatsApp (SSE) the moment a
// message or status update arrives, and they're only used on the WhatsApp
// pages that mount it — so polling is just a slow safety net for a dropped
// connection, not the primary way new messages show up.
const REALTIME_FALLBACK_MS = 60_000;

export function useMyWhatsAppStatus() {
  return useQuery({
    queryKey: ['my-whatsapp-status'],
    queryFn: async () => {
      const response = await api.get<{ data: any }>('/whatsapp/my/status');
      return response.data.data;
    },
  });
}

/**
 * Connect user's WhatsApp instance (creates instance + returns QR code)
 */
export function useConnectMyWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: any }>('/whatsapp/my/connect');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-whatsapp-status'] });
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });
}

/**
 * Disconnect user's WhatsApp instance
 */
export function useDisconnectMyWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: any }>('/whatsapp/my/disconnect');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-whatsapp-status'] });
      queryClient.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });
}

/**
 * Get WhatsApp inbox (conversations list)
 */
export function useWhatsAppInbox(branchId?: string) {
  return useQuery({
    queryKey: ['whatsapp-inbox', branchId],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (branchId && branchId !== 'all') {
        params.branchId = branchId;
      }
      const response = await api.get<{
        data: { conversations: WhatsAppConversation[]; totalUnread: number; pagination: any };
      }>('/whatsapp/inbox', { params });
      return response.data.data;
    },
    refetchInterval: REALTIME_FALLBACK_MS,
  });
}

/**
 * Get conversation by contact ID
 */
export function useWhatsAppConversation(contactId: string) {
  return useQuery({
    queryKey: ['whatsapp-conversation', contactId],
    queryFn: async () => {
      const response = await api.get<{ data: any }>(`/whatsapp/conversations/${contactId}`);
      return response.data.data;
    },
    enabled: !!contactId,
    refetchInterval: REALTIME_FALLBACK_MS,
  });
}

/**
 * Get conversation by lead ID
 */
export function useWhatsAppConversationByLead(leadId: string, enabled = true) {
  return useQuery({
    queryKey: ['whatsapp-conversation-lead', leadId],
    queryFn: async () => {
      const response = await api.get<{ data: any }>(`/whatsapp/conversations/lead/${leadId}`);
      return response.data.data;
    },
    enabled: !!leadId && enabled,
    refetchInterval: 10000,
  });
}

/**
 * Send WhatsApp message
 */
export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      contactId?: string;
      leadId?: string;
      message: string;
      type?: string;
      mediaUrl?: string;
      documentUrl?: string;
      fileName?: string;
      caption?: string;
      mediaType?: 'image' | 'document' | 'video' | 'audio';
      mediaMimeType?: string;
    }) => {
      const response = await api.post<{ data: any }>('/whatsapp/send', params);
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
      if (variables.contactId) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', variables.contactId] });
      }
      if (variables.leadId) {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp-conversation-lead', variables.leadId],
        });
      }
    },
  });
}

/**
 * Send WhatsApp message to a new number
 */
export function useSendWhatsAppToNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      phoneNumber: string;
      message: string;
      type?: string;
      mediaUrl?: string;
      documentUrl?: string;
      fileName?: string;
      caption?: string;
      mediaType?: 'image' | 'document' | 'video' | 'audio';
      mediaMimeType?: string;
    }) => {
      const response = await api.post<{ data: any }>('/whatsapp/send-to-number', params);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
    },
  });
}

/**
 * Get the unified admin inbox (conversations across all branches and users).
 * ADMIN only — backend enforces the role check.
 */
export function useAdminWhatsAppInbox(params?: {
  branchId?: string;
  search?: string;
  userId?: string;
}) {
  return useQuery({
    queryKey: ['whatsapp-admin-inbox', params?.branchId, params?.search, params?.userId],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params?.branchId && params.branchId !== 'all') query.branchId = params.branchId;
      if (params?.search) query.search = params.search;
      if (params?.userId) query.userId = params.userId;
      const response = await api.get<{
        data: { conversations: WhatsAppConversation[]; totalUnread: number; pagination: any };
      }>('/whatsapp/admin/inbox', { params: query });
      return response.data.data;
    },
    refetchInterval: REALTIME_FALLBACK_MS,
  });
}

/**
 * Get a single conversation as admin (bypasses per-user instance isolation).
 * ADMIN only — backend enforces the role check.
 */
export function useAdminWhatsAppConversation(contactId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-admin-conversation', contactId],
    queryFn: async () => {
      const response = await api.get<{ data: any }>(`/whatsapp/admin/conversations/${contactId}`);
      return response.data.data;
    },
    enabled: !!contactId,
    refetchInterval: REALTIME_FALLBACK_MS,
  });
}

/**
 * Get total unread count
 */
export function useTotalUnread() {
  const { data } = useQuery({
    queryKey: ['whatsapp-unread-count'],
    queryFn: async () => {
      const response = await api.get<{ data: { totalUnread: number } }>('/whatsapp/unread-count');
      return response.data.data;
    },
    refetchInterval: 30000,
  });
  return data?.totalUnread ?? 0;
}

/**
 * Connect WhatsApp instance
 */
export function useWhatsAppConnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ branchId }: { branchId: string }) => {
      const response = await api.post<{
        data: { qrCode: string; instanceName: string; message: string; alreadyConnected?: boolean };
      }>('/whatsapp/connect', { branchId });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-branch-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
    },
  });
}

/**
 * Disconnect WhatsApp instance
 */
export function useWhatsAppDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ branchId }: { branchId: string }) => {
      const response = await api.post<{ data: { instanceName: string; message: string } }>(
        '/whatsapp/disconnect',
        { branchId }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-branch-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
    },
  });
}

/**
 * Restart WhatsApp instance
 */
export function useWhatsAppRestart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ branchId }: { branchId: string }) => {
      const response = await api.post<{ data: { instanceName: string; message: string } }>(
        '/whatsapp/restart',
        { branchId }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-branch-status'] });
    },
  });
}

/**
 * Link contact to lead
 */
export function useLinkContactToLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, leadId }: { contactId: string; leadId: string }) => {
      const response = await api.post<{ data: any }>(`/whatsapp/contacts/${contactId}/link-lead`, {
        leadId,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
    },
  });
}

/**
 * Create lead from contact
 */
export function useCreateLeadFromContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      name,
      email,
    }: {
      contactId: string;
      name?: string;
      email?: string;
    }) => {
      const response = await api.post<{ data: { lead: any } }>(
        `/whatsapp/contacts/${contactId}/create-lead`,
        {
          name,
          email,
        }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
    },
  });
}

/**
 * Get branch WhatsApp status
 */
export function useWhatsAppBranchStatus(branchId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-branch-status', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const response = await api.get<{ data: any }>(`/whatsapp/branch/${branchId}/status`);
      return response.data.data;
    },
    enabled: !!branchId,
    refetchInterval: 30000,
  });
}

/**
 * Get WhatsApp status for all branches (ADMIN)
 */
export function useWhatsAppAllBranchesStatus() {
  return useQuery({
    queryKey: ['whatsapp-all-branches-status'],
    queryFn: async () => {
      const response = await api.get<{ data: any[] }>('/whatsapp/all-branches-status');
      return response.data.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

/**
 * Get WhatsApp statistics
 */
export function useWhatsAppStats(branchId?: string, days: number = 7) {
  return useQuery({
    queryKey: ['whatsapp-stats', branchId, days],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (branchId && branchId !== 'all') {
        params.append('branchId', branchId);
      }
      params.append('days', days.toString());
      const response = await api.get<{
        data: {
          stats: {
            totalMessages: number;
            inboundMessages: number;
            outboundMessages: number;
            totalContacts: number;
            activeContacts: number;
            avgMessagesPerDay: number;
          };
          chartData: Array<{ date: string; inbound: number; outbound: number; total: number }>;
          period: string;
        };
      }>(`/whatsapp/stats?${params.toString()}`);
      return response.data.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Archive a chat
 */
export function useArchiveChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const response = await api.post<{ success: boolean }>(
        `/whatsapp/contacts/${contactId}/archive`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
    },
  });
}

/**
 * Unarchive a chat
 */
export function useUnarchiveChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const response = await api.post<{ success: boolean }>(
        `/whatsapp/contacts/${contactId}/unarchive`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-archived'] });
    },
  });
}

/**
 * Delete a chat (ADMIN only — backend enforces the role check)
 */
export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const response = await api.delete<{ success: boolean }>(`/whatsapp/contacts/${contactId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-admin-inbox'] });
    },
  });
}

/**
 * Get archived chats
 */
export function useArchivedChats() {
  return useQuery({
    queryKey: ['whatsapp-archived'],
    queryFn: async () => {
      const response = await api.get<{ data: { conversations: any[] } }>('/whatsapp/archived');
      return response.data.data;
    },
  });
}
