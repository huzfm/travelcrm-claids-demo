'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BedDouble } from 'lucide-react';
import { HotelForm } from './hotel-form';
import type { Hotel } from '@/types';

interface HotelManualEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (hotel: Partial<Hotel>) => void;
  initialData?: Partial<Hotel>;
  mode?: 'create' | 'edit';
}

export function HotelManualEntryModal({
  open,
  onOpenChange,
  onSave,
  initialData,
  mode = 'create',
}: HotelManualEntryModalProps) {
  const [, setLocalHotel] = useState<Hotel | null>(null);

  const handleLocalSubmit = (hotel: Hotel) => {
    setLocalHotel(hotel);
    onSave(hotel);
    onOpenChange(false);
    setLocalHotel(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="h-5 w-5" />
            {mode === 'edit' ? 'Edit Hotel Details' : 'Enter Hotel Details'}
          </DialogTitle>
        </DialogHeader>

        {/* Info banner */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
          <p className="text-xs text-neutral-800">
            <strong>Pricing Required:</strong> Please add at least one room type with base price,
            extra bed price, child price, and a meal plan. This data will be included in the PDF and
            itinerary.
          </p>
        </div>

        <HotelForm
          initialData={initialData}
          saveToDb={false}
          onSubmit={async () => {}}
          onLocalSubmit={handleLocalSubmit}
          onCancel={() => onOpenChange(false)}
          forceExpandRoomTypes={true}
          forceExpandMealPlans={true}
        />
      </DialogContent>
    </Dialog>
  );
}
