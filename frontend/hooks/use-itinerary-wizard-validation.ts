'use client';

import { z } from 'zod';
import type {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  ValidationResult,
  DayHotelEntry,
  DayVehicleEntry,
} from '@/components/itinerary/wizard-types';
import {
  calculateTripDuration,
  isPastDate,
  isDateRangeValid,
  extractSpanGroups,
} from '@/components/itinerary/wizard-types';

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

const step1Schema = z.object({
  quoteMode: z.enum(['single', 'multi']),
  destination: z.string().min(2, 'Destination must be at least 2 characters'),
  templateId: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  totalTravelers: z.number().int().min(1, 'At least 1 traveler is required'),
  tripType: z
    .enum([
      'HONEYMOON',
      'FAMILY',
      'ADVENTURE',
      'BUSINESS',
      'SOLO',
      'GROUP',
      'DOMESTIC',
      'INTERNATIONAL',
    ])
    .optional(),
});

const dayHotelEntrySchema = z.object({
  hotelId: z.string(),
  hotelName: z.string(),
  roomType: z.string(),
  bedType: z.string().optional(),
  basePrice: z.number().optional(),
  mealPlan: z.enum(['EP', 'CP', 'MAP', 'APAI']),
  mealPlanLabel: z.string().optional(),
  mealPlanPrice: z.number().optional(),
  roomCount: z.number().int().min(1, 'Room count must be at least 1'),
  hotelSpan: z
    .object({
      startDay: z.number().int().min(1),
      endDay: z.number().int().min(1),
      hotelId: z.string(),
      hotelName: z.string(),
    })
    .optional(),
});

const dayVehicleEntrySchema = z.object({
  vehicleId: z.string(),
  vehicleName: z.string(),
  vehicleType: z.string(),
  driverIncluded: z.boolean(),
  pickupPoint: z.string(),
  dropPoint: z.string(),
  ratePerDay: z.number().optional(),
  skipped: z.boolean(),
});

const quoteSchema = z.object({
  label: z.string().min(1, 'Quote label is required'),
  totalCost: z.number().min(0, 'Total cost cannot be negative'),
  description: z.string().optional(),
  breakdown: z
    .object({
      hotelCost: z.number().optional(),
      vehicleCost: z.number().optional(),
      activityCost: z.number().optional(),
      miscCost: z.number().optional(),
    })
    .optional(),
  additionalCharges: z
    .array(
      z.object({
        label: z.string(),
        amount: z.number(),
      })
    )
    .optional(),
  marginPercent: z.number().min(0).max(100).optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  features: z.array(z.string()).optional(),
});

// ─── Validation Functions ──────────────────────────────────────────────────────

/**
 * Validate Step 1: Basic Trip Details
 */
export function validateStep1(data: Step1Data): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Required field validations
  const result = step1Schema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors[path] = issue.message;
    }
  }

  // Date relationship validation
  if (data.startDate && data.endDate) {
    if (!isDateRangeValid(data.startDate, data.endDate)) {
      errors['endDate'] = 'End date must be on or after start date';
    }

    // Trip duration warnings
    const duration = calculateTripDuration(data.startDate, data.endDate);
    if (duration === 0) {
      errors['endDate'] = 'Invalid date range';
    } else if (duration === 1) {
      warnings['dateRange'] = 'Single day trip - is this intentional?';
    } else if (duration > 30) {
      warnings['dateRange'] = `Long trip (${duration} days) - please confirm`;
    }
  }

  // Past date warning
  if (data.startDate && isPastDate(data.startDate)) {
    warnings['startDate'] = 'Start date is in the past';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

/**
 * Validate Step 2: Hotel Selection
 * Each day must have hotelId, roomType, mealPlan, and roomCount >= 1.
 * Spans must be contiguous (no gaps).
 */
export function validateStep2(data: Step2Data, daysCount: number): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Validate each day
  for (let day = 1; day <= daysCount; day++) {
    const dayKey = String(day);
    const entry = data[dayKey];

    if (!entry) {
      errors[`day${day}.hotelId`] = `Day ${day}: Hotel selection is required`;
      continue;
    }

    // Validate hotel entry schema
    const result = dayHotelEntrySchema.safeParse(entry);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        errors[`day${day}.${path}`] = `Day ${day}: ${issue.message}`;
      }
    }

    // Hotel ID required
    if (!entry.hotelId) {
      errors[`day${day}.hotelId`] = `Day ${day}: Please select a hotel`;
    }

    // Room type required if hotel is selected
    if (entry.hotelId && !entry.roomType) {
      errors[`day${day}.roomType`] = `Day ${day}: Please select a room type`;
    }

    // Room count validation
    if (entry.roomCount < 1) {
      errors[`day${day}.roomCount`] = `Day ${day}: Room count must be at least 1`;
    }
  }

  // Validate span contiguity
  const spanErrors = validateSpanContiguity(data, daysCount);
  for (const err of spanErrors) {
    errors[err.field] = err.message;
  }

  // Soft warning: missing hotel for all days
  const daysWithHotel = Object.values(data as Record<string, DayHotelEntry>).filter(
    e => e?.hotelId
  ).length;
  if (daysWithHotel === 0 && daysCount > 0) {
    warnings['noHotels'] = 'No hotels selected for any day';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

/**
 * Validate span contiguity: all spanned days should be consecutive.
 */
function validateSpanContiguity(
  data: Step2Data,
  daysCount: number
): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];
  const groups = extractSpanGroups(data, daysCount);

  for (const group of groups) {
    if (group.days.length > 1) {
      // Check that days are truly consecutive
      for (let i = 1; i < group.days.length; i++) {
        if (group.days[i] !== group.days[i - 1] + 1) {
          errors.push({
            field: `day${group.days[i]}.hotelSpan`,
            message: `Gap detected in hotel span at day ${group.days[i]}`,
          });
        }
      }

      // Check that span start matches actual entry
      const startEntry = data[String(group.startDay)];
      if (startEntry && startEntry.hotelSpan) {
        if (
          startEntry.hotelSpan.startDay !== group.startDay ||
          startEntry.hotelSpan.endDay !== group.endDay
        ) {
          errors.push({
            field: `day${group.startDay}.hotelSpan`,
            message: `Hotel span configuration mismatch for days ${group.startDay}-${group.endDay}`,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate Step 3: Vehicle Selection
 * All fields are optional, but if vehicleId is set, vehicleName should match.
 */
export function validateStep3(data: Step3Data, daysCount: number): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Validate each day
  for (let day = 1; day <= daysCount; day++) {
    const dayKey = String(day);
    const entry = data[dayKey];

    if (!entry) continue;

    // Validate schema
    const result = dayVehicleEntrySchema.safeParse(entry);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        errors[`day${day}.${path}`] = `Day ${day}: ${issue.message}`;
      }
    }

    // If vehicleId is set, vehicleName should also be set
    if (entry.vehicleId && !entry.skipped && !entry.vehicleName) {
      errors[`day${day}.vehicleName`] = `Day ${day}: Vehicle name is missing`;
    }

    // Vehicle type consistency check
    if (entry.vehicleId && !entry.vehicleType) {
      warnings[`day${day}.vehicleType`] = `Day ${day}: Vehicle type not specified`;
    }
  }

  // Soft warning: no vehicles selected at all
  const daysWithVehicle = Object.values(data as Record<string, DayVehicleEntry>).filter(
    e => e?.vehicleId && !e.skipped
  ).length;
  if (daysWithVehicle === 0 && daysCount > 0) {
    warnings['noVehicles'] = 'No vehicles selected - is this intentional?';
  }

  // Warning if all days are skipped
  const allSkipped = Object.values(data as Record<string, DayVehicleEntry>).every(
    e => e?.skipped === true
  );
  if (allSkipped && daysCount > 0) {
    warnings['allSkipped'] = 'All transport days are skipped';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

/**
 * Validate Step 4: Final Details
 * - included/excluded: arrays (can be empty)
 * - quotes: each quote must have label and totalCost >= 0
 * - marginPercent/gstPercent: 0-100 if set
 */
export function validateStep4(data: Step4Data): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // included: array validation (can be empty)
  if (!Array.isArray(data.included)) {
    errors['included'] = 'Inclusions must be an array';
  }

  // excluded: array validation (can be empty)
  if (!Array.isArray(data.excluded)) {
    errors['excluded'] = 'Exclusions must be an array';
  }

  // notes: string validation (optional)
  if (typeof data.notes !== 'string') {
    errors['notes'] = 'Notes must be a string';
  }

  // tripId: string (optional, auto-generated if empty)
  if (data.tripId && data.tripId.length > 50) {
    errors['tripId'] = 'Trip ID must be 50 characters or less';
  }

  // quotes: array of quote objects
  if (!Array.isArray(data.quotes)) {
    errors['quotes'] = 'Quotes must be an array';
  } else {
    for (let i = 0; i < data.quotes.length; i++) {
      const quote = data.quotes[i];
      const quoteResult = quoteSchema.safeParse(quote);
      if (!quoteResult.success) {
        for (const issue of quoteResult.error.issues) {
          const path = issue.path.join('.');
          errors[`quote${i}.${path}`] = `Quote ${i + 1}: ${issue.message}`;
        }
      }

      // Additional quote-level validations
      if (!quote.label || quote.label.trim() === '') {
        errors[`quote${i}.label`] = `Quote ${i + 1}: Label is required`;
      }

      if (quote.totalCost < 0) {
        errors[`quote${i}.totalCost`] = `Quote ${i + 1}: Total cost cannot be negative`;
      }

      if (
        quote.marginPercent !== undefined &&
        (quote.marginPercent < 0 || quote.marginPercent > 100)
      ) {
        errors[`quote${i}.marginPercent`] = `Quote ${i + 1}: Margin must be between 0 and 100`;
      }

      if (quote.gstPercent !== undefined && (quote.gstPercent < 0 || quote.gstPercent > 100)) {
        errors[`quote${i}.gstPercent`] = `Quote ${i + 1}: GST must be between 0 and 100`;
      }
    }
  }

  // selectedQuotes: array of indices
  if (!Array.isArray(data.selectedQuotes)) {
    errors['selectedQuotes'] = 'Selected quotes must be an array';
  } else {
    // Validate that selected indices are valid
    for (const idx of data.selectedQuotes) {
      if (idx < 0 || idx >= data.quotes.length) {
        errors['selectedQuotes'] = `Invalid quote index: ${idx}`;
        break;
      }
    }
  }

  // Warning: no quotes selected for presentation
  if (data.quotes.length > 0 && data.selectedQuotes.length === 0) {
    warnings['noQuotesSelected'] = 'No quotes are selected for presentation';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined,
  };
}

/**
 * Validate the entire wizard state (all steps).
 */
export function validateWizard(
  step1: Step1Data,
  step2: Step2Data,
  step3: Step3Data,
  step4: Step4Data,
  daysCount: number
): ValidationResult {
  const combinedErrors: Record<string, string> = {};
  const combinedWarnings: Record<string, string> = {};

  const step1Result = validateStep1(step1);
  const step2Result = validateStep2(step2, daysCount);
  const step3Result = validateStep3(step3, daysCount);
  const step4Result = validateStep4(step4);

  Object.assign(combinedErrors, step1Result.errors);
  Object.assign(combinedErrors, step2Result.errors);
  Object.assign(combinedErrors, step3Result.errors);
  Object.assign(combinedErrors, step4Result.errors);

  if (step1Result.warnings) Object.assign(combinedWarnings, step1Result.warnings);
  if (step2Result.warnings) Object.assign(combinedWarnings, step2Result.warnings);
  if (step3Result.warnings) Object.assign(combinedWarnings, step3Result.warnings);
  if (step4Result.warnings) Object.assign(combinedWarnings, step4Result.warnings);

  return {
    valid: Object.keys(combinedErrors).length === 0,
    errors: combinedErrors,
    warnings: Object.keys(combinedWarnings).length > 0 ? combinedWarnings : undefined,
  };
}

// ─── Quick Validation Helpers ─────────────────────────────────────────────────

/**
 * Check if step 1 can proceed (less strict than full validation).
 * Used for real-time feedback while typing.
 */
export function canProceedFromStep1(data: Step1Data): boolean {
  return (
    data.destination.length >= 2 &&
    data.startDate.length > 0 &&
    data.endDate.length > 0 &&
    data.totalTravelers >= 1 &&
    isDateRangeValid(data.startDate, data.endDate)
  );
}

/**
 * Check if a specific day in step 2 is valid.
 */
export function isDayHotelValid(entry: Step2Data[string] | undefined): boolean {
  if (!entry) return false;
  return (
    entry.hotelId.length > 0 &&
    entry.roomType.length > 0 &&
    entry.mealPlan.length > 0 &&
    entry.roomCount >= 1
  );
}

/**
 * Check if a specific day in step 3 is valid (or skipped).
 */
export function isDayVehicleValid(entry: Step3Data[string] | undefined): boolean {
  if (!entry) return true; // Empty is fine (will be treated as skipped)
  if (entry.skipped) return true;
  if (entry.vehicleId) {
    return entry.vehicleName.length > 0;
  }
  return true;
}
