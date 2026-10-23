'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useItinerary,
  useUpdateItinerary,
  useShareItinerary,
  useSaveAsTemplate,
  useDeleteItinerary,
  useSendDocumentMessage,
} from '@/hooks/useItineraries';
import { format as dateFormat, addDays } from 'date-fns';
import { usePdfProgress } from '@/components/itineraries/pdf-progress-overlay';
import { cleanFlightsForSave } from '@/lib/flights';
import { useSendWhatsAppToNumber } from '@/hooks/useWhatsApp';
import type {
  DayActivity,
  DayMeals,
  FlightSegment,
  ItineraryDay,
  ActivityCategory,
  TripType,
  ItineraryOption,
  Itinerary,
  OptionHotel,
  OptionVehicle,
  OptionActivity,
} from '@/types';

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

import type { PerPersonShare } from '@/types/itinerary.types';

export type { ItineraryDay, DayActivity };

export interface Quote {
  label: string;
  totalCost: number;
  description?: string;
  breakdown?: {
    hotelCost?: number;
    vehicleCost?: number;
    activityCost?: number;
    miscCost?: number;
    customTotal?: number; // manual total override from Step 4 Pricing
  };
  additionalCharges?: Array<{ label: string; amount: number }>;
  marginPercent?: number;
  gstPercent?: number;
  discountPercent?: number;
  roundOff?: number;
  items?: Array<{ label: string; amount: number }>;
  features?: string[];
  dayAlternatives?: Record<string, { hotelAltIndex?: number; vehicleAltIndex?: number }>;
  // Per-quote day data for multi-option editing
  days?: ItineraryDay[];
  /** Optional per-traveller split of this quote's price, set in the editor. */
  perPersonSplit?: PerPersonShare[];
}

// Helper to calculate quote totals
export function calculateQuoteTotal(quote: Quote): {
  subtotal: number;
  marginAmount: number;
  gstAmount: number;
  roundOff: number;
  grandTotal: number;
} {
  const breakdown = quote.breakdown || {};
  const addCharges = Array.isArray(quote.additionalCharges)
    ? quote.additionalCharges
    : typeof quote.additionalCharges === 'string'
      ? JSON.parse(quote.additionalCharges || '[]')
      : [];
  const subtotal =
    (breakdown.hotelCost || 0) +
    (breakdown.vehicleCost || 0) +
    (breakdown.activityCost || 0) +
    (breakdown.miscCost || 0) +
    addCharges.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0);

  const marginAmount = quote.marginPercent ? subtotal * (quote.marginPercent / 100) : 0;
  const subtotalWithMargin = subtotal + marginAmount;
  const gstAmount = quote.gstPercent ? subtotalWithMargin * (quote.gstPercent / 100) : 0;
  const afterGst = subtotalWithMargin + gstAmount;
  const roundOff = quote.roundOff || 0;
  const afterRoundOff = afterGst + roundOff;
  const discountAmount = afterRoundOff * ((quote.discountPercent || 0) / 100);
  const grandTotal = afterRoundOff - discountAmount;

  return { subtotal, marginAmount, gstAmount, roundOff, grandTotal };
}

export function useItineraryDetail(itineraryId: string) {
  const router = useRouter();
  const _queryClient = useQueryClient();
  // Drives the full-screen PDF download overlay.
  const pdfProgress = usePdfProgress();

  const { data: itinerary, isLoading } = useItinerary(itineraryId);
  const updateItinerary = useUpdateItinerary();
  const shareItinerary = useShareItinerary();
  const sendDocumentMessage = useSendDocumentMessage();
  const sendTextMessage = useSendWhatsAppToNumber();
  const saveAsTemplate = useSaveAsTemplate();
  const deleteItinerary = useDeleteItinerary();

  // State
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [hasChanges, setHasChanges] = useState(false);

  // Trip meta
  const [tripTitle, setTripTitle] = useState('');
  const [tripDestination, setTripDestination] = useState('');
  const [tripId, setTripId] = useState('');
  const [tripType, setTripType] = useState<TripType | undefined>();
  const [tripStartDate, setTripStartDate] = useState<string>('');
  const [tripEndDate, setTripEndDate] = useState<string>('');
  const [tripTravelers, setTripTravelers] = useState(2);

  // PDF cover page salutation shown before the client's name. The hero image
  // itself is shared by every itinerary — see usePdfSettings.
  const [salutation, setSalutation] = useState('Mr');

  // Store included/excluded/terms for save (not editable on final page, but needed for persistence)
  const [tripIncluded, setTripIncluded] = useState<string[]>([]);
  const [tripExcluded, setTripExcluded] = useState<string[]>([]);
  const [tripNotes, setTripNotes] = useState('');
  const [tripTerms, setTripTerms] = useState('');
  const [customInclusion, setCustomInclusion] = useState('');
  const [customExclusion, setCustomExclusion] = useState('');

  // Trip-level flights — outbound, return and any hops between destinations.
  const [flights, setFlights] = useState<FlightSegment[]>([]);

  // Multi-quote state
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuotes, setSelectedQuotes] = useState<number[]>([]);

  // Multi-option state
  const [options, setOptions] = useState<ItineraryOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  // ─── SINGLE SOURCE OF TRUTH FOR PRICING ─────────────────────────────────────
  // Options from Step 4 carry their own pre-computed pricing (with margin/GST/discount/custom overrides).
  // When options exist, use them directly — do NOT recalculate from raw day costs.
  // Only recalculate quotes when in single-quote mode (no options array).
  // ───────────────────────────────────────────────────────────────────────────

  // ─── SINGLE SOURCE OF TRUTH FOR PRICING ─────────────────────────────────────
  // For newly created single-option itineraries (no options, no quotes from API):
  // the itinerary.totalCost is the AUTHORITATIVE price set in Step 4.
  // Never recalculate it from raw day costs — it was already computed with
  // margin/GST/discount and is stored at the top level.
  //
  // For multi-option itineraries: use options[N].totalCost (from Step 4 build)
  // For multi-quote itineraries: use quotes[N].totalCost
  // ───────────────────────────────────────────────────────────────────────────

  const _tripTotalCost = useMemo(() => {
    // Multi-option mode: use selected option's price (from Step 4)
    if (options.length > 0) {
      const optIdx = selectedOptions[0] ?? 0;
      const opt = options[optIdx];
      if (opt?.breakdown?.customTotal != null) {
        return opt.breakdown.customTotal;
      }
      return opt?.totalCost ?? 0;
    }
    // Multi-quote mode: use selected quote's price
    if (quotes.length > 0) {
      const q = quotes[selectedQuotes[0] ?? 0];
      if (q?.breakdown?.customTotal != null) {
        return q.breakdown.customTotal;
      }
      return q?.totalCost ?? 0;
    }
    // Single-option itinerary (no quotes, no options):
    // Use itinerary.totalCost directly — this was set from Step 4 pricing
    return itinerary?.totalCost ?? 0;
  }, [quotes, selectedQuotes, options, selectedOptions, itinerary]);

  // Apply selected quote's dayAlternatives, embedded days, or option data to display days
  const displayDays = useMemo<ItineraryDay[]>(() => {
    const anyOptionHasDayData = options.some(
      opt =>
        (opt.hotels && opt.hotels.length > 0) ||
        (opt.vehicles && opt.vehicles.length > 0) ||
        (opt.activities && opt.activities.length > 0) ||
        (opt.images && opt.images.length > 0)
    );
    const anyQuoteHasEmbeddedDays = quotes.some(q => q.days && q.days.length > 0);

    // OPTIONS MODE: When we have options, use selectedOption to determine which data to show
    if (options.length > 0) {
      const optIdx = selectedOptions[0] ?? 0;
      const selectedOption = options[optIdx];

      if (selectedOption && anyOptionHasDayData) {
        // Build display days from option's per-day hotel/vehicle/activity data
        return days.map((day, dayIdx) => {
          const dayNum = day.dayNumber || dayIdx + 1;
          const optHotel = selectedOption.hotels?.find(h => h.dayNumber === dayNum);
          const optVehicle = selectedOption.vehicles?.find(v => v.dayNumber === dayNum);
          const optActivities = selectedOption.activities?.filter(a => a.dayNumber === dayNum);

          const updated: ItineraryDay = { ...day };

          if (optHotel) {
            updated.hotelId = optHotel.hotelId;
            updated.hotel = optHotel.hotelName;
            updated.hotelAddress = optHotel.hotelAddress;
            updated.hotelContact = optHotel.hotelContact;
            updated.hotelImage = optHotel.hotelImage;
            updated.hotelStars = optHotel.hotelStars;
            updated.numberOfRooms = optHotel.numberOfRooms || 1;
            updated.extraBeds = optHotel.extraBeds;
            updated.childrenNoBed = optHotel.childWithoutBed;
            if (optHotel.pricePerNight) {
              updated.selectedRoomType = {
                ...day.selectedRoomType,
                name: optHotel.roomType || 'Standard',
                bedType: optHotel.bedType || 'Double',
                basePrice: optHotel.pricePerNight,
                extraBedPrice:
                  (optHotel as any).extraBedPrice ?? day.selectedRoomType?.extraBedPrice,
                childPrice: (optHotel as any).childPrice ?? day.selectedRoomType?.childPrice,
              };
            }
            // Also expose at day level for HotelCardMulti cost calculations
            (updated as any).extraBedPrice =
              (optHotel as any).extraBedPrice ??
              day.selectedRoomType?.extraBedPrice ??
              (day as any).extraBedPrice ??
              (day as any).extraBedCost ??
              0;
            (updated as any).childPrice =
              (optHotel as any).childPrice ??
              day.selectedRoomType?.childPrice ??
              (day as any).childPrice ??
              (day as any).childWithoutBedCost ??
              0;
          } else {
            // No optHotel found for this day
          }

          if (optVehicle) {
            updated.vehicleId = optVehicle.vehicleId;
            updated.vehicleName = optVehicle.vehicleName;
            updated.vehicleType = optVehicle.vehicleType;
            updated.vehicleImage = optVehicle.vehicleImage;
            updated.numberOfVehicles = optVehicle.numberOfVehicles || 1;
            updated.vehicleRatePerDay = optVehicle.ratePerDay;
            updated.selectedVehicle = {
              name: optVehicle.vehicleName,
              vehicleType: optVehicle.vehicleType || '',
              seatingCapacity: 0,
              driverName: optVehicle.driverName,
              driverPhone: optVehicle.driverPhone,
              ratePerDay: optVehicle.ratePerDay,
            };
          }

          if (optActivities && optActivities.length > 0) {
            updated.activities = optActivities.map(a => ({
              id: generateId(),
              title: a.title,
              description: a.description,
              location: a.location,
              time: a.time,
              cost: a.cost,
              category: 'ACTIVITY' as const,
            }));
          }

          // Apply option images for this day (only if main days state doesn't have them yet)
          if (selectedOption.images) {
            const dayImages = selectedOption.images.find(img => img.dayNumber === dayNum);
            if (dayImages && (!day.images || day.images.length === 0)) {
              updated.images = dayImages.images;
            }
          }
          // Always prefer the latest images from main days state (they may be freshly uploaded dataUrls)
          if (day.images && day.images.length > 0) {
            updated.images = day.images;
          }

          return updated;
        });
      }

      // Options exist but no per-day data - use quote's embedded days matching selected option index
      if (anyQuoteHasEmbeddedDays) {
        // Match quote index to option index when possible
        const quoteIdx = Math.min(optIdx, quotes.length - 1);
        const selectedQuote = quotes[quoteIdx];
        if (selectedQuote?.days && selectedQuote.days.length > 0) {
          // Merge hotelImage from selected option's hotels into quote's days
          return selectedQuote.days.map((day, dayIdx) => {
            const dayNum = dayIdx + 1;
            const optHotel = selectedOption.hotels?.find(
              h => h.dayNumber === dayNum || selectedOption.hotels?.indexOf(h) === dayIdx
            );
            if (optHotel?.hotelImage) {
              return {
                ...day,
                hotelImage: optHotel.hotelImage,
                dayType: days[dayIdx]?.dayType,
                leisureGuidelines: days[dayIdx]?.leisureGuidelines,
              };
            }
            // Preserve dayType and leisureGuidelines from main days state even when no hotelImage
            return {
              ...day,
              dayType: days[dayIdx]?.dayType,
              leisureGuidelines: days[dayIdx]?.leisureGuidelines,
            };
          });
        }
      }

      return days.map((d, idx) => ({
        ...d,
        dayType: d.dayType || days[idx]?.dayType,
        leisureGuidelines: days[idx]?.leisureGuidelines,
      }));
    }

    // SINGLE OPTION or NO OPTIONS: use quotes mode (existing behavior)
    const quoteIdx = selectedQuotes[0] ?? 0;
    const selectedQuote = quotes[quoteIdx];

    // If quote has its own days data, use those for editing
    if (selectedQuote?.days && selectedQuote.days.length > 0) {
      // Merge day images from main days state (they may be newer dataUrls not yet in quote)
      // Also merge destination/hotel/vehicle from main days state if quote days are missing them
      return selectedQuote.days.map((qDay, idx) => ({
        ...qDay,
        images: days[idx]?.images && days[idx].images.length > 0 ? days[idx].images : qDay.images,
        // Fall back to main days state for destination, hotel, vehicle fields not in quote days
        ...((!qDay.destinationId ||
          qDay.destinationHighlights == null ||
          qDay.destinationShortDescription == null ||
          qDay.destinationDescription == null) &&
        days[idx]?.destinationId
          ? {
              destinationId: days[idx].destinationId,
              destination: days[idx].destination,
              destinationAddress: days[idx].destinationAddress,
              destinationHighlights: days[idx].destinationHighlights,
              destinationShortDescription: days[idx].destinationShortDescription,
              destinationDescription: days[idx].destinationDescription,
              destinationAmenities: days[idx].destinationAmenities,
              destinationBestTimeToVisit: days[idx].destinationBestTimeToVisit,
              destinationAverageTemperature: days[idx].destinationAverageTemperature,
              destinationLanguage: days[idx].destinationLanguage,
              destinationCurrency: days[idx].destinationCurrency,
              destinationTimezone: days[idx].destinationTimezone,
              destinationThingsToKnow: days[idx].destinationThingsToKnow,
            }
          : {}),
        // Always merge hotel data from main days when available (selectedRoomType carries extraBedPrice/childPrice)
        // Also merge dayType which controls leisure/rest day rendering
        ...(days[idx]?.hotelId
          ? {
              dayType: days[idx].dayType,
              hotelId: days[idx].hotelId,
              hotel: days[idx].hotel,
              hotelAddress: days[idx].hotelAddress,
              hotelContact: days[idx].hotelContact,
              hotelImage: days[idx].hotelImage,
              hotelStars: days[idx].hotelStars,
              selectedRoomType: days[idx].selectedRoomType,
              selectedMealPlan: days[idx].selectedMealPlan,
              numberOfRooms: days[idx].numberOfRooms,
              // Merge extraBeds/childrenNoBed from main days (quote days often missing these even when hotelId exists)
              extraBeds:
                qDay.extraBeds == null || qDay.extraBeds === 0
                  ? days[idx].extraBeds
                  : qDay.extraBeds,
              childrenNoBed:
                qDay.childrenNoBed == null || qDay.childrenNoBed === 0
                  ? days[idx].childrenNoBed
                  : qDay.childrenNoBed,
              extraBedCost:
                qDay.extraBedCost == null || qDay.extraBedCost === 0
                  ? days[idx].extraBedCost
                  : qDay.extraBedCost,
              childWithoutBedCost:
                qDay.childWithoutBedCost == null || qDay.childWithoutBedCost === 0
                  ? days[idx].childWithoutBedCost
                  : qDay.childWithoutBedCost,
            }
          : {}),
        // Always merge dayType from main days state (controls leisure/rest day rendering in PDF)
        // even when there's no hotelId
        ...(days[idx]?.dayType ? { dayType: days[idx].dayType } : {}),
        // Merge leisureGuidelines from main days state (shown in PDF for leisure days)
        ...(days[idx]?.leisureGuidelines !== undefined
          ? { leisureGuidelines: days[idx].leisureGuidelines }
          : {}),
        ...(!qDay.vehicleId && days[idx]?.vehicleId
          ? {
              vehicleId: days[idx].vehicleId,
              vehicleName: days[idx].vehicleName,
              vehicleType: days[idx].vehicleType,
              vehicleRatePerDay: days[idx].vehicleRatePerDay,
              vehicleImage: days[idx].vehicleImage,
              numberOfVehicles: days[idx].numberOfVehicles,
              selectedVehicle: days[idx].selectedVehicle,
              vehicleFeatures: days[idx].vehicleFeatures,
              vehicleRegistration: days[idx].vehicleRegistration,
              vehicleDriver: days[idx].vehicleDriver,
              vehicleDriverPhone: days[idx].vehicleDriverPhone,
            }
          : {}),
      }));
    }

    // Otherwise apply dayAlternatives to main days
    if (!selectedQuote?.dayAlternatives) {
      return days.map((d, idx) => ({
        ...d,
        dayType: d.dayType || days[idx]?.dayType,
        leisureGuidelines: days[idx]?.leisureGuidelines,
      }));
    }

    return days.map((day, idx) => {
      const alt = selectedQuote.dayAlternatives?.[idx.toString()];
      if (!alt) return day;

      let updated = { ...day };
      const hotelOpts = day.alternatives?.hotelOptions || [];
      const vehicleOpts = day.alternatives?.vehicleOptions || [];

      // Apply selected hotel alternative to display
      if (alt.hotelAltIndex !== undefined && hotelOpts[alt.hotelAltIndex]) {
        const h = hotelOpts[alt.hotelAltIndex];
        updated = {
          ...updated,
          hotelId: h.hotelId,
          hotel: h.hotelName,
          hotelAddress: h.hotelAddress,
          hotelContact: h.hotelContact,
          hotelImage: h.hotelImage,
          hotelStars: h.hotelStars,
          selectedRoomType: h.selectedRoomType,
          selectedMealPlan: h.selectedMealPlan,
          extraBedCost: h.extraBedCost,
          childWithoutBedCost: h.childWithoutBedCost,
        };
      }

      // Apply selected vehicle alternative to display
      if (alt.vehicleAltIndex !== undefined && vehicleOpts[alt.vehicleAltIndex]) {
        const v = vehicleOpts[alt.vehicleAltIndex];
        updated = {
          ...updated,
          vehicleId: v.vehicleId,
          vehicleName: v.vehicleName,
          vehicleType: v.vehicleType,
          vehicleImage: v.vehicleImage,
          vehicleRatePerDay: v.vehicleRatePerDay,
          selectedVehicle: v.selectedVehicle,
          vehicleFeatures: v.vehicleFeatures,
        };
      }

      // Apply day images from quote embedded days
      if (selectedQuote.days?.[idx]?.images) {
        updated.images = selectedQuote.days[idx].images;
      }

      return updated;
    });
  }, [days, quotes, selectedQuotes, options, selectedOptions]);

  // Dialogs
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showEditTripDialog, setShowEditTripDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);

  // Activity form
  const [activityForm, setActivityForm] = useState<Partial<DayActivity>>({
    time: '',
    title: '',
    description: '',
    location: '',
    category: 'ACTIVITY',
    cost: undefined,
    bookingRef: '',
    contactNumber: '',
    duration: '',
  });

  // Share state
  const [recipientPhone, setRecipientPhone] = useState('');

  // Auto-save
  const _saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Initialize from API
  useEffect(() => {
    if (itinerary) {
      const parseArr = (val: unknown) =>
        Array.isArray(val) ? val : typeof val === 'string' ? JSON.parse(val) : [];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds editable state from the loaded itinerary
      setTripIncluded(parseArr(itinerary.included));
      setTripExcluded(parseArr(itinerary.excluded));
      // Itineraries created before the flight section have no `flights` at all.
      setFlights(Array.isArray(itinerary.flights) ? itinerary.flights : []);

      // Parse quotes - could be string or array
      let loadedQuotes = itinerary.quotes;
      if (typeof loadedQuotes === 'string') {
        try {
          loadedQuotes = JSON.parse(loadedQuotes);
        } catch {
          loadedQuotes = [];
        }
      }
      if (!Array.isArray(loadedQuotes)) loadedQuotes = [];
      // Cast to local Quote type which includes days field
      const typedQuotes = loadedQuotes as Quote[];

      setQuotes(typedQuotes);

      // Load options - if options field is empty/null, convert quotes to options
      const rawOptions = parseArr(itinerary.options);
      if (rawOptions.length > 0) {
        setOptions(rawOptions as ItineraryOption[]);
      } else if (typedQuotes.length > 1) {
        // No options but multiple quotes - convert quotes to options for multi-option display
        const convertedOptions: ItineraryOption[] = typedQuotes.map((q, i) => ({
          name: q.label || `Option ${i + 1}`,
          description: q.description,
          hotels: [],
          vehicles: [],
          activities: [],
          totalCost: q.totalCost,
          breakdown: q.breakdown,
          features: q.features,
          marginPercent: q.marginPercent,
          gstPercent: q.gstPercent,
          discountPercent: q.discountPercent,
          roundOff: q.roundOff,
          additionalCharges: q.additionalCharges,
          perPersonSplit: q.perPersonSplit,
        }));
        setOptions(convertedOptions);
      } else {
        setOptions([]);
      }

      // Initialize days from selected quote's embedded days if available
      const sel = itinerary.selectedQuote;
      const selQuoteIdx = Array.isArray(sel) ? (sel[0] ?? 0) : typeof sel === 'number' ? sel : 0;
      const selectedQuote = typedQuotes[selQuoteIdx];

      let processedDays: ItineraryDay[] = [];
      // Prefer itinerary.daysJson (which has full enriched data from DB) over quote.days
      // Quote embedded days are often bare/minimal — use them only as fallback for editing
      const rawDaysFallback = itinerary.daysJson;
      let mainDaysArray: ItineraryDay[] = [];
      if (Array.isArray(rawDaysFallback)) {
        mainDaysArray = rawDaysFallback;
      } else if (typeof rawDaysFallback === 'string') {
        try {
          mainDaysArray = JSON.parse(rawDaysFallback);
        } catch {
          mainDaysArray = [];
        }
      }
      if (
        mainDaysArray.length > 0 &&
        (mainDaysArray[0].destinationId || mainDaysArray[0].hotelId || mainDaysArray[0].vehicleId)
      ) {
        processedDays = mainDaysArray;
      } else if (
        selectedQuote?.days &&
        Array.isArray(selectedQuote.days) &&
        selectedQuote.days.length > 0
      ) {
        // Use quote's embedded days when daysJson is empty/bare
        processedDays = selectedQuote.days;
      } else {
        // Fall back to main daysJson
        processedDays = mainDaysArray;
      }

      setDays(processedDays);
      setExpandedDays(processedDays.reduce((acc, _, i) => ({ ...acc, [i]: true }), {}));
      setTripTitle(itinerary.title || '');
      setTripDestination(itinerary.destination || '');
      setTripId(itinerary.tripId || '');
      setTripType(itinerary.tripType as TripType);
      setTripStartDate(
        itinerary.startDate ? dateFormat(new Date(itinerary.startDate), 'yyyy-MM-dd') : ''
      );
      setTripEndDate(
        itinerary.endDate ? dateFormat(new Date(itinerary.endDate), 'yyyy-MM-dd') : ''
      );
      setTripTravelers(itinerary.totalTravelers || 2);
      setSalutation(itinerary.salutation || 'Mr');
      // tripTotalCost is now DERIVED from quotes/options — no separate state to set
      setTripNotes(itinerary.notes || '');
      setTripTerms(itinerary.terms || '');

      setSelectedQuotes(Array.isArray(sel) ? sel : typeof sel === 'number' ? [sel] : []);

      const selOpt = itinerary.selectedOption;
      setSelectedOptions(
        Array.isArray(selOpt) ? selOpt : typeof selOpt === 'number' ? [selOpt] : []
      );
    }
  }, [itinerary]);

  // Auto-calculate quotes from actual day costs — also syncs options.totalCost
  const recalculateQuotes = useCallback(() => {
    if (days.length === 0) return;

    // If itinerary already has a totalCost (set from Step 4 during creation), preserve it.
    // Only recalculate for legacy itineraries that never went through Step 4 pricing.
    // An itinerary with no quotes/options and a top-level totalCost is authoritative.
    if (itinerary?.totalCost && quotes.length === 0 && options.length === 0) {
      return;
    }

    // Hotel cost = (room price × rooms) + extra beds + children no bed + meals
    // Room price is per-room, NOT per-person — don't multiply by travelers
    const hotelCost = days.reduce((sum, day) => {
      const rooms = day.numberOfRooms || 1;
      const extraBeds = day.extraBeds || 0;
      const childrenNoBed = day.childrenNoBed || 0;
      const room = day.selectedRoomType?.basePrice || 0;
      const extraBedPrice = day.selectedRoomType?.extraBedPrice || day.extraBedCost || 0;
      const childPrice = day.selectedRoomType?.childPrice || day.childWithoutBedCost || 0;
      const meal = day.selectedMealPlan?.pricePerNight || 0;
      const dayCost =
        room * rooms + extraBedPrice * extraBeds + childPrice * childrenNoBed + meal * rooms;
      if (dayCost !== 0) {
        return sum + dayCost;
      }
      return sum;
    }, 0);

    const vehicleCost = days.reduce((sum, day) => {
      const rate = day.selectedVehicle?.ratePerDay || day.vehicleRatePerDay || 0;
      const num = day.numberOfVehicles || 1;
      return sum + rate * num;
    }, 0);

    const activityCost = days.reduce((sum, day) => {
      return sum + day.activities.reduce((s, a) => s + (a.cost || 0), 0);
    }, 0);

    // Skip recalculating existing quotes that have manual customTotal overrides
    // This preserves manually edited grand totals from the pricing dialog
    const hasExistingQuotesWithOverrides = quotes.some(q => q.breakdown?.customTotal != null);
    if (hasExistingQuotesWithOverrides && options.length === 0) {
      // Just update the breakdown costs but preserve the customTotal
      setQuotes(prev =>
        prev.map(q => ({
          ...q,
          breakdown: {
            ...q.breakdown,
            hotelCost,
            vehicleCost,
            activityCost,
            miscCost: 0,
          },
        }))
      );
      return;
    }

    const baseTotal = hotelCost + vehicleCost + activityCost;

    // Build features from non-zero categories
    const features: string[] = [];
    if (hotelCost > 0) features.push(`${tripTravelers}N/${days.length}D Hotel Stay`);
    if (vehicleCost > 0) features.push('Transport Included');
    if (activityCost > 0) features.push('Activities & Sightseeing');
    features.push(`${days.length} Days, ${tripTravelers} Travelers`);

    setQuotes(prev => {
      if (prev.length === 0) {
        return [
          {
            label: 'Standard Package',
            // Use itinerary.totalCost if it exists (set from Step 4 Pricing during creation)
            // Otherwise fall back to baseTotal (raw hotel + vehicle + activity)
            totalCost: itinerary?.totalCost ?? baseTotal,
            breakdown: { hotelCost, vehicleCost, activityCost, miscCost: 0 },
            features,
            gstPercent: 0,
          },
        ];
      }
      return prev.map(q => {
        const sub = hotelCost + vehicleCost + activityCost;
        const addCharges = Array.isArray(q.additionalCharges)
          ? q.additionalCharges
          : typeof q.additionalCharges === 'string'
            ? JSON.parse(q.additionalCharges || '[]')
            : [];
        const addChgTotal = addCharges.reduce(
          (s: number, c: { amount: number }) => s + c.amount,
          0
        );
        const subtotal = sub + addChgTotal;
        // Same order as PricingDialog's singleCalculations: margin, GST,
        // round-off, then discount — this used to skip round-off entirely and
        // apply the discount before it, so any edit to a day's hotel/vehicle
        // after pricing was set (which retriggers this recalculation) silently
        // drifted the saved total away from what the dialog last showed.
        const marginAmt = subtotal * ((q.marginPercent || 0) / 100);
        const afterMargin = subtotal + marginAmt;
        const gstAmt = afterMargin * ((q.gstPercent || 0) / 100);
        const afterGst = afterMargin + gstAmt;
        const afterRoundOff = afterGst + (q.roundOff || 0);
        const discountAmt = afterRoundOff * ((q.discountPercent || 0) / 100);
        const calculatedTotal = afterRoundOff - discountAmt;
        // Preserve manual customTotal override if it exists
        const finalTotal = q.breakdown?.customTotal ?? calculatedTotal;
        return {
          ...q,
          totalCost: finalTotal,
          breakdown: {
            hotelCost,
            vehicleCost,
            activityCost,
            miscCost: 0,
            customTotal: q.breakdown?.customTotal ?? undefined,
          },
        };
      });
    });

    // Sync options pricing — each option has its OWN hotel/vehicle data
    if (options.length > 0) {
      setOptions(prev =>
        prev.map(opt => {
          // Check if this option has its own per-day hotel/vehicle/activity data
          const hasOwnData =
            (opt.hotels && opt.hotels.length > 0) ||
            (opt.vehicles && opt.vehicles.length > 0) ||
            (opt.activities && opt.activities.length > 0);

          // If option has its own data and has a manual finalPrice, preserve it
          if (hasOwnData) {
            // Calculate component costs first (needed for breakdown whether manual price or not)
            const optHotelCost = (opt.hotels || []).reduce((sum, h) => {
              const rooms = h.numberOfRooms || 1;
              const pricePerNight = h.pricePerNight || 0;
              const extraBedRate = h.extraBedPrice || 0;
              const childRate = h.childPrice || 0;
              const extraBeds = h.extraBeds || 0;
              const childNoBed = h.childWithoutBed || 0;
              return (
                sum + pricePerNight * rooms + extraBedRate * extraBeds + childRate * childNoBed
              );
            }, 0);

            const optVehicleCost = (opt.vehicles || []).reduce((sum, v) => {
              const rate = v.ratePerDay || 0;
              const num = v.numberOfVehicles || 1;
              return sum + rate * num;
            }, 0);

            const optActivityCost = (opt.activities || []).reduce((sum, a) => {
              return sum + (a.cost || 0);
            }, 0);

            // Check if this option has a manual override price
            const manualPrice = opt.finalPrice ?? opt.breakdown?.finalPrice;
            const manualTotal = opt.breakdown?.manualTotal ?? opt.breakdown?.customTotal;
            if (manualPrice != null || manualTotal != null) {
              // Preserve manual price - just update breakdown with component costs
              return {
                ...opt,
                totalCost: manualPrice ?? manualTotal ?? opt.totalCost,
                finalPrice: manualPrice ?? manualTotal,
                breakdown: {
                  hotelCost: optHotelCost,
                  vehicleCost: optVehicleCost,
                  activityCost: optActivityCost,
                  miscCost: 0,
                  finalPrice: manualPrice ?? manualTotal,
                  manualTotal,
                },
              };
            }
            // No manual price - recalculate normally from component costs

            const optSubtotal = optHotelCost + optVehicleCost + optActivityCost;
            const addCharges = Array.isArray(opt.additionalCharges)
              ? opt.additionalCharges
              : typeof opt.additionalCharges === 'string'
                ? JSON.parse(opt.additionalCharges || '[]')
                : [];
            const addChgTotal = addCharges.reduce(
              (s: number, c: { amount: number }) => s + c.amount,
              0
            );
            const subtotal = optSubtotal + addChgTotal;
            // margin is absolute, marginPercent is percentage
            const marginAmt =
              (opt.marginPercent ? subtotal * (opt.marginPercent / 100) : 0) + (opt.margin || 0);
            const afterMargin = subtotal + marginAmt;
            const gstAmt = afterMargin * ((opt.gstPercent || 0) / 100);
            const afterGst = afterMargin + gstAmt;
            const discountAmt = afterGst * ((opt.discountPercent || 0) / 100);
            const finalTotal = afterGst - discountAmt + (opt.roundOff || 0);

            return {
              ...opt,
              totalCost: finalTotal,
              finalPrice: opt.finalPrice ?? opt.breakdown?.finalPrice ?? finalTotal,
              breakdown: {
                hotelCost: optHotelCost,
                vehicleCost: optVehicleCost,
                activityCost: optActivityCost,
                miscCost: 0,
                finalPrice: opt.finalPrice ?? opt.breakdown?.finalPrice ?? finalTotal,
              },
            };
          }

          // No own data — calculate from shared days (legacy behavior)
          const addCharges = Array.isArray(opt.additionalCharges)
            ? opt.additionalCharges
            : typeof opt.additionalCharges === 'string'
              ? JSON.parse(opt.additionalCharges || '[]')
              : [];
          const addChgTotal = addCharges.reduce(
            (s: number, c: { amount: number }) => s + c.amount,
            0
          );
          const subtotal = baseTotal + addChgTotal;
          // margin is absolute, marginPercent is percentage
          const marginAmt =
            (opt.marginPercent ? subtotal * (opt.marginPercent / 100) : 0) + (opt.margin || 0);
          const afterMargin = subtotal + marginAmt;
          const gstAmt = afterMargin * ((opt.gstPercent || 0) / 100);
          const afterGst = afterMargin + gstAmt;
          const discountAmt = afterGst * ((opt.discountPercent || 0) / 100);
          const finalTotal = afterGst - discountAmt + (opt.roundOff || 0);

          return {
            ...opt,
            totalCost: finalTotal,
            finalPrice: opt.finalPrice ?? opt.breakdown?.finalPrice ?? finalTotal,
            breakdown: {
              hotelCost,
              vehicleCost,
              activityCost,
              miscCost: 0,
              finalPrice: opt.finalPrice ?? opt.breakdown?.finalPrice ?? finalTotal,
            },
          };
        })
      );
    }
  }, [days, tripTravelers, options, itinerary]);

  // Auto-save when hotel/vehicle/activity prices change
  // Skip on initial mount so API-loaded quotes are preserved
  const isInitialized = useRef(false);
  const prevQuotesRef = useRef<Quote[]>([]);
  // Track if quotes were updated externally (by pricing dialog) vs internally (by recalculate)
  const skipRecalcRef = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }
    // Only recalculate if quotes haven't been updated externally (e.g. from pricing dialog)
    // This prevents overwriting manual customTotal overrides
    if (quotes === prevQuotesRef.current && !skipRecalcRef.current) {
      recalculateQuotes();
    }
    // Reset the skip flag after processing
    skipRecalcRef.current = false;
  }, [days, tripTravelers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track when quotes are updated externally
  useEffect(() => {
    // Update prevQuotesRef when quotes change
    if (quotes !== prevQuotesRef.current) {
      prevQuotesRef.current = quotes;
      // Mark that quotes were externally updated - next days change should NOT trigger recalc
      skipRecalcRef.current = true;
    }
  }, [quotes]);
  // NOTE: recalculateQuotes is stable — it reads current options state via closure.
  // Options (margin/GST/discount) are already captured when recalculateQuotes is called.
  // The sync happens inside recalculateQuotes.

  // Auto-sync options when quotes are updated externally (e.g. from StickyActionBar pricing dialog)
  // This ensures package option prices stay in sync with quote pricing changes
  useEffect(() => {
    // Detect when quotes were updated (not initial mount, not same object)
    if (quotes !== prevQuotesRef.current && options.length > 0 && isInitialized.current) {
      // Check if options have their own per-day data
      const anyOptionHasOwnData = options.some(
        opt =>
          (opt.hotels && opt.hotels.length > 0) ||
          (opt.vehicles && opt.vehicles.length > 0) ||
          (opt.activities && opt.activities.length > 0)
      );

      // Only sync from quotes if options DON'T have their own data
      // If options have own data, their totalCost is already correct
      if (anyOptionHasOwnData) {
        prevQuotesRef.current = quotes;
        return;
      }

      // Sync options from the new quote values (quotes drive options)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- re-syncs option totals after quotes change
      setOptions(prev =>
        prev.map((opt, i) => {
          const q = quotes[i];
          if (!q) return opt;

          const addCharges = Array.isArray(q.additionalCharges)
            ? q.additionalCharges
            : typeof q.additionalCharges === 'string'
              ? JSON.parse(q.additionalCharges || '[]')
              : typeof q.additionalCharges === 'number'
                ? [{ amount: q.additionalCharges }]
                : [];
          const addChgTotal = addCharges.reduce(
            (s: number, c: { amount: number }) => s + (c.amount || 0),
            0
          );
          const subtotal = q.totalCost + addChgTotal;
          const marginAmt = subtotal * ((q.marginPercent || 0) / 100);
          const afterMargin = subtotal + marginAmt;
          const gstAmt = afterMargin * ((q.gstPercent || 0) / 100);
          const afterGst = afterMargin + gstAmt;
          const discountAmt = afterGst * ((q.discountPercent || 0) / 100);
          const finalTotal = afterGst - discountAmt;
          return {
            ...opt,
            totalCost: finalTotal,
            marginPercent: q.marginPercent || opt.marginPercent,
            gstPercent: q.gstPercent || opt.gstPercent,
            discountPercent: q.discountPercent || opt.discountPercent,
            additionalCharges: addCharges,
          };
        })
      );
    }
    prevQuotesRef.current = quotes;
  }, [quotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // markChanged — updates UI status (manual save only)
  const markChanged = useCallback(() => {
    setSaveStatus('unsaved');
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      // NOTE: Don't call recalculateQuotes() here - it would overwrite manual customTotal overrides
      // Quotes should already have the correct pricing from the pricing dialog

      // Use displayDays when options exist (they contain merged hotel/vehicle data from options)
      // Otherwise fall back to base days state
      const daysToSave = options.length > 0 ? displayDays : days;

      // Build quotes with embedded days for multi-quote mode
      const quotesToSave =
        quotes.length > 0
          ? quotes.map((q, i) => {
              const embeddedDays =
                q.days && q.days.length > 0
                  ? q.days
                  : i === (selectedQuotes[0] ?? 0)
                    ? daysToSave
                    : undefined;
              return {
                ...q,
                ...(embeddedDays ? { days: embeddedDays } : {}),
              };
            })
          : undefined;

      const payload = {
        daysJson: daysToSave,
        title: tripTitle,
        destination: tripDestination,
        tripType,
        startDate: tripStartDate ? new Date(tripStartDate).toISOString() : undefined,
        endDate: tripEndDate ? new Date(tripEndDate).toISOString() : undefined,
        totalTravelers: tripTravelers,
        totalCost: _tripTotalCost,
        included: tripIncluded,
        excluded: tripExcluded,
        notes: tripNotes || undefined,
        terms: tripTerms || undefined,
        flights: cleanFlightsForSave(flights),
        quotes: quotesToSave,
        selectedQuote: quotes.length > 0 ? selectedQuotes : undefined,
        options: options.length > 0 ? options : undefined,
        selectedOption: options.length > 0 ? selectedOptions[0] : undefined,
        salutation,
      };
      await updateItinerary.mutateAsync({ id: itineraryId, data: payload });
      setSaveStatus('saved');
      setHasChanges(false);
      toast.success('Itinerary saved!');
    } catch {
      setSaveStatus('unsaved');
      toast.error('Failed to save');
    }
  }, [
    days,
    displayDays,
    tripTitle,
    tripDestination,
    tripType,
    tripStartDate,
    tripEndDate,
    tripTravelers,
    tripIncluded,
    tripExcluded,
    tripNotes,
    tripTerms,
    flights,
    quotes,
    selectedQuotes,
    options,
    selectedOptions,
    salutation,
    itineraryId,
    updateItinerary,
    recalculateQuotes,
  ]);

  /** Applied from the flights dialog; the page's Save is what persists them. */
  const handleFlightsChange = useCallback(
    (next: FlightSegment[]) => {
      setFlights(next);
      markChanged();
    },
    [markChanged]
  );

  /** Applied from the cover dialog; the page's Save is what persists it. */
  const handleSalutationChange = useCallback(
    (next: string) => {
      setSalutation(next);
      markChanged();
    },
    [markChanged]
  );

  // Day operations
  const handleAddDay = useCallback(() => {
    const newDay: ItineraryDay = {
      id: generateId(),
      dayNumber: days.length + 1,
      date: '',
      title: '',
      description: '',
      activities: [],
      meals: { breakfast: false, lunch: false, dinner: false },
    };
    const updatedDays = [...days, newDay];
    setDays(updatedDays);
    setExpandedDays({ ...expandedDays, [days.length]: true });

    // Sync to quotes in single-quote mode (displayDays prioritizes quotes over days state)
    if (quotes.length > 0 && options.length === 0) {
      const quoteIdx = selectedQuotes[0] ?? 0;
      setQuotes(prev => prev.map((q, i) => (i === quoteIdx ? { ...q, days: updatedDays } : q)));
    }

    markChanged();
  }, [days, expandedDays, quotes, selectedQuotes, options, markChanged]);

  const handleRemoveDay = useCallback(
    (index: number) => {
      const newDays = [...days];
      newDays.splice(index, 1);
      const updatedDays = newDays.map((d, i) => ({ ...d, dayNumber: i + 1 }));
      setDays(updatedDays);
      setExpandedDays(prev => {
        const next = { ...prev };
        delete next[index];
        // Re-index to stay in sync with new day indices
        const newExpanded: Record<number, boolean> = {};
        Object.entries(next).forEach(([k, v]) => {
          const oldIdx = parseInt(k);
          if (oldIdx > index) {
            newExpanded[oldIdx - 1] = v;
          } else {
            newExpanded[oldIdx] = v;
          }
        });
        return newExpanded;
      });

      // Sync to quotes in single-quote mode
      if (quotes.length > 0 && options.length === 0) {
        const quoteIdx = selectedQuotes[0] ?? 0;
        setQuotes(prev => prev.map((q, i) => (i === quoteIdx ? { ...q, days: updatedDays } : q)));
      }

      markChanged();
    },
    [days, quotes, selectedQuotes, options, markChanged]
  );

  // Sync day changes to the selected quote's or option's embedded days
  const syncDayToQuote = useCallback(
    (dayIndex: number, updates: Partial<ItineraryDay>) => {
      // Always update the main days state for basic day properties
      const basicProps: Partial<ItineraryDay> = {};
      if (updates.title !== undefined) basicProps.title = updates.title;
      if (updates.description !== undefined) basicProps.description = updates.description;
      if (updates.dayType !== undefined) basicProps.dayType = updates.dayType;
      if (updates.date !== undefined) basicProps.date = updates.date;
      if (updates.notes !== undefined) basicProps.notes = updates.notes;
      if (updates.weather !== undefined) basicProps.weather = updates.weather;
      if (updates.meals !== undefined) basicProps.meals = updates.meals;
      if (updates.destination !== undefined) basicProps.destination = updates.destination;
      if (updates.destinationId !== undefined) basicProps.destinationId = updates.destinationId;
      if (updates.destinationAddress !== undefined)
        basicProps.destinationAddress = updates.destinationAddress;
      if (updates.destinationHighlights !== undefined)
        basicProps.destinationHighlights = updates.destinationHighlights;
      if (updates.activitiesLocation !== undefined)
        basicProps.activitiesLocation = updates.activitiesLocation;
      if (updates.images !== undefined) basicProps.images = updates.images;
      if (updates.leisureGuidelines !== undefined)
        basicProps.leisureGuidelines = updates.leisureGuidelines;
      if (Object.keys(basicProps).length > 0) {
        console.log('[syncDayToQuote] basicProps:', JSON.stringify(basicProps));
        setDays(prev => prev.map((d, i) => (i === dayIndex ? { ...d, ...basicProps } : d)));
        markChanged();
      }

      if (options.length > 0) {
        // OPTIONS MODE: update the selected option's hotel/vehicle/activities at the day index
        const optIdx = selectedOptions[0] ?? 0;
        const selectedOption = options[optIdx];
        if (!selectedOption) return;

        const dayNum = dayIndex + 1;

        // Update hotel for this day — trigger when ANY hotel-related field is present
        const hotelFields = [
          'hotelId',
          'hotel',
          'hotelAddress',
          'hotelContact',
          'hotelImage',
          'hotelStars',
          'numberOfRooms',
          'extraBeds',
          'childrenNoBed',
          'selectedRoomType',
          'selectedMealPlan',
        ];
        const hasHotelUpdate = hotelFields.some(f => (updates as any)[f] !== undefined);
        if (hasHotelUpdate) {
          const hotelIdx = selectedOption.hotels.findIndex(h => h.dayNumber === dayNum);
          const newHotel: OptionHotel = {
            hotelId: updates.hotelId || selectedOption.hotels[hotelIdx]?.hotelId || '',
            hotelName: updates.hotel || selectedOption.hotels[hotelIdx]?.hotelName || '',
            hotelAddress: updates.hotelAddress ?? selectedOption.hotels[hotelIdx]?.hotelAddress,
            hotelContact: updates.hotelContact ?? selectedOption.hotels[hotelIdx]?.hotelContact,
            hotelImage: updates.hotelImage ?? selectedOption.hotels[hotelIdx]?.hotelImage,
            hotelStars: updates.hotelStars ?? selectedOption.hotels[hotelIdx]?.hotelStars,
            numberOfRooms:
              updates.numberOfRooms ?? selectedOption.hotels[hotelIdx]?.numberOfRooms ?? 1,
            extraBeds: updates.extraBeds ?? selectedOption.hotels[hotelIdx]?.extraBeds,
            childWithoutBed:
              updates.childrenNoBed ?? selectedOption.hotels[hotelIdx]?.childWithoutBed,
            roomType: updates.selectedRoomType?.name ?? selectedOption.hotels[hotelIdx]?.roomType,
            bedType: updates.selectedRoomType?.bedType ?? selectedOption.hotels[hotelIdx]?.bedType,
            pricePerNight:
              updates.selectedRoomType?.basePrice ?? selectedOption.hotels[hotelIdx]?.pricePerNight,
            extraBedPrice:
              (updates.selectedRoomType as any)?.extraBedPrice ??
              selectedOption.hotels[hotelIdx]?.extraBedPrice,
            childPrice:
              (updates.selectedRoomType as any)?.childPrice ??
              selectedOption.hotels[hotelIdx]?.childPrice,
          };

          setOptions(prev =>
            prev.map((opt, i) => {
              if (i !== optIdx) return opt;
              const hotels = [...opt.hotels];
              if (hotelIdx >= 0) {
                hotels[hotelIdx] = { ...hotels[hotelIdx], ...newHotel };
              } else {
                // Add new hotel for this day
                hotels.push({ ...newHotel, dayNumber: dayNum });
              }
              return { ...opt, hotels };
            })
          );
        }

        // Update vehicle for this day — trigger when ANY vehicle-related field is present
        const vehicleFields = [
          'vehicleId',
          'vehicleName',
          'vehicleType',
          'vehicleImage',
          'vehicleRatePerDay',
          'vehicleRegistration',
          'vehicleDriver',
          'vehicleDriverPhone',
          'vehicleFeatures',
          'transport',
          'selectedVehicle',
          'numberOfVehicles',
        ];
        const hasVehicleUpdate = vehicleFields.some(f => (updates as any)[f] !== undefined);
        if (hasVehicleUpdate) {
          const vehicleIdx = selectedOption.vehicles.findIndex(v => v.dayNumber === dayNum);
          const newVehicle: OptionVehicle = {
            vehicleId: updates.vehicleId || selectedOption.vehicles[vehicleIdx]?.vehicleId || '',
            vehicleName:
              updates.vehicleName || selectedOption.vehicles[vehicleIdx]?.vehicleName || '',
            vehicleType: updates.vehicleType ?? selectedOption.vehicles[vehicleIdx]?.vehicleType,
            vehicleImage: updates.vehicleImage ?? selectedOption.vehicles[vehicleIdx]?.vehicleImage,
            numberOfVehicles:
              updates.numberOfVehicles ??
              selectedOption.vehicles[vehicleIdx]?.numberOfVehicles ??
              1,
            ratePerDay:
              updates.vehicleRatePerDay ?? selectedOption.vehicles[vehicleIdx]?.ratePerDay,
            driverName:
              updates.selectedVehicle?.driverName ??
              selectedOption.vehicles[vehicleIdx]?.driverName,
            driverPhone:
              updates.selectedVehicle?.driverPhone ??
              selectedOption.vehicles[vehicleIdx]?.driverPhone,
          };

          setOptions(prev =>
            prev.map((opt, i) => {
              if (i !== optIdx) return opt;
              const vehicles = [...opt.vehicles];
              if (vehicleIdx >= 0) {
                vehicles[vehicleIdx] = { ...vehicles[vehicleIdx], ...newVehicle };
              } else {
                vehicles.push({ ...newVehicle, dayNumber: dayNum });
              }
              return { ...opt, vehicles };
            })
          );
        }

        // Update activities for this day
        if (updates.activities !== undefined) {
          setOptions(prev =>
            prev.map((opt, i) => {
              if (i !== optIdx) return opt;
              const otherActivities = opt.activities.filter(a => a.dayNumber !== dayNum);
              const newActivities: OptionActivity[] = updates.activities!.map(a => ({
                dayNumber: dayNum,
                title: a.title,
                description: a.description,
                location: a.location,
                time: a.time,
                cost: a.cost,
              }));
              return { ...opt, activities: [...otherActivities, ...newActivities] };
            })
          );
        }

        // Update images for this day
        if (updates.images !== undefined) {
          setOptions(prev =>
            prev.map((opt, i) => {
              if (optIdx !== undefined && i !== optIdx) return opt;
              // Find or create day images entry
              const images = opt.images || [];
              const dayImagesIdx = images.findIndex(img => img.dayNumber === dayNum);
              const newDayImages = { dayNumber: dayNum, images: updates.images! };

              if (dayImagesIdx >= 0) {
                const updated = [...images];
                updated[dayImagesIdx] = newDayImages;
                return { ...opt, images: updated };
              } else {
                return { ...opt, images: [...images, newDayImages] };
              }
            })
          );
          // Also update main days state so UI reflects the change
          setDays(prev =>
            prev.map((d, i) => (i === dayIndex ? { ...d, images: updates.images! } : d))
          );
        }

        return;
      }

      // QUOTES MODE: update quote's embedded days
      const quoteIdx = selectedQuotes[0] ?? 0;
      const currentQuote = quotes[quoteIdx];
      if (!currentQuote?.days) {
        // No embedded days - main days already updated above
        return;
      }

      const updatedDays = currentQuote.days.map((d, i) =>
        i === dayIndex ? { ...d, ...updates } : d
      );
      setQuotes(prev => prev.map((q, i) => (i === quoteIdx ? { ...q, days: updatedDays } : q)));
    },
    [options, selectedOptions, quotes, selectedQuotes, setOptions, setQuotes, setDays, markChanged]
  );

  const handleUpdateDay = useCallback(
    (index: number, updates: Partial<ItineraryDay>) => {
      // Always sync to main days state first (handles notes, description, title, etc.)
      syncDayToQuote(index, updates);

      // OPTIONS MODE: additional sync to option's hotel/vehicle/activity data is done in syncDayToQuote
      if (options.length > 0) {
        return;
      }

      // QUOTES MODE: sync to quote's embedded days if they exist
      const quoteIdx = selectedQuotes[0] ?? 0;
      const currentQuote = quotes[quoteIdx];

      if (currentQuote?.days && currentQuote.days.length > 0) {
        const updatedDays = currentQuote.days.map((d, i) =>
          i === index ? { ...d, ...updates } : d
        );
        setQuotes(quotes.map((q, i) => (i === quoteIdx ? { ...q, days: updatedDays } : q)));
      }
    },
    [options, quotes, selectedQuotes, syncDayToQuote, setQuotes]
  );

  const handleUpdateMeals = useCallback(
    (dayIndex: number, meals: DayMeals) => {
      // OPTIONS MODE: update meals in main days state
      if (options.length > 0) {
        setDays(prev => prev.map((d, i) => (i === dayIndex ? { ...d, meals } : d)));
        markChanged();
        return;
      }

      // QUOTES MODE
      const quoteIdx = selectedQuotes[0] ?? 0;
      const currentQuote = quotes[quoteIdx];

      if (currentQuote?.days && currentQuote.days.length > 0) {
        // Multi-quote mode - update quote's days
        const updatedDays = currentQuote.days.map((d, i) => (i === dayIndex ? { ...d, meals } : d));
        setQuotes(quotes.map((q, i) => (i === quoteIdx ? { ...q, days: updatedDays } : q)));
      } else {
        // Single mode - update main days
        setDays(days.map((d, i) => (i === dayIndex ? { ...d, meals } : d)));
      }
      markChanged();
    },
    [options, days, quotes, selectedQuotes, markChanged]
  );

  // Activity operations
  const handleOpenAddActivity = useCallback((dayIndex: number) => {
    setEditingDayIndex(dayIndex);
    setEditingActivityIndex(null);
    setActivityForm({
      time: '',
      title: '',
      description: '',
      location: '',
      category: 'ACTIVITY',
      cost: undefined,
      bookingRef: '',
      contactNumber: '',
      duration: '',
    });
    setShowActivityDialog(true);
  }, []);

  const handleQuickAddActivity = useCallback(
    (dayIndex: number, quickTitle: string, category: ActivityCategory) => {
      const newActivity: DayActivity = {
        id: generateId(),
        time: '',
        title: quickTitle,
        description: '',
        location: '',
        category,
        cost: undefined,
        bookingRef: '',
        contactNumber: '',
        duration: '',
      };

      // OPTIONS MODE
      if (options.length > 0) {
        const optIdx = selectedOptions[0] ?? 0;
        const dayNum = dayIndex + 1;
        setOptions(prev =>
          prev.map((opt, i) => {
            if (i !== optIdx) return opt;
            const newOptActivity: OptionActivity = {
              dayNumber: dayNum,
              title: quickTitle,
              description: quickTitle,
            };
            return { ...opt, activities: [...opt.activities, newOptActivity] };
          })
        );
        markChanged();
        toast.success(`${quickTitle} added!`);
        return;
      }

      // QUOTES MODE
      const quoteIdx = selectedQuotes[0] ?? 0;
      const currentQuote = quotes[quoteIdx];

      if (currentQuote?.days && currentQuote.days.length > 0) {
        const updatedDays = currentQuote.days.map((d, i) =>
          i === dayIndex ? { ...d, activities: [...d.activities, newActivity] } : d
        );
        setQuotes(quotes.map((q, i) => (i === quoteIdx ? { ...q, days: updatedDays } : q)));
      } else {
        setDays(
          days.map((d, i) =>
            i === dayIndex ? { ...d, activities: [...d.activities, newActivity] } : d
          )
        );
      }
      markChanged();
      toast.success(`${quickTitle} added!`);
    },
    [options, days, quotes, selectedQuotes, markChanged]
  );

  const handleOpenEditActivity = useCallback(
    (dayIndex: number, actIndex: number) => {
      // OPTIONS MODE: get activity from selected option
      if (options.length > 0) {
        const optIdx = selectedOptions[0] ?? 0;
        const dayNum = dayIndex + 1;
        const dayActivities = options[optIdx]?.activities.filter(a => a.dayNumber === dayNum) || [];
        const activity = dayActivities[actIndex];
        if (activity) {
          setEditingDayIndex(dayIndex);
          setEditingActivityIndex(actIndex);
          setActivityForm({
            title: activity.title,
            description: activity.description,
            location: activity.location,
            time: activity.time,
            cost: activity.cost,
            category: 'ACTIVITY',
          });
          setShowActivityDialog(true);
        }
        return;
      }

      // QUOTES MODE
      const quoteIdx = selectedQuotes[0] ?? 0;
      const currentQuote = quotes[quoteIdx];
      const sourceDays =
        currentQuote?.days && currentQuote.days.length > 0 ? currentQuote.days : days;
      const activity = sourceDays[dayIndex]?.activities[actIndex];
      setEditingDayIndex(dayIndex);
      setEditingActivityIndex(actIndex);
      setActivityForm({ ...activity });
      setShowActivityDialog(true);
    },
    [options, days, quotes, selectedQuotes]
  );

  const handleSaveActivity = useCallback(() => {
    if (editingDayIndex === null || !activityForm.title?.trim()) {
      if (!activityForm.title?.trim()) toast.error('Title is required');
      return;
    }
    const newActivity: DayActivity = {
      id: activityForm.id || generateId(),
      time: activityForm.time || '',
      title: activityForm.title,
      description: activityForm.description || '',
      location: activityForm.location || '',
      category: activityForm.category || 'ACTIVITY',
      cost: activityForm.cost,
      bookingRef: activityForm.bookingRef || '',
      contactNumber: activityForm.contactNumber || '',
      duration: activityForm.duration || '',
    };

    // OPTIONS MODE
    if (options.length > 0) {
      const optIdx = selectedOptions[0] ?? 0;
      const dayNum = editingDayIndex + 1;

      setOptions(prev =>
        prev.map((opt, i) => {
          if (i !== optIdx) return opt;

          // Get existing activities for this day (excluding the one being edited)
          const otherActivities = opt.activities.filter(
            a => a.dayNumber !== dayNum || !activityForm.id || a.title !== activityForm.title
          );

          // Add the updated activity
          const updatedActivity: OptionActivity = {
            dayNumber: dayNum,
            title: activityForm.title ?? '',
            description: activityForm.description,
            location: activityForm.location,
            time: activityForm.time,
            cost: activityForm.cost,
          };

          return { ...opt, activities: [...otherActivities, updatedActivity] };
        })
      );

      setShowActivityDialog(false);
      markChanged();
      return;
    }

    // QUOTES MODE
    const quoteIdx = selectedQuotes[0] ?? 0;
    const currentQuote = quotes[quoteIdx];

    if (currentQuote?.days && currentQuote.days.length > 0) {
      const updatedDays = currentQuote.days.map((d, i) =>
        i === editingDayIndex ? { ...d, activities: [...d.activities, newActivity] } : d
      );
      setQuotes(quotes.map((q, i) => (i === quoteIdx ? { ...q, days: updatedDays } : q)));
    } else {
      setDays(
        days.map((d, i) =>
          i === editingDayIndex ? { ...d, activities: [...d.activities, newActivity] } : d
        )
      );
    }
    setShowActivityDialog(false);
    markChanged();
  }, [activityForm, options, days, quotes, selectedQuotes, editingDayIndex, markChanged]);

  const handleDeleteActivity = useCallback(
    (dayIndex: number, actIndex: number) => {
      // OPTIONS MODE
      if (options.length > 0) {
        const optIdx = selectedOptions[0] ?? 0;
        const dayNum = dayIndex + 1;
        setOptions(prev =>
          prev.map((opt, i) => {
            if (i !== optIdx) return opt;
            // Remove activity at actIndex for this day (filtered by dayNumber)
            const dayActivities = opt.activities.filter(a => a.dayNumber === dayNum);
            const otherActivities = opt.activities.filter(a => a.dayNumber !== dayNum);
            const filteredDayActivities = dayActivities.filter((_, idx) => idx !== actIndex);
            return { ...opt, activities: [...otherActivities, ...filteredDayActivities] };
          })
        );
        markChanged();
        return;
      }

      // QUOTES MODE
      const quoteIdx = selectedQuotes[0] ?? 0;
      const currentQuote = quotes[quoteIdx];

      if (currentQuote?.days && currentQuote.days.length > 0) {
        const updatedDays = currentQuote.days.map((d, i) =>
          i === dayIndex
            ? { ...d, activities: d.activities.filter((_, idx) => idx !== actIndex) }
            : d
        );
        setQuotes(quotes.map((q, i) => (i === quoteIdx ? { ...q, days: updatedDays } : q)));
      } else {
        setDays(
          days.map((d, i) =>
            i !== dayIndex
              ? d
              : { ...d, activities: d.activities.filter((_, idx) => idx !== actIndex) }
          )
        );
      }
      markChanged();
    },
    [options, days, quotes, selectedQuotes, markChanged]
  );

  // Sharing
  const handleShare = useCallback(async () => {
    try {
      await shareItinerary.mutateAsync({
        id: itineraryId,
        via: 'whatsapp',
        recipientPhone: recipientPhone || undefined,
      });
      toast.success('Shared via WhatsApp!');
      setShowShareDialog(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed to share');
    }
  }, [itineraryId, recipientPhone, shareItinerary]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/itineraries/${itineraryId}/view`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  }, [itineraryId]);

  // Marks the itinerary as no longer a draft once it's actually been sent to
  // the client. Fire-and-forget on purpose — a failure here shouldn't turn a
  // successful WhatsApp send into an error toast, it just leaves the Draft
  // badge stale until the next send.
  const markShared = useCallback(
    (via: string) => {
      if (itinerary?.sharedVia) return;
      updateItinerary.mutateAsync({ id: itineraryId, data: { sharedVia: via } }).catch(err => {
        console.error('[markShared] Failed to record sharedVia:', err);
      });
    },
    [itinerary?.sharedVia, itineraryId, updateItinerary]
  );

  const handleSendDocument = useCallback(
    async (base64Data: string, fileName: string) => {
      const phone = recipientPhone || itinerary?.lead?.phone;
      if (!phone) {
        toast.error('Phone number is required');
        return;
      }
      try {
        await sendDocumentMessage.mutateAsync({
          phoneNumber: phone,
          base64Data,
          fileName,
          caption: `Itinerary: ${itinerary?.title || 'Travel Itinerary'}`,
        });
        toast.success('PDF sent via WhatsApp!');
        setShowShareDialog(false);
        markShared('whatsapp');
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        toast.error(e?.response?.data?.error || 'Failed to send document');
      }
    },
    [recipientPhone, itinerary, sendDocumentMessage, markShared]
  );

  /** Sends the share dialog's generated message as a plain WhatsApp text. */
  const handleSendText = useCallback(
    async (phone: string, message: string) => {
      try {
        await sendTextMessage.mutateAsync({ phoneNumber: phone, message });
        toast.success('Message sent on WhatsApp');
        setShowShareDialog(false);
        markShared('whatsapp');
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        toast.error(e?.response?.data?.error || 'Failed to send the message');
      }
    },
    [sendTextMessage, markShared]
  );

  const handleSaveAsTemplate = useCallback(async () => {
    try {
      await handleSave();
      await saveAsTemplate.mutateAsync({
        id: itineraryId,
        name: templateName || `${itinerary?.destination || ''} - ${itinerary?.title || ''}`,
      });
      toast.success('Saved as template with all your data!');
      setShowTemplateDialog(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed to save as template');
    }
  }, [itineraryId, templateName, itinerary, handleSave, saveAsTemplate]);

  // Derive currency from itinerary data or branch
  const currency = (itinerary as any)?.currency || (itinerary?.branch as any)?.currency || 'INR';

  // PDF — generate client-side using React PDF (no backend, no storage)
  const handleGeneratePdf = useCallback(async () => {
    if (!itinerary) return;
    pdfProgress.start();
    try {
      await handleSave();
      pdfProgress.saved();

      // Build a fresh itinerary object with the latest trip dates from state
      // to avoid the stale itinerary object from TanStack Query cache
      const freshItinerary: Itinerary = {
        ...itinerary,
        title: tripTitle,
        destination: tripDestination,
        startDate: tripStartDate ? new Date(tripStartDate).toISOString() : itinerary.startDate,
        endDate: tripEndDate ? new Date(tripEndDate).toISOString() : itinerary.endDate,
        totalTravelers: tripTravelers,
        notes: tripNotes,
        terms: tripTerms,
      };

      const { downloadClientPDF, hasMultipleOptions } =
        await import('@/components/itineraries/itinerary-pdf');

      const shouldUseMultiOption = hasMultipleOptions(itinerary) || (options && options.length > 1);

      const selectedQuote = selectedQuotes[0] !== undefined ? quotes[selectedQuotes[0]] : quotes[0];

      if (shouldUseMultiOption && options && options.length > 0) {
        await downloadClientPDF(
          freshItinerary,
          displayDays,
          undefined,
          itinerary.branch?.name,
          itinerary.branch?.email,
          (itinerary.branch as any)?.instagram,
          `${itinerary.title || 'itinerary'}.pdf`,
          options,
          selectedOptions[0],
          'normal',
          currency,
          pdfProgress.report
        );
      } else {
        await downloadClientPDF(
          freshItinerary,
          displayDays,
          selectedQuote,
          itinerary.branch?.name,
          itinerary.branch?.email,
          (itinerary.branch as any)?.instagram,
          `${itinerary.title || 'itinerary'}.pdf`,
          undefined,
          undefined,
          'normal',
          currency,
          pdfProgress.report
        );
      }
      pdfProgress.finish();
      toast.success('PDF downloaded!');
    } catch {
      pdfProgress.fail();
      toast.error('Failed to generate PDF');
    }
  }, [
    itinerary,
    displayDays,
    quotes,
    selectedQuotes,
    options,
    selectedOptions,
    handleSave,
    currency,
    tripTitle,
    tripDestination,
    tripStartDate,
    tripEndDate,
    tripTravelers,
    tripNotes,
    tripTerms,
    pdfProgress,
  ]);

  // Generate PDF for a specific quote index — REMOVED (no longer needed)

  // Delete
  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this itinerary? This action cannot be undone.'))
      return;
    try {
      await deleteItinerary.mutateAsync(itineraryId);
      toast.success('Itinerary deleted');
      router.push('/itineraries');
    } catch {
      toast.error('Failed to delete itinerary');
    }
  }, [itineraryId, deleteItinerary, router]);

  // Auto-calculate dates
  useEffect(() => {
    if (tripStartDate && days.length > 0) {
      const start = new Date(tripStartDate);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- re-dates days when the start date changes
      setDays(prev =>
        prev.map((day, i) => ({ ...day, date: dateFormat(addDays(start, i), 'yyyy-MM-dd') }))
      );
      markChanged();
    }
  }, [tripStartDate]);

  useEffect(() => {
    if (tripStartDate && days.length > 0) {
      const start = new Date(tripStartDate);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps the end date in step with start date and day count
      setTripEndDate(dateFormat(addDays(start, days.length - 1), 'yyyy-MM-dd'));
    }
  }, [days.length, tripStartDate]);

  const formatDate = (dateStr: string) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : '';

  return {
    // Data
    itinerary,
    isLoading,
    // Days state
    days,
    displayDays, // days with selected quote's alternatives applied
    setDays,
    expandedDays,
    setExpandedDays,
    // Save state
    saveStatus,
    hasChanges,
    // Trip meta
    tripTitle,
    setTripTitle,
    tripDestination,
    setTripDestination,
    tripId,
    setTripId,
    tripType,
    setTripType,
    tripStartDate,
    setTripStartDate,
    tripEndDate,
    setTripEndDate,
    tripTravelers,
    setTripTravelers,
    salutation,
    handleSalutationChange,
    // tripTotalCost is derived: use quotes[selectedQuotes[0]]?.totalCost or options[selectedOptions[0]]?.totalCost
    // DO NOT use tripTotalCost setter — price changes must go through quotes/options state
    tripIncluded,
    setTripIncluded,
    tripExcluded,
    setTripExcluded,
    tripNotes,
    setTripNotes,
    tripTerms,
    setTripTerms,
    // Flights
    flights,
    setFlights,
    handleFlightsChange,
    customInclusion,
    setCustomInclusion,
    customExclusion,
    setCustomExclusion,
    // Quotes (SINGLE SOURCE OF TRUTH for pricing)
    quotes,
    setQuotes,
    selectedQuotes,
    setSelectedQuotes,
    // Options
    options,
    setOptions,
    selectedOptions,
    setSelectedOptions,
    // Dialogs
    showActivityDialog,
    setShowActivityDialog,
    showShareDialog,
    setShowShareDialog,
    showEditTripDialog,
    setShowEditTripDialog,
    showTemplateDialog,
    setShowTemplateDialog,
    templateName,
    setTemplateName,
    editingDayIndex,
    setEditingDayIndex,
    editingActivityIndex,
    setEditingActivityIndex,
    // Activity form
    activityForm,
    setActivityForm,
    // Share
    recipientPhone,
    setRecipientPhone,
    sendDocumentMessage,
    // Mutations
    updateItinerary,
    shareItinerary,
    saveAsTemplate,
    deleteItinerary,
    // Actions
    handleSave,
    markChanged,
    handleAddDay,
    handleRemoveDay,
    handleUpdateDay,
    handleUpdateMeals,
    handleOpenAddActivity,
    handleQuickAddActivity,
    handleOpenEditActivity,
    handleSaveActivity,
    handleDeleteActivity,
    handleShare,
    handleCopyLink,
    handleSendDocument,
    handleSendText,
    sendTextMessage,
    handleSaveAsTemplate,
    /** Resolved from the itinerary, else its branch, else INR. */
    currency,
    pdfProgress: pdfProgress.state,
    handleGeneratePdf,
    handleDelete,
    formatDate,
  };
}
