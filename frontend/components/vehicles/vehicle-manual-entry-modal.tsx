'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Car } from 'lucide-react';
import { VehicleForm } from './vehicle-form';
import type { Vehicle } from '@/types';

interface VehicleManualEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vehicle: Partial<Vehicle>) => void;
  initialData?: Partial<Vehicle>;
  mode?: 'create' | 'edit';
}

export function VehicleManualEntryModal({
  open,
  onOpenChange,
  onSave,
  initialData,
  mode = 'create',
}: VehicleManualEntryModalProps) {
  const [, setLocalVehicle] = useState<Vehicle | null>(null);

  const handleLocalSubmit = (vehicle: Vehicle) => {
    setLocalVehicle(vehicle);
    onSave(vehicle);
    onOpenChange(false);
    setLocalVehicle(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {mode === 'edit' ? 'Edit Vehicle Details' : 'Enter Vehicle Details'}
          </DialogTitle>
        </DialogHeader>

        {/* Info banner */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">
            This data will be stored temporarily in your browser and included in the PDF. It will
            not be saved to the database.
          </p>
        </div>

        <VehicleForm
          initialData={initialData}
          saveToDb={false}
          onSubmit={async () => {}}
          onLocalSubmit={handleLocalSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
