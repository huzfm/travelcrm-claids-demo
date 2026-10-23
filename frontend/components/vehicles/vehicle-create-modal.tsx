'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VehicleForm } from './vehicle-form';
import api from '@/lib/axios';
import { toast } from 'sonner';
import type { Vehicle } from '@/types/vehicle.types';

interface VehicleCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (vehicle: Vehicle) => void;
}

export function VehicleCreateModal({ open, onOpenChange, onCreated }: VehicleCreateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (vehicleData: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const res = await api.post('/vehicles', vehicleData);
      if (res.data.success) {
        const createdVehicle = res.data.data as Vehicle;
        toast.success('Vehicle created successfully!');
        // Invalidate vehicle queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        queryClient.invalidateQueries({ queryKey: ['vehicle-search'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles-all-new'] });
        onCreated(createdVehicle);
        onOpenChange(false);
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.errors?.[0]?.msg ||
        'Failed to create vehicle';
      toast.error(errorMsg);
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
            <span className="text-2xl">🚗</span>
            Create New Vehicle
          </DialogTitle>
        </DialogHeader>
        <VehicleForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
