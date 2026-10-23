'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Calculator,
  Plus,
  X,
  Trash2,
  Copy,
  Percent,
  Banknote,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ItineraryOption } from '@/types';
import type { PerPersonShare } from '@/types/itinerary.types';
import { allocatedTotal } from '@/lib/per-person-split';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AdditionalCharge {
  id: string;
  label: string;
  amount: number;
}

interface OptionFormState {
  id: string;
  name: string;
  /**
   * The saved option's name when this one was loaded, so its per-person split
   * is still found after the agent renames it. Unset for new and copied options.
   */
  sourceName?: string;
  hotelCost: number;
  vehicleCost: number;
  activityCost: number;
  miscCost: number;
  margin: number;
  gstPercent: number;
  roundOff: number;
  additionalCharges: AdditionalCharge[];
}

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveQuotes?: (
    quotes: Array<{
      label: string;
      totalCost: number;
      marginPercent?: number;
      gstPercent?: number;
      discountPercent?: number;
      roundOff?: number;
      breakdown?: { hotelCost?: number; vehicleCost?: number };
      additionalCharges?: AdditionalCharge[];
      perPersonSplit?: PerPersonShare[];
    }>
  ) => void;
  existingQuotes?: Array<{
    label: string;
    totalCost: number;
    marginPercent?: number;
    gstPercent?: number;
    discountPercent?: number;
    roundOff?: number;
    breakdown?: { hotelCost?: number; vehicleCost?: number };
    additionalCharges?: AdditionalCharge[];
    perPersonSplit?: PerPersonShare[];
  }>;
  onSaveOptions?: (options: ItineraryOption[]) => void;
  existingOptions?: ItineraryOption[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function generateId(prefix = 'charge') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeOption(name: string): OptionFormState {
  return {
    id: generateId('opt'),
    name,
    hotelCost: 0,
    vehicleCost: 0,
    activityCost: 0,
    miscCost: 0,
    margin: 0,
    gstPercent: 0,
    roundOff: 0,
    additionalCharges: [],
  };
}

function calcOption(o: OptionFormState) {
  const base = o.hotelCost + o.vehicleCost + o.activityCost + o.miscCost;
  const addChg = o.additionalCharges.reduce((s, c) => s + (c.amount || 0), 0);
  const subtotal = base + addChg;
  const afterMargin = subtotal + o.margin;
  const gstAmount = afterMargin * (o.gstPercent / 100);
  const afterGst = afterMargin + gstAmount;
  const afterRound = afterGst + o.roundOff;
  return { base, addChg, subtotal, afterMargin, gstAmount, afterGst, afterRound };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PricingDialog({
  open,
  onOpenChange,
  onSaveQuotes,
  existingQuotes = [],
  onSaveOptions,
  existingOptions = [],
}: PricingDialogProps) {
  const [dialogMode, setDialogMode] = useState<'single' | 'options'>('single');

  // ── Single quote state (legacy)
  const [singleLabel, setSingleLabel] = useState('Standard Package');
  const [singleDiscount, setSingleDiscount] = useState(0);
  const [singleMargin, setSingleMargin] = useState(0);
  const [singleGst, setSingleGst] = useState(18);
  const [singleRoundOff, setSingleRoundOff] = useState(0);
  const [singleAdditionalCharges, setSingleAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [singleCustomTotal, setSingleCustomTotal] = useState<number | null>(null);
  const [hotelCost, setHotelCost] = useState(0);
  const [vehicleCost, setVehicleCost] = useState(0);

  // ── Multi options state
  const [options, setOptions] = useState<OptionFormState[]>([]);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

  // ── Single quote calculations
  const singleCalculations = useMemo(() => {
    const baseTotal = hotelCost + vehicleCost;
    const additionalChargesTotal = singleAdditionalCharges.reduce(
      (sum, c) => sum + (c.amount || 0),
      0
    );
    const subtotal = baseTotal + additionalChargesTotal;
    const marginAmount = subtotal * (singleMargin / 100);
    const afterMargin = subtotal + marginAmount;
    const gstAmount = afterMargin * (singleGst / 100);
    const afterGst = afterMargin + gstAmount;
    const afterRoundOff = afterGst + singleRoundOff;
    const discountAmount = afterRoundOff * (singleDiscount / 100);
    const grandTotal = afterRoundOff - discountAmount;
    return {
      baseTotal,
      additionalChargesTotal,
      subtotal,
      marginAmount,
      afterMargin,
      gstAmount,
      afterGst,
      afterRoundOff,
      discountAmount,
      grandTotal,
    };
  }, [
    hotelCost,
    vehicleCost,
    singleAdditionalCharges,
    singleDiscount,
    singleMargin,
    singleGst,
    singleRoundOff,
  ]);

  // ── Multi option calculations
  const optionCalculations = useMemo(() => {
    return options.map(calcOption);
  }, [options]);

  // ── Initialize from existing data
  useEffect(() => {
    if (!open) return;

    if (existingOptions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the form when the dialog opens
      setDialogMode('options');
      const loaded = existingOptions.map(o => ({
        id: o.name,
        name: o.name,
        sourceName: o.name,
        hotelCost: o.breakdown?.hotelCost || 0,
        vehicleCost: o.breakdown?.vehicleCost || 0,
        activityCost: o.breakdown?.activityCost || 0,
        miscCost: o.breakdown?.miscCost || 0,
        margin: o.margin || 0,
        gstPercent: o.gstPercent ?? 0,
        roundOff: o.roundOff || 0,
        additionalCharges: (o.additionalCharges || []).map(c => ({
          id: generateId(),
          label: typeof c === 'string' ? c : c.label || '',
          amount: typeof c === 'number' ? c : c.amount || 0,
        })),
      }));
      setOptions(loaded);
      setExpandedOptions(new Set(loaded.map(o => o.id)));
      return;
    }

    if (existingQuotes.length === 0) {
      setDialogMode('single');
      setSingleLabel('Standard Package');
      setSingleDiscount(0);
      setSingleMargin(0);
      setSingleGst(0);
      setSingleRoundOff(0);
      setSingleAdditionalCharges([]);
      setHotelCost(0);
      setVehicleCost(0);
      setSingleCustomTotal(null);
      setOptions([]);
    } else if (existingQuotes.length === 1) {
      setDialogMode('single');
      setSingleLabel(existingQuotes[0].label || 'Standard Package');
      setSingleDiscount(existingQuotes[0].discountPercent || 0);
      setSingleMargin(existingQuotes[0].marginPercent || 0);
      setSingleGst(existingQuotes[0].gstPercent || 0);
      setSingleRoundOff(existingQuotes[0].roundOff || 0);
      setSingleAdditionalCharges(
        (existingQuotes[0].additionalCharges?.length ?? 0) > 0
          ? (existingQuotes[0].additionalCharges ?? [])
          : []
      );
      setHotelCost(existingQuotes[0].breakdown?.hotelCost || 0);
      setVehicleCost(existingQuotes[0].breakdown?.vehicleCost || 0);
      setSingleCustomTotal(
        existingQuotes[0].breakdown?.customTotal ?? existingQuotes[0].breakdown?.finalPrice ?? null
      );
      setOptions([]);
    } else {
      setDialogMode('options');
      setOptions(
        existingQuotes.map((q, i) => ({
          id: `opt-${i}`,
          name: q.label || `Option ${i + 1}`,
          hotelCost: q.breakdown?.hotelCost ?? 0,
          vehicleCost: q.breakdown?.vehicleCost ?? 0,
          activityCost: 0,
          miscCost: 0,
          margin: q.totalCost * ((q.marginPercent || 0) / 100),
          gstPercent: q.gstPercent ?? 0,
          roundOff: q.roundOff || 0,
          additionalCharges: Array.isArray(q.additionalCharges)
            ? q.additionalCharges.map(c => ({
                id: generateId(),
                label: c.label || '',
                amount: c.amount || 0,
              }))
            : [],
        }))
      );
    }
  }, [open, existingQuotes, existingOptions]);

  // ── Single charge helpers
  const addChargeSingle = () => {
    setSingleAdditionalCharges(prev => [...prev, { id: generateId(), label: '', amount: 0 }]);
  };
  const updateChargeSingle = (id: string, field: 'label' | 'amount', value: string | number) => {
    setSingleAdditionalCharges(prev =>
      prev.map(c =>
        c.id === id ? { ...c, [field]: field === 'amount' ? Number(value) || 0 : value } : c
      )
    );
  };
  const removeChargeSingle = (id: string) => {
    setSingleAdditionalCharges(prev => prev.filter(c => c.id !== id));
  };

  // ── Multi option helpers
  const addOption = () => {
    const names = ['Basic', 'Premium', 'Luxury', 'Elite', 'Standard'];
    const usedNames = options.map(o => o.name.toLowerCase());
    const nextName =
      names.find(n => !usedNames.includes(n.toLowerCase())) || `Option ${options.length + 1}`;
    const newOpt = makeOption(nextName);
    setOptions(prev => [...prev, newOpt]);
    setExpandedOptions(prev => new Set([...prev, newOpt.id]));
  };

  const removeOption = (id: string) => {
    setOptions(prev => prev.filter(o => o.id !== id));
  };

  const updateOption = (id: string, field: keyof OptionFormState, value: string | number) => {
    setOptions(prev =>
      prev.map(o =>
        o.id === id
          ? {
              ...o,
              [field]: typeof value === 'number' ? value : field === 'name' ? value : o[field],
            }
          : o
      )
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedOptions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const duplicateOption = (index: number) => {
    const src = options[index];
    if (!src) return;
    const dupe: OptionFormState = {
      ...src,
      id: generateId('opt'),
      name: `${src.name} (Copy)`,
      sourceName: undefined,
      additionalCharges: src.additionalCharges.map(c => ({ ...c, id: generateId() })),
    };
    setOptions(prev => [...prev.slice(0, index + 1), dupe, ...prev.slice(index + 1)]);
    setExpandedOptions(prev => new Set([...prev, dupe.id]));
  };

  const addChargeOption = (optionId: string) => {
    setOptions(prev =>
      prev.map(o =>
        o.id === optionId
          ? {
              ...o,
              additionalCharges: [
                ...o.additionalCharges,
                { id: generateId(), label: '', amount: 0 },
              ],
            }
          : o
      )
    );
  };

  const updateChargeOption = (
    optionId: string,
    chargeId: string,
    field: 'label' | 'amount',
    value: string | number
  ) => {
    setOptions(prev =>
      prev.map(o =>
        o.id === optionId
          ? {
              ...o,
              additionalCharges: o.additionalCharges.map(c =>
                c.id === chargeId
                  ? { ...c, [field]: field === 'amount' ? Number(value) || 0 : value }
                  : c
              ),
            }
          : o
      )
    );
  };

  const removeChargeOption = (optionId: string, chargeId: string) => {
    setOptions(prev =>
      prev.map(o =>
        o.id === optionId
          ? { ...o, additionalCharges: o.additionalCharges.filter(c => c.id !== chargeId) }
          : o
      )
    );
  };

  // ── Save
  // A per-person split set in the itinerary editor survives a re-price only
  // while it still fits: it may never add up to more than the price.
  const keepSplit = (
    split: PerPersonShare[] | undefined,
    total: number,
    name: string,
    droppedSplits: string[]
  ) => {
    if (!split || split.length === 0) return undefined;
    if (allocatedTotal(split) <= total) return split;
    droppedSplits.push(name);
    return undefined;
  };
  const warnDroppedSplits = (droppedSplits: string[]) => {
    if (droppedSplits.length === 0) return;
    toast.warning(
      `Per-person split removed for ${droppedSplits.join(', ')}: it was more than the new price. Re-split it in Edit itinerary.`
    );
  };

  const handleSave = () => {
    const droppedSplits: string[] = [];
    if (dialogMode === 'single' && onSaveQuotes) {
      const totalCost = singleCustomTotal ?? singleCalculations.grandTotal;
      const quotes = [
        {
          label: singleLabel || 'Standard Package',
          totalCost,
          discountPercent: singleDiscount || undefined,
          marginPercent: singleMargin || undefined,
          gstPercent: singleGst || undefined,
          roundOff: singleRoundOff || undefined,
          additionalCharges: singleAdditionalCharges.filter(c => c.label && c.amount > 0),
          breakdown: {
            hotelCost: hotelCost,
            vehicleCost: vehicleCost,
            customTotal: singleCustomTotal ?? undefined,
          },
          perPersonSplit: keepSplit(
            existingQuotes?.[0]?.perPersonSplit,
            totalCost,
            singleLabel || 'this package',
            droppedSplits
          ),
        },
      ];
      onSaveQuotes(quotes);
      toast.success('Pricing saved');
      warnDroppedSplits(droppedSplits);
      onOpenChange(false);
    } else if (dialogMode === 'options' && onSaveOptions) {
      if (options.length === 0) {
        toast.error('Please add at least one option');
        return;
      }
      const savedOptions: ItineraryOption[] = options.map((o, i) => {
        const calc = optionCalculations[i];
        // totalCost = final price (all adjustments applied) — matches what recalculateQuotes computes
        const totalCost = calc.afterRound;
        return {
          name: o.name || `Option ${i + 1}`,
          hotels: [],
          vehicles: [],
          activities: [],
          totalCost,
          margin: o.margin,
          finalPrice: totalCost,
          breakdown: {
            hotelCost: o.hotelCost || undefined,
            vehicleCost: o.vehicleCost || undefined,
            activityCost: o.activityCost || undefined,
            miscCost: o.miscCost || undefined,
          },
          gstPercent: o.gstPercent || undefined,
          roundOff: o.roundOff || undefined,
          additionalCharges: o.additionalCharges.filter(c => c.label && c.amount > 0),
          perPersonSplit: keepSplit(
            existingOptions.find(e => e.name === o.sourceName)?.perPersonSplit,
            totalCost,
            o.name || `Option ${i + 1}`,
            droppedSplits
          ),
        };
      });
      onSaveOptions(savedOptions);
      toast.success(`${savedOptions.length} option${savedOptions.length > 1 ? 's' : ''} saved`);
      warnDroppedSplits(droppedSplits);
      onOpenChange(false);
    }
  };

  const formatINR = (n: number) => n.toLocaleString('en-IN');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pricing
          </DialogTitle>
        </DialogHeader>

        {/* ── Dialog mode toggle */}
        <div className="flex items-center gap-2 border rounded-lg p-1 w-fit">
          <button
            onClick={() => setDialogMode('single')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              dialogMode === 'single'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Single Quote
          </button>
          <button
            onClick={() => setDialogMode('options')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              dialogMode === 'options'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Package Options
          </button>
        </div>

        {/* ───────────────────────────────────────── */}
        {/* SINGLE QUOTE (legacy) */}
        {/* ───────────────────────────────────────── */}
        {dialogMode === 'single' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Package Name</Label>
                <Input
                  value={singleLabel}
                  onChange={e => setSingleLabel(e.target.value)}
                  placeholder="e.g., Standard Package"
                />
              </div>
            </div>

            {/* Base Costs */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-primary/5 px-4 py-3 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Base Costs</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hotel Cost (per person)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">₹</span>
                    <Input
                      type="number"
                      min={0}
                      value={hotelCost || ''}
                      onChange={e => setHotelCost(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vehicle / Transport Cost</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">₹</span>
                    <Input
                      type="number"
                      min={0}
                      value={vehicleCost || ''}
                      onChange={e => setVehicleCost(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2">
                  <span>Base Total</span>
                  <span className="text-primary">₹{formatINR(singleCalculations.baseTotal)}</span>
                </div>
              </div>
            </div>

            {/* Additional Charges */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-red-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Additional Charges</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addChargeSingle}
                  className="h-6 text-xs gap-1 text-red-700"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              <div className="p-3 space-y-2">
                {singleAdditionalCharges.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No additional charges
                  </p>
                ) : (
                  singleAdditionalCharges.map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Input
                        value={c.label}
                        onChange={e => updateChargeSingle(c.id, 'label', e.target.value)}
                        placeholder="e.g., Visa Fee, Tour Guide"
                        className="flex-1 h-8 text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground text-sm">₹</span>
                        <Input
                          type="number"
                          min={0}
                          value={c.amount || ''}
                          onChange={e => updateChargeSingle(c.id, 'amount', e.target.value)}
                          placeholder="0"
                          className="w-24 h-8 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeChargeSingle(c.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Adjustments */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-neutral-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-neutral-600" />
                  <span className="text-sm font-semibold text-neutral-700">Adjustments</span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Discount %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={singleDiscount}
                        onChange={e => setSingleDiscount(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    {singleDiscount > 0 && (
                      <p className="text-xs text-neutral-600">
                        -₹{formatINR(singleCalculations.discountAmount)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Margin %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={singleMargin}
                        onChange={e => setSingleMargin(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    {singleMargin > 0 && (
                      <p className="text-xs text-neutral-600">
                        +₹{formatINR(singleCalculations.marginAmount)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">GST %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={singleGst}
                        onChange={e => setSingleGst(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Round Off (₹)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">₹</span>
                      <Input
                        type="number"
                        value={singleRoundOff || ''}
                        onChange={e => setSingleRoundOff(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-xl overflow-hidden">
              <div className="px-5 py-4">
                <div className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                  Price Breakdown
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Hotel Cost</span>
                    <span>₹{formatINR(hotelCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-300">Vehicle / Transport Cost</span>
                    <span>₹{formatINR(vehicleCost)}</span>
                  </div>
                  <div className="flex justify-between border-t border-neutral-700 pt-1.5">
                    <span className="text-neutral-300">Base Cost</span>
                    <span>₹{formatINR(singleCalculations.baseTotal)}</span>
                  </div>
                  {singleCalculations.additionalChargesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-300">Additional Charges</span>
                      <span className="text-red-300">
                        +₹{formatINR(singleCalculations.additionalChargesTotal)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-neutral-700 pt-1.5">
                    <span className="text-neutral-300">Subtotal</span>
                    <span>₹{formatINR(singleCalculations.subtotal)}</span>
                  </div>
                  {singleCalculations.marginAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-300">+ Margin ({singleMargin}%)</span>
                      <span className="text-neutral-300">
                        +₹{formatINR(singleCalculations.marginAmount)}
                      </span>
                    </div>
                  )}
                  {singleCalculations.gstAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-300">+ GST ({singleGst}%)</span>
                      <span className="text-red-300">
                        +₹{formatINR(singleCalculations.gstAmount)}
                      </span>
                    </div>
                  )}
                  {singleCalculations.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-300">- Discount ({singleDiscount}%)</span>
                      <span className="text-neutral-400">
                        -₹{formatINR(singleCalculations.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-neutral-600 pt-2 mt-2">
                    <span className="text-base font-bold">Grand Total</span>
                    <span className="text-2xl font-bold text-red-400">
                      ₹{formatINR(singleCustomTotal ?? singleCalculations.grandTotal)}
                    </span>
                  </div>
                  {singleCustomTotal !== null &&
                    singleCustomTotal !== singleCalculations.grandTotal && (
                      <div className="flex justify-between text-neutral-400 text-xs">
                        <span>Manual override applied</span>
                      </div>
                    )}
                  <div className="pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-neutral-300">Edit Grand Total</Label>
                      {singleCustomTotal !== null && (
                        <button
                          type="button"
                          onClick={() => setSingleCustomTotal(null)}
                          className="text-xs text-neutral-400 hover:text-white"
                        >
                          Reset to calculated
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-neutral-400 text-sm">₹</span>
                      <input
                        type="number"
                        min={0}
                        value={singleCustomTotal ?? singleCalculations.grandTotal}
                        onChange={e => setSingleCustomTotal(Number(e.target.value) || 0)}
                        className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-1.5 text-red-400 font-bold text-lg text-right outline-none"
                        placeholder={String(singleCalculations.grandTotal)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────── */}
        {/* PACKAGE OPTIONS (multi-option) */}
        {/* ───────────────────────────────────────── */}
        {dialogMode === 'options' && (
          <div className="space-y-3">
            {options.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="text-sm mb-1">No options yet</p>
                <p className="text-xs">Click &quot;Add Option&quot; to create package options</p>
              </div>
            ) : (
              options.map((opt, idx) => {
                const calc = optionCalculations[idx] || calcOption(opt);
                const isExpanded = expandedOptions.has(opt.id);
                const optColors = [
                  'border-red-200 bg-red-50/30',
                  'border-neutral-300 bg-neutral-50/30',
                  'border-neutral-200 bg-neutral-50/30',
                  'border-neutral-200 bg-neutral-50/30',
                  'border-red-200 bg-red-50/30',
                ];
                const colorIdx = idx % optColors.length;
                const accentColors = [
                  'text-red-600',
                  'text-neutral-600',
                  'text-neutral-600',
                  'text-neutral-600',
                  'text-red-600',
                ];
                const badgeColors = [
                  'bg-red-500',
                  'bg-neutral-600',
                  'bg-neutral-600',
                  'bg-neutral-600',
                  'bg-red-500',
                ];

                return (
                  <div
                    key={opt.id}
                    className={cn('border-2 rounded-xl overflow-hidden', optColors[colorIdx])}
                  >
                    {/* Collapsible header */}
                    <div className="flex items-center gap-2 p-3">
                      <div
                        className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white shrink-0',
                          badgeColors[colorIdx]
                        )}
                      >
                        {idx + 1}
                      </div>
                      <Input
                        value={opt.name}
                        onChange={e => updateOption(opt.id, 'name', e.target.value)}
                        placeholder="Option name (e.g., Basic)"
                        className="flex-1 h-8 font-semibold"
                      />
                      <button
                        onClick={() => duplicateOption(idx)}
                        className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                        title="Duplicate option"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeOption(opt.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-500"
                        title="Remove option"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => toggleExpanded(opt.id)}
                        className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Collapsed summary row */}
                    {!isExpanded && (
                      <div className="px-4 pb-3 flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Base: <span className="font-medium">₹{formatINR(calc.base)}</span>
                        </span>
                        {opt.margin > 0 && (
                          <span className="text-neutral-600">
                            + Margin: <span className="font-medium">₹{formatINR(opt.margin)}</span>
                          </span>
                        )}
                        <span className={cn('font-bold text-lg', accentColors[colorIdx])}>
                          ₹{formatINR(calc.afterRound)}
                        </span>
                      </div>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4">
                        {/* Base costs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { field: 'hotelCost', label: 'Hotel Cost', icon: '🏨' },
                            { field: 'vehicleCost', label: 'Vehicle Cost', icon: '🚗' },
                            { field: 'activityCost', label: 'Activity Cost', icon: '🎯' },
                            { field: 'miscCost', label: 'Misc Cost', icon: '📦' },
                          ].map(({ field, label, icon }) => (
                            <div key={field} className="space-y-1">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>{icon}</span> {label}
                              </Label>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-xs">₹</span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={
                                    (opt as unknown as Record<string, number | string>)[field] || ''
                                  }
                                  onChange={e =>
                                    updateOption(
                                      opt.id,
                                      field as keyof OptionFormState,
                                      Number(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Base total */}
                        <div className="flex justify-between items-center rounded-lg bg-white px-3 py-2 text-sm border">
                          <span className="text-muted-foreground">Base Cost</span>
                          <span className="font-bold">₹{formatINR(calc.base)}</span>
                        </div>

                        {/* Margin input */}
                        <div className="border-2 border-neutral-100 rounded-lg p-3 bg-neutral-50/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-neutral-600" />
                            <span className="text-sm font-semibold text-neutral-700">
                              Margin (₹)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-600 text-sm">₹</span>
                            <Input
                              type="number"
                              min={0}
                              value={opt.margin || ''}
                              onChange={e =>
                                updateOption(opt.id, 'margin', Number(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="h-8 text-sm max-w-40"
                            />
                            {opt.margin > 0 && (
                              <span className="text-xs text-neutral-600 font-medium">
                                +₹{formatINR(opt.margin)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Additional charges */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Banknote className="h-3 w-3" /> Additional Charges
                            </Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => addChargeOption(opt.id)}
                              className="h-5 text-xs gap-1"
                            >
                              <Plus className="h-3 w-3" /> Add
                            </Button>
                          </div>
                          {opt.additionalCharges.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">None</p>
                          ) : (
                            <div className="space-y-1">
                              {opt.additionalCharges.map(c => (
                                <div key={c.id} className="flex items-center gap-2">
                                  <Input
                                    value={c.label}
                                    onChange={e =>
                                      updateChargeOption(opt.id, c.id, 'label', e.target.value)
                                    }
                                    placeholder="Label"
                                    className="flex-1 h-7 text-xs"
                                  />
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground text-xs">₹</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={c.amount || ''}
                                      onChange={e =>
                                        updateChargeOption(opt.id, c.id, 'amount', e.target.value)
                                      }
                                      className="w-20 h-7 text-xs"
                                    />
                                  </div>
                                  <button
                                    onClick={() => removeChargeOption(opt.id, c.id)}
                                    className="p-1 hover:bg-red-50 rounded text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* GST + Round Off */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">GST %</Label>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={opt.gstPercent}
                                onChange={e =>
                                  updateOption(opt.id, 'gstPercent', Number(e.target.value) || 0)
                                }
                                className="h-8 text-sm"
                              />
                              <Percent className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Round Off (₹)</Label>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-xs">₹</span>
                              <Input
                                type="number"
                                value={opt.roundOff || 0}
                                onChange={e =>
                                  updateOption(opt.id, 'roundOff', Number(e.target.value) || 0)
                                }
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Price breakdown */}
                        <div className="bg-neutral-900 text-white rounded-xl p-4 space-y-2">
                          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                            Price Breakdown
                          </div>
                          <div className="flex justify-between text-sm text-neutral-300">
                            <span>Hotel</span>
                            <span>₹{formatINR(opt.hotelCost)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-neutral-300">
                            <span>Vehicle</span>
                            <span>₹{formatINR(opt.vehicleCost)}</span>
                          </div>
                          {opt.activityCost > 0 && (
                            <div className="flex justify-between text-sm text-neutral-300">
                              <span>Activities</span>
                              <span>₹{formatINR(opt.activityCost)}</span>
                            </div>
                          )}
                          {calc.addChg > 0 && (
                            <div className="flex justify-between text-sm text-red-300">
                              <span>Additional</span>
                              <span>+₹{formatINR(calc.addChg)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm text-neutral-300 border-t border-neutral-700 pt-1">
                            <span>Base Total</span>
                            <span>₹{formatINR(calc.base + calc.addChg)}</span>
                          </div>
                          {opt.margin > 0 && (
                            <div className="flex justify-between text-sm text-neutral-300">
                              <span>+ Margin</span>
                              <span>+₹{formatINR(opt.margin)}</span>
                            </div>
                          )}
                          {calc.gstAmount > 0 && (
                            <div className="flex justify-between text-sm text-red-300">
                              <span>+ GST ({opt.gstPercent}%)</span>
                              <span>+₹{formatINR(calc.gstAmount)}</span>
                            </div>
                          )}
                          {opt.roundOff !== 0 && (
                            <div className="flex justify-between text-sm text-neutral-300">
                              <span>Round Off</span>
                              <span>
                                {opt.roundOff > 0 ? '+' : ''}₹{formatINR(opt.roundOff)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-base font-bold border-t border-neutral-600 pt-2">
                            <span>Final Price</span>
                            <span className="text-red-400">₹{formatINR(calc.afterRound)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            <Button variant="outline" onClick={addOption} className="w-full gap-1">
              <Plus className="h-4 w-4" /> Add Option
            </Button>
          </div>
        )}

        {/* ── Actions */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-1">
            <Check className="h-4 w-4" />
            Save Pricing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
