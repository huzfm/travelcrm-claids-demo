'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  variables?: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const response = await api.get<{ data: WhatsAppTemplate[] }>('/whatsapp/templates');
      return response.data.data;
    },
  });
}

export function useCreateWhatsAppTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; content: string; category: string }) => {
      const response = await api.post<{ data: WhatsAppTemplate }>('/whatsapp/templates', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
  });
}

export function useUpdateWhatsAppTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WhatsAppTemplate> }) => {
      const response = await api.patch<{ data: WhatsAppTemplate }>(
        `/whatsapp/templates/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
  });
}

export function useDeleteWhatsAppTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/whatsapp/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
  });
}
