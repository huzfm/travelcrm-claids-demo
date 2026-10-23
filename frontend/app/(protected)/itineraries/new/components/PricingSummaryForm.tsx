'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  Users,
  Bed,
  Baby,
  Percent,
  IndianRupee,
  Check,
  Save,
  Plus,
  X,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatCurrencyText } from '@/lib/currency';
import { useAuthContext } from '@/components/providers';
import type {
  Step1FormData,
  DayBuilderData,
  PricingData,
  OptionBuilder,
  OptionPricing,
  HotelManualPrices,
  CostOverride,
  HotelCostLine,
  VehicleCostLine,
} from '../types';
import {
  createEmptyAdditionalCharge,
  calculateOptionPricing,
  calculateCostBreakdown,
  resolveOptionPricing,
  singlePricingOverrides,
  sumAdditionalCharges,
  parseOverride,
} from '../types';
import { PerPersonSplitCard } from './PerPersonSplitCard';

interface PricingSummaryFormProps {
  step1Data: Step1FormData;
  days: DayBuilderData[];
  pricingData: PricingData;
  onPricingChange: (data: PricingData) => void;
  onSave: () => void;
  isSaving: boolean;
  isMulti?: boolean;
  options?: OptionBuilder[];
  onOptionsChange?: (options: OptionBuilder[]) => void;
  currency?: string;
}

const OPTION_COLORS = [
  { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  { bg: 'bg-neutral-900', text: 'text-white', border: 'border-neutral-900' },
  { bg: 'bg-neutral-100', text: 'text-neutral-800', border: 'border-neutral-400' },
  { bg: 'bg-red-600', text: 'text-white', border: 'border-red-600' },
  { bg: 'bg-white', text: 'text-neutral-700', border: 'border-neutral-300' },
];

// Get unique hotels from days - FIX: track total rooms instead of just days
function getUniqueHotels(days: DayBuilderData[]) {
  const hotelMap = new Map<
    string,
    { name: string; count: number; basePrice: number; mealPlanPrice: number; roomCount: number }
  >();
  days.forEach(day => {
    if (day.hotelId && day.hotelName) {
      const existing = hotelMap.get(day.hotelId);
      if (existing) {
        existing.count += 1;
        existing.roomCount += day.roomCount || 1;
      } else {
        hotelMap.set(day.hotelId, {
          name: day.hotelName,
          count: 1,
          basePrice: day.basePrice,
          mealPlanPrice: day.mealPlanPrice,
          roomCount: day.roomCount || 1,
        });
      }
    }
  });
  return Array.from(hotelMap.entries()).map(([id, data]) => ({ id, ...data }));
}

// Get unique vehicles from days
function getUniqueVehicles(days: DayBuilderData[]) {
  const vehicleMap = new Map<
    string,
    { name: string; type: string; count: number; ratePerDay: number; driverIncluded: boolean }
  >();
  days.forEach(day => {
    if (day.vehicleId && day.vehicleName) {
      const existing = vehicleMap.get(day.vehicleId);
      if (existing) {
        existing.count += day.vehicleCount || 1;
      } else {
        vehicleMap.set(day.vehicleId, {
          name: day.vehicleName,
          type: day.vehicleType || '',
          count: day.vehicleCount || 1,
          ratePerDay: day.ratePerDay,
          driverIncluded: day.driverIncluded,
        });
      }
    }
  });
  return Array.from(vehicleMap.entries()).map(([id, data]) => ({ id, ...data }));
}

/** Sets or (with `undefined`) removes one key, without mutating the map. */
function withEntry<T>(map: Record<string, T> | undefined, key: string, value: T | undefined) {
  const next = { ...(map ?? {}) };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

/** Whole numbers stay whole; anything else is shown to two decimals at most. */
function displayAmount(value: number | '') {
  return value === '' ? '' : String(Math.round(value * 100) / 100);
}

/**
 * A price box whose blank state means "use the calculated figure". While the
 * agent is typing it shows exactly what they typed — including a blank box —
 * and only falls back to `value` once they leave it. Without this, clearing
 * the box to retype a price made the calculated figure jump straight back in
 * and the next keystroke was appended to it.
 */
function OverrideInput({
  value,
  onValueChange,
  ui = false,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number | '';
  onValueChange: (raw: string) => void;
  /** Render the design-system Input instead of a bare input. */
  ui?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shared = {
    ...props,
    type: 'number',
    min: props.min ?? 0,
    value: draft ?? displayAmount(value),
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setDraft(displayAmount(value));
      props.onFocus?.(e);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value);
      onValueChange(e.target.value);
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      setDraft(null);
      props.onBlur?.(e);
    },
    // Chrome steps a focused number field on wheel; scrolling the page past
    // the box must never change a price.
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
  };
  return ui ? <Input {...shared} /> : <input {...shared} />;
}

/** The rate every night shares, or undefined when the nights differ. */
function sharedRate(days: DayBuilderData[], pick: (d: DayBuilderData) => number) {
  const rates = new Set(days.map(d => pick(d) || 0));
  return rates.size === 1 ? [...rates][0] : undefined;
}

export function PricingSummaryForm({
  step1Data,
  days,
  pricingData,
  onPricingChange,
  onSave,
  isSaving,
  isMulti,
  options,
  onOptionsChange,
  currency: currencyProp,
}: PricingSummaryFormProps) {
  const { user } = useAuthContext();
  const branchCurrency = user?.branch?.currency || 'INR';
  const currency = currencyProp || step1Data?.currency || branchCurrency;
  const [activeOptionIdx, setActiveOptionIdx] = useState(0);
  const hotels = useMemo(() => getUniqueHotels(days), [days]);
  const vehicles = useMemo(() => getUniqueVehicles(days), [days]);
  const tripDays = days.length || 1;
  const isMultiOption = isMulti && options && options.length > 0;

  const additionalChargesTotal = sumAdditionalCharges(pricingData.additionalCharges);

  // Every number on this screen comes from the shared calculator in ../types,
  // the same one the save uses — so the screen, the database and the PDF
  // can't drift apart.
  const getOptionPricing = (opt: OptionBuilder) =>
    resolveOptionPricing(opt, step1Data.totalTravelers, additionalChargesTotal);

  /**
   * Applies a pricing edit to one package and stores the recalculated result,
   * so anything else reading `opt.pricing` sees the same figures as here.
   */
  const updateOptionPricing = (optIdx: number, patch: Partial<OptionPricing>) => {
    if (!options) return;
    onOptionsChange?.(
      options.map((o, i) => {
        if (i !== optIdx) return o;
        const { effectiveTotal: _effectiveTotal, ...pricing } = getOptionPricing({
          ...o,
          pricing: { ...o.pricing, ...patch },
        });
        return { ...o, pricing };
      })
    );
  };

  const overrides = useMemo(() => singlePricingOverrides(pricingData), [pricingData]);
  const breakdown = useMemo(() => calculateCostBreakdown(days, overrides), [days, overrides]);

  // Single-package totals
  const calculations = (() => {
    const pricing = calculateOptionPricing(
      days,
      step1Data.totalTravelers,
      additionalChargesTotal,
      pricingData.marginPercent,
      pricingData.gstPercent,
      pricingData.discountPercent,
      pricingData.roundOff,
      overrides
    );
    const total = pricing.totalCost;
    // A hotel whose total was typed in can't be split back into rooms/meals,
    // so the breakdown then shows one hotels line instead.
    const hotelOverridden = breakdown.hotels.some(h => h.overridden);
    const sumHotels = (pick: (h: (typeof breakdown.hotels)[number]) => number) =>
      breakdown.hotels.reduce((sum, h) => sum + pick(h), 0);

    return {
      hotelCost: pricing.hotelCost,
      hotelOverridden,
      roomCost: sumHotels(h => h.room),
      mealPlanCost: sumHotels(h => h.meal),
      extraBedCost: sumHotels(h => h.extraBed),
      childCost: sumHotels(h => h.child),
      vehicleCost: pricing.vehicleCost,
      activityCost: pricing.activityCost,
      additionalChargesTotal,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      marginAmount: pricing.marginAmount,
      gstAmount: pricing.gstAmount,
      roundOff: pricing.roundOff,
      total,
      // When the user has typed a manual Grand Total, expose the gap between
      // the auto-computed total and the override as `manualAdjustment` so the
      // breakdown can show a "Manual Adjustment" line. This keeps the Subtotal
      // + adjustments = Final Total identity intact, even when the user types
      // a rounded/approximate total.
      manualAdjustment: pricingData.customGrandTotalIsManual
        ? (pricingData.customGrandTotal as number) - total
        : 0,
      // Use customGrandTotal only if the user has explicitly typed it
      // (customGrandTotalIsManual). Otherwise the live computed total wins,
      // so a stale seeded or leftover value can never disagree with the
      // visible Subtotal row.
      finalTotal: pricingData.customGrandTotalIsManual
        ? (pricingData.customGrandTotal as number)
        : total,
    };
  })();

  // Additional charges handlers
  const addCharge = () => {
    updatePricingData({
      additionalCharges: [...pricingData.additionalCharges, createEmptyAdditionalCharge()],
    });
  };

  const updateCharge = (id: string, field: 'label' | 'amount', value: string | number) => {
    updatePricingData({
      additionalCharges: pricingData.additionalCharges.map(c =>
        c.id === id ? { ...c, [field]: field === 'amount' ? Number(value) || 0 : value } : c
      ),
    });
  };

  const removeCharge = (id: string) => {
    updatePricingData({
      additionalCharges: pricingData.additionalCharges.filter(c => c.id !== id),
    });
  };

  const updatePricingData = (updated: Partial<PricingData>) => {
    onPricingChange({
      ...pricingData,
      ...updated,
      customGrandTotal: undefined,
      customGrandTotalIsManual: false,
    });
  };

  // A blank box means "use the calculated figure", never 0.
  const setHotelRate = (hotelId: string, field: keyof HotelManualPrices, raw: string) => {
    const rates = withEntry<number>(
      pricingData.hotelPrices?.[hotelId] as Record<string, number> | undefined,
      field,
      parseOverride(raw)
    ) as Partial<HotelManualPrices>;
    updatePricingData({
      hotelPrices: withEntry(
        pricingData.hotelPrices,
        hotelId,
        Object.keys(rates).length > 0 ? rates : undefined
      ),
      // Editing a rate means the agent wants it priced from the rates again.
      hotelTotals: withEntry(pricingData.hotelTotals, hotelId, undefined),
    });
  };

  // A typed total remembers the figure it replaced (its basis), so it stops
  // applying if the nights or vehicle days are changed afterwards.
  const toOverride = (raw: string, basis: number): CostOverride | undefined => {
    const amount = parseOverride(raw);
    return amount === undefined ? undefined : { amount, basis };
  };

  const setHotelTotal = (line: HotelCostLine, raw: string) => {
    updatePricingData({
      hotelTotals: withEntry(
        pricingData.hotelTotals,
        line.hotelId,
        toOverride(raw, line.calculated)
      ),
    });
  };

  const setVehicleTotal = (line: VehicleCostLine, raw: string) => {
    updatePricingData({
      vehicleTotals: withEntry(
        pricingData.vehicleTotals,
        line.vehicleId,
        toOverride(raw, line.calculated)
      ),
    });
  };

  const handleCustomGrandTotalChange = (raw: string) => {
    const value = parseOverride(raw);
    onPricingChange({
      ...pricingData,
      customGrandTotal: value,
      customGrandTotalIsManual: value !== undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-2 sm:px-0">
      {/* Header */}
      <div className="text-center px-2">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center justify-center gap-2">
          <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Pricing Details
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Configure rooms, extras, and finalize pricing for your trip
        </p>
      </div>

      {/* Trip Summary Banner */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4 px-3">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <Badge variant="outline" className="text-xs sm:text-base px-2 sm:px-3 py-1">
              <Bed className="h-3 w-3 mr-1" />
              {tripDays} Nights
            </Badge>
            <Badge variant="outline" className="text-xs sm:text-base px-2 sm:px-3 py-1">
              <Users className="h-3 w-3 mr-1" />
              {step1Data.totalTravelers} Travelers
            </Badge>
            <Badge variant="outline" className="text-xs sm:text-base px-2 sm:px-3 py-1">
              {hotels.length} Hotels
            </Badge>
            {vehicles.length > 0 && (
              <Badge variant="outline" className="text-xs sm:text-base px-2 sm:px-3 py-1">
                <Car className="h-3 w-3 mr-1" />
                {vehicles.length} Vehicles
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Multi-Option Tabs */}
      {isMultiOption && (
        <Tabs
          defaultValue={options[0]?.id}
          onValueChange={v => setActiveOptionIdx(options.findIndex(o => o.id === v))}
        >
          <TabsList className="w-full justify-start flex flex-wrap gap-2 h-auto py-2 bg-transparent border-0">
            {options.map((opt, idx) => {
              const color = OPTION_COLORS[idx % OPTION_COLORS.length];
              const optPricing = getOptionPricing(opt);
              return (
                <TabsTrigger
                  key={opt.id}
                  value={opt.id}
                  className={cn('data-[state=active]:shadow-md', color.bg, color.text)}
                >
                  <span className="font-semibold">{opt.label || `Option ${idx + 1}`}</span>
                  <span className="ml-2 text-xs opacity-70">
                    {formatCurrencyText(optPricing.effectiveTotal, currency)}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {options.map((opt, optIdx) => {
            const color = OPTION_COLORS[optIdx % OPTION_COLORS.length];
            const optPricing = getOptionPricing(opt);
            const optBreakdown = calculateCostBreakdown(opt.days);
            const optVehicles = getUniqueVehicles(opt.days);
            const setPercent =
              (field: 'marginPercent' | 'gstPercent' | 'discountPercent' | 'roundOff') =>
              (e: React.ChangeEvent<HTMLInputElement>) =>
                updateOptionPricing(optIdx, { [field]: parseFloat(e.target.value) || 0 });
            return (
              <TabsContent key={opt.id} value={opt.id} className="space-y-4 mt-4">
                {/* Option Cost Summary */}
                <Card className={cn('border-2', color.border)}>
                  <CardHeader className={cn('pb-2', color.bg)}>
                    <CardTitle className={cn('text-base', color.text)}>
                      {opt.label || `Option ${optIdx + 1}`} - Cost Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Manual Override Fields — a blank box goes back to the calculated figure */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Hotel Cost (Manual)</Label>
                        <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 rounded-md px-3 h-10">
                          <OverrideInput
                            value={optPricing.hotelCost}
                            onValueChange={raw =>
                              updateOptionPricing(optIdx, {
                                manualHotelCost: parseOverride(raw),
                                manualHotelBasis: optBreakdown.hotelCost,
                              })
                            }
                            className="flex-1 bg-transparent text-right font-bold text-neutral-700 w-full outline-none"
                          />
                        </div>
                        {optPricing.manualHotelCost !== undefined && (
                          <p className="text-[11px] text-muted-foreground">
                            Calculated: {formatCurrencyText(optBreakdown.hotelCost, currency)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Vehicle Cost (Manual)
                        </Label>
                        <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 rounded-md px-3 h-10">
                          <OverrideInput
                            value={optPricing.vehicleCost}
                            onValueChange={raw =>
                              updateOptionPricing(optIdx, {
                                manualVehicleCost: parseOverride(raw),
                                manualVehicleBasis: optBreakdown.vehicleCost,
                              })
                            }
                            className="flex-1 bg-transparent text-right font-bold text-neutral-700 w-full outline-none"
                          />
                        </div>
                        {optPricing.manualVehicleCost !== undefined && (
                          <p className="text-[11px] text-muted-foreground">
                            Calculated: {formatCurrencyText(optBreakdown.vehicleCost, currency)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Grand Total (Manual)
                        </Label>
                        <div className="flex items-center gap-1 bg-primary/5 border border-primary/30 rounded-md px-3 h-10">
                          <OverrideInput
                            value={optPricing.effectiveTotal}
                            onValueChange={raw => {
                              const finalPrice = parseOverride(raw);
                              updateOptionPricing(optIdx, {
                                finalPrice,
                                finalPriceIsManual: finalPrice !== undefined,
                              });
                            }}
                            className="flex-1 bg-transparent text-right font-bold text-primary text-lg w-full outline-none"
                          />
                        </div>
                        {optPricing.finalPriceIsManual && (
                          <p className="text-[11px] text-muted-foreground">
                            Calculated: {formatCurrencyText(optPricing.totalCost, currency)} · clear
                            to use it
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Hotels ({step1Data.totalTravelers} travelers)
                        </span>
                        <p className="font-semibold text-lg">
                          {formatCurrencyText(optPricing.hotelCost, currency)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Transport</span>
                        <p className="font-semibold text-lg">
                          {formatCurrencyText(optPricing.vehicleCost, currency)}
                        </p>
                      </div>
                      {optPricing.activityCost > 0 && (
                        <div>
                          <span className="text-muted-foreground">Activities</span>
                          <p className="font-semibold text-lg">
                            {formatCurrencyText(optPricing.activityCost, currency)}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Subtotal</span>
                        <p className="font-semibold text-lg">
                          {formatCurrencyText(optPricing.subtotal, currency)}
                        </p>
                      </div>
                    </div>

                    {/* Adjustments - Per Option */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t">
                      <div className="space-y-1">
                        <Label className="text-xs">Margin %</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={optPricing.marginPercent}
                            onChange={setPercent('marginPercent')}
                            onWheel={e => e.currentTarget.blur()}
                            className="h-8 w-20"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        {optPricing.marginPercent > 0 && (
                          <span className="text-xs text-neutral-600">
                            +{formatCurrencyText(optPricing.marginAmount, currency)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">GST %</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={optPricing.gstPercent}
                            onChange={setPercent('gstPercent')}
                            onWheel={e => e.currentTarget.blur()}
                            className="h-8 w-20"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        {optPricing.gstPercent > 0 && (
                          <span className="text-xs text-red-600">
                            +{formatCurrencyText(optPricing.gstAmount, currency)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Round Off</Label>
                        <Input
                          type="number"
                          value={optPricing.roundOff || ''}
                          onChange={setPercent('roundOff')}
                          onWheel={e => e.currentTarget.blur()}
                          className="h-8"
                          placeholder={formatCurrencyText(0, currency)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Discount %</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={optPricing.discountPercent}
                            onChange={setPercent('discountPercent')}
                            onWheel={e => e.currentTarget.blur()}
                            className="h-8 w-20"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        {optPricing.discountPercent > 0 && (
                          <span className="text-xs text-neutral-600">
                            -{formatCurrencyText(optPricing.discountAmount, currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Option Total */}
                    <div
                      className={cn('flex justify-between items-center p-4 rounded-lg', color.bg)}
                    >
                      <div>
                        <p className={cn('font-semibold', color.text)}>
                          {opt.label || `Option ${optIdx + 1}`} Total
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {optPricing.finalPriceIsManual ? 'Manual override' : 'Calculated total'}
                        </p>
                      </div>
                      <p className={cn('text-2xl font-bold', color.text)}>
                        {formatCurrencyText(optPricing.effectiveTotal, currency)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <PerPersonSplitCard
                  total={optPricing.effectiveTotal}
                  adults={step1Data.adults}
                  childCount={step1Data.children}
                  childrenAges={step1Data.childrenAges}
                  currency={currency}
                  value={opt.perPersonSplit}
                  onChange={perPersonSplit =>
                    onOptionsChange?.(
                      options.map(o => (o.id === opt.id ? { ...o, perPersonSplit } : o))
                    )
                  }
                />

                {/* Hotels in this option */}
                {optBreakdown.hotels.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Bed className="h-5 w-5 text-primary" />
                        Hotels in this Option
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {optBreakdown.hotels.map(hotel => (
                        <div
                          key={hotel.hotelId}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-neutral-600" />
                            <span className="font-medium">{hotel.hotelName}</span>
                            <Badge variant="outline">
                              {hotel.nights} night{hotel.nights > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <span className="font-semibold">
                            {formatCurrencyText(hotel.total, currency)}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Vehicles in this option */}
                {optVehicles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Car className="h-5 w-5 text-neutral-600" />
                        Vehicles in this Option
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {optVehicles.map(vehicle => (
                        <div
                          key={vehicle.id}
                          className="flex items-center justify-between p-3 bg-neutral-50/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-neutral-600" />
                            <span className="font-medium">{vehicle.name}</span>
                            {vehicle.type && (
                              <Badge variant="outline" className="text-xs">
                                {vehicle.type}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {vehicle.count} day{vehicle.count > 1 ? 's' : ''}
                            </Badge>
                            {vehicle.driverIncluded && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-neutral-100 text-neutral-700"
                              >
                                + Driver
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold text-neutral-700">
                            {formatCurrencyText(
                              optBreakdown.vehicles.find(v => v.vehicleId === vehicle.id)?.total ??
                                0,
                              currency
                            )}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {isMultiOption && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="w-full">
                <p className="font-semibold mb-2">Final Package Prices</p>
                <Tabs
                  value={options[activeOptionIdx]?.id}
                  onValueChange={v => setActiveOptionIdx(options.findIndex(o => o.id === v))}
                >
                  <TabsList className="h-auto bg-transparent border-0 p-0 gap-2">
                    {options.map((opt, i) => {
                      const color = OPTION_COLORS[i % OPTION_COLORS.length];
                      return (
                        <TabsTrigger
                          key={opt.id}
                          value={opt.id}
                          className={cn(
                            'data-[state=active]:shadow-md py-1.5 px-3',
                            color.bg,
                            color.text
                          )}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-sm">
                              {opt.label || `Option ${i + 1}`}
                            </span>
                            <span className="text-xs font-bold">
                              {formatCurrencyText(getOptionPricing(opt).effectiveTotal, currency)}
                            </span>
                          </div>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
              <Button onClick={onSave} disabled={isSaving} size="lg" className="gap-2">
                {isSaving ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Create Itinerary & View
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Option - Full Pricing Form */}
      {!isMulti && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bed className="h-5 w-5 text-primary" />
              Hotel Rooms & Beds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {breakdown.hotels.map(line => {
              const hotelDays = days.filter(d => d.hotelId === line.hotelId);
              const rates = pricingData.hotelPrices?.[line.hotelId];
              // Show the rate when every night shares it; when the nights differ
              // the box stays blank ("Varies") and each night keeps its own rate
              // until the agent types one for the whole stay.
              const rateField = (
                field: keyof HotelManualPrices,
                pick: (d: DayBuilderData) => number
              ) => {
                const shared = sharedRate(hotelDays, pick);
                return {
                  value: rates?.[field] ?? shared ?? ('' as const),
                  placeholder: shared === undefined ? 'Varies' : '0',
                  onValueChange: (raw: string) => setHotelRate(line.hotelId, field, raw),
                };
              };

              return (
                <div key={line.hotelId} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  {/* Hotel name */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-neutral-600" />
                      <span className="font-semibold">{line.hotelName}</span>
                    </div>
                    <Badge variant="outline">
                      {line.nights} night{line.nights > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Manual Price Entry Section */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-white rounded-lg border border-neutral-200">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Bed className="h-3 w-3" /> Room /night
                      </Label>
                      <OverrideInput
                        ui
                        {...rateField('basePricePerRoom', d => d.basePrice)}
                        className="h-9 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Room Type +</Label>
                      <OverrideInput
                        ui
                        {...rateField('roomTypeUpgradePrice', d => d.roomTypePrice)}
                        className="h-9 text-sm font-medium"
                      />
                    </div>

                    {line.extraBeds > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Extra Bed</Label>
                        <OverrideInput
                          ui
                          {...rateField('extraBedPrice', d => d.extraBedPrice)}
                          className="h-9 text-sm font-medium"
                        />
                      </div>
                    )}

                    {line.children > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Child (no bed)</Label>
                        <OverrideInput
                          ui
                          {...rateField('childPrice', d => d.childPrice)}
                          className="h-9 text-sm font-medium"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Meal Plan</Label>
                      <OverrideInput
                        ui
                        {...rateField('mealPlanPricePerRoom', d => d.mealPlanPrice)}
                        className="h-9 text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Room & bed controls */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Rooms */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Bed className="h-3 w-3" /> Rooms
                      </Label>
                      <div className="h-8 flex items-center px-3 bg-white rounded-md border text-center w-14 mx-auto">
                        <span className="font-medium w-full">{line.rooms}</span>
                      </div>
                    </div>

                    {/* Extra Beds (Adult) */}
                    {line.extraBeds > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          + Extra Bed
                        </Label>
                        <div className="h-8 flex items-center px-3 bg-white rounded-md border text-center w-14 mx-auto">
                          <span className="font-medium w-full">{line.extraBeds}</span>
                        </div>
                      </div>
                    )}

                    {/* Children without bed */}
                    {line.children > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Baby className="h-3 w-3" /> Child (No Bed)
                        </Label>
                        <div className="h-8 flex items-center px-3 bg-white rounded-md border text-center w-14 mx-auto">
                          <span className="font-medium w-full">{line.children}</span>
                        </div>
                      </div>
                    )}

                    {/* Total for this hotel only - editable; blank goes back to the rates */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hotel Total</Label>
                      <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-md px-3 h-10">
                        <OverrideInput
                          value={line.total}
                          onValueChange={raw => setHotelTotal(line, raw)}
                          className="flex-1 bg-transparent text-right font-bold text-neutral-700 text-lg w-full outline-none"
                        />
                      </div>
                      {line.overridden && (
                        <p className="text-[11px] text-muted-foreground">
                          From rates: {formatCurrencyText(line.calculated, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {breakdown.hotels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bed className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No hotels configured in your itinerary yet.</p>
                <p className="text-sm">Go back to add hotels to your days.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Single Option - Vehicle Details */}
      {!isMulti && vehicles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5 text-neutral-600" />
              Transport & Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicles.map(vehicle => {
              const line = breakdown.vehicles.find(v => v.vehicleId === vehicle.id);
              const vehicleCount = vehicle.count;

              return (
                <div key={vehicle.id} className="border rounded-lg p-4 space-y-3 bg-neutral-50/30">
                  {/* Vehicle name and info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-neutral-600" />
                      <span className="font-semibold">{vehicle.name}</span>
                      {vehicle.type && (
                        <Badge variant="outline" className="text-xs">
                          {vehicle.type}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline">
                      {vehicle.count} day{vehicle.count > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Vehicle details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Rate/Day</Label>
                      <div className="h-8 flex items-center px-3 bg-white rounded-md border">
                        <span className="font-medium">
                          {formatCurrencyText(vehicle.ratePerDay, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Vehicles</Label>
                      <div className="h-8 flex items-center px-3 bg-white rounded-md border text-center w-14 mx-auto">
                        <span className="font-medium w-full">{vehicleCount}</span>
                      </div>
                    </div>
                    {/* Total for this vehicle only - editable; blank goes back to the day rates */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Vehicle Total</Label>
                      <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-md px-3 h-10">
                        <OverrideInput
                          value={line?.total ?? 0}
                          onValueChange={raw => line && setVehicleTotal(line, raw)}
                          className="flex-1 bg-transparent text-right font-bold text-neutral-700 text-lg w-full outline-none"
                        />
                      </div>
                      {line?.overridden && (
                        <p className="text-[11px] text-muted-foreground">
                          From day rates: {formatCurrencyText(line.calculated, currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Single Option only sections */}
      {!isMulti && (
        <>
          {/* Additional Charges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-primary" />
                Additional Charges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pricingData.additionalCharges.length > 0 ? (
                <div className="space-y-2">
                  {pricingData.additionalCharges.map(charge => (
                    <div key={charge.id} className="flex items-center gap-2">
                      <Input
                        value={charge.label}
                        onChange={e => updateCharge(charge.id, 'label', e.target.value)}
                        placeholder="Charge description (e.g., Visa Fee)"
                        className="flex-1 h-9 text-sm"
                      />
                      <Input
                        type="number"
                        onWheel={e => e.currentTarget.blur()}
                        min={0}
                        value={charge.amount || ''}
                        onChange={e => updateCharge(charge.id, 'amount', e.target.value)}
                        placeholder={formatCurrencyText(0, currency)}
                        className="w-32 h-9 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCharge(charge.id)}
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No additional charges added. Click below to add.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCharge}
                className="w-full gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Charge
              </Button>
            </CardContent>
          </Card>

          {/* Adjustments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent className="h-5 w-5 text-primary" />
                Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {/* Discount */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Discount (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      onWheel={e => e.currentTarget.blur()}
                      min={0}
                      max={100}
                      value={pricingData.discountPercent}
                      onChange={e =>
                        updatePricingData({
                          discountPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-10"
                      placeholder="0"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  {pricingData.discountPercent > 0 && (
                    <p className="text-xs text-neutral-600">
                      -{formatCurrencyText(calculations.discountAmount, currency)}
                    </p>
                  )}
                </div>

                {/* Margin */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Margin (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      onWheel={e => e.currentTarget.blur()}
                      min={0}
                      max={100}
                      value={pricingData.marginPercent}
                      onChange={e =>
                        updatePricingData({
                          marginPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-10"
                      placeholder="0"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  {pricingData.marginPercent > 0 && (
                    <p className="text-xs text-neutral-600">
                      +{formatCurrencyText(calculations.marginAmount, currency)}
                    </p>
                  )}
                </div>

                {/* GST */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">GST (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      onWheel={e => e.currentTarget.blur()}
                      min={0}
                      max={100}
                      value={pricingData.gstPercent}
                      onChange={e =>
                        updatePricingData({
                          gstPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-10"
                      placeholder="0"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>{' '}
                </div>

                {/* Round Off */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Round Off</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      {formatCurrencyText(0, currency)
                        .replace(/[0-9,]/g, '')
                        .trim()}
                    </span>
                    <Input
                      type="number"
                      onWheel={e => e.currentTarget.blur()}
                      value={pricingData.roundOff || ''}
                      onChange={e =>
                        updatePricingData({
                          roundOff: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-10"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Add/subtract to round total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grand Total - Editable */}
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <Label className="text-sm font-semibold">Grand Total (Editable)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    This is the final price that will be saved
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto bg-white border-2 border-primary/30 rounded-lg px-4 py-2">
                  <OverrideInput
                    value={calculations.finalTotal}
                    onValueChange={handleCustomGrandTotalChange}
                    className="flex-1 bg-transparent text-right font-bold text-2xl w-full outline-none"
                  />
                </div>
              </div>
              {pricingData.customGrandTotalIsManual && (
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  Calculated: {formatCurrencyText(calculations.total, currency)} · clear the box to
                  use it
                </p>
              )}
            </CardContent>
          </Card>

          <PerPersonSplitCard
            total={calculations.finalTotal}
            adults={step1Data.adults}
            childCount={step1Data.children}
            childrenAges={step1Data.childrenAges}
            currency={currency}
            value={pricingData.perPersonSplit}
            onChange={perPersonSplit => onPricingChange({ ...pricingData, perPersonSplit })}
          />

          {/* Price Summary */}
          <Card className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <IndianRupee className="h-5 w-5" />
                Price Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Breakdown rows */}
              <div className="space-y-2 text-sm">
                {calculations.hotelOverridden && calculations.hotelCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Hotels</span>
                    <span className="font-medium">
                      {formatCurrencyText(calculations.hotelCost, currency)}
                    </span>
                  </div>
                )}

                {!calculations.hotelOverridden && calculations.roomCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Hotel Rooms</span>
                    <span className="font-medium">
                      {formatCurrencyText(calculations.roomCost, currency)}
                    </span>
                  </div>
                )}

                {!calculations.hotelOverridden && calculations.mealPlanCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Meal Plans</span>
                    <span className="font-medium text-neutral-300">
                      +{formatCurrencyText(calculations.mealPlanCost, currency)}
                    </span>
                  </div>
                )}

                {!calculations.hotelOverridden && calculations.extraBedCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Extra Beds</span>
                    <span className="text-red-300">
                      +{formatCurrencyText(calculations.extraBedCost, currency)}
                    </span>
                  </div>
                )}

                {!calculations.hotelOverridden && calculations.childCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Children (no bed)</span>
                    <span className="text-neutral-300">
                      +{formatCurrencyText(calculations.childCost, currency)}
                    </span>
                  </div>
                )}

                {calculations.vehicleCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Transport</span>
                    <span className="font-medium">
                      {formatCurrencyText(calculations.vehicleCost, currency)}
                    </span>
                  </div>
                )}

                {calculations.activityCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Activities</span>
                    <span className="font-medium">
                      {formatCurrencyText(calculations.activityCost, currency)}
                    </span>
                  </div>
                )}

                {calculations.additionalChargesTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Additional Charges</span>
                    <span className="text-red-300">
                      +{formatCurrencyText(calculations.additionalChargesTotal, currency)}
                    </span>
                  </div>
                )}

                {/* Subtotal */}
                <div className="h-px bg-neutral-600 my-2" />
                <div className="flex justify-between">
                  <span className="text-neutral-300">Subtotal</span>
                  <span className="font-medium">
                    {formatCurrencyText(calculations.subtotal, currency)}
                  </span>
                </div>

                {/* Same order as the calculation: margin, GST, round off, then discount */}
                {pricingData.marginPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Margin ({pricingData.marginPercent}%)</span>
                    <span className="text-neutral-300">
                      +{formatCurrencyText(calculations.marginAmount, currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-neutral-300">GST ({pricingData.gstPercent}%)</span>
                  <span className="text-red-300">
                    +{formatCurrencyText(calculations.gstAmount, currency)}
                  </span>
                </div>

                {calculations.roundOff !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Round Off</span>
                    <span
                      className={calculations.roundOff > 0 ? 'text-red-300' : 'text-neutral-400'}
                    >
                      {calculations.roundOff > 0 ? '+' : '-'}
                      {formatCurrencyText(Math.abs(calculations.roundOff), currency)}
                    </span>
                  </div>
                )}

                {pricingData.discountPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">
                      Discount ({pricingData.discountPercent}%)
                    </span>
                    <span className="text-neutral-400">
                      -{formatCurrencyText(calculations.discountAmount, currency)}
                    </span>
                  </div>
                )}

                {calculations.manualAdjustment !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-300">
                      Manual Adjustment
                      <span className="block text-[10px] text-neutral-400">
                        Grand Total override
                      </span>
                    </span>
                    <span
                      className={
                        calculations.manualAdjustment < 0 ? 'text-neutral-400' : 'text-red-300'
                      }
                    >
                      {calculations.manualAdjustment < 0 ? '' : '+'}
                      {formatCurrencyText(calculations.manualAdjustment, currency)}
                    </span>
                  </div>
                )}

                <div className="h-px bg-neutral-600 my-2" />

                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Final Total</span>
                  <span className="text-2xl font-bold text-white">
                    {formatCurrencyText(calculations.finalTotal, currency)}
                  </span>
                </div>
              </div>

              {/* Save button */}
              <div className="pt-4 border-t border-neutral-700">
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="w-full h-12 text-lg gap-2"
                  size="lg"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Create Itinerary & View
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
