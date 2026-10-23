'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TripType, ItineraryOption } from '@/types';

const TRIP_TYPES = [
  { value: 'HONEYMOON', label: 'Honeymoon' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'SOLO', label: 'Solo' },
  { value: 'GROUP', label: 'Group' },
  { value: 'DOMESTIC', label: 'Domestic' },
  { value: 'INTERNATIONAL', label: 'International' },
];

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setTitle: (v: string) => void;
  destination: string;
  setDestination: (v: string) => void;
  tripId: string;
  tripType: TripType | undefined;
  setTripType: (v: TripType) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  travelers: number;
  setTravelers: (v: number) => void;
  onSave: () => void;
  markChanged: () => void;
  quotes?: Array<{
    label: string;
    description?: string;
    totalCost: number;
    breakdown?: {
      hotelCost?: number;
      vehicleCost?: number;
      activityCost?: number;
      miscCost?: number;
    };
    features?: string[];
    additionalCharges?: Array<{ label: string; amount: number }>;
    marginPercent?: number;
    gstPercent?: number;
    dayAlternatives?: Record<string, { hotelAltIndex?: number; vehicleAltIndex?: number }>;
  }>;
  setQuotes?: (
    quotes: Array<{
      label: string;
      description?: string;
      totalCost: number;
      breakdown?: {
        hotelCost?: number;
        vehicleCost?: number;
        activityCost?: number;
        miscCost?: number;
      };
      features?: string[];
      additionalCharges?: Array<{ label: string; amount: number }>;
      marginPercent?: number;
      gstPercent?: number;
      dayAlternatives?: Record<string, { hotelAltIndex?: number; vehicleAltIndex?: number }>;
    }>
  ) => void;
  selectedQuotes?: number[];
  setSelectedQuotes?: (quotes: number[]) => void;
  options?: ItineraryOption[];
  setOptions?: (options: ItineraryOption[]) => void;
  selectedOptions?: number[];
  setSelectedOptions?: (options: number[]) => void;
  days?: Array<{
    dayNumber: number;
    selectedRoomType?: { basePrice: number; extraBedPrice?: number; childPrice?: number };
    selectedMealPlan?: { pricePerNight: number };
    vehicleRatePerDay?: number;
    activities: Array<{ cost?: number }>;
  }>;
  // totalCost is now DERIVED — read from quotes/options, NOT a separate setter
  // To change price, use PricingDialog or update quotes/options
}

export function EditTripDialog({
  open,
  onOpenChange,
  title,
  setTitle,
  destination,
  setDestination,
  tripId,
  tripType,
  setTripType,
  startDate,
  setStartDate,
  travelers,
  setTravelers,
  onSave,
  markChanged,
}: EditTripDialogProps) {
  const handleSave = () => {
    onOpenChange(false);
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label>Trip Title</Label>
            <Input
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                markChanged();
              }}
              placeholder="e.g., John Smith's Dubai Trip"
            />
          </div>

          {/* Destination & Trip ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Destination</Label>
              <Input
                value={destination}
                onChange={e => {
                  setDestination(e.target.value);
                  markChanged();
                }}
                placeholder="Dubai, Bali, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Trip ID</Label>
              <Input
                value={tripId || 'Auto-generated'}
                readOnly
                disabled
                className="bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Trip ID is auto-generated and cannot be edited
              </p>
            </div>
          </div>

          {/* Trip Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Trip Type</Label>
              <Select
                value={tripType || ''}
                onValueChange={v => {
                  setTripType(v as TripType);
                  markChanged();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {TRIP_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Date & Travelers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  markChanged();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Travelers</Label>
              <Input
                type="number"
                min="1"
                value={travelers}
                onChange={e => {
                  setTravelers(Number(e.target.value) || 1);
                  markChanged();
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
