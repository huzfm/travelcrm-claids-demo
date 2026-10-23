import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { toast } from 'sonner';

export interface AdCampaign {
  id: string;
  branchId: string;
  name: string;
  platform: 'GOOGLE' | 'META';
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  budget: number;
  spent: number;
  startDate: string;
  endDate?: string;
  notes?: string;
  googleAccountId?: string;
  googleCampaignId?: string;
  googleRefreshToken?: string;
  metaAccountId?: string;
  metaAdSetId?: string;
  metaAccessToken?: string;
  leadsCount: number;
  branch?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface AdCampaignStats {
  totalSpend: number;
  totalLeads: number;
  activeCampaigns: number;
  costPerLead: number;
  bestCampaign: {
    id: string;
    name: string;
    platform: string;
    leadsCount: number;
    spent: number;
  } | null;
  byPlatform: Record<string, number>;
  totalCampaigns: number;
}

export interface CreateCampaignInput {
  name: string;
  platform: 'GOOGLE' | 'META';
  branchId: string;
  budget?: number;
  startDate: string;
  endDate?: string;
  notes?: string;
  googleAccountId?: string;
  googleCampaignId?: string;
  metaAccountId?: string;
  metaAdSetId?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'ENDED';
  budget?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export function useAdCampaigns(
  filters: { branchId?: string; status?: string; platform?: string } = {}
) {
  return useQuery({
    queryKey: ['ad-campaigns', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.status) params.append('status', filters.status);
      if (filters.platform) params.append('platform', filters.platform);

      const response = await api.get(`/ad-campaigns?${params.toString()}`);
      return response.data.data;
    },
  });
}

export function useAdCampaign(id: string) {
  return useQuery({
    queryKey: ['ad-campaign', id],
    queryFn: async () => {
      const response = await api.get(`/ad-campaigns/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useAdCampaignStats(branchId?: string) {
  return useQuery({
    queryKey: ['ad-campaigns-stats', branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : '';
      const response = await api.get(`/ad-campaigns/stats${params}`);
      return response.data.data;
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCampaignInput) => {
      const response = await api.post('/ad-campaigns', data);
      return response.data.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      toast.success('Campaign created successfully');
      return data.campaign;
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to create campaign');
      throw error;
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCampaignInput }) => {
      const response = await api.patch(`/ad-campaigns/${id}`, data);
      return response.data.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ad-campaign', data.id] });
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns-stats'] });
      toast.success('Campaign updated successfully');
      return data;
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to update campaign');
      throw error;
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/ad-campaigns/${id}`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns-stats'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to delete campaign');
      throw error;
    },
  });
}

export function useLinkLeadToCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, leadId }: { campaignId: string; leadId: string }) => {
      const response = await api.post(`/ad-campaigns/${campaignId}/leads`, { leadId });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['ad-campaign', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns-stats'] });
      toast.success('Lead linked to campaign');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to link lead');
      throw error;
    },
  });
}

export function useSyncGoogleAds() {
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.post(`/ad-campaigns/${campaignId}/sync/google`);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Google Ads sync initiated');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to sync Google Ads');
      throw error;
    },
  });
}

export function useSyncMetaAds() {
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.post(`/ad-campaigns/${campaignId}/sync/meta`);
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Meta Ads sync initiated');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to sync Meta Ads');
      throw error;
    },
  });
}

export function useGetGoogleAuthUrl() {
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.get(`/ad-campaigns/auth/google?campaignId=${campaignId}`);
      return response.data.data;
    },
  });
}

export function useGetMetaAuthUrl() {
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.get(`/ad-campaigns/auth/meta?campaignId=${campaignId}`);
      return response.data.data;
    },
  });
}

export function useConnectGoogle() {
  return useMutation({
    mutationFn: async ({ state, code }: { state: string; code: string }) => {
      const response = await api.post('/ad-campaigns/auth/google/callback', { code, state });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Google account connected successfully');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to connect Google account');
      throw error;
    },
  });
}

export function useConnectMeta() {
  return useMutation({
    mutationFn: async ({ state, code }: { state: string; code: string }) => {
      const response = await api.post('/ad-campaigns/auth/meta/callback', { code, state });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Meta account connected successfully');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to connect Meta account');
      throw error;
    },
  });
}

// Simple account-level OAuth (no campaign required)
export function useGetGoogleAccountAuthUrl() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get('/ad-campaigns/auth/google/account');
      return response.data.data;
    },
  });
}

export function useConnectGoogleAccount() {
  return useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      const response = await api.post('/ad-campaigns/auth/google/account/callback', { code, state });
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Google account connected successfully');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to connect Google account');
      throw error;
    },
  });
}

export function useAdConnectionStatus() {
  return useQuery<{ google: { connected: boolean }; meta: { connected: boolean } }>({
    queryKey: ['ad-connection-status'],
    queryFn: async () => {
      const response = await api.get('/ad-campaigns/connections/status');
      return response.data.data;
    },
  });
}

export interface MetaConnection {
  connected: boolean;
  tokenValid?: boolean;
  userName?: string;
  expiresAt?: string | null;
  connectedAt?: string;
  pages?: { pageId: string; name: string; subscribed: boolean; subscribeError?: string | null }[];
  adAccounts?: { id: string; accountId: string; name: string; currency: string; active: boolean }[];
}

export function useMetaConnection() {
  return useQuery<MetaConnection>({
    queryKey: ['meta-connection'],
    queryFn: async () => {
      const response = await api.get('/ad-campaigns/meta/connection');
      return response.data.data;
    },
  });
}

export function useResubscribeMetaPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pageId: string) => {
      const response = await api.post(`/ad-campaigns/meta/pages/${pageId}/subscribe`);
      return response.data.data;
    },
    onSuccess: data => {
      toast.success(data?.message || 'Page subscribed');
      queryClient.invalidateQueries({ queryKey: ['meta-connection'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to subscribe Page');
      queryClient.invalidateQueries({ queryKey: ['meta-connection'] });
    },
  });
}

export function useDisconnectMeta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.delete('/ad-campaigns/meta/connection');
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Meta account disconnected');
      queryClient.invalidateQueries({ queryKey: ['meta-connection'] });
      queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to disconnect Meta');
    },
  });
}

export function useGetMetaAccountAuthUrl() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get('/ad-campaigns/auth/meta/account');
      return response.data.data;
    },
  });
}

export function useConnectMetaAccount() {
  return useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      const response = await api.post('/ad-campaigns/auth/meta/account/callback', { code, state });
      return response.data.data;
    },
    onSuccess: data => {
      toast.success(data?.message || 'Meta account connected successfully');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to connect Meta account');
      throw error;
    },
  });
}
