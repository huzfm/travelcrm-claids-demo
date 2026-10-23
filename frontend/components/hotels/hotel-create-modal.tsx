'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HotelForm } from './hotel-form';
import api from '@/lib/axios';
import { toast } from 'sonner';
import type { Hotel } from '@/types';

interface HotelCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (hotel: Hotel) => void;
}

export function HotelCreateModal({ open, onOpenChange, onCreated }: HotelCreateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (hotelData: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const res = await api.post('/hotels', hotelData);
      if (res.data.success) {
        const createdHotel = res.data.data as Hotel;
        toast.success('Hotel created successfully!');
        // Invalidate hotel queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['hotels'] });
        queryClient.invalidateQueries({ queryKey: ['hotel-search'] });
        queryClient.invalidateQueries({ queryKey: ['hotels-all-new'] });
        onCreated(createdHotel);
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('Failed to create hotel');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🏨</span>
            Create New Hotel
          </DialogTitle>
        </DialogHeader>
        <HotelForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
