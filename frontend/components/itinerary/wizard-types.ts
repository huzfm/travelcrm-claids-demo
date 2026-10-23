// Wizard Types for Itinerary Creation
// MealPlan is defined in hotel.types but re-exported via itinerary.types
import type { MealPlan, Hotel } from '@/types';
import type { Vehicle } from '@/types/vehicle.types';
import type { TripType, Quote } from '@/types/itinerary.types';
import type { Destination } from '@/types/destination.types';

// ─── Core Wizard Draft ─────────────────────────────────────────────────────────

export interface WizardDraft {
  leadId: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
  step5?: Step5Data;
}

export interface Step1Data {
  quoteMode: 'single' | 'multi';
  title?: string;
  destination: string;
  templateId?: string;
  startDate: string;
  endDate: string;
  totalTravelers: number;
  tripType?: TripType;
}

export interface Step5Data {
  // Keyed by day number: "1", "2", "3"
  [dayNumber: string]: DayDestinationEntry;
}

export interface DayDestinationEntry {
  destinationId: string;
  destinationName: string;
  destinationData?: Destination;
}

export interface Step2Data {
  // Keyed by day number: "1", "2", "3"
  [dayNumber: string]: DayHotelEntry;
}

export interface DayHotelEntry {
  hotelId: string;
  hotelName: string;
  roomType: string;
  bedType: string;
  basePrice: number;
  extraBedPrice?: number;
  childPrice?: number;
  mealPlan: MealPlan;
  mealPlanLabel: string;
  mealPlanPrice: number;
  roomCount: number;
  // For spanning: links this day to a "hotel entry" shared across multiple days
  hotelSpan?: HotelSpan;
  // Alternatives for multi-quote mode: additional hotel options for this day
  alternatives?: HotelAlternativeEntry[];
  // Full hotel data for manual (non-database) entries used in PDF generation
  hotelData?: Hotel;
}

export interface HotelAlternativeEntry {
  altId: string;
  hotelId: string;
  hotelName: string;
  roomType: string;
  bedType: string;
  basePrice: number;
  mealPlan: MealPlan;
  mealPlanLabel: string;
  mealPlanPrice: number;
  roomCount: number;
}

export interface HotelSpan {
  startDay: number;
  endDay: number;
  hotelId: string;
  hotelName: string;
}

export interface Step3Data {
  // Keyed by day number: "1", "2", "3"
  [dayNumber: string]: DayVehicleEntry;
}

export interface DayVehicleEntry {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  driverIncluded: boolean;
  pickupPoint: string;
  dropPoint: string;
  ratePerDay: number;
  vehicleRatePerDay?: number;
  skipped: boolean;
  // Alternatives for multi-quote mode: additional vehicle options for this day
  alternatives?: VehicleAlternativeEntry[];
  // Full vehicle data for manual (non-database) entries used in PDF generation
  vehicleData?: Vehicle;
}

export interface VehicleAlternativeEntry {
  altId: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  driverIncluded: boolean;
  pickupPoint: string;
  dropPoint: string;
  ratePerDay: number;
}

export interface Step4Data {
  included: string[];
  excluded: string[];
  notes: string;
  tripId: string;
  quotes: Quote[];
  selectedQuotes: number[];
}

// ─── Wizard State ──────────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4;

export interface WizardState {
  currentStep: WizardStep;
  leadId: string;
  step1: Step1Data;
  step2: Step2Data;
  step3: Step3Data;
  step4: Step4Data;
}

export const DEFAULT_STEP1: Step1Data = {
  quoteMode: 'single',
  destination: '',
  templateId: undefined,
  startDate: '',
  endDate: '',
  totalTravelers: 1,
  tripType: undefined,
};

export const DEFAULT_STEP4: Step4Data = {
  included: ['Hotels', 'Transfers', 'Meals', 'Sightseeing'],
  excluded: ['Personal Expenses', 'Visa Fees', 'Travel Insurance'],
  notes: '',
  tripId: '',
  quotes: [],
  selectedQuotes: [],
};

export function createEmptyStep2(daysCount: number): Step2Data {
  const result: Step2Data = {};
  for (let i = 1; i <= daysCount; i++) {
    result[String(i)] = {
      hotelId: '',
      hotelName: '',
      roomType: '',
      bedType: '',
      basePrice: 0,
      mealPlan: 'EP',
      mealPlanLabel: 'Room Only',
      mealPlanPrice: 0,
      roomCount: 1,
      hotelSpan: undefined,
      alternatives: [],
    };
  }
  return result;
}

export function createEmptyStep3(daysCount: number): Step3Data {
  const result: Step3Data = {};
  for (let i = 1; i <= daysCount; i++) {
    result[String(i)] = {
      vehicleId: '',
      vehicleName: '',
      vehicleType: '',
      driverIncluded: true,
      pickupPoint: '',
      dropPoint: '',
      ratePerDay: 0,
      skipped: false,
      alternatives: [],
    };
  }
  return result;
}

// ─── Validation Result ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

export interface DayValidationError {
  day: number;
  field: string;
  message: string;
}

// ─── Hotel Span Utilities ──────────────────────────────────────────────────────

export interface SpanGroup {
  hotelId: string;
  hotelName: string;
  startDay: number;
  endDay: number;
  days: number[];
}

/**
 * Extract contiguous span groups from Step2 data.
 * A span group is a consecutive range of days that share the same hotel.
 */
export function extractSpanGroups(step2: Step2Data, daysCount: number): SpanGroup[] {
  const groups: SpanGroup[] = [];
  const processed = new Set<number>();

  for (let day = 1; day <= daysCount; day++) {
    if (processed.has(day)) continue;

    const entry = step2[String(day)];
    if (!entry?.hotelId) {
      processed.add(day);
      continue;
    }

    // Check if this day starts a span
    if (entry.hotelSpan && entry.hotelSpan.startDay === day) {
      const { hotelId, hotelName, startDay, endDay } = entry.hotelSpan;
      const spannedDays: number[] = [];
      for (let d = startDay; d <= endDay; d++) {
        if (d <= daysCount) {
          spannedDays.push(d);
          processed.add(d);
        }
      }
      groups.push({ hotelId, hotelName, startDay, endDay, days: spannedDays });
    } else {
      // Standalone day (no span)
      processed.add(day);
      groups.push({
        hotelId: entry.hotelId,
        hotelName: entry.hotelName,
        startDay: day,
        endDay: day,
        days: [day],
      });
    }
  }

  return groups;
}

/**
 * Unspan a specific day - removes the hotelSpan reference and makes the day standalone.
 */
export function unspanDay(step2: Step2Data, day: number): Step2Data {
  const updated = { ...step2 };
  const entry = updated[String(day)];
  if (entry) {
    const { hotelSpan: _hotelSpan, ...rest } = entry;
    updated[String(day)] = {
      ...rest,
      hotelSpan: undefined,
    };
  }
  return updated;
}

/**
 * Apply spanning to a range of days - sets hotelSpan on the first day and clears hotelId on subsequent days.
 */
export function applyHotelSpan(
  step2: Step2Data,
  startDay: number,
  endDay: number,
  hotel: Pick<Hotel, 'id' | 'name'>
): Step2Data {
  const updated = { ...step2 };

  // Set span on start day
  const startEntry = updated[String(startDay)];
  if (startEntry) {
    updated[String(startDay)] = {
      ...startEntry,
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelSpan: { startDay, endDay, hotelId: hotel.id, hotelName: hotel.name },
    };
  }

  // Clear hotelId on spanned days (they inherit from start day)
  for (let day = startDay + 1; day <= endDay; day++) {
    const entry = updated[String(day)];
    if (entry) {
      updated[String(day)] = {
        ...entry,
        hotelId: hotel.id,
        hotelName: hotel.name,
        hotelSpan: { startDay, endDay, hotelId: hotel.id, hotelName: hotel.name },
      };
    }
  }

  return updated;
}

// ─── Trip Duration Helpers ─────────────────────────────────────────────────────

export function calculateTripDuration(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 0;
  // Inclusive of both start and end dates
  return Math.round(diffMs / 86400000) + 1;
}

export function isPastDate(dateString: string): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function isDateRangeValid(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  return end >= start;
}
