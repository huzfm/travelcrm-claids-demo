'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plane,
  MapPin,
  Calendar,
  Users,
  Car,
  Building,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Plus,
  Trash2,
  Calculator,
  AlertCircle,
  Bed,
  Utensils,
  ShieldCheck,
  ShieldX,
  FileTextIcon,
  Sparkles,
  Zap,
  Package,
} from 'lucide-react';
import { HotelAutocomplete } from '@/components/hotels/hotel-autocomplete';
import { VehicleAutocomplete } from '@/components/vehicles/vehicle-autocomplete';
import { DestinationAutocomplete } from '@/components/destinations/destination-autocomplete';
import { DestinationForm } from '@/components/destinations/destination-form';
import api from '@/lib/axios';
import { useAuthContext } from '@/components/providers';
import { useItineraryTemplates } from '@/hooks/useItineraries';
import { useCreateItinerary } from '@/hooks/useItineraries';
import { useItineraryPrefill } from '@/hooks/use-itinerary-prefill';
import { useItineraryDraft } from '@/hooks/use-itinerary-draft';
import { useAvailableHotels } from '@/hooks/use-hotel-availability';
import {
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
} from '@/hooks/use-itinerary-wizard-validation';
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  DayHotelEntry,
  DayVehicleEntry,
  DayDestinationEntry,
  ValidationResult,
} from './wizard-types';
import type { Hotel } from '@/types';
import type { Vehicle } from '@/types/vehicle.types';
import type { Lead } from '@/types';
import type { Destination } from '@/types/destination.types';
import type { TripType, Quote, ItineraryDay } from '@/types/itinerary.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: 'HONEYMOON', label: 'Honeymoon' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'SOLO', label: 'Solo' },
  { value: 'GROUP', label: 'Group' },
  { value: 'DOMESTIC', label: 'Domestic' },
  { value: 'INTERNATIONAL', label: 'International' },
];

const DEFAULT_INCLUSIONS = [
  'Flights',
  'Hotels',
  'Transfers',
  'Meals',
  'Sightseeing',
  'Guide',
  'Visa Assistance',
  'Travel Insurance',
];

const DEFAULT_EXCLUSIONS = [
  'Personal Expenses',
  'Visa Fees',
  'Travel Insurance',
  'Tips',
  'Lunch & Dinner',
  'Adventure Activities',
  'Airport Tax',
];

const MEAL_PLANS: { value: 'EP' | 'CP' | 'MAP' | 'APAI'; label: string }[] = [
  { value: 'EP', label: 'EP — Room Only' },
  { value: 'CP', label: 'CP — Breakfast' },
  { value: 'MAP', label: 'MAP — Breakfast + Dinner' },
  { value: 'APAI', label: 'APAI — All Meals' },
];

const PACKAGE_TIERS = ['Basic', 'Standard', 'Premium', 'Luxury', 'Advance'];

const PACKAGE_FEATURES: Record<string, string[]> = {
  Basic: ['3-Star Hotels', 'Airport Transfers', 'Daily Breakfast', 'Standard Sightseeing'],
  Standard: [
    '4-Star Hotels',
    'Airport Transfers',
    'Daily Breakfast',
    'Premium Sightseeing',
    'Tour Guide',
  ],
  Premium: [
    '5-Star Hotels',
    'Private Transfers',
    'All Meals (MAP)',
    'Premium Sightseeing',
    'Tour Guide',
    'Welcome Gift',
  ],
  Luxury: [
    '5-Star Luxury Hotels',
    'Private Luxury Transfers',
    'All Meals (APAI)',
    'VIP Sightseeing',
    'Dedicated Tour Guide',
    'Spa Access',
    'Welcome Basket',
  ],
  Advance: [
    'Luxury Hotels',
    'Chauffeur Service',
    'All Meals',
    'Private Tours',
    'Personal Concierge',
    'Premium Spa',
    'Fine Dining Reservations',
  ],
};

const STEPS = [
  { num: 1, label: 'Trip Details', icon: FileTextIcon },
  { num: 2, label: 'Hotels', icon: Building },
  { num: 3, label: 'Transport', icon: Car },
  { num: 4, label: 'Pricing', icon: Sparkles },
  { num: 5, label: 'Destinations', icon: MapPin },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateDays(from: string, to: string): number {
  if (!from || !to) return 3;
  const s = new Date(from);
  const e = new Date(to);
  const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

function emptyStep1(lead?: Lead | null): Step1Data {
  return {
    quoteMode: 'single',
    title: lead?.name ? `${lead.name}'s Trip` : '',
    destination: lead?.destination || '',
    templateId: undefined,
    startDate: lead?.travelDateFrom
      ? new Date(lead.travelDateFrom).toISOString().split('T')[0]
      : '',
    endDate: lead?.travelDateTo ? new Date(lead.travelDateTo).toISOString().split('T')[0] : '',
    totalTravelers: lead?.numberOfPax ? parseInt(lead.numberOfPax) || 2 : 2,
    tripType: (lead?.tripType as Step1Data['tripType']) || undefined,
  };
}

function emptyStep2(daysCount: number): Step2Data {
  return Array.from({ length: daysCount }, (_, i) => i + 1).reduce(
    (acc, day) => ({
      ...acc,
      [String(day)]: {
        hotelId: '',
        hotelName: '',
        roomType: '',
        bedType: '',
        basePrice: 0,
        mealPlan: 'MAP' as const,
        mealPlanLabel: 'Breakfast + Dinner',
        mealPlanPrice: 0,
        roomCount: 1,
      },
    }),
    {} as Step2Data
  );
}

function emptyStep3(daysCount: number): Step3Data {
  return Array.from({ length: daysCount }, (_, i) => i + 1).reduce(
    (acc, day) => ({
      ...acc,
      [String(day)]: {
        vehicleId: '',
        vehicleName: '',
        vehicleType: '',
        driverIncluded: true,
        pickupPoint: '',
        dropPoint: '',
        ratePerDay: 0,
        skipped: false,
      },
    }),
    {} as Step3Data
  );
}

function emptyStep4(): Step4Data {
  return {
    included: ['Flights', 'Hotels', 'Transfers', 'Meals', 'Sightseeing'],
    excluded: ['Personal Expenses', 'Visa Fees', 'Travel Insurance'],
    notes: '',
    tripId: '',
    quotes: [],
    selectedQuotes: [],
  };
}

function emptyStep5(daysCount: number): Step5Data {
  return Array.from({ length: daysCount }, (_, i) => i + 1).reduce(
    (acc, day) => ({
      ...acc,
      [String(day)]: {
        destinationId: '',
        destinationName: '',
        destinationData: undefined,
      },
    }),
    {} as Step5Data
  );
}

function buildDaysJson(
  step1: Step1Data,
  step2: Step2Data,
  step3: Step3Data,
  step5: Step5Data,
  daysCount: number
): ItineraryDay[] {
  return Array.from({ length: daysCount }, (_, i) => {
    const dayNum = i + 1;
    const dayKey = String(dayNum);
    const hotel = step2[dayKey];
    const vehicle = step3[dayKey];
    const dest = step5[dayKey];

    // Get full hotel data for PDF (manual entries have hotelData, DB entries use hotelId)
    const hotelData = hotel?.hotelData;
    const vehicleData = vehicle?.vehicleData;
    const destinationData = dest?.destinationData;

    // Build hotel properties from either manual data or existing properties
    const hotelProps = hotel?.hotelId
      ? {
          hotelId: hotel.hotelId,
          hotel: hotel.hotelName,
          hotelAddress: hotelData?.address || (hotel as any).hotelAddress || '',
          hotelContact: hotelData?.phone || (hotel as any).hotelContact || '',
          hotelImage: hotelData?.images?.[0] || (hotel as any).hotelImage || '',
          hotelStars: hotelData?.stars || (hotel as any).hotelStars || 0,
          hotelLocation: hotelData?.location || '',
          hotelDescription: hotelData?.description || '',
          selectedRoomType: {
            name: hotel.roomType,
            bedType: hotel.bedType,
            basePrice: hotel.basePrice,
            extraBedPrice: hotel.extraBedPrice || hotelData?.roomTypes?.[0]?.extraBedPrice,
            childPrice: hotel.childPrice || hotelData?.roomTypes?.[0]?.childPrice,
          },
          selectedMealPlan: {
            type: hotel.mealPlan,
            label: hotel.mealPlanLabel,
            pricePerNight: hotel.mealPlanPrice,
          },
          numberOfRooms: hotel.roomCount || 1,
          extraBeds: (hotel as any).extraBeds || 0,
          childrenNoBed: (hotel as any).childrenNoBed || 0,
          extraBedCost: hotel.extraBedPrice || hotelData?.roomTypes?.[0]?.extraBedPrice,
          childWithoutBedCost: hotel.childPrice || hotelData?.roomTypes?.[0]?.childPrice,
        }
      : {};

    // Build vehicle properties from either manual data or existing properties
    const vehicleProps =
      vehicle?.vehicleId && !vehicle.skipped
        ? {
            vehicleId: vehicle.vehicleId,
            vehicleName: vehicle.vehicleName,
            vehicleType: vehicle.vehicleType,
            vehicleDriverPhone: vehicleData?.driverPhone || '',
            vehicleRatePerDay: vehicleData?.ratePerDay || vehicle.ratePerDay || 0,
            driverIncluded: vehicle.driverIncluded,
            pickupPoint: vehicle.pickupPoint,
            dropPoint: vehicle.dropPoint,
            vehicleBaseLocation: vehicleData?.baseLocation || '',
            vehicleRegistrationNumber: vehicleData?.registrationNumber || '',
            vehicleFeatures: vehicleData?.features || [],
          }
        : {};

    // Build destination properties from destination database
    const destinationProps = dest?.destinationId
      ? {
          destinationId: dest.destinationId,
          destination: dest.destinationName,
          destinationAddress: destinationData?.address || '',
          destinationHighlights: destinationData?.highlights || [],
        }
      : {};

    return {
      dayNumber: dayNum,
      date: step1.startDate ? format(addDays(new Date(step1.startDate), i), 'yyyy-MM-dd') : '',
      title: `Day ${dayNum}`,
      activities: [],
      meals: { breakfast: true, lunch: false, dinner: false },
      ...hotelProps,
      ...vehicleProps,
      ...destinationProps,
    };
  });
}

// ─── Wizard Stepper ───────────────────────────────────────────────────────────

function WizardStepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-0.5 sm:gap-1 py-3 border-b overflow-x-auto">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.num === currentStep;
        const isDone = step.num < currentStep;
        return (
          <div key={step.num} className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              type="button"
              onClick={() => isDone && onStepClick(step.num)}
              disabled={!isDone}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 cursor-pointer',
                !isActive && !isDone && 'text-muted-foreground'
              )}
            >
              {isDone ? (
                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              ) : (
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              )}
              <span className="hidden xs:inline">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={cn('h-px w-3 sm:w-8 bg-border', isDone && 'bg-neutral-300')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Basic Details ───────────────────────────────────────────────────

function Step1BasicDetails({
  data,
  onChange,
  errors,
  lead,
  prefillData,
}: {
  data: Step1Data;
  onChange: (d: Step1Data) => void;
  errors: Record<string, string>;
  lead: Lead;
  prefillData: ReturnType<typeof useItineraryPrefill>['prefillData'];
}) {
  const { data: templates } = useItineraryTemplates();
  const templatesArray = Array.isArray(templates) ? templates : [];

  const update = (patch: Partial<Step1Data>) => onChange({ ...data, ...patch });

  // Auto-compute days from date range
  const tripDays = calculateDays(data.startDate, data.endDate);

  // Auto-destination from lead or history
  useEffect(() => {
    if (!data.destination && (prefillData?.suggestedDestination || lead?.destination)) {
      update({ destination: prefillData?.suggestedDestination || lead?.destination || '' });
    }
  }, []);

  // Auto-travelers from lead
  useEffect(() => {
    if (!data.totalTravelers && (lead?.numberOfPax || prefillData?.suggestedPaxCount)) {
      update({
        totalTravelers: parseInt(String(lead?.numberOfPax)) || prefillData?.suggestedPaxCount || 2,
      });
    }
  }, []);

  // Auto-dates from lead
  useEffect(() => {
    if (!data.startDate && lead?.travelDateFrom) {
      update({ startDate: new Date(lead.travelDateFrom).toISOString().split('T')[0] });
    }
    if (!data.endDate && lead?.travelDateTo) {
      update({ endDate: new Date(lead.travelDateTo).toISOString().split('T')[0] });
    }
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-xs sm:text-sm text-muted-foreground">
        We&apos;ve pre-filled what we know from the lead. Feel free to adjust any details.
      </div>

      {/* Enhanced Lead Info Card */}
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-primary/5 p-3 sm:p-5 shadow-sm">
        <div className="flex items-start gap-2 sm:gap-4">
          <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-md">
            <span className="text-base sm:text-xl font-bold text-white">
              {lead?.name?.charAt(0) ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
              <p className="font-bold text-foreground text-sm sm:text-lg leading-tight">
                {lead?.name}
              </p>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30 text-[9px] sm:text-xs py-0 px-1.5"
              >
                Lead
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-3">
              {lead?.phone && (
                <div className="flex items-center gap-0.5 bg-muted/50 px-1 py-0.5 rounded-full">
                  <span className="text-[8px]">📱</span>
                  <span className="font-mono text-[10px]">{lead.phone}</span>
                </div>
              )}
              {lead?.email && (
                <div className="flex items-center gap-0.5 bg-muted/50 px-1 py-0.5 rounded-full max-w-[120px] sm:max-w-[150px]">
                  <span className="text-[8px]">✉️</span>
                  <span className="truncate text-[10px]">{lead.email}</span>
                </div>
              )}
            </div>
            {/* Quick info pills - show current form data */}
            <div className="flex flex-wrap gap-1 sm:gap-2 max-w-full">
              {data.destination && (
                <div className="flex items-center gap-0.5 text-[9px] sm:text-xs bg-neutral-50 text-neutral-700 rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1 border border-neutral-200 font-medium whitespace-nowrap">
                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>{data.destination}</span>
                </div>
              )}
              {data.totalTravelers && (
                <div className="flex items-center gap-0.5 text-[9px] sm:text-xs bg-neutral-50 text-neutral-700 rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1 border border-neutral-200 font-medium whitespace-nowrap">
                  <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>
                    {data.totalTravelers} {data.totalTravelers === 1 ? 'Traveler' : 'Travelers'}
                  </span>
                </div>
              )}
              {(data.startDate || data.endDate) && (
                <div className="flex items-center gap-0.5 text-[9px] sm:text-xs bg-neutral-50 text-neutral-700 rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1 border border-neutral-200 font-medium whitespace-nowrap">
                  <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="hidden xs:inline">
                    {data.startDate
                      ? new Date(data.startDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : ''}
                  </span>
                  <span>→</span>
                  <span className="hidden xs:inline">
                    {data.endDate
                      ? new Date(data.endDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : ''}
                  </span>
                </div>
              )}
              {lead?.budget && (
                <div className="flex items-center gap-0.5 text-[9px] sm:text-xs bg-red-50 text-red-700 rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1 border border-red-200 font-medium whitespace-nowrap">
                  <span className="text-[8px] sm:text-[10px]">💰</span>
                  <span>₹{lead.budget.toLocaleString('en-IN')}</span>
                </div>
              )}
              {data.tripType && (
                <div className="flex items-center gap-0.5 text-[9px] sm:text-xs bg-neutral-50 text-neutral-700 rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1 border border-neutral-200 font-medium whitespace-nowrap">
                  <Plane className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>{data.tripType}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quote Mode Selection - Card-based UI */}
      <div className="rounded-xl sm:rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-transparent p-3 sm:p-5">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
          <div className="p-1 rounded-lg bg-primary/10">
            <Plane className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-foreground">Create Mode</span>
        </div>
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => update({ quoteMode: 'single' })}
            className={cn(
              'relative flex flex-col p-2.5 sm:p-4 rounded-xl border-2 text-left transition-all cursor-pointer overflow-hidden',
              data.quoteMode === 'single'
                ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50 bg-white hover:shadow-sm'
            )}
          >
            <div
              className={cn(
                'absolute top-0 right-0 w-12 h-12 sm:w-20 sm:h-20 rounded-full -mr-4 sm:-mr-8 -mt-4 sm:-mt-8 transition-colors',
                data.quoteMode === 'single' ? 'bg-primary/10' : 'bg-muted/30'
              )}
            />
            <div className="relative flex items-center gap-2 sm:gap-3">
              <div
                className={cn(
                  'h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0',
                  data.quoteMode === 'single'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold">Quick Create</span>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground">Simple trips</p>
              </div>
            </div>
            {data.quoteMode === 'single' && (
              <div className="flex items-center gap-1 mt-2">
                <Check className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary font-medium">Selected</span>
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={() => update({ quoteMode: 'multi' })}
            className={cn(
              'relative flex flex-col p-2.5 sm:p-4 rounded-xl border-2 text-left transition-all cursor-pointer overflow-hidden',
              data.quoteMode === 'multi'
                ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50 bg-white hover:shadow-sm'
            )}
          >
            <div
              className={cn(
                'absolute top-0 right-0 w-12 h-12 sm:w-20 sm:h-20 rounded-full -mr-4 sm:-mr-8 -mt-4 sm:-mt-8 transition-colors',
                data.quoteMode === 'multi' ? 'bg-primary/10' : 'bg-muted/30'
              )}
            />
            <div className="relative flex items-center gap-2 sm:gap-3">
              <div
                className={cn(
                  'h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0',
                  data.quoteMode === 'multi'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold">Multiple Packages</span>
                <p className="text-[8px] sm:text-[10px] text-muted-foreground">Client comparison</p>
              </div>
            </div>
            {data.quoteMode === 'multi' && (
              <div className="flex items-center gap-1 mt-2">
                <Check className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary font-medium">Selected</span>
              </div>
            )}
          </button>
        </div>
        {data.quoteMode === 'multi' && (
          <div className="mt-2 flex items-center gap-1.5 text-[9px] sm:text-xs text-primary bg-primary/5 rounded-lg px-2 sm:px-3 py-1.5 border border-primary/20">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span>Add packages with different pricing</span>
          </div>
        )}
      </div>

      {/* Trip Details Form - Two Column Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Destination */}
        <div className="space-y-1.5">
          <Label htmlFor="w-dest" className="text-xs sm:text-sm">
            Destination *
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="w-dest"
              value={data.destination}
              onChange={e => update({ destination: e.target.value })}
              placeholder="Dubai, Bali, Kashmir..."
              className="pl-9 text-sm"
            />
          </div>
          {errors.destination && (
            <p className="text-[10px] sm:text-xs text-red-500">{errors.destination}</p>
          )}
        </div>

        {/* Date range */}
        <div className="space-y-1.5">
          <Label htmlFor="w-start" className="text-xs sm:text-sm">
            Start Date
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="w-start"
              type="date"
              value={data.startDate}
              onChange={e => update({ startDate: e.target.value })}
              className="pl-9 text-sm"
            />
          </div>
          {errors.startDate && (
            <p className="text-[10px] sm:text-xs text-red-500">{errors.startDate}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="w-end" className="text-xs sm:text-sm">
            End Date
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="w-end"
              type="date"
              value={data.endDate}
              onChange={e => update({ endDate: e.target.value })}
              className="pl-9 text-sm"
            />
          </div>
          {errors.endDate && (
            <p className="text-[10px] sm:text-xs text-red-500">{errors.endDate}</p>
          )}
        </div>

        {/* Travelers - Prominent display on mobile */}
        <div className="space-y-2 p-3 sm:p-0 bg-primary/5 sm:bg-transparent rounded-xl sm:rounded-none border sm:border-0 border-primary/20">
          <Label htmlFor="w-pax" className="text-xs sm:text-sm font-medium text-primary">
            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1" />
            Number of Travelers *
          </Label>
          <div className="flex items-center justify-center gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={() =>
                update({ totalTravelers: Math.max(1, (data.totalTravelers || 2) - 1) })
              }
            >
              <span className="text-lg">−</span>
            </Button>
            <div className="flex items-center justify-center min-w-[80px]">
              <Input
                id="w-pax"
                type="number"
                min={1}
                max={50}
                value={data.totalTravelers}
                onChange={e =>
                  update({
                    totalTravelers: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)),
                  })
                }
                className="text-center text-xl sm:text-2xl font-bold w-16 sm:w-20 h-12 sm:h-14 border-2 border-primary/30 focus:border-primary"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={() =>
                update({ totalTravelers: Math.min(50, (data.totalTravelers || 2) + 1) })
              }
            >
              <span className="text-lg">+</span>
            </Button>
          </div>
          <p className="text-center text-[10px] sm:text-xs text-muted-foreground">
            {data.totalTravelers === 1 ? '1 Traveler' : `${data.totalTravelers} Travelers`}
            {data.totalTravelers >= 2 && ` • ${Math.ceil(data.totalTravelers / 2)} Rooms`}
          </p>
          {errors.totalTravelers && (
            <p className="text-center text-[10px] sm:text-xs text-red-500">
              {errors.totalTravelers}
            </p>
          )}
        </div>

        {/* Trip type */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs sm:text-sm">Trip Type</Label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {TRIP_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() =>
                  update({ tripType: data.tripType === t.value ? undefined : t.value })
                }
                className={cn(
                  'px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[10px] sm:text-xs font-medium transition-colors cursor-pointer',
                  data.tripType === t.value
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white border-border text-foreground hover:border-primary/50'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trip Duration Summary */}
      {data.startDate && data.endDate && (
        <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/20 flex-wrap">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
          <span className="text-xs sm:text-sm text-muted-foreground">Trip Duration:</span>
          <Badge variant="outline" className="bg-white text-xs">
            {tripDays} day{tripDays !== 1 ? 's' : ''}
          </Badge>
          <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
            {format(new Date(data.startDate), 'MMM d')} →{' '}
            {format(new Date(data.endDate), 'MMM d, yyyy')}
          </span>
        </div>
      )}

      {/* Template */}
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Start from Template (Optional)</Label>
        <Select
          value={data.templateId || ''}
          onValueChange={v => {
            const tpl =
              v !== '__new__' ? templatesArray.find((t: { id: string }) => t.id === v) : null;
            update({
              templateId: v !== '__new__' ? v : undefined,
              ...(tpl ? { destination: tpl.destination || data.destination } : {}),
            });
          }}
        >
          <SelectTrigger className="bg-white text-sm">
            <SelectValue placeholder="Start from scratch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__new__">Start from scratch</SelectItem>
            {templatesArray.map(
              (tpl: { id: string; name?: string; title?: string; destination?: string }) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name || tpl.title} — {tpl.destination || 'No destination'}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Step 2: Hotel Assignment ─────────────────────────────────────────────────

function Step2HotelAssignment({
  data,
  onChange,
  errors,
  step1,
  prefillHotels,
  isMainBranch,
}: {
  data: Step2Data;
  onChange: (d: Step2Data) => void;
  errors: Record<string, string>;
  step1: Step1Data;
  prefillHotels: Hotel[];
  isMainBranch: boolean;
}) {
  const daysCount = calculateDays(step1.startDate, step1.endDate);
  const existingIds = Object.values(data)
    .filter(e => e.hotelId)
    .map(e => e.hotelId);

  const available = useAvailableHotels(
    prefillHotels,
    step1.startDate && step1.endDate
      ? { startDate: new Date(step1.startDate), endDate: new Date(step1.endDate) }
      : null,
    existingIds
  );

  const updateDay = (day: string, patch: Partial<DayHotelEntry>) => {
    onChange({ ...data, [day]: { ...data[day], ...patch } });
  };

  const applyToNext = (startDay: number, entry: DayHotelEntry) => {
    const newData = { ...data };
    for (let d = startDay + 1; d <= daysCount; d++) {
      const key = String(d);
      const prev = data[key];
      // Only overwrite if the next day is empty
      if (!prev?.hotelId) {
        newData[key] = {
          ...entry,
          hotelSpan: { startDay, endDay: d, hotelId: entry.hotelId, hotelName: entry.hotelName },
        };
      } else {
        break;
      }
    }
    onChange(newData);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Assign hotels for each day — select a hotel, then pick a room type and meal plan.
      </div>

      {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
        const dayKey = String(day);
        const entry = data[dayKey] || {
          hotelId: '',
          hotelName: '',
          roomType: '',
          bedType: '',
          basePrice: 0,
          mealPlan: 'MAP' as const,
          mealPlanLabel: 'Breakfast + Dinner',
          mealPlanPrice: 0,
          roomCount: 1,
        };
        const dayDate = step1.startDate
          ? format(addDays(new Date(step1.startDate), day - 1), 'EEE, MMM d')
          : `Day ${day}`;
        const selectedHotel =
          entry.hotelData ||
          available.find(h => h.id === entry.hotelId) ||
          prefillHotels.find(h => h.id === entry.hotelId);

        return (
          <Card
            key={day}
            className={cn(
              'overflow-hidden',
              entry.hotelId && 'border-neutral-200 bg-neutral-50/30'
            )}
          >
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] sm:text-sm font-bold text-primary">
                    {day}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold">Day {day}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{dayDate}</p>
                  </div>
                </div>
                {entry.hotelId && (
                  <Badge
                    variant="outline"
                    className="bg-neutral-50 text-neutral-700 border-neutral-200 gap-1 text-[10px] sm:text-xs"
                  >
                    <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden xs:inline">{entry.hotelName}</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Hotel selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs flex items-center gap-1">
                  <Building className="h-3 w-3" /> Hotel
                </Label>
                <HotelAutocomplete
                  value={entry.hotelName}
                  onChange={(name, hotel) => {
                    if (hotel) {
                      const firstRoom = hotel.roomTypes?.[0];
                      const firstMeal = hotel.mealPlans?.[0];
                      updateDay(dayKey, {
                        hotelId: hotel.id,
                        hotelName: hotel.name || name,
                        roomType: firstRoom?.name || '',
                        bedType: firstRoom?.bedType || '',
                        basePrice: firstRoom?.basePrice || hotel.pricePerNight || 0,
                        mealPlan: (firstMeal?.type as 'EP' | 'CP' | 'MAP' | 'APAI') || 'MAP',
                        mealPlanLabel: firstMeal?.label || 'Breakfast + Dinner',
                        mealPlanPrice: firstMeal?.pricePerNight || 0,
                        roomCount: Math.ceil(step1.totalTravelers / 2),
                        hotelData: hotel,
                      });
                    } else {
                      updateDay(dayKey, {
                        hotelId: '',
                        hotelName: name,
                        roomType: '',
                        bedType: '',
                        basePrice: 0,
                        mealPlan: 'MAP',
                        mealPlanLabel: 'Breakfast + Dinner',
                        mealPlanPrice: 0,
                        hotelData: undefined,
                      });
                    }
                  }}
                  destination={step1.destination}
                  showManualEntry={!isMainBranch}
                />
                {errors[`day${day}.hotelId`] && (
                  <p className="text-xs text-red-500">{errors[`day${day}.hotelId`]}</p>
                )}
              </div>

              {/* Room type + meal plan row (shown when hotel selected) */}
              {entry.hotelId && selectedHotel && (
                <>
                  {/* Room Types */}
                  {selectedHotel.roomTypes && selectedHotel.roomTypes.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] sm:text-xs flex items-center gap-1">
                        <Bed className="h-3 w-3" /> Room Type
                      </Label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {selectedHotel.roomTypes.map((rt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              updateDay(dayKey, {
                                roomType: rt.name,
                                bedType: rt.bedType,
                                basePrice: rt.basePrice || selectedHotel.pricePerNight || 0,
                              })
                            }
                            className={cn(
                              'px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[10px] sm:text-xs font-medium transition-colors cursor-pointer',
                              entry.roomType === rt.name
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-white border-border text-foreground hover:border-primary/50'
                            )}
                          >
                            {rt.name}
                            <span className="ml-0.5 sm:ml-1 text-muted-foreground text-[9px] sm:text-[10px]">
                              {rt.bedType}
                            </span>
                            {rt.basePrice > 0 && (
                              <span className="ml-0.5 sm:ml-1 text-primary font-semibold text-[9px] sm:text-[10px]">
                                ₹{rt.basePrice.toLocaleString()}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meal Plans */}
                  {selectedHotel.mealPlans && selectedHotel.mealPlans.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] sm:text-xs flex items-center gap-1">
                        <Utensils className="h-3 w-3" /> Meal Plan
                      </Label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {MEAL_PLANS.map(mp => {
                          const planData = selectedHotel.mealPlans.find(
                            (p: { type?: string }) => p.type === mp.value
                          );
                          return (
                            <button
                              key={mp.value}
                              type="button"
                              onClick={() =>
                                updateDay(dayKey, {
                                  mealPlan: mp.value,
                                  mealPlanLabel: planData?.label || mp.label,
                                  mealPlanPrice: planData?.pricePerNight || 0,
                                })
                              }
                              className={cn(
                                'px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border text-[10px] sm:text-xs font-medium transition-colors cursor-pointer',
                                entry.mealPlan === mp.value
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-white border-border text-foreground hover:border-primary/50'
                              )}
                            >
                              <span className="hidden xs:inline">{mp.label.split(' — ')[0]}</span>
                              <span className="xs:hidden">{mp.value}</span>
                              {(planData?.pricePerNight ?? 0) > 0 && (
                                <span className="ml-0.5 sm:ml-1 text-primary font-semibold text-[9px] sm:text-[10px]">
                                  +₹{planData!.pricePerNight}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Room count */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] sm:text-xs">Rooms</Label>
                      <Input
                        type="number"
                        min={1}
                        value={entry.roomCount}
                        onChange={e =>
                          updateDay(dayKey, { roomCount: parseInt(e.target.value) || 1 })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyToNext(day, entry as DayHotelEntry)}
                        className="text-[10px] sm:text-xs h-8 sm:h-9 w-full"
                      >
                        <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                        <span className="hidden xs:inline">Apply to next days</span>
                        <span className="xs:hidden">Next days</span>
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* No hotel selected */}
              {!entry.hotelId && (
                <div className="text-[10px] sm:text-xs text-muted-foreground italic py-2">
                  No hotel selected for this day — optional. Leave blank if not needed.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Step 3: Vehicle Assignment ───────────────────────────────────────────────

function Step3VehicleAssignment({
  data,
  onChange,
  step1,
  prefillVehicles,
  isMainBranch,
}: {
  data: Step3Data;
  onChange: (d: Step3Data) => void;
  errors: Record<string, string>;
  step1: Step1Data;
  prefillVehicles: Vehicle[];
  isMainBranch: boolean;
}) {
  const daysCount = calculateDays(step1.startDate, step1.endDate);

  const updateDay = (day: string, patch: Partial<DayVehicleEntry>) => {
    onChange({ ...data, [day]: { ...data[day], ...patch } });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Assign transport for each day — select a vehicle, or skip days where no transport is needed.
      </div>

      {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
        const dayKey = String(day);
        const entry = data[dayKey] || {
          vehicleId: '',
          vehicleName: '',
          vehicleType: '',
          driverIncluded: true,
          pickupPoint: '',
          dropPoint: '',
          skipped: false,
        };
        const dayDate = step1.startDate
          ? format(addDays(new Date(step1.startDate), day - 1), 'EEE, MMM d')
          : `Day ${day}`;
        const selectedVehicle = prefillVehicles.find(v => v.id === entry.vehicleId);
        const capacityWarning =
          selectedVehicle && selectedVehicle.seatingCapacity < step1.totalTravelers;

        return (
          <Card
            key={day}
            className={cn(
              'overflow-hidden',
              entry.vehicleId && !entry.skipped && 'border-neutral-200 bg-neutral-50/30'
            )}
          >
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] sm:text-sm font-bold text-primary">
                    {day}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold">Day {day}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{dayDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {entry.vehicleId && !entry.skipped && (
                    <Badge
                      variant="outline"
                      className="bg-neutral-50 text-neutral-700 border-neutral-200 gap-1 text-[10px] sm:text-xs"
                    >
                      <Car className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span className="hidden xs:inline">{entry.vehicleName}</span>
                    </Badge>
                  )}
                  {!entry.vehicleId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateDay(dayKey, { skipped: true })}
                      className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground h-6 sm:h-7 px-1.5 sm:px-2"
                    >
                      Skip
                    </Button>
                  )}
                  {entry.skipped && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateDay(dayKey, {
                          skipped: false,
                          vehicleId: '',
                          vehicleName: '',
                          vehicleType: '',
                        })
                      }
                      className="text-[10px] sm:text-xs h-6 sm:h-7 px-1.5 sm:px-2"
                    >
                      Add
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {entry.skipped ? (
              <CardContent>
                <p className="text-[10px] sm:text-xs text-muted-foreground italic">
                  No transport for this day.
                </p>
              </CardContent>
            ) : (
              <CardContent className="space-y-3 sm:space-y-4">
                {/* Vehicle selector */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] sm:text-xs flex items-center gap-1">
                    <Car className="h-3 w-3" /> Vehicle
                  </Label>
                  <VehicleAutocomplete
                    value={entry.vehicleName}
                    onChange={(name, vehicle) => {
                      if (vehicle) {
                        updateDay(dayKey, {
                          vehicleId: vehicle.id,
                          vehicleName: vehicle.name || name,
                          vehicleType: vehicle.vehicleType || '',
                          vehicleData: vehicle,
                        });
                      } else {
                        updateDay(dayKey, {
                          vehicleId: '',
                          vehicleName: name,
                          vehicleType: '',
                          vehicleData: undefined,
                        });
                      }
                    }}
                    serviceArea={step1.destination}
                    showManualEntry={!isMainBranch}
                  />
                </div>

                {capacityWarning && (
                  <div className="flex items-start gap-1.5 sm:gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-[10px] sm:text-xs text-red-700">
                    <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5 shrink-0" />
                    <span>
                      This vehicle seats {selectedVehicle.seatingCapacity} but you have{' '}
                      {step1.totalTravelers} travelers. Consider a larger vehicle.
                    </span>
                  </div>
                )}

                {/* Vehicle details shown when selected */}
                {entry.vehicleId && (
                  <>
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[10px] sm:text-xs">Driver</Label>
                        <Switch
                          checked={entry.driverIncluded}
                          onCheckedChange={v => updateDay(dayKey, { driverIncluded: v })}
                        />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {entry.driverIncluded ? 'Included' : 'Not needed'}
                        </span>
                      </div>
                      {selectedVehicle?.seatingCapacity && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {selectedVehicle.seatingCapacity} Seats
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] sm:text-xs">Pickup Point</Label>
                        <Input
                          value={entry.pickupPoint}
                          onChange={e => updateDay(dayKey, { pickupPoint: e.target.value })}
                          placeholder="e.g., Airport, Hotel Lobby"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] sm:text-xs">Drop Point</Label>
                        <Input
                          value={entry.dropPoint}
                          onChange={e => updateDay(dayKey, { dropPoint: e.target.value })}
                          placeholder="e.g., Hotel, Railway Station"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {!entry.vehicleId && (
                  <div className="text-[10px] sm:text-xs text-muted-foreground italic py-2">
                    No vehicle selected — optional. Skip the day if no transport is needed.
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Step 4: Final Details ────────────────────────────────────────────────────

function Step4FinalDetails({
  data,
  onChange,
  step1,
  step2,
  step3,
}: {
  data: Step4Data;
  onChange: (d: Step4Data) => void;
  errors: Record<string, string>;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  onClearDraft: () => void;
}) {
  const [showQuoteCalc, setShowQuoteCalc] = useState<number | null>(null);
  const daysCount = calculateDays(step1.startDate, step1.endDate);
  const update = (patch: Partial<Step4Data>) => onChange({ ...data, ...patch });

  // Compute auto breakdown from day selections
  const autoBreakdown = useMemo(() => {
    let hotelCost = 0;
    let vehicleCost = 0;
    Object.values(step2).forEach(entry => {
      if (entry?.basePrice && entry?.mealPlanPrice) {
        hotelCost +=
          (entry.basePrice + entry.mealPlanPrice) * entry.roomCount * step1.totalTravelers;
      }
    });
    Object.values(step3).forEach(entry => {
      if (entry?.vehicleId && !entry.skipped && entry?.vehicleRatePerDay) {
        vehicleCost += entry.vehicleRatePerDay;
      }
    });
    return { hotelCost, vehicleCost, activityCost: 0, miscCost: 0 };
  }, [step2, step3, step1.totalTravelers]);

  // Keep per-package breakdown/totalCost in sync with the latest autoBreakdown
  // whenever the user has NOT manually overridden the auto-filled values.
  // Bug fix: after editing Step 2 selections and returning to Step 4, the
  // auto-filled per-package prices were frozen at the first-pass values.
  useEffect(() => {
    if (data.quotes.length === 0) return;
    let changed = false;
    const newQuotes = data.quotes.map(q => {
      // Treat a quote as "live-derived" when it has a breakdown but the user
      // has not yet entered a manual override of the total / hotel / vehicle
      // cost. (Per-field manual edits set manualHotelCost / manualVehicleCost,
      // and a direct total edit sets manualTotal.)
      const isManuallyOverridden =
        (q.breakdown?.manualTotal ?? 0) > 0 ||
        (q.breakdown?.customTotal ?? 0) > 0 ||
        (q.breakdown?.manualHotelCost ?? 0) > 0 ||
        (q.breakdown?.manualVehicleCost ?? 0) > 0;
      if (isManuallyOverridden) return q;
      if (!q.breakdown) return q; // never auto-filled yet — leave alone

      const newBreakdown = {
        ...q.breakdown,
        hotelCost: autoBreakdown.hotelCost,
        vehicleCost: autoBreakdown.vehicleCost,
        activityCost: 0,
        miscCost: 0,
      };

      // Recompute total from breakdown + margin + gst (mirrors the live panel)
      const subtotal =
        newBreakdown.hotelCost +
        newBreakdown.vehicleCost +
        (newBreakdown.activityCost || 0) +
        (newBreakdown.miscCost || 0);
      const marginAmt = q.marginPercent ? subtotal * (q.marginPercent / 100) : 0;
      const gstAmt = (subtotal + marginAmt) * ((q.gstPercent || 0) / 100);
      const newTotal = subtotal + marginAmt + gstAmt;

      const breakdownUnchanged =
        newBreakdown.hotelCost === q.breakdown.hotelCost &&
        newBreakdown.vehicleCost === q.breakdown.vehicleCost &&
        newBreakdown.activityCost === (q.breakdown.activityCost || 0) &&
        newBreakdown.miscCost === (q.breakdown.miscCost || 0);
      const totalUnchanged = q.totalCost === newTotal;

      if (breakdownUnchanged && totalUnchanged) return q;
      changed = true;
      return { ...q, breakdown: newBreakdown, totalCost: newTotal };
    });
    if (changed) update({ quotes: newQuotes });
    // We intentionally exclude `data.quotes` from deps — the effect is driven
    // by autoBreakdown; including data.quotes would cause an infinite loop
    // since we update it via update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBreakdown]);

  const updateQuote = (idx: number, patch: Partial<Quote>) => {
    const newQuotes = [...data.quotes];
    newQuotes[idx] = { ...newQuotes[idx], ...patch };
    update({ quotes: newQuotes });
  };

  const addQuote = (label: string) => {
    update({
      quotes: [...data.quotes, { label, totalCost: 0, features: PACKAGE_FEATURES[label] || [] }],
    });
  };

  const removeQuote = (idx: number) => {
    update({
      quotes: data.quotes.filter((_, i) => i !== idx),
      selectedQuotes: data.selectedQuotes.filter(i => i !== idx).map(i => (i > idx ? i - 1 : i)),
    });
  };

  const toggleIncluded = (item: string) => {
    update({
      included: data.included.includes(item)
        ? data.included.filter(i => i !== item)
        : [...data.included, item],
    });
  };

  const toggleExcluded = (item: string) => {
    update({
      excluded: data.excluded.includes(item)
        ? data.excluded.filter(i => i !== item)
        : [...data.excluded, item],
    });
  };

  const addCustomInclude = (item: string) => {
    if (item.trim()) update({ included: [...data.included, item.trim()] });
  };

  const addCustomExclude = (item: string) => {
    if (item.trim()) update({ excluded: [...data.excluded, item.trim()] });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary */}
      <div className="rounded-lg border bg-muted/20 p-3 sm:p-4 space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Check className="h-4 w-4 text-neutral-600" />
          Trip Summary
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
          <div className="bg-white rounded p-1.5 sm:p-2">
            <p className="text-muted-foreground text-[10px] sm:text-xs">Destination</p>
            <p className="font-medium text-[11px] sm:text-sm">{step1.destination || '—'}</p>
          </div>
          <div className="bg-white rounded p-1.5 sm:p-2">
            <p className="text-muted-foreground text-[10px] sm:text-xs">Dates</p>
            <p className="font-medium text-[11px] sm:text-sm">
              {step1.startDate || '—'} → {step1.endDate || '—'}
            </p>
            <p className="text-muted-foreground text-[10px] sm:text-xs">
              {daysCount} day{daysCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="bg-white rounded p-1.5 sm:p-2">
            <p className="text-muted-foreground text-[10px] sm:text-xs">Travelers</p>
            <p className="font-medium text-[11px] sm:text-sm">{step1.totalTravelers}</p>
          </div>
          <div className="bg-white rounded p-1.5 sm:p-2">
            <p className="text-muted-foreground text-[10px] sm:text-xs">Hotels</p>
            <p className="font-medium text-[11px] sm:text-sm">
              {Object.values(step2).filter(e => e?.hotelId).length} / {daysCount} days
            </p>
          </div>
        </div>
        {autoBreakdown.hotelCost > 0 && (
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs bg-white rounded p-1.5 sm:p-2 flex-wrap">
            <Calculator className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Auto-estimate:</span>
            <span className="text-neutral-700 font-medium">
              Hotel ₹{autoBreakdown.hotelCost.toLocaleString()}
            </span>
            {autoBreakdown.vehicleCost > 0 && (
              <span className="text-red-700 font-medium">
                Vehicle ₹{autoBreakdown.vehicleCost.toLocaleString()}
              </span>
            )}
            <span className="font-semibold text-primary">
              Total ₹{(autoBreakdown.hotelCost + autoBreakdown.vehicleCost).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Inclusions */}
      <div className="space-y-2">
        <Label className="text-neutral-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
          <ShieldCheck className="h-4 w-4" /> Inclusions — Whats Included
        </Label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {DEFAULT_INCLUSIONS.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => toggleIncluded(item)}
              className={cn(
                'text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-colors cursor-pointer',
                data.included.includes(item)
                  ? 'bg-neutral-100 border-neutral-300 text-neutral-700'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              )}
            >
              {data.included.includes(item) ? '✓ ' : '+ '}
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom..."
            className="border-neutral-200 text-sm"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                addCustomInclude((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-neutral-300 text-neutral-600 hover:bg-neutral-50"
            onClick={e => {
              const input = (
                e as unknown as { currentTarget: { previousElementSibling?: { value: string } } }
              ).currentTarget.previousElementSibling;
              if (input?.value) {
                addCustomInclude(input.value);
                input.value = '';
              }
            }}
          >
            + Add
          </Button>
        </div>
        {data.included.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.included.map(item => (
              <Badge
                key={item}
                variant="outline"
                className="bg-neutral-50 text-neutral-700 border-neutral-200 text-[10px] sm:text-xs gap-1"
              >
                {item}
                <button
                  type="button"
                  onClick={() => toggleIncluded(item)}
                  className="hover:text-red-600 ml-0.5"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Exclusions */}
      <div className="space-y-2">
        <Label className="text-red-600 font-medium flex items-center gap-1 text-xs sm:text-sm">
          <ShieldX className="h-4 w-4" /> Exclusions — Whats Not Included
        </Label>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {DEFAULT_EXCLUSIONS.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => toggleExcluded(item)}
              className={cn(
                'text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border transition-colors cursor-pointer',
                data.excluded.includes(item)
                  ? 'bg-red-100 border-red-300 text-red-700'
                  : 'bg-white border-red-200 text-red-600 hover:bg-red-50'
              )}
            >
              {data.excluded.includes(item) ? '✓ ' : '+ '}
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add custom..."
            className="border-red-200 text-sm"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                addCustomExclude((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
            onClick={e => {
              const input = (
                e as unknown as { currentTarget: { previousElementSibling?: { value: string } } }
              ).currentTarget.previousElementSibling;
              if (input?.value) {
                addCustomExclude(input.value);
                input.value = '';
              }
            }}
          >
            + Add
          </Button>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Trip Notes</Label>
        <Textarea
          value={data.notes}
          onChange={e => update({ notes: e.target.value })}
          placeholder="General notes about the trip..."
          rows={2}
        />
      </div>

      {/* Trip ID */}
      <div className="space-y-1.5">
        <Label className="text-xs sm:text-sm">Internal Trip ID (Optional)</Label>
        <Input
          value={data.tripId}
          onChange={e => update({ tripId: e.target.value })}
          placeholder="Auto-generated if left blank"
          className="text-sm"
        />
      </div>

      {/* Package Options */}
      <div className="space-y-3">
        <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <Label className="text-primary font-semibold text-xs sm:text-sm">
                Package Options
              </Label>
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Select tiers to add
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {PACKAGE_TIERS.map(tier => (
              <button
                key={tier}
                type="button"
                onClick={() => {
                  if (!data.quotes.some(q => q.label === tier)) addQuote(tier);
                }}
                disabled={data.quotes.some(q => q.label === tier)}
                className={cn(
                  'text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border cursor-pointer transition-all font-medium',
                  data.quotes.some(q => q.label === tier)
                    ? 'border-neutral-300 bg-neutral-50 text-neutral-700'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300'
                )}
              >
                {data.quotes.some(q => q.label === tier) ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3 w-3" /> {tier}
                  </span>
                ) : (
                  <span>+ {tier}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {data.quotes.length === 0 ? (
          <div className="text-center py-8 sm:py-10 text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-gradient-to-br from-muted/20 to-white">
            <Package className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 text-muted-foreground/40" />
            <p className="text-xs sm:text-sm mb-1 font-medium">No packages added yet</p>
            <p className="text-[10px] sm:text-xs">
              Select package tiers above to create pricing options
            </p>
          </div>
        ) : (
          data.quotes.map((quote, idx) => (
            <div
              key={idx}
              className="border-2 rounded-xl p-3 sm:p-4 bg-gradient-to-br from-neutral-50 to-white shadow-sm space-y-2 sm:space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/30 text-xs px-2 sm:px-3"
                  >
                    #{idx + 1}
                  </Badge>
                  <Input
                    value={quote.label}
                    onChange={e => updateQuote(idx, { label: e.target.value })}
                    placeholder="Package name"
                    className="w-28 sm:w-36 h-8 sm:h-9 bg-white font-semibold text-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 rounded-lg border bg-white px-1.5 sm:px-2 py-1">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={quote.totalCost || ''}
                      onChange={e =>
                        updateQuote(idx, {
                          totalCost: Number(e.target.value) || 0,
                          // User is overriding the auto-derived total — mark the
                          // quote as manually overridden so the auto-sync effect
                          // stops clobbering their input.
                          breakdown: {
                            ...(quote.breakdown || {}),
                            manualTotal: Number(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="0"
                      className="w-20 sm:w-28 h-7 border-0 p-0 text-right font-bold text-primary text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowQuoteCalc(showQuoteCalc === idx ? null : idx)}
                    className="h-8 w-8 sm:h-8 sm:w-8 p-0 text-neutral-600 hover:bg-neutral-50"
                  >
                    <Calculator className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuote(idx)}
                    className="h-8 w-8 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showQuoteCalc === idx && (
                <div className="p-2 sm:p-3 bg-gradient-to-br from-neutral-100 to-neutral-50 rounded-lg border border-neutral-200 space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-xs font-semibold text-neutral-600">
                      Price Calculation
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateQuote(idx, {
                          breakdown: {
                            hotelCost: autoBreakdown.hotelCost,
                            vehicleCost: autoBreakdown.vehicleCost,
                            activityCost: 0,
                            miscCost: 0,
                          },
                        })
                      }
                      className="h-5 sm:h-6 text-[9px] sm:text-[10px] text-neutral-600"
                    >
                      <Calculator className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" /> Auto-fill
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    {(['hotelCost', 'vehicleCost', 'activityCost', 'miscCost'] as const).map(
                      field => (
                        <div key={field} className="space-y-1">
                          <Label className="text-[9px] sm:text-[10px] text-muted-foreground capitalize">
                            {field.replace('Cost', ' Cost')}
                          </Label>
                          <Input
                            type="number"
                            value={quote.breakdown?.[field] || ''}
                            onChange={e => {
                              const value = Number(e.target.value) || 0;
                              const manualFieldKey =
                                field === 'hotelCost'
                                  ? 'manualHotelCost'
                                  : field === 'vehicleCost'
                                    ? 'manualVehicleCost'
                                    : null;
                              updateQuote(idx, {
                                breakdown: {
                                  ...quote.breakdown,
                                  [field]: value,
                                  // Mark this field as manually edited so the
                                  // auto-sync effect won't keep overwriting it
                                  // when step2/step3 change.
                                  ...(manualFieldKey ? { [manualFieldKey]: value } : {}),
                                } as Quote['breakdown'],
                              });
                            }}
                            placeholder="0"
                            className="h-7 sm:h-8 text-xs bg-white"
                          />
                        </div>
                      )
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    <div className="space-y-1">
                      <Label className="text-[9px] sm:text-[10px] text-neutral-600">Margin %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={quote.marginPercent || ''}
                        onChange={e =>
                          updateQuote(idx, { marginPercent: Number(e.target.value) || 0 })
                        }
                        placeholder="e.g., 10"
                        className="h-7 sm:h-8 text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] sm:text-[10px] text-neutral-600">GST %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={quote.gstPercent || ''}
                        onChange={e =>
                          updateQuote(idx, { gstPercent: Number(e.target.value) || 0 })
                        }
                        placeholder="e.g., 18"
                        className="h-7 sm:h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                  {(() => {
                    const b = quote.breakdown || {};
                    const subtotal =
                      (b.hotelCost || 0) +
                      (b.vehicleCost || 0) +
                      (b.activityCost || 0) +
                      (b.miscCost || 0);
                    const marginAmt = quote.marginPercent
                      ? subtotal * (quote.marginPercent / 100)
                      : 0;
                    const gstAmt = (subtotal + marginAmt) * ((quote.gstPercent || 0) / 100);
                    const grand = subtotal + marginAmt + gstAmt;
                    return (
                      <div className="bg-white rounded p-1.5 sm:p-2 space-y-1 text-[10px] sm:text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                        </div>
                        {(quote?.marginPercent ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">
                              Margin ({quote.marginPercent}%)
                            </span>
                            <span className="font-medium text-neutral-600">
                              +₹{marginAmt.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {(quote?.gstPercent ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-neutral-600">GST ({quote.gstPercent}%)</span>
                            <span className="font-medium text-neutral-600">
                              +₹{gstAmt.toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t pt-1">
                          <span>Total</span>
                          <span className="text-primary">₹{grand.toLocaleString()}</span>
                        </div>
                        {grand > 0 && quote.totalCost !== grand && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuote(idx, { totalCost: grand })}
                            className="w-full h-5 sm:h-6 text-[9px] sm:text-[10px]"
                          >
                            Apply ₹{grand.toLocaleString()}
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Step 5: Destination Assignment ───────────────────────────────────────────

function Step5DestinationAssignment({
  data,
  onChange,
  step1,
}: {
  data: Step5Data;
  onChange: (d: Step5Data) => void;
  step1: Step1Data;
}) {
  const daysCount = calculateDays(step1.startDate, step1.endDate);
  const { user } = useAuthContext();
  const canCreateDestination = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [createForDay, setCreateForDay] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const updateDay = (day: string, patch: Partial<DayDestinationEntry>) => {
    onChange({ ...data, [day]: { ...data[day], ...patch } });
  };

  const handleCreateDestination = async (formData: Record<string, unknown>) => {
    if (!createForDay) return;
    setIsCreating(true);
    try {
      const res = await api.post('/destinations', formData);
      const resData = res.data;
      if (resData.success) {
        toast.success('Destination created!');
        const destination = resData.data as Destination;
        updateDay(createForDay, {
          destinationId: destination.id,
          destinationName: destination.name,
          destinationData: destination,
        });
        setCreateForDay(null);
      } else {
        toast.error(resData.error || 'Failed to create destination');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create destination');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Assign destinations for each day — select from your destination database to include cover
        images and highlights in the itinerary.
      </div>

      {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => {
        const dayKey = String(day);
        const entry = data[dayKey] || {
          destinationId: '',
          destinationName: '',
          destinationData: undefined,
        };
        const dayDate = step1.startDate
          ? format(addDays(new Date(step1.startDate), day - 1), 'EEE, MMM d')
          : `Day ${day}`;

        return (
          <Card
            key={day}
            className={cn(
              'overflow-hidden',
              entry.destinationId && 'border-neutral-200 bg-neutral-50/30'
            )}
          >
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] sm:text-sm font-bold text-primary">
                    {day}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold">Day {day}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{dayDate}</p>
                  </div>
                </div>
                {entry.destinationId && (
                  <Badge
                    variant="outline"
                    className="bg-neutral-50 text-neutral-700 border-neutral-200 gap-1 text-[10px] sm:text-xs"
                  >
                    <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span className="hidden xs:inline">{entry.destinationName}</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Destination selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] sm:text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Destination
                </Label>
                <DestinationAutocomplete
                  value={entry.destinationName}
                  onChange={(name, destination) => {
                    if (destination) {
                      updateDay(dayKey, {
                        destinationId: destination.id,
                        destinationName: destination.name || name,
                        destinationData: destination,
                      });
                    } else {
                      updateDay(dayKey, {
                        destinationId: '',
                        destinationName: name,
                        destinationData: undefined,
                      });
                    }
                  }}
                  destination={step1.destination}
                  showCreateButton={canCreateDestination}
                  onCreateDestination={
                    canCreateDestination ? () => setCreateForDay(dayKey) : undefined
                  }
                />
              </div>

              {/* Destination preview - rich details from DB */}
              {entry.destinationData && (
                <div className="bg-white rounded-lg border border-neutral-100 overflow-hidden space-y-3">
                  <div className="px-3 space-y-2">
                    {/* Location & type */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.destinationData.placeType && (
                        <Badge
                          variant="outline"
                          className="text-[9px] sm:text-[10px] bg-neutral-50 border-neutral-200 text-neutral-600 capitalize"
                        >
                          {entry.destinationData.placeType.toLowerCase()}
                        </Badge>
                      )}
                      {entry.destinationData.address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{entry.destinationData.address}</span>
                        </p>
                      )}
                    </div>

                    {/* Short description */}
                    {entry.destinationData.shortDescription && (
                      <p className="text-xs text-foreground/80 line-clamp-2">
                        {entry.destinationData.shortDescription}
                      </p>
                    )}

                    {/* Description */}
                    {entry.destinationData.description && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-3">
                        {entry.destinationData.description}
                      </p>
                    )}

                    {/* Meta info grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {entry.destinationData.bestTimeToVisit && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-red-50 rounded px-2 py-1">
                          <span className="text-red-600">🗓️</span>
                          <span className="text-red-700 truncate">
                            {entry.destinationData.bestTimeToVisit}
                          </span>
                        </div>
                      )}
                      {entry.destinationData.averageTemperature && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-neutral-50 rounded px-2 py-1">
                          <span className="text-neutral-600">🌡️</span>
                          <span className="text-neutral-700 truncate">
                            {entry.destinationData.averageTemperature}
                          </span>
                        </div>
                      )}
                      {entry.destinationData.language && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-neutral-50 rounded px-2 py-1">
                          <span className="text-neutral-600">🗣️</span>
                          <span className="text-neutral-700 truncate">
                            {entry.destinationData.language}
                          </span>
                        </div>
                      )}
                      {entry.destinationData.currency && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-neutral-50 rounded px-2 py-1">
                          <span className="text-neutral-600">💱</span>
                          <span className="text-neutral-700 truncate">
                            {entry.destinationData.currency}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Highlights */}
                    {entry.destinationData.highlights &&
                      entry.destinationData.highlights.length > 0 && (
                        <div>
                          <p className="text-[10px] sm:text-[10px] font-medium text-neutral-700 mb-1">
                            Highlights
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {entry.destinationData.highlights.map((h: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-[9px] sm:text-[10px] bg-neutral-50 border-neutral-200 text-neutral-600"
                              >
                                {h}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Amenities */}
                    {entry.destinationData.amenities &&
                      entry.destinationData.amenities.length > 0 && (
                        <div>
                          <p className="text-[10px] sm:text-[10px] font-medium text-neutral-700 mb-1">
                            Activities & Amenities
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {entry.destinationData.amenities.map((a: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-[9px] sm:text-[10px] bg-neutral-50 border-neutral-200 text-neutral-600"
                              >
                                {a}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Things to know */}
                    {entry.destinationData.thingsToKnow && (
                      <div className="p-2 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-[9px] sm:text-[10px] text-red-600/80 line-clamp-3">
                          {entry.destinationData.thingsToKnow}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!entry.destinationId && (
                <div className="text-[10px] sm:text-xs text-muted-foreground italic py-2">
                  No destination selected — optional. Leave blank if not needed.
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Create Destination Dialog */}
      <Dialog open={!!createForDay} onOpenChange={open => !open && setCreateForDay(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Destination</DialogTitle>
          </DialogHeader>
          <DestinationForm
            onSubmit={handleCreateDestination}
            onCancel={() => setCreateForDay(null)}
            isLoading={isCreating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Resume Draft Banner ──────────────────────────────────────────────────────

function ResumeDraftBanner({
  age,
  onResume,
  onDismiss,
}: {
  age: string;
  onResume: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-red-50 border border-red-200 mb-2 sm:mb-4">
      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
      <p className="text-xs sm:text-sm text-red-800 flex-1">
        You have a saved draft from <span className="font-medium">{age}</span>.
      </p>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onDismiss}
          className="h-7 text-[10px] sm:text-xs border-red-300 text-red-700 hover:bg-red-100 flex-1 sm:flex-none"
        >
          Start Fresh
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onResume}
          className="h-7 text-[10px] sm:text-xs bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
        >
          Resume Draft
        </Button>
      </div>
    </div>
  );
}

// ─── Main Wizard Component ────────────────────────────────────────────────────

interface CreateItineraryWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

export function CreateItineraryWizard({ open, onOpenChange, lead }: CreateItineraryWizardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createItinerary = useCreateItinerary();
  const { user } = useAuthContext();
  const isMainBranch = user?.branchId === 'branch-main';

  // Draft management
  const { draft, showResumePrompt, draftAge, saveDraft, clearDraft, resumeDraft, startFresh } =
    useItineraryDraft(lead.id);

  // Prefill from data sources
  const { prefillData, allHotels, allVehicles } = useItineraryPrefill({
    leadId: lead.id,
    destination: draft?.step1?.destination || undefined,
    startDate: draft?.step1?.startDate ? new Date(draft.step1.startDate) : undefined,
    endDate: draft?.step1?.endDate ? new Date(draft.step1.endDate) : undefined,
    paxCount: draft?.step1?.totalTravelers || undefined,
  });

  // Wizard state — initialize from draft or defaults
  const [currentStep, setCurrentStep] = useState(1);
  const [step1, setStep1] = useState<Step1Data>(() => draft?.step1 || emptyStep1(lead));
  const [step2, setStep2] = useState<Step2Data>(() => draft?.step2 || emptyStep2(3));
  const [step3, setStep3] = useState<Step3Data>(() => draft?.step3 || emptyStep3(3));
  const [step4, setStep4] = useState<Step4Data>(() => draft?.step4 || emptyStep4());
  const [step5, setStep5] = useState<Step5Data>(() => draft?.step5 || emptyStep5(3));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});

  // Sync step2/step3 day counts when step1 dates change
  const daysCount = calculateDays(step1.startDate, step1.endDate);

  useEffect(() => {
    if (daysCount > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ensures an entry exists for every day when the day count changes
      setStep2(prev => {
        const newData = { ...prev };
        for (let d = 1; d <= daysCount; d++) {
          if (!newData[String(d)]) {
            newData[String(d)] = {
              hotelId: '',
              hotelName: '',
              roomType: '',
              bedType: '',
              basePrice: 0,
              mealPlan: 'MAP',
              mealPlanLabel: 'Breakfast + Dinner',
              mealPlanPrice: 0,
              roomCount: Math.ceil(step1.totalTravelers / 2),
            };
          }
        }
        return newData;
      });
      setStep3(prev => {
        const newData = { ...prev };
        for (let d = 1; d <= daysCount; d++) {
          if (!newData[String(d)]) {
            newData[String(d)] = {
              vehicleId: '',
              vehicleName: '',
              vehicleType: '',
              driverIncluded: true,
              pickupPoint: '',
              dropPoint: '',
              ratePerDay: 0,
              skipped: false,
            };
          }
        }
        return newData;
      });
      setStep5((prev: Step5Data) => {
        const newData = { ...prev };
        for (let d = 1; d <= daysCount; d++) {
          if (!newData[String(d)]) {
            newData[String(d)] = {
              destinationId: '',
              destinationName: '',
              destinationData: undefined,
            };
          }
        }
        return newData;
      });
    }
  }, [daysCount, step1.totalTravelers]);

  // Save draft on every change
  useEffect(() => {
    if (!open) return;
    saveDraft({ currentStep, step1, step2, step3, step4, step5 });
  }, [open, currentStep, step1, step2, step3, step4, step5]);

  // Resume draft when user confirms
  const handleResume = useCallback(() => {
    const restored = resumeDraft();
    if (restored) {
      setStep1(restored.step1 || emptyStep1(lead));
      setStep2(restored.step2 || emptyStep2(daysCount));
      setStep3(restored.step3 || emptyStep3(daysCount));
      setStep4(restored.step4 || emptyStep4());
      setStep5(restored.step5 || emptyStep5(daysCount));
      setCurrentStep(restored.currentStep || 1);
    }
  }, [resumeDraft, daysCount]);

  const handleStartFresh = useCallback(() => {
    startFresh();
    setStep1(emptyStep1(lead));
    setStep2(emptyStep2(daysCount));
    setStep3(emptyStep3(daysCount));
    setStep4(emptyStep4());
    setStep5(emptyStep5(daysCount));
    setCurrentStep(1);
    setErrors({});
    setWarnings({});
  }, [startFresh, daysCount]);

  // Validation
  const validateCurrentStep = (): ValidationResult => {
    setErrors({});
    setWarnings({});
    let result: ValidationResult;

    if (currentStep === 1) {
      result = validateStep1(step1);
    } else if (currentStep === 2) {
      result = validateStep2(step2, daysCount);
    } else if (currentStep === 3) {
      result = validateStep3(step3, daysCount);
    } else if (currentStep === 4) {
      result = validateStep4(step4);
    } else {
      // Step 5 is optional, always valid
      result = { valid: true, errors: {} };
    }

    if (!result.valid) {
      setErrors(result.errors);
    }
    if (result.warnings) {
      setWarnings(result.warnings);
    }
    return result;
  };

  const handleContinue = () => {
    const result = validateCurrentStep();
    if (!result.valid) {
      toast.error('Please fix the errors before continuing.');
      return;
    }
    if (result.warnings && Object.keys(result.warnings).length > 0) {
      const confirmed = confirm(Object.values(result.warnings).join('\n') + '\n\nProceed anyway?');
      if (!confirmed) return;
    }
    if (currentStep < 5) {
      setCurrentStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) setCurrentStep(step);
  };

  const handleSubmit = async () => {
    const result = validateCurrentStep();
    if (!result.valid) {
      toast.error('Please fix the errors before creating.');
      return;
    }
    if (result.warnings) {
      const confirmed = confirm(Object.values(result.warnings).join('\n') + '\n\nProceed anyway?');
      if (!confirmed) return;
    }

    try {
      const daysJson = buildDaysJson(step1, step2, step3, step5, daysCount);

      const result = await createItinerary.mutateAsync({
        destination: step1.destination,
        leadId: lead.id,
        daysJson,
        totalTravelers: step1.totalTravelers,
        ...(step1.startDate ? { startDate: step1.startDate } : {}),
        ...(step1.endDate ? { endDate: step1.endDate } : {}),
        ...(step1.tripType ? { tripType: step1.tripType } : {}),
        ...(step1.templateId ? { templateId: step1.templateId } : {}),
        included: step4.included,
        excluded: step4.excluded,
        ...(step4.notes ? { notes: step4.notes } : {}),
        ...(step4.quotes.length > 0 ? { quotes: step4.quotes } : {}),
      });

      clearDraft();
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      onOpenChange(false);
      toast.success('Itinerary created! Redirecting...');
      router.push(`/itineraries/${result.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(e?.response?.data?.error || e?.message || 'Failed to create itinerary');
    }
  };

  const stepTitles = ['Trip Details', 'Hotels', 'Transport', 'Pricing', 'Destinations'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden mx-2 sm:mx-4">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-0 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <Plane className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            Create Itinerary
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="px-4 sm:px-6 shrink-0">
          <WizardStepper currentStep={currentStep} onStepClick={handleStepClick} />
        </div>

        {/* Warnings banner */}
        {warnings && Object.keys(warnings).length > 0 && (
          <div className="mx-4 sm:mx-6 mt-2 p-2 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-[10px] sm:text-xs text-red-700 shrink-0">
            <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5 shrink-0" />
            <span>{Object.values(warnings).join(' · ')}</span>
          </div>
        )}

        {/* Resume draft banner */}
        {showResumePrompt && (
          <div className="px-4 sm:px-6 shrink-0">
            <ResumeDraftBanner
              age={draftAge || 'earlier'}
              onResume={handleResume}
              onDismiss={handleStartFresh}
            />
          </div>
        )}

        {/* Step content */}
        <ScrollArea className="flex-1 px-4 sm:px-6 py-3 sm:py-4">
          {currentStep === 1 && (
            <Step1BasicDetails
              data={step1}
              onChange={setStep1}
              errors={errors}
              lead={lead}
              prefillData={prefillData}
            />
          )}
          {currentStep === 2 && (
            <Step2HotelAssignment
              data={step2}
              onChange={setStep2}
              errors={errors}
              step1={step1}
              prefillHotels={allHotels}
              isMainBranch={isMainBranch}
            />
          )}
          {currentStep === 3 && (
            <Step3VehicleAssignment
              data={step3}
              onChange={setStep3}
              errors={errors}
              step1={step1}
              prefillVehicles={allVehicles}
              isMainBranch={isMainBranch}
            />
          )}
          {currentStep === 4 && (
            <Step4FinalDetails
              data={step4}
              onChange={setStep4}
              errors={errors}
              step1={step1}
              step2={step2}
              step3={step3}
              onClearDraft={clearDraft}
            />
          )}
          {currentStep === 5 && (
            <Step5DestinationAssignment data={step5} onChange={setStep5} step1={step1} />
          )}
        </ScrollArea>

        {/* Footer navigation */}
        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t shrink-0 flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-1 w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex-1 text-center text-[10px] sm:text-xs text-muted-foreground">
            Step {currentStep} of 5 — {stepTitles[currentStep - 1]}
          </div>

          {currentStep < 5 ? (
            <Button type="button" onClick={handleContinue} className="gap-1 w-full sm:w-auto">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createItinerary.isPending}
              className="gap-1 w-full sm:w-auto"
            >
              {createItinerary.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Plane className="h-4 w-4" /> Create
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
