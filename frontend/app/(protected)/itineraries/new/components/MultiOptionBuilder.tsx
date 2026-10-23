'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, X, GitBranch, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import type { Hotel } from '@/types';
import type { Vehicle } from '@/types/vehicle.types';
import { useMasterDestinationId } from '@/hooks/use-master-destination';
import { DayCard } from './DayCard';
import type { OptionBuilder, DayBuilderData } from '../types';
import { applyDayPatch, calculateOptionPricing, resolveOptionPricing } from '../types';

interface MultiOptionBuilderProps {
  options: OptionBuilder[];
  onChange: (options: OptionBuilder[]) => void;
  travelers: number;
  onSave: () => void;
  isSaving: boolean;
  /** Master destination from step 1; scopes each day's hotel picker to it. */
  destinationId?: string;
  destination?: string;
  /** Which of each day's sections to show. Defaults to both. */
  sections?: Array<'hotel' | 'vehicle'>;
  /** Overrides the footer button's label for a focused step. */
  nextLabel?: string;
}

const DEFAULT_LABELS = ['Basic', 'Standard', 'Premium', 'Luxury', 'Advance'];
const OPTION_COLORS = [
  { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  { bg: 'bg-neutral-900', text: 'text-white', border: 'border-neutral-900' },
  { bg: 'bg-neutral-100', text: 'text-neutral-800', border: 'border-neutral-400' },
  { bg: 'bg-red-600', text: 'text-white', border: 'border-red-600' },
  { bg: 'bg-white', text: 'text-neutral-700', border: 'border-neutral-300' },
];

// Compact tab button for packages
function PackageTab({
  label,
  isActive,
  onClick,
  onRemove,
  canRemove,
  color,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  canRemove: boolean;
  color: { bg: string; text: string; border: string };
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer shrink-0 text-xs font-medium',
        'min-w-[70px] justify-center',
        isActive
          ? `${color.bg} ${color.text} ${color.border} shadow-sm`
          : 'bg-white border-border hover:border-primary/40'
      )}
    >
      <span>{label}</span>
      {isActive && <Check className="h-3 w-3 shrink-0" />}
      {canRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 opacity-50 hover:opacity-100 cursor-pointer p-0.5 rounded hover:bg-black/10"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

// Mobile-friendly pricing summary card
function PricingSummaryCard({
  pricing,
  travelers,
  label,
  optIdx,
}: {
  pricing: ReturnType<typeof resolveOptionPricing>;
  travelers: number;
  label: string;
  optIdx: number;
}) {
  const color = OPTION_COLORS[optIdx % OPTION_COLORS.length];
  const displayTotal = pricing.effectiveTotal;

  return (
    <Card className={cn('border-0 bg-gradient-to-r from-primary/5 to-transparent', color.bg)}>
      <CardContent className="pt-3 pb-3 px-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">{label} Cost</span>
          {pricing.finalPriceIsManual && (
            <span className="text-[10px] text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded">
              Manual
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
          <div className="text-center py-1.5 bg-white/60 rounded">
            <div className="text-muted-foreground text-[10px]">Hotels</div>
            <div className="font-semibold">₹{pricing.hotelCost.toLocaleString()}</div>
          </div>
          <div className="text-center py-1.5 bg-white/60 rounded">
            <div className="text-muted-foreground text-[10px]">Transport</div>
            <div className="font-semibold">₹{pricing.vehicleCost.toLocaleString()}</div>
          </div>
          <div className="text-center py-1.5 bg-white/60 rounded">
            <div className="text-muted-foreground text-[10px]">Subtotal</div>
            <div className="font-semibold">₹{pricing.subtotal.toLocaleString()}</div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-primary/10">
          <span className="text-xs text-muted-foreground">{travelers} travelers</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-primary">₹{displayTotal.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MultiOptionBuilder({
  options,
  onChange,
  travelers,
  onSave,
  isSaving,
  destinationId,
  destination,
  sections = ['hotel', 'vehicle'],
  nextLabel = 'Continue to Day Details',
}: MultiOptionBuilderProps) {
  const masterDestinationId = useMasterDestinationId(destinationId, destination);
  const [activeTab, setActiveTab] = useState(options[0]?.id || '');

  // Fetch all available hotels
  const { data: hotelsData } = useQuery({
    queryKey: ['hotels-all-multi'],
    queryFn: async () => {
      const res = await api.get('/hotels?isActive=true&limit=100');
      return res.data.data.hotels as Hotel[];
    },
  });
  const availableHotels: typeof hotelsData = hotelsData || [];

  // Fetch all available vehicles
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-all-multi'],
    queryFn: async () => {
      const res = await api.get('/vehicles?isActive=true&limit=100');
      return res.data.data.vehicles as Vehicle[];
    },
  });
  const availableVehicles: typeof vehiclesData = vehiclesData || [];

  const activeIdx = options.findIndex(o => o.id === activeTab);
  const activeOption = options[activeIdx];

  const updateOptionLabel = (optId: string, label: string) => {
    onChange(options.map(o => (o.id === optId ? { ...o, label } : o)));
  };

  const handleDayChange = (optId: string, dayIndex: number, patch: Partial<DayBuilderData>) => {
    onChange(
      options.map(o => {
        if (o.id !== optId) return o;
        const days = applyDayPatch(o.days, dayIndex, patch);
        // Recalculate from the new days, keeping the agent's adjustments and
        // any price they typed themselves — but never a stale snapshot.
        const { effectiveTotal: _effectiveTotal, ...pricing } = resolveOptionPricing(
          { days, pricing: o.pricing },
          travelers,
          o.pricing?.additionalCharges ?? 0
        );
        return { ...o, days, pricing };
      })
    );
  };

  const addOption = () => {
    if (options.length >= 5) return;
    const newLabel = DEFAULT_LABELS[options.length] || `Option ${options.length + 1}`;
    // Start with empty days (same structure, no hotel/vehicle/destination)
    const templateDays = options[0]?.days || [];
    const emptyDays = templateDays.map(d => ({
      ...d,
      dayNumber: d.dayNumber,
      date: d.date,
      // Clear all selections so each package starts fresh
      hotelId: '',
      hotelName: '',
      hotelAddress: '',
      hotelStars: undefined,
      hotelContact: '',
      hotelImage: null,
      roomType: '',
      bedType: '',
      basePrice: 0,
      mealPlan: '',
      mealPlanLabel: '',
      mealPlanPrice: 0,
      roomCount: 1,
      extraBedPrice: 0,
      extraBedCount: 0,
      childPrice: 0,
      childCount: 0,
      hotelFromDay: undefined,
      vehicleId: '',
      vehicleName: '',
      vehicleType: '',
      driverIncluded: true,
      ratePerDay: 0,
      vehicleCount: 1,
      pickupPoint: '',
      dropPoint: '',
      vehicleImage: null,
      destinationId: '',
      destination: '',
      destinationAddress: '',
      destinationHighlights: [],
      description: '',
      notes: '',
      images: [],
      hotelAlts: [],
      vehicleAlts: [],
      _isManualHotelEntry: false,
      _isManualVehicleEntry: false,
    }));
    const newOpt: OptionBuilder = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: newLabel,
      days: emptyDays,
      pricing: calculateOptionPricing(emptyDays, travelers),
    };
    onChange([...options, newOpt]);
    setActiveTab(newOpt.id);
  };

  const removeOption = (optId: string) => {
    if (options.length <= 2) return;
    const remaining = options.filter(o => o.id !== optId);
    onChange(remaining);
    if (activeTab === optId) setActiveTab(remaining[0]?.id || '');
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="text-lg font-bold sm:text-xl">Package Builder</h2>
          </div>
          {options.length > 2 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeOption(activeTab)}
              className="h-8 text-muted-foreground hover:text-destructive gap-1 px-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-xs">Remove</span>
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Build {options.length} packages with {options[0]?.days?.length || 0} days each
        </p>
      </div>

      {/* Package Tabs - Always visible scrollable tabs */}
      <div>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
          {options.map((opt, idx) => {
            const color = OPTION_COLORS[idx % OPTION_COLORS.length];
            return (
              <PackageTab
                key={opt.id}
                label={opt.label || `P${idx + 1}`}
                isActive={activeTab === opt.id}
                onClick={() => setActiveTab(opt.id)}
                onRemove={() => removeOption(opt.id)}
                canRemove={options.length > 2}
                color={color}
              />
            );
          })}

          {options.length < 5 && (
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all shrink-0 text-xs text-muted-foreground hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Package Editor */}
      {activeOption && (
        <div className="space-y-4">
          {/* Package Label */}
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'font-bold text-xs',
                OPTION_COLORS[activeIdx % OPTION_COLORS.length].bg,
                OPTION_COLORS[activeIdx % OPTION_COLORS.length].text,
                'border-0 shrink-0'
              )}
            >
              {activeOption.label || `Package ${activeIdx + 1}`}
            </Badge>
            <Input
              value={activeOption.label}
              onChange={e => updateOptionLabel(activeOption.id, e.target.value)}
              placeholder="Package name"
              className="h-9 max-w-xs flex-1 text-sm"
            />
          </div>

          {/* Days List */}
          <div className="space-y-3">
            {activeOption.days.map((day, dayIndex) => (
              <DayCard
                key={`${activeOption.id}-${day.dayNumber}`}
                day={day}
                dayIndex={dayIndex}
                onChange={(idx, patch) => handleDayChange(activeOption.id, idx, patch)}
                availableHotels={availableHotels}
                availableVehicles={availableVehicles}
                travelers={travelers}
                defaultOpen={dayIndex === 0}
                hideMealAndActivities={false}
                destinationId={masterDestinationId}
                destinationLabel={destination}
                sections={sections}
                isLastDay={
                  activeOption.days.length > 1 && dayIndex === activeOption.days.length - 1
                }
                allDays={activeOption.days}
              />
            ))}
          </div>

          {/* Pricing Summary */}
          <PricingSummaryCard
            pricing={resolveOptionPricing(
              activeOption,
              travelers,
              activeOption.pricing?.additionalCharges ?? 0
            )}
            travelers={travelers}
            label={activeOption.label || `Package ${activeIdx + 1}`}
            optIdx={activeIdx}
          />
        </div>
      )}

      {/* Footer */}
      <div className="pt-2">
        <Button onClick={onSave} disabled={isSaving} className="w-full gap-2" size="lg">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              <span>{nextLabel}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
