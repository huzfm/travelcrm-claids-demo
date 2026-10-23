// Shared types for the new itinerary creation page

export type { MealPlan } from '@/types/hotel.types';
export type { RoomType, HotelMealPlan } from '@/types/hotel.types';
import type { PerPersonShare, TripType, TripTypeValue } from '@/types/itinerary.types';

// Re-export so consumers can import from this file
export { type TripType, type TripTypeValue };

// ─── Step 1 Form Data ─────────────────────────────────────────────────────────

export interface Step1FormData {
  /** Who the trip is for — required, prefilled from the selected lead. */
  clientName: string;
  /** Optional label for the trip; falls back to "<client>'s Trip" on save. */
  tripName: string;
  leadId: string;
  /** Display label of the picked master destination ("Kashmir"). */
  destination: string;
  /** Id of the picked master destination, when it came from the master list. */
  destinationId?: string;
  /** A preset or a custom value the agent typed. Stored verbatim. */
  tripType: TripTypeValue;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  /** One age per child; always `children` entries long. */
  childrenAges: number[];
  totalTravelers: number;
  currency: string;
}

/** Grows/shrinks the ages list to match the child count, keeping what's typed. */
export function resizeChildrenAges(ages: number[], count: number): number[] {
  const next = ages.slice(0, count);
  while (next.length < count) next.push(Number.NaN);
  return next;
}

/** The itinerary title: the agent's label, else one built from the client. */
export function deriveItineraryTitle(data: {
  tripName: string;
  clientName: string;
  destination: string;
}): string {
  if (data.tripName.trim()) return data.tripName.trim();
  if (data.clientName.trim()) return `${data.clientName.trim()}'s Trip`;
  return `${data.destination || 'New'} Trip`;
}

// ─── Day Builder Data (used in both single and multi modes) ───────────────────

export interface ActivityItem {
  id: string;
  name: string;
  description: string;
  cost?: number;
  time?: string;
}

export interface HotelAlt {
  hotelId: string;
  hotelName: string;
  hotelAddress?: string;
  hotelStars?: number;
  hotelImage?: string;
  roomType: string;
  bedType: string;
  basePrice: number;
  extraBedPrice?: number;
  childPrice?: number;
  mealPlan?: string;
  mealPlanLabel: string;
  mealPlanPrice?: number;
}

export interface VehicleAlt {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  ratePerDay: number;
  driverIncluded: boolean;
  vehicleImage?: string | null;
}

// ─── Additional Charges for Pricing ──────────────────────────────────────────

export interface AdditionalCharge {
  id: string;
  label: string;
  amount: number;
}

// ─── Day Builder Data ─────────────────────────────────────────────────────────

export type DayType = 'activity' | 'leisure';

export interface DayBuilderData {
  dayNumber: number;
  date: string;
  /** 'activity' = normal day with planned itinerary; 'leisure' = rest/free day */
  dayType: DayType;
  /** Custom guidelines shown to the client for leisure days */
  leisureGuidelines?: string;
  location: string;
  destinationId?: string;
  destination?: string;
  destinationAddress?: string;
  destinationHighlights?: string[];
  destinationShortDescription?: string;
  destinationDescription?: string;
  destinationAmenities?: string[];
  destinationBestTimeToVisit?: string;
  destinationAverageTemperature?: string;
  destinationLanguage?: string;
  destinationCurrency?: string;
  destinationTimezone?: string;
  destinationThingsToKnow?: string;
  // Hotel
  hotelId: string;
  hotelName: string;
  hotelAddress?: string;
  hotelStars?: number;
  hotelContact?: string;
  hotelImage?: string | null;
  roomType: string;
  bedType: string;
  basePrice: number;
  roomTypePrice: number; // additional price for room type upgrade (e.g., deluxe)
  mealPlan: string;
  mealPlanLabel: string;
  mealPlanPrice: number;
  roomCount: number;
  // Extra services
  extraBedPrice: number;
  extraBedCount: number;
  childPrice: number;
  childCount: number;
  /**
   * Builder-only: the dayNumber of the day whose hotel this night shares,
   * ticked from that day's card. While set, the day mirrors that day's stay
   * (see applyDayPatch), so a multi-night stay is picked once. Not saved —
   * only the copied hotel fields reach the itinerary.
   */
  hotelFromDay?: number;
  // Vehicle
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  driverIncluded: boolean;
  ratePerDay: number;
  vehicleCount: number;
  pickupPoint: string;
  dropPoint: string;
  vehicleImage?: string | null;
  // Activities & Notes
  activities: ActivityItem[];
  notes: string;
  description: string;
  // Day images (base64 dataUrls for immediate PDF rendering)
  images: string[];
  // Alternatives for multi-quote mode
  hotelAlts: HotelAlt[];
  vehicleAlts: VehicleAlt[];
  // Manual entry metadata (prefixed with _ to indicate not sent to backend)
  _isManualHotelEntry?: boolean;
  _manualHotelDescription?: string;
  _isManualVehicleEntry?: boolean;
  _manualVehicleDescription?: string;
  _manualVehicleCapacity?: number;
  _manualVehicleIsAc?: boolean;
  _manualVehicleDriverName?: string;
  _manualVehicleDriverPhone?: string;
  // Stored room types and meal plans from manual hotel entry
  _manualRoomTypes?: RoomType[];
  _manualMealPlans?: HotelMealPlan[];
}

// ─── Multi-Option Builder ─────────────────────────────────────────────────────

export interface OptionPricing {
  hotelCost: number;
  vehicleCost: number;
  activityCost: number;
  miscCost: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  marginPercent: number;
  marginAmount: number;
  gstPercent: number;
  gstAmount: number;
  additionalCharges: number;
  roundOff: number;
  totalCost: number;
  // Manual overrides set in Step 4 (take precedence over calculated costs)
  manualHotelCost?: number;
  manualVehicleCost?: number;
  /**
   * The calculated hotel/vehicle cost when the manual one was typed. Once the
   * days change that figure the manual cost no longer describes the trip and
   * is dropped — it used to silently outlive a hotel being swapped.
   */
  manualHotelBasis?: number;
  manualVehicleBasis?: number;
  manualTotal?: number;
  // finalPrice: user-set final price that overrides everything else.
  // Only honoured while `finalPriceIsManual` is true — older code also wrote
  // it as a snapshot of the calculated total, and a snapshot must never
  // freeze the price once the days or adjustments change.
  finalPrice?: number;
  finalPriceIsManual?: boolean;
}

export interface OptionBuilder {
  id: string;
  label: string;
  days: DayBuilderData[];
  pricing: OptionPricing;
  /**
   * Optional per-traveller split of this package's price. Kept here rather
   * than in `pricing`, which is recomputed from scratch whenever a day changes.
   */
  perPersonSplit?: PerPersonShare[];
}

export function createEmptyDay(dayNumber: number, date: string): DayBuilderData {
  return {
    dayNumber,
    date,
    dayType: 'activity',
    location: '',
    description: '',
    hotelId: '',
    hotelName: '',
    hotelAddress: '',
    hotelStars: undefined,
    hotelContact: '',
    hotelImage: null,
    roomType: '',
    bedType: '',
    basePrice: 0,
    roomTypePrice: 0,
    mealPlan: 'MAP',
    mealPlanLabel: 'Breakfast + Dinner',
    mealPlanPrice: 0,
    roomCount: 1,
    extraBedPrice: 0,
    extraBedCount: 0,
    childPrice: 0,
    childCount: 0,
    vehicleId: '',
    vehicleName: '',
    vehicleType: '',
    driverIncluded: true,
    ratePerDay: 0,
    vehicleCount: 1,
    pickupPoint: '',
    dropPoint: '',
    vehicleImage: null,
    activities: [],
    destinationId: undefined,
    destination: undefined,
    destinationAddress: undefined,
    destinationHighlights: undefined,
    destinationShortDescription: undefined,
    destinationDescription: undefined,
    destinationAmenities: undefined,
    destinationBestTimeToVisit: undefined,
    destinationAverageTemperature: undefined,
    destinationLanguage: undefined,
    destinationCurrency: undefined,
    destinationTimezone: undefined,
    destinationThingsToKnow: undefined,
    notes: '',
    images: [],
    hotelAlts: [],
    vehicleAlts: [],
    _isManualHotelEntry: false,
    _isManualVehicleEntry: false,
    _manualRoomTypes: [],
    _manualMealPlans: [],
  };
}

export function createOptionBuilder(days: DayBuilderData[], travelers = 1): OptionBuilder {
  return {
    id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    days: structuredClone(days),
    pricing: calculateOptionPricing(days, travelers),
  };
}

export function createOptionBuilderWithClearedDays(
  days: DayBuilderData[],
  travelers = 1
): OptionBuilder {
  const clearedDays = days.map(d => ({
    ...d,
    dayNumber: d.dayNumber,
    date: d.date,
    dayType: 'activity',
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
    roomTypePrice: 0,
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
    _manualRoomTypes: [],
    _manualMealPlans: [],
  }));
  return {
    id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    days: clearedDays,
    pricing: calculateOptionPricing(clearedDays, travelers),
  };
}

// ─── Option Pricing Calculator ─────────────────────────────────────────────────
//
// This is the only place hotel, vehicle and activity costs are worked out.
// The pricing screen, the save, the edit page and the option cards all go
// through it, so what the agent sees is exactly what is saved and printed —
// they used to each have their own maths and disagreed in edge cases.

/**
 * An agent-typed total, remembered with the calculated figure it replaced.
 * It only applies while the days still add up to that figure; a later change
 * to the nights (or vehicle days) falls back to the rates instead of keeping
 * a total typed for a different stay.
 */
export interface CostOverride {
  amount: number;
  basis: number;
}

/** Whether an override still applies to the figure it was typed against. */
export function overrideApplies(override: CostOverride | undefined, calculated: number) {
  return (
    override !== undefined &&
    Number.isFinite(override.amount) &&
    Math.abs(override.basis - calculated) < 0.5
  );
}

/** Price edits made on the pricing step, layered over the per-day rates. */
export interface PricingOverrides {
  /** Per-hotel rate edits; each set field replaces that rate on every night. */
  hotelPrices?: PricingData['hotelPrices'];
  /** Per-hotel full cost (rooms, meals, extra beds, children) for the whole stay. */
  hotelTotals?: Record<string, CostOverride>;
  /** Per-vehicle full cost for the whole trip. */
  vehicleTotals?: Record<string, CostOverride>;
  /** Whole-package hotel cost (multi-option manual field). Beats the per-hotel values. */
  hotelCost?: number;
  /** Whole-package vehicle cost (multi-option manual field). */
  vehicleCost?: number;
}

export interface NightCost {
  room: number;
  meal: number;
  extraBed: number;
  child: number;
  total: number;
}

/** One night at the day's hotel: every rate is per night, priced on its own night. */
export function hotelNightCost(
  day: DayBuilderData,
  rates?: Partial<HotelManualPrices>
): NightCost {
  if (!day.hotelId) return { room: 0, meal: 0, extraBed: 0, child: 0, total: 0 };
  const rooms = day.roomCount || 1;
  const base = rates?.basePricePerRoom ?? (day.basePrice || 0);
  const upgrade = rates?.roomTypeUpgradePrice ?? (day.roomTypePrice || 0);
  const room = (base + upgrade) * rooms;
  const meal = (rates?.mealPlanPricePerRoom ?? (day.mealPlanPrice || 0)) * rooms;
  // Extra beds and children are counted per night, not per room.
  const extraBed = (day.extraBedCount || 0) * (rates?.extraBedPrice ?? (day.extraBedPrice || 0));
  const child = (day.childCount || 0) * (rates?.childPrice ?? (day.childPrice || 0));
  return { room, meal, extraBed, child, total: room + meal + extraBed + child };
}

/** One day's transport. Leisure days count too: a vehicle there is picked on purpose. */
export function vehicleDayCost(day: DayBuilderData): number {
  return day.vehicleId ? (day.ratePerDay || 0) * (day.vehicleCount || 1) : 0;
}

export interface HotelCostLine {
  hotelId: string;
  hotelName: string;
  nights: number;
  rooms: number;
  extraBeds: number;
  children: number;
  room: number;
  meal: number;
  extraBed: number;
  child: number;
  /** Sum of the nights at their rates. */
  calculated: number;
  /** What is charged: the agent's total for this hotel when set, else `calculated`. */
  total: number;
  overridden: boolean;
}

export interface VehicleCostLine {
  vehicleId: string;
  vehicleName: string;
  days: number;
  calculated: number;
  total: number;
  overridden: boolean;
}

export interface CostBreakdown {
  hotels: HotelCostLine[];
  vehicles: VehicleCostLine[];
  hotelCost: number;
  vehicleCost: number;
  activityCost: number;
}

/** Turns an input's text into an override: blank (or junk) means "no override". */
export function parseOverride(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function calculateCostBreakdown(
  days: DayBuilderData[],
  overrides: PricingOverrides = {}
): CostBreakdown {
  const hotels = new Map<string, HotelCostLine>();
  const vehicles = new Map<string, VehicleCostLine>();
  let activityCost = 0;

  days.forEach(day => {
    if (day.hotelId) {
      const night = hotelNightCost(day, overrides.hotelPrices?.[day.hotelId]);
      const line = hotels.get(day.hotelId) ?? {
        hotelId: day.hotelId,
        hotelName: day.hotelName,
        nights: 0,
        rooms: 0,
        extraBeds: 0,
        children: 0,
        room: 0,
        meal: 0,
        extraBed: 0,
        child: 0,
        calculated: 0,
        total: 0,
        overridden: false,
      };
      line.nights += 1;
      line.rooms += day.roomCount || 1;
      line.extraBeds += day.extraBedCount || 0;
      line.children += day.childCount || 0;
      line.room += night.room;
      line.meal += night.meal;
      line.extraBed += night.extraBed;
      line.child += night.child;
      line.calculated += night.total;
      hotels.set(day.hotelId, line);
    }

    if (day.vehicleId) {
      const line = vehicles.get(day.vehicleId) ?? {
        vehicleId: day.vehicleId,
        vehicleName: day.vehicleName,
        days: 0,
        calculated: 0,
        total: 0,
        overridden: false,
      };
      line.days += day.vehicleCount || 1;
      line.calculated += vehicleDayCost(day);
      vehicles.set(day.vehicleId, line);
    }

    // Leisure days hide the activities section, so anything left there from
    // before the day was switched isn't part of the plan.
    if (day.dayType !== 'leisure') {
      day.activities.forEach(act => {
        activityCost += act.cost || 0;
      });
    }
  });

  const hotelLines = Array.from(hotels.values()).map(line => {
    const custom = overrides.hotelTotals?.[line.hotelId];
    return custom && overrideApplies(custom, line.calculated)
      ? { ...line, total: custom.amount, overridden: true }
      : { ...line, total: line.calculated };
  });
  const vehicleLines = Array.from(vehicles.values()).map(line => {
    const custom = overrides.vehicleTotals?.[line.vehicleId];
    return custom && overrideApplies(custom, line.calculated)
      ? { ...line, total: custom.amount, overridden: true }
      : { ...line, total: line.calculated };
  });

  return {
    hotels: hotelLines,
    vehicles: vehicleLines,
    hotelCost: overrides.hotelCost ?? hotelLines.reduce((sum, l) => sum + l.total, 0),
    vehicleCost: overrides.vehicleCost ?? vehicleLines.reduce((sum, l) => sum + l.total, 0),
    activityCost,
  };
}

/** The pricing step's edits in single-package mode, as calculator overrides. */
export function singlePricingOverrides(pricingData: PricingData): PricingOverrides {
  return {
    hotelPrices: pricingData.hotelPrices,
    hotelTotals: pricingData.hotelTotals,
    vehicleTotals: pricingData.vehicleTotals,
  };
}

export function calculateOptionPricing(
  days: DayBuilderData[],
  // basePrice is per-room, not per-person, so the head count scales nothing.
  _travelers: number,
  additionalCharges: number = 0,
  marginPercent: number = 0,
  gstPercent: number = 0,
  discountPercent: number = 0,
  roundOff: number = 0,
  overrides: PricingOverrides = {}
): OptionPricing {
  const { hotelCost: totalHotelCost, vehicleCost, activityCost } = calculateCostBreakdown(
    days,
    overrides
  );
  const subtotal = totalHotelCost + vehicleCost + activityCost + additionalCharges;

  // Apply margin (agency markup) on base subtotal
  const marginAmount = subtotal * (marginPercent / 100);
  const afterMargin = subtotal + marginAmount;

  // Apply GST on (subtotal + margin)
  const gstAmount = afterMargin * (gstPercent / 100);
  const afterGst = afterMargin + gstAmount;

  // Apply round off, then discount on that — same order as PricingDialog's
  // singleCalculations (margin, GST, round-off, discount). This used to apply
  // round-off after the discount, which gave a different total than the
  // pricing dialog for the exact same inputs whenever both were non-zero.
  const afterRoundOff = afterGst + roundOff;
  const discountAmount = afterRoundOff * (discountPercent / 100);
  const totalCost = afterRoundOff - discountAmount;

  return {
    hotelCost: totalHotelCost,
    vehicleCost,
    activityCost,
    miscCost: additionalCharges,
    subtotal,
    discountPercent,
    discountAmount,
    marginPercent,
    marginAmount,
    gstPercent,
    gstAmount,
    additionalCharges,
    roundOff,
    totalCost,
  };
}

/**
 * A multi-option package's live pricing: recalculated from its days and its
 * own adjustments, with the agent's manual hotel/vehicle costs fed into the
 * same calculation. `effectiveTotal` is what is shown, saved and printed — the
 * typed final price when there is one, otherwise the calculated total.
 */
export function resolveOptionPricing(
  option: Pick<OptionBuilder, 'days' | 'pricing'>,
  travelers: number,
  additionalChargesTotal: number
): OptionPricing & { effectiveTotal: number } {
  const stored = option.pricing;
  // A manual cost typed before the days changed no longer applies. One
  // without a basis (saved before bases existed) is kept as it was.
  const base = calculateCostBreakdown(option.days);
  const keep = (amount: number | undefined, basis: number | undefined, calculated: number) =>
    amount !== undefined && (basis === undefined || Math.abs(basis - calculated) < 0.5)
      ? amount
      : undefined;
  const manualHotelCost = keep(stored.manualHotelCost, stored.manualHotelBasis, base.hotelCost);
  const manualVehicleCost = keep(
    stored.manualVehicleCost,
    stored.manualVehicleBasis,
    base.vehicleCost
  );
  const calculated = calculateOptionPricing(
    option.days,
    travelers,
    additionalChargesTotal,
    stored.marginPercent ?? 0,
    stored.gstPercent ?? 0,
    stored.discountPercent ?? 0,
    stored.roundOff ?? 0,
    { hotelCost: manualHotelCost, vehicleCost: manualVehicleCost }
  );
  const manual = stored.finalPriceIsManual && stored.finalPrice !== undefined;
  return {
    ...calculated,
    manualHotelCost,
    manualVehicleCost,
    manualHotelBasis: manualHotelCost !== undefined ? stored.manualHotelBasis : undefined,
    manualVehicleBasis: manualVehicleCost !== undefined ? stored.manualVehicleBasis : undefined,
    manualTotal: stored.manualTotal,
    finalPrice: manual ? stored.finalPrice : undefined,
    finalPriceIsManual: manual,
    effectiveTotal: manual ? (stored.finalPrice as number) : calculated.totalCost,
  };
}

/** Sum of the additional charge amounts. */
export function sumAdditionalCharges(charges: AdditionalCharge[]): number {
  return charges.reduce((sum, c) => sum + (c.amount || 0), 0);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Whether a day has been given any content. Shared so the day card's green tick
 * and the builder's progress bar can never disagree — they used to apply
 * different rules, and the destination one checked `destinationId`, which the
 * free-text title field deliberately clears.
 */
export function isDayConfigured(day: DayBuilderData): boolean {
  return (
    day.dayType === 'leisure' ||
    Boolean(day.hotelId) ||
    Boolean(day.vehicleId) ||
    day.activities.length > 0 ||
    Boolean((day.destination || day.location || '').trim())
  );
}

// Everything that describes a day's stay: the hotel, the room and meal plan
// picked in it, and the alternatives offered alongside it.
const HOTEL_FIELDS = [
  'hotelId',
  'hotelName',
  'hotelAddress',
  'hotelStars',
  'hotelContact',
  'hotelImage',
  'roomType',
  'bedType',
  'basePrice',
  'roomTypePrice',
  'mealPlan',
  'mealPlanLabel',
  'mealPlanPrice',
  'roomCount',
  'extraBedPrice',
  'extraBedCount',
  'childPrice',
  'childCount',
  'hotelAlts',
  '_isManualHotelEntry',
  '_manualHotelDescription',
  '_manualRoomTypes',
  '_manualMealPlans',
] as const satisfies ReadonlyArray<keyof DayBuilderData>;

function hotelFieldsOf(day: DayBuilderData): Partial<DayBuilderData> {
  return Object.fromEntries(HOTEL_FIELDS.map(k => [k, day[k]]));
}

/** A day's stay fields as on a fresh day — i.e. no hotel. */
export function emptyHotelFields(): Partial<DayBuilderData> {
  return hotelFieldsOf(createEmptyDay(0, ''));
}

/**
 * Applies an edit to one day and keeps shared stays in step: a night ticked
 * on another day's card takes that day's hotel, and any later change to that
 * day's stay flows on to every night that shares it. Removing the hotel
 * releases those nights. Every builder routes its day edits through here.
 */
export function applyDayPatch(
  days: DayBuilderData[],
  dayIndex: number,
  patch: Partial<DayBuilderData>
): DayBuilderData[] {
  const next = days.map((d, i) => (i === dayIndex ? { ...d, ...patch } : d));
  const changed = next[dayIndex];

  if (patch.hotelFromDay) {
    const source = next.find(d => d.dayNumber === patch.hotelFromDay);
    if (source) next[dayIndex] = { ...changed, ...hotelFieldsOf(source) };
    return next;
  }

  const released = !changed.hotelId;
  return next.map(d =>
    d.hotelFromDay === changed.dayNumber
      ? { ...d, ...hotelFieldsOf(changed), ...(released ? { hotelFromDay: undefined } : {}) }
      : d
  );
}

/**
 * Reshapes template days onto the trip actually being built.
 *
 * Templates are only offered within a couple of days of the trip's length, so
 * this is always a small adjustment: extra days are dropped from the end, and
 * missing ones are appended as leisure days rather than empty activity days —
 * a free day at the end of a trip is a real answer, a blank one is a to-do.
 *
 * It also re-dates every day from the trip's start. Template days carry the
 * dates of the trip they were saved from, which would otherwise be copied in.
 */
export function adaptDaysToTrip(
  days: DayBuilderData[],
  targetCount: number,
  startDate: string
): DayBuilderData[] {
  const count = Math.max(1, targetCount);
  const dateFor = (index: number): string => {
    if (!startDate) return '';
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return '';
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };

  const kept = days.slice(0, count);

  while (kept.length < count) {
    const index = kept.length;
    kept.push({
      ...createEmptyDay(index + 1, dateFor(index)),
      dayType: 'leisure',
    });
  }

  return kept.map((day, index) => ({
    ...day,
    dayNumber: index + 1,
    date: dateFor(index),
  }));
}

export function calculateDays(from: string, to: string): number {
  if (!from || !to) return 3;
  const s = new Date(from);
  const e = new Date(to);
  const diff = Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

// ─── Step 4 Pricing Data ───────────────────────────────────────────────────────

// Hotel manual prices for manual entry mode
export interface HotelManualPrices {
  basePricePerRoom: number; // e.g., 100/room
  roomTypeUpgradePrice?: number; // extra cost for upgraded room type e.g., +50
  extraBedPrice: number; // per extra bed per night
  childPrice: number; // per child (no bed) per night
  mealPlanPricePerRoom: number; // per room per night for meal plan
}

export interface PricingData {
  roomsPerHotel: Record<string, number>; // hotelId -> roomCount
  extraBeds: Record<string, number>; // hotelId -> extraBedCount
  childWithoutBed: Record<string, number>; // hotelId -> childCount
  mealPlanPreference: 'EP' | 'CP' | 'MAP' | 'APAI';
  discountPercent: number;
  marginPercent: number;
  gstPercent: number;
  roundOff: number; // roundoff amount (positive = add, negative = subtract)
  additionalCharges: AdditionalCharge[];
  /**
   * @deprecated One value shared by every hotel's "Hotel Total" box, so typing
   * in one replaced them all. Ignored now; kept so older drafts still parse.
   */
  customHotelTotal?: number;
  /** @deprecated See `customHotelTotal`. */
  customVehicleTotal?: number;
  /** hotelId -> the agent's total for that whole stay. */
  hotelTotals?: Record<string, CostOverride>;
  /** vehicleId -> the agent's total for that vehicle across the trip. */
  vehicleTotals?: Record<string, CostOverride>;
  customGrandTotal?: number; // user-editable grand total override
  customGrandTotalIsManual?: boolean; // true once the user has typed a value into the "Grand Total (Editable)" field
  // Rates edited per hotel on the pricing step. Only the fields the agent
  // actually changed are set; the rest fall back to each night's own rate.
  hotelPrices: Record<string, Partial<HotelManualPrices>>;
  /** Optional per-traveller split of the grand total (single-package mode). */
  perPersonSplit?: PerPersonShare[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function createEmptyAdditionalCharge(): AdditionalCharge {
  return {
    id: `charge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    amount: 0,
  };
}
