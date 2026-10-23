'use client';

import { useState, useCallback, useMemo, Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { ChevronLeft, Loader2, Pencil, RotateCcw, CloudUpload, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Step1DetailsForm } from '../new/components/Step1DetailsForm';
import { Step2ModeSelection } from '../new/components/Step2ModeSelection';
import { SingleOptionBuilder } from '../new/components/SingleOptionBuilder';
import { MultiOptionBuilder } from '../new/components/MultiOptionBuilder';
import { TransportPlanner } from '../new/components/TransportPlanner';
import { MultiTransportPlanner } from '../new/components/MultiTransportPlanner';
import { PricingSummaryForm } from '../new/components/PricingSummaryForm';
import { Step5DayDetailsReview } from '../new/components/Step5DayDetailsReview';
import { Step6Terms } from '../new/components/Step6Terms';
import { WizardProgress } from '../new/components/WizardProgress';
import { FlightDetailsSection } from '../new/components/FlightDetailsSection';
import { useItinerary, useUpdateItinerary } from '@/hooks/useItineraries';
import { useWizardDraft } from '@/hooks/use-wizard-draft';
import type { Step1FormData, DayBuilderData, OptionBuilder, PricingData } from '../new/types';
import type {
  FlightSegment,
  HotelAlternative,
  ItineraryDay,
  ItineraryOption,
  TripType,
  MealPlan,
} from '@/types';
import { cleanFlightsForSave } from '@/lib/flights';
import { perPersonSplitError, splitForTravellers } from '@/lib/per-person-split';
import {
  createEmptyDay,
  createOptionBuilder,
  createOptionBuilderWithClearedDays,
  calculateDays,
  calculateOptionPricing,
  calculateCostBreakdown,
  hotelNightCost,
  vehicleDayCost,
  resolveOptionPricing,
  singlePricingOverrides,
  sumAdditionalCharges,
  deriveItineraryTitle,
  resizeChildrenAges,
} from '../new/types';
import type { Itinerary } from '@/types';

// 3: Choose Hotels, 4: Choose Transport, 5: Destinations & Activities (was one
// combined day planner step); 6: Review Hotels, 7: Review Transport (was one
// combined day details review step); 8: Flights, 9: Terms, 10: Pricing — kept
// in lockstep with the create wizard's step split (see ../new/page.tsx).
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// NOTE: A previous version of this file stripped DB-derived prices from each
// day for non-main branch users. That was wrong: the per-day `basePrice` /
// `ratePerDay` / `extraBedPrice` / `childPrice` / `mealPlanPrice` fields are
// the user's own entered quote, not a DB catalogue price. The catalogue
// price is hidden at the SELECTION layer (hotel/vehicle autocomplete) for
// non-main users, and is never written into the day fields. Zeroing these
// fields on edit destroyed the user's saved manualHotelCost /
// manualVehicleCost / finalPrice, so any small edit wiped the persisted
// prices back to 0. We therefore load the days as-is for both branches.

/** Bump when the persisted wizard shape changes; older drafts are discarded. */
const DRAFT_VERSION = 5;

interface WizardSnapshot {
  step: Step;
  mode: 'single' | 'multi' | null;
  step1Data: Step1FormData | null;
  days: DayBuilderData[];
  options: OptionBuilder[];
  pricingData: PricingData;
  included: string[];
  excluded: string[];
  terms: string;
  flights: FlightSegment[];
}

function EditItineraryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const updateItinerary = useUpdateItinerary();

  const itineraryId = searchParams.get('itineraryId') || '';
  const { data: itinerary, isLoading: isLoadingItinerary } = useItinerary(itineraryId);

  const itineraryDaysCount = Array.isArray(itinerary?.daysJson) ? itinerary.daysJson.length : 0;

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<'single' | 'multi' | null>(null);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  const [days, setDays] = useState<DayBuilderData[]>([]);
  const [options, setOptions] = useState<OptionBuilder[]>([]);
  const [pricingData, setPricingData] = useState<PricingData>({
    roomsPerHotel: {},
    extraBeds: {},
    childWithoutBed: {},
    mealPlanPreference: 'MAP',
    discountPercent: 0,
    marginPercent: 0,
    gstPercent: 0,
    roundOff: 0,
    additionalCharges: [],
    customGrandTotal: undefined,
  });
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [terms, setTerms] = useState('');
  // Trip-level flights — outbound, return and any hops between destinations.
  const [flights, setFlights] = useState<FlightSegment[]>([]);
  const [resumedAt, setResumedAt] = useState<number | null>(null);

  // Unsaved edits survive leaving the page. Keyed on the itinerary, so two
  // itineraries open in turn never see each other's work.
  const wizardSnapshot: WizardSnapshot = useMemo(
    () => ({
      step,
      mode,
      step1Data,
      days,
      options,
      pricingData,
      included,
      excluded,
      terms,
      flights,
    }),
    [step, mode, step1Data, days, options, pricingData, included, excluded, terms, flights]
  );

  const draft = useWizardDraft<WizardSnapshot>({
    key: itineraryId ? `edit:${itineraryId}` : null,
    version: DRAFT_VERSION,
    value: wizardSnapshot,
    // Only once the itinerary has been loaded into the wizard — otherwise the
    // empty initial state would be written over a real draft.
    shouldSave: Boolean(itinerary) && Boolean(step1Data),
  });
  const { restored: restoredDraft, clear: clearDraft } = draft;

  // Convert Itinerary to wizard state
  useEffect(() => {
    if (!itinerary) return;

    // A local draft newer than the saved record is unsaved work, so it wins. If
    // the record is newer — someone else saved in the meantime — the draft is
    // stale and gets dropped rather than silently overwriting their change.
    const recovered = restoredDraft;
    if (recovered && recovered.savedAt > new Date(itinerary.updatedAt).getTime()) {
      const saved = recovered.data;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restores a local draft once the record has loaded
      if (saved.step !== undefined) setStep(saved.step);
      if (saved.mode !== undefined) setMode(saved.mode);
      if (saved.step1Data !== undefined) setStep1Data(saved.step1Data);
      if (saved.days !== undefined) setDays(saved.days);
      if (saved.options !== undefined) setOptions(saved.options);
      if (saved.pricingData !== undefined) setPricingData(saved.pricingData);
      if (saved.included !== undefined) setIncluded(saved.included);
      if (saved.excluded !== undefined) setExcluded(saved.excluded);
      if (saved.terms !== undefined) setTerms(saved.terms);
      if (saved.flights !== undefined) setFlights(saved.flights);
      setResumedAt(recovered.savedAt);
      return;
    }
    if (recovered) clearDraft();

    // Parse daysJson
    const rawDays = itinerary.daysJson;
    const itineraryDays: ItineraryDay[] = Array.isArray(rawDays)
      ? rawDays
      : JSON.parse(rawDays as string);

    // Build step1Data from itinerary
    const adults = itinerary.adults ?? Math.floor((itinerary.totalTravelers ?? 2) / 2);
    const children = itinerary.children ?? (itinerary.totalTravelers ?? 2) - adults;
    setStep1Data({
      clientName: itinerary.clientName || itinerary.lead?.name || '',
      tripName: itinerary.title || itinerary.templateName || '',
      leadId: itinerary.leadId || '',
      destination: itinerary.destination || '',
      tripType: (itinerary.tripType as TripType) || '',
      startDate: itinerary.startDate ? format(new Date(itinerary.startDate), 'yyyy-MM-dd') : '',
      endDate: itinerary.endDate ? format(new Date(itinerary.endDate), 'yyyy-MM-dd') : '',
      adults,
      children,
      childrenAges: resizeChildrenAges(itinerary.childrenAges ?? [], children),
      totalTravelers: itinerary.totalTravelers || 2,
      currency: (itinerary as any).currency || step1Data?.currency || itinerary?.currency || 'INR',
    });

    // Parse included/excluded/terms
    if (itinerary.included) {
      setIncluded(
        Array.isArray(itinerary.included)
          ? itinerary.included
          : JSON.parse(itinerary.included as string)
      );
    }
    if (itinerary.excluded) {
      setExcluded(
        Array.isArray(itinerary.excluded)
          ? itinerary.excluded
          : JSON.parse(itinerary.excluded as string)
      );
    }
    if (itinerary.terms) {
      setTerms(itinerary.terms);
    }
    // Itineraries created before the flight section have no `flights` at all.
    setFlights(Array.isArray(itinerary.flights) ? itinerary.flights : []);

    // Determine mode from quotes/options
    const rawOptions = Array.isArray(itinerary.options)
      ? itinerary.options
      : typeof itinerary.options === 'string'
        ? JSON.parse(itinerary.options || '[]')
        : [];
    const hasMultiOptions = rawOptions.length > 1;

    // Parse quotes for pricing data
    const rawQuotes: any[] = Array.isArray(itinerary.quotes)
      ? itinerary.quotes
      : typeof itinerary.quotes === 'string'
        ? JSON.parse(itinerary.quotes || '[]')
        : [];

    // Convert ItineraryDays to DayBuilderData
    // For non-main branch users, strip DB-derived prices (the backend also
    // strips them, but the frontend stays defensive in case an older payload
    // or cached response still contains them). Manual entries are preserved.
    // Shared by the itinerary's own days and each package's saved days below.
    const toBuilderDay = (d: ItineraryDay, i: number): DayBuilderData => {
      const built: DayBuilderData = {
        id: `day-${i}`,
        dayNumber: d.dayNumber || i + 1,
        date: d.date || '',
        dayType: d.dayType || 'activity',
        leisureGuidelines: d.leisureGuidelines || '',
        location: d.title || '',
        description: d.description || '',
        activities: (d.activities || []).map((a: any, idx: number) => ({
          id: `act-${idx}`,
          name: a.title || '',
          description: a.description || '',
          cost: a.cost,
          time: a.time,
        })),
        hotelId: d.hotelId || '',
        hotelName: d.hotel || '',
        hotelAddress: d.hotelAddress || '',
        hotelStars: d.hotelStars,
        hotelContact: d.hotelContact || '',
        hotelImage: d.hotelImage || null,
        roomType: d.selectedRoomType?.name || '',
        bedType: d.selectedRoomType?.bedType || '',
        basePrice: d.selectedRoomType?.basePrice || 0,
        extraBedPrice: d.selectedRoomType?.extraBedPrice || d.extraBedCost || 0,
        mealPlan: d.selectedMealPlan?.type || 'MAP',
        mealPlanLabel: d.selectedMealPlan?.label || 'Breakfast + Dinner',
        mealPlanPrice: d.selectedMealPlan?.pricePerNight || 0,
        roomCount: d.numberOfRooms || 1,
        extraBedCount: d.extraBeds || 0,
        childCount: d.childrenNoBed || 0,
        childPrice: d.selectedRoomType?.childPrice || d.childWithoutBedCost || 0,
        vehicleId: d.vehicleId || '',
        vehicleName: d.vehicleName || '',
        vehicleType: d.vehicleType || '',
        driverIncluded: true,
        driverName: d.selectedVehicle?.driverName || '',
        ratePerDay: d.vehicleRatePerDay || 0,
        pickupPoint: d.pickupPoint || '',
        dropPoint: d.dropPoint || '',
        vehicleCount: d.numberOfVehicles || 1,
        vehicleImage: d.vehicleImage || null,
        destinationId: d.destinationId || '',
        destination: d.destination || '',
        destinationAddress: d.destinationAddress || '',
        destinationHighlights: d.destinationHighlights || [],
        notes: d.notes || '',
        images: d.images || [],
        hotelAlts: (d.alternatives?.hotelOptions || []).map((h: any) => ({
          hotelId: h.hotelId,
          hotelName: h.hotelName,
          hotelAddress: h.hotelAddress,
          roomType: h.selectedRoomType?.name,
          bedType: h.selectedRoomType?.bedType,
          basePrice: h.selectedRoomType?.basePrice,
          extraBedPrice: h.selectedRoomType?.extraBedPrice,
          mealPlan: h.selectedMealPlan?.type,
          mealPlanLabel: h.selectedMealPlan?.label,
          mealPlanPrice: h.selectedMealPlan?.pricePerNight,
        })),
        vehicleAlts: (d.alternatives?.vehicleOptions || []).map((v: any) => ({
          vehicleId: v.vehicleId || '',
          vehicleName: v.vehicleName || '',
          vehicleType: v.vehicleType || '',
          ratePerDay: v.vehicleRatePerDay || 0,
          driverIncluded: v.driverIncluded ?? true,
          vehicleImage: v.vehicleImage || null,
        })),
        _isManualHotelEntry: false,
        _isManualVehicleEntry: false,
      };
      // Per-day price fields are the user's own quote — never strip them.
      // (See the file-level note above for why a previous version of this
      // guard caused the user's manualHotelCost / finalPrice to be wiped
      // to 0 on save.)
      return built;
    };
    const convertedDays: DayBuilderData[] = itineraryDays.map(toBuilderDay);

    if (hasMultiOptions) {
      setMode('multi');
      // Build options from rawOptions (ItineraryOption[])
      const builtOptions: OptionBuilder[] = rawOptions.map((opt: ItineraryOption, idx: number) => {
        // Newer saves keep every package's full days (rates, meal plan, rooms,
        // extra beds, vehicles, by day number) on its quote. Prefer those: the
        // option summary below drops several of those fields and matches
        // hotels by list position, so a day without a hotel shifted the rest.
        const savedDays: ItineraryDay[] | undefined = rawQuotes[idx]?.days;
        const fromSaved =
          Array.isArray(savedDays) && savedDays.length === convertedDays.length
            ? savedDays.map((qd, dayIdx) => {
                const own = convertedDays[dayIdx];
                return {
                  ...toBuilderDay(qd, dayIdx),
                  // Quotes saved before the day type was stored on them.
                  dayType: qd.dayType ?? own.dayType,
                  leisureGuidelines: qd.leisureGuidelines ?? own.leisureGuidelines,
                };
              })
            : null;

        // Build days for this option
        const optDays =
          fromSaved ??
          convertedDays.map((d, dayIdx) => {
            const dayNum = dayIdx + 1;
            const optHotel = opt.hotels?.find(h => h.dayNumber === dayNum) || opt.hotels?.[dayIdx];
            const optVehicle =
              opt.vehicles?.find(v => v.dayNumber === dayNum) || opt.vehicles?.[dayIdx];
            const optActivities = opt.activities?.filter(a => a.dayNumber === dayNum) || [];

            const day: DayBuilderData = { ...d };
            if (optHotel) {
              day.hotelId = optHotel.hotelId;
              day.hotelName = optHotel.hotelName;
              day.hotelAddress = optHotel.hotelAddress;
              day.hotelStars = optHotel.hotelStars;
              day.hotelImage = optHotel.hotelImage || null;
              day.basePrice = optHotel.pricePerNight || 0;
              day.roomType = optHotel.roomType || '';
              day.bedType = optHotel.bedType || '';
              day.extraBedCount = optHotel.extraBeds ?? day.extraBedCount ?? 0;
              day.childCount = optHotel.childWithoutBed ?? day.childCount ?? 0;
              day.extraBedPrice = (day as any).extraBedPrice ?? 0;
              day.childPrice = (day as any).childPrice ?? 0;
            }
            if (optVehicle) {
              day.vehicleId = optVehicle.vehicleId;
              day.vehicleName = optVehicle.vehicleName;
              day.vehicleType = optVehicle.vehicleType || '';
              day.ratePerDay = optVehicle.ratePerDay || 0;
              day.vehicleImage = optVehicle.vehicleImage || null;
            }
            if (optActivities.length > 0) {
              day.activities = optActivities.map((a, i) => ({
                id: `opt-act-${i}`,
                name: a.title || '',
                description: a.description || '',
                cost: a.cost,
                time: a.time,
              }));
            }
            return day;
          });

        const travelers = itinerary.totalTravelers || 2;
        const manualHotelCost: number | undefined = (opt as any).breakdown?.manualHotelCost;
        const manualVehicleCost: number | undefined = (opt as any).breakdown?.manualVehicleCost;
        const optPricing = calculateOptionPricing(
          optDays,
          travelers,
          0,
          opt.marginPercent || 0,
          opt.gstPercent || 0,
          opt.discountPercent || 0,
          opt.roundOff || 0,
          { hotelCost: manualHotelCost, vehicleCost: manualVehicleCost }
        );
        // Older saves stored the calculated total as `finalPrice` too, which
        // froze the price on every later edit. Only a value that differs from
        // what the saved days add up to was really typed by the agent.
        const persistedPrice: number | undefined =
          (opt as any).breakdown?.finalPrice ?? opt.finalPrice ?? opt.totalCost;
        const finalPriceIsManual =
          persistedPrice !== undefined && Math.abs(persistedPrice - optPricing.totalCost) > 0.5;

        // Manual costs are checked against the figure they were typed over;
        // take today's calculated figures as theirs, so later day edits that
        // change them drop the manual cost.
        const optBase = calculateCostBreakdown(optDays);

        return {
          id: `opt-${idx}`,
          label: opt.name || `Option ${idx + 1}`,
          // Per-day price fields are the user's own quote — keep them as-is.
          days: optDays,
          pricing: {
            ...optPricing,
            manualTotal:
              (opt as any).breakdown?.manualTotal ??
              (opt as any).breakdown?.customTotal ??
              opt.totalCost,
            finalPrice: finalPriceIsManual ? persistedPrice : undefined,
            finalPriceIsManual,
            manualHotelCost,
            manualVehicleCost,
            manualHotelBasis: manualHotelCost !== undefined ? optBase.hotelCost : undefined,
            manualVehicleBasis: manualVehicleCost !== undefined ? optBase.vehicleCost : undefined,
          },
          perPersonSplit: opt.perPersonSplit ?? rawQuotes[idx]?.perPersonSplit,
        };
      });
      setOptions(builtOptions);
    } else {
      setMode('single');
      setDays(convertedDays);

      // Extract pricing data from quotes
      if (rawQuotes.length > 0) {
        const q = rawQuotes[0];
        const persistedTotal =
          (q as any).breakdown?.customTotal ?? (q as any).breakdown?.manualTotal ?? q.totalCost;

        // The persisted customTotal/manualTotal is only a *real* manual
        // override if the user actually typed a value that differs from the
        // live computed total at save time. If it matches the live total
        // recomputed from the persisted margin/gst/discount/roundOff +
        // `days` + travelers, then the user never typed an override — the
        // persisted value is just a snapshot, and on reload the live
        // computed total (driven by `days` and the editable inputs) is the
        // source of truth. Treating a matching snapshot as a manual
        // override made a stale save (e.g. a previous bug saving `total =
        // 0`) get stuck as the Final Total forever, so the breakdown's
        // Subtotal/Margin/GST/Discount rows would all compute from the
        // editable inputs but the Final Total would show 0.
        const liveTotal = calculateOptionPricing(
          convertedDays,
          itinerary.totalTravelers || 2,
          0, // additional charges are not persisted at the itinerary level
          q.marginPercent || 0,
          q.gstPercent || 0,
          q.discountPercent || 0,
          q.roundOff || 0
        ).totalCost;
        const persistedIsManual = Math.abs(persistedTotal - liveTotal) > 0.5;

        setPricingData(prev => ({
          ...prev,
          discountPercent: q.discountPercent || 0,
          marginPercent: q.marginPercent || 0,
          gstPercent: q.gstPercent || 0,
          roundOff: q.roundOff || 0,
          // Restore the persisted grand total so the user sees their
          // previous quote on reopen. The flag is only set when the
          // persisted value actually represents a typed override.
          customGrandTotal: persistedIsManual ? persistedTotal : undefined,
          customGrandTotalIsManual: persistedIsManual,
          perPersonSplit: q.perPersonSplit,
        }));
      } else {
        setPricingData(prev => ({
          ...prev,
          customGrandTotal: itinerary.totalCost,
          customGrandTotalIsManual: true,
        }));
      }
    }
  }, [itinerary, restoredDraft, clearDraft]);

  const goToStep = (s: Step) => setStep(s);

  const goBack = () => {
    if (step === 10) goToStep(9);
    else if (step === 9) goToStep(8);
    else if (step === 8) goToStep(7);
    else if (step === 7) goToStep(6);
    else if (step === 6) goToStep(5);
    else if (step === 5) goToStep(4);
    else if (step === 4) goToStep(3);
    else if (step === 3) goToStep(2);
    else if (step === 2) goToStep(1);
    else if (step === 1) router.push(`/itineraries/${itineraryId}`);
  };

  const handleModeSelect = useCallback(
    (selectedMode: 'single' | 'multi') => {
      setMode(selectedMode);
      const count = calculateDays(step1Data!.startDate, step1Data!.endDate);
      const travelers = step1Data!.totalTravelers;

      if (selectedMode === 'single') {
        const generatedDays: DayBuilderData[] = Array.from(
          { length: Math.max(1, count) },
          (_, i) => {
            const dayNum = i + 1;
            const date = step1Data!.startDate
              ? format(addDays(new Date(step1Data!.startDate), i), 'yyyy-MM-dd')
              : '';
            return createEmptyDay(dayNum, date);
          }
        );
        setDays(generatedDays);
      } else {
        const generatedDays: DayBuilderData[] = Array.from(
          { length: Math.max(1, count) },
          (_, i) => {
            const dayNum = i + 1;
            const date = step1Data!.startDate
              ? format(addDays(new Date(step1Data!.startDate), i), 'yyyy-MM-dd')
              : '';
            return createEmptyDay(dayNum, date);
          }
        );
        setOptions([
          { ...createOptionBuilder(generatedDays, travelers), label: 'Basic' },
          {
            ...createOptionBuilderWithClearedDays(generatedDays, travelers),
            label: 'Standard',
          },
          {
            ...createOptionBuilderWithClearedDays(generatedDays, travelers),
            label: 'Premium',
          },
        ]);
      }
      goToStep(3);
    },
    [step1Data]
  );

  // Set while the progress bar submits step 1, so its Next lands on the
  // clicked step instead of the usual next one.
  const STEP1_FORM_ID = 'itinerary-step1-form';
  const pendingJumpRef = useRef<Step | null>(null);

  const handleStep1Next = useCallback(
    (data: Step1FormData) => {
      const newStep1Data = { ...data, leadId: data.leadId || step1Data?.leadId || '' };
      setStep1Data(newStep1Data);

      if (mode) {
        // Regenerate days if date range changed (user edited dates in Step 1)
        const newCount = calculateDays(data.startDate, data.endDate);
        const existingCount = days.length || (options[0]?.days.length ?? 0);
        const datesChanged =
          data.startDate !== step1Data?.startDate || data.endDate !== step1Data?.endDate;

        if (newCount !== existingCount || datesChanged) {
          const generatedDays: DayBuilderData[] = Array.from(
            { length: Math.max(1, newCount) },
            (_, i) => {
              const dayNum = i + 1;
              const date = data.startDate
                ? format(addDays(new Date(data.startDate), i), 'yyyy-MM-dd')
                : '';
              return createEmptyDay(dayNum, date);
            }
          );

          if (mode === 'single') {
            // Preserve existing day data where day numbers overlap
            const mergedDays = generatedDays.map(newDay => {
              const existingDay = days.find(d => d.dayNumber === newDay.dayNumber);
              if (existingDay) {
                return { ...existingDay, dayNumber: newDay.dayNumber, date: newDay.date };
              }
              return newDay;
            });
            setDays(mergedDays);
          } else {
            // For multi, regenerate each option's days
            setOptions(prev =>
              prev.map(opt => {
                const mergedDays = generatedDays.map(newDay => {
                  const existingDay = opt.days.find(d => d.dayNumber === newDay.dayNumber);
                  if (existingDay) {
                    return { ...existingDay, dayNumber: newDay.dayNumber, date: newDay.date };
                  }
                  return newDay;
                });
                return { ...opt, days: mergedDays };
              })
            );
          }
        }

        // A progress-bar jump from step 1 lands where the agent clicked.
        goToStep(pendingJumpRef.current ?? 3);
      } else {
        const jumpTarget = pendingJumpRef.current;
        goToStep(jumpTarget && jumpTarget <= 2 ? jumpTarget : 2);
      }
      if (pendingJumpRef.current) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [mode, days, options, step1Data?.startDate, step1Data?.endDate, step1Data?.leadId]
  );

  // Progress-bar navigation. A step is reachable once the data it renders
  // from exists; leaving step 1 submits its form first so edits there are
  // validated and kept rather than silently dropped.

  const canJumpTo = (target: number) => {
    if (target === 1) return true;
    if (!step1Data) return false;
    if (target === 2) return true;
    return mode === 'multi' ? options.length > 0 : mode === 'single' && days.length > 0;
  };

  const handleProgressJump = (target: number) => {
    if (target === step || !canJumpTo(target)) return;
    if (step === 1) {
      const form = document.getElementById(STEP1_FORM_ID) as HTMLFormElement | null;
      if (form) {
        // requestSubmit runs validation and the submit handler synchronously;
        // if validation fails the agent stays here with the errors shown.
        pendingJumpRef.current = target as Step;
        form.requestSubmit();
        pendingJumpRef.current = null;
        return;
      }
    }
    goToStep(target as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fires when the Transport step is done, moving on to Destinations &
  // Activities. Do NOT seed customGrandTotal here — only a typed value in
  // the "Grand Total (Editable)" field should set it; the live computed
  // total in PricingSummaryForm is otherwise the source of truth.
  const handleDaysComplete = useCallback(() => {
    goToStep(5);
  }, []);

  const handleSave = useCallback(async () => {
    if (!step1Data || !itineraryId) {
      toast.error('Missing itinerary data');
      return;
    }

    // Build days JSON
    const primaryDays = mode === 'multi' ? options[0]?.days || [] : days;

    const daysJson = primaryDays.map(d => {
      const hotelAlts = d.hotelAlts;
      const vehicleAlts = d.vehicleAlts;

      return {
        dayNumber: d.dayNumber,
        date: d.date,
        dayType: d.dayType || 'activity',
        leisureGuidelines: d.leisureGuidelines,
        title: d.location || `Day ${d.dayNumber}`,
        description: d.description || '',
        activities: d.activities.map(a => ({
          title: a.name,
          description: a.description,
          cost: a.cost,
          time: a.time,
        })),
        meals: { breakfast: true, lunch: false, dinner: false },
        notes: d.notes,
        images: d.images || [],
        ...(d.destinationId
          ? {
              destinationId: d.destinationId,
              destination: d.destination,
              destinationAddress: d.destinationAddress,
              destinationHighlights: d.destinationHighlights || [],
            }
          : {}),
        ...(d.hotelId
          ? {
              hotelId: d.hotelId,
              hotel: d.hotelName,
              hotelAddress: d.hotelAddress,
              hotelStars: d.hotelStars,
              hotelImage: d.hotelImage ?? undefined,
              selectedRoomType: {
                name: d.roomType,
                bedType: d.bedType,
                basePrice: d.basePrice,
                extraBedPrice: d.extraBedPrice || 0,
              },
              ...(d.mealPlan
                ? {
                    selectedMealPlan: {
                      type: d.mealPlan as 'EP' | 'CP' | 'MAP' | 'APAI',
                      label: d.mealPlanLabel,
                      pricePerNight: d.mealPlanPrice,
                    },
                  }
                : {}),
              numberOfRooms: d.roomCount || 1,
              extraBeds: d.extraBedCount || 0,
              childrenNoBed: d.childCount || 0,
              extraBedCost: d.extraBedPrice || 0,
              childWithoutBedCost: d.childPrice || 0,
            }
          : {}),
        // Trip-level pickup/drop (set in the transport step on the first/last
        // day) — kept even when that day has no vehicle ticked.
        ...(d.pickupPoint ? { pickupPoint: d.pickupPoint } : {}),
        ...(d.dropPoint ? { dropPoint: d.dropPoint } : {}),
        ...(d.vehicleId
          ? {
              vehicleId: d.vehicleId,
              vehicleName: d.vehicleName,
              vehicleType: d.vehicleType,
              vehicleRatePerDay: d.ratePerDay,
              driverIncluded: d.driverIncluded,
              numberOfVehicles: d.vehicleCount || 1,
              vehicleImage: d.vehicleImage ?? undefined,
            }
          : {}),
        ...(hotelAlts.length > 0 || vehicleAlts.length > 0
          ? {
              alternatives: {
                hotelOptions: hotelAlts.map(a => ({
                  hotelId: a.hotelId,
                  hotelName: a.hotelName,
                  selectedRoomType: {
                    name: a.roomType,
                    bedType: a.bedType,
                    basePrice: a.basePrice,
                    extraBedPrice: a.extraBedPrice || 0,
                  },
                  ...(a.mealPlan
                    ? {
                        selectedMealPlan: {
                          type: a.mealPlan as 'EP' | 'CP' | 'MAP' | 'APAI',
                          label: a.mealPlanLabel,
                          pricePerNight: a.mealPlanPrice,
                        },
                      }
                    : {}),
                })),
                vehicleOptions: vehicleAlts.map(a => ({
                  vehicleId: a.vehicleId,
                  vehicleName: a.vehicleName,
                  vehicleType: a.vehicleType,
                  vehicleRatePerDay: a.ratePerDay,
                  vehicleImage: a.vehicleImage ?? undefined,
                  selectedVehicle: {
                    name: a.vehicleName,
                    vehicleType: a.vehicleType,
                    seatingCapacity: 0,
                    driverName: a.driverIncluded ? 'Driver Included' : '',
                    ratePerDay: a.ratePerDay,
                  },
                })),
              },
            }
          : {}),
      };
    });

    // One pricing per package, shared by everything saved below so the
    // options, quotes and itinerary total can't disagree with each other.
    const additionalChargesTotal = sumAdditionalCharges(pricingData.additionalCharges);
    const optionPricings =
      mode === 'multi'
        ? options.map(opt =>
            resolveOptionPricing(opt, step1Data.totalTravelers, additionalChargesTotal)
          )
        : [];

    // Build itinerary options for multi mode
    const itineraryOptions: ItineraryOption[] | undefined =
      mode === 'multi'
        ? options.map((opt, optIdx) => ({
            name: opt.label,
            hotels: opt.days
              .filter(d => d.hotelId)
              .map(d => ({
                hotelId: d.hotelId,
                hotelName: d.hotelName,
                hotelAddress: d.hotelAddress,
                hotelStars: d.hotelStars,
                hotelImage: d.hotelImage ?? undefined,
                roomType: d.roomType,
                bedType: d.bedType,
                numberOfRooms: d.roomCount,
                extraBeds: d.extraBedCount,
                childWithoutBed: d.childCount,
                extraBedPrice: d.extraBedPrice,
                childPrice: d.childPrice,
                mealPlan: d.mealPlan ?? '',
                pricePerNight: d.basePrice,
                totalCost: hotelNightCost(d).total,
              })),
            vehicles: opt.days
              .filter(d => d.vehicleId)
              .map(d => ({
                vehicleId: d.vehicleId,
                vehicleName: d.vehicleName,
                vehicleType: d.vehicleType,
                ratePerDay: d.ratePerDay,
                numberOfVehicles: d.vehicleCount,
                totalCost: vehicleDayCost(d),
                driverName: d._manualVehicleDriverName,
                driverPhone: d._manualVehicleDriverPhone,
                vehicleImage: d.vehicleImage ?? undefined,
              })),
            activities: opt.days.flatMap(d =>
              d.activities.map(a => ({
                dayNumber: d.dayNumber,
                title: a.name,
                description: a.description,
                cost: a.cost,
                time: a.time,
              }))
            ),
            // Same calculation the pricing screen shows (see resolveOptionPricing).
            totalCost: optionPricings[optIdx].totalCost,
            finalPrice: optionPricings[optIdx].effectiveTotal,
            margin: optionPricings[optIdx].marginAmount,
            breakdown: {
              hotelCost: optionPricings[optIdx].hotelCost,
              vehicleCost: optionPricings[optIdx].vehicleCost,
              activityCost: optionPricings[optIdx].activityCost,
              miscCost: optionPricings[optIdx].miscCost,
              manualHotelCost: optionPricings[optIdx].manualHotelCost,
              manualVehicleCost: optionPricings[optIdx].manualVehicleCost,
              manualTotal: optionPricings[optIdx].manualTotal,
              customTotal: optionPricings[optIdx].effectiveTotal,
              finalPrice: optionPricings[optIdx].effectiveTotal,
            },
            marginPercent: optionPricings[optIdx].marginPercent,
            gstPercent: optionPricings[optIdx].gstPercent,
            discountPercent: optionPricings[optIdx].discountPercent,
            roundOff: optionPricings[optIdx].roundOff,
            perPersonSplit: splitForTravellers(opt.perPersonSplit, step1Data),
          }))
        : undefined;

    const singleModeQuote =
      mode === 'single'
        ? (() => {
            // Same inputs and overrides as the pricing screen's totals.
            const pricing = calculateOptionPricing(
              days,
              step1Data?.totalTravelers ?? 1,
              additionalChargesTotal,
              pricingData.marginPercent,
              pricingData.gstPercent,
              pricingData.discountPercent,
              pricingData.roundOff,
              singlePricingOverrides(pricingData)
            );
            // Mirror the breakdown's rule: only honor a manual override
            // when the user actually typed one (or the persisted value was
            // loaded as manual at restore time). A stale/seeded value must
            // never reach the DB or PDF.
            const finalTotal = pricingData.customGrandTotalIsManual
              ? (pricingData.customGrandTotal as number)
              : pricing.totalCost;

            return {
              label: step1Data?.tripName || step1Data?.destination || 'Package',
              totalCost: finalTotal,
              breakdown: {
                hotelCost: pricing.hotelCost,
                vehicleCost: pricing.vehicleCost,
                activityCost: pricing.activityCost,
                miscCost: pricing.miscCost,
                customTotal: finalTotal,
                finalPrice: finalTotal,
              },
              additionalCharges: pricingData.additionalCharges.filter(c => c.label && c.amount > 0),
              discountPercent: pricingData.discountPercent,
              marginPercent: pricingData.marginPercent,
              gstPercent: pricingData.gstPercent,
              roundOff: pricingData.roundOff,
              perPersonSplit: splitForTravellers(pricingData.perPersonSplit, step1Data),
            };
          })()
        : undefined;

    // Build quotes for multi mode
    const quotes =
      mode === 'multi'
        ? options.map((opt, optIdx) => {
            const pricing = optionPricings[optIdx];
            const quoteDays = opt.days.map(d => ({
              id: d.hotelId || d.vehicleId || `day-${d.dayNumber}`,
              dayNumber: d.dayNumber,
              date: d.date,
              dayType: d.dayType || 'activity',
              leisureGuidelines: d.leisureGuidelines,
              title: d.location || `Day ${d.dayNumber}`,
              description: d.description || '',
              notes: d.notes || '',
              images: d.images || [],
              activities: d.activities.map(a => ({
                id: a.id,
                time: a.time || '',
                title: a.name,
                description: a.description,
                location: '',
                category: 'ACTIVITY' as const,
                cost: a.cost,
              })),
              hotelId: d.hotelId,
              hotel: d.hotelName,
              hotelAddress: d.hotelAddress,
              hotelStars: d.hotelStars,
              hotelContact: d.hotelContact,
              hotelImage: d.hotelImage ?? undefined,
              selectedRoomType: {
                name: d.roomType,
                bedType: d.bedType,
                basePrice: d.basePrice,
                extraBedPrice: d.extraBedPrice || 0,
              },
              selectedMealPlan: {
                type: (d.mealPlan || 'MAP') as MealPlan,
                label: (d.mealPlanLabel || d.mealPlan || 'MAP') as string,
                pricePerNight: d.mealPlanPrice ?? 0,
              },
              numberOfRooms: d.roomCount,
              extraBeds: d.extraBedCount,
              childrenNoBed: d.childCount,
              extraBedCost: d.extraBedPrice || 0,
              childWithoutBedCost: d.childPrice || 0,
              vehicleId: d.vehicleId,
              vehicleName: d.vehicleName,
              vehicleType: d.vehicleType,
              vehicleRatePerDay: d.ratePerDay,
              vehicleImage: d.vehicleImage ?? undefined,
              driverIncluded: d.driverIncluded,
              driverName: d._manualVehicleDriverName,
              driverPhone: d._manualVehicleDriverPhone,
              numberOfVehicles: d.vehicleCount,
              meals: { breakfast: true, lunch: false, dinner: false },
              alternatives: {
                hotelOptions: d.hotelAlts.map((a): HotelAlternative => {
                  return {
                    hotelId: a.hotelId,
                    hotelName: a.hotelName,
                    hotelAddress: a.hotelAddress,
                    hotelImage: a.hotelImage,
                    selectedRoomType: {
                      name: a.roomType || '',
                      bedType: a.bedType || '',
                      basePrice: a.basePrice || 0,
                      extraBedPrice: a.extraBedPrice,
                    },
                    selectedMealPlan: {
                      type: (a.mealPlan || 'MAP') as MealPlan,
                      label: a.mealPlanLabel || 'MAP',
                      pricePerNight: a.mealPlanPrice ?? 0,
                    },
                  };
                }),
                vehicleOptions: d.vehicleAlts.map(a => ({
                  vehicleId: a.vehicleId,
                  vehicleName: a.vehicleName,
                  vehicleType: a.vehicleType,
                  vehicleRatePerDay: a.ratePerDay,
                  vehicleImage: a.vehicleImage ?? undefined,
                  selectedVehicle: {
                    name: a.vehicleName,
                    vehicleType: a.vehicleType,
                    seatingCapacity: 0,
                    ratePerDay: a.ratePerDay,
                  },
                })),
              },
            }));
            const finalTotal = pricing.effectiveTotal;
            return {
              label: opt.label || `Option ${optIdx + 1}`,
              totalCost: finalTotal,
              breakdown: {
                hotelCost: pricing.hotelCost,
                vehicleCost: pricing.vehicleCost,
                activityCost: pricing.activityCost,
                miscCost: pricing.miscCost,
                manualHotelCost: pricing.manualHotelCost,
                manualVehicleCost: pricing.manualVehicleCost,
                manualTotal: pricing.manualTotal,
                customTotal: finalTotal,
                finalPrice: pricing.finalPrice,
              },
              marginPercent: pricing.marginPercent,
              gstPercent: pricing.gstPercent,
              discountPercent: pricing.discountPercent,
              roundOff: pricing.roundOff,
              days: quoteDays,
              perPersonSplit: splitForTravellers(opt.perPersonSplit, step1Data),
            };
          })
        : singleModeQuote
          ? [singleModeQuote]
          : undefined;

    // A per-person split may leave part of a price unallocated, never exceed it.
    const splitError = (quotes || [])
      .map(q => perPersonSplitError(q.perPersonSplit, q.totalCost, step1Data.currency))
      .find(Boolean);
    if (splitError) {
      toast.error(splitError);
      return;
    }

    try {
      // Preserve manual final prices from each option's pricing state
      const payloadTotalCost =
        mode === 'multi'
          ? optionPricings.reduce((max, p) => Math.max(max, p.effectiveTotal), 0)
          : (singleModeQuote?.totalCost ?? 0);

      const payload: Partial<Itinerary> = {
        title: deriveItineraryTitle(step1Data),
        clientName: step1Data.clientName || undefined,
        destination: step1Data.destination,
        daysJson: daysJson as any,
        totalTravelers: step1Data.totalTravelers,
        adults: step1Data.adults,
        children: step1Data.children,
        childrenAges: step1Data.childrenAges?.filter(Number.isFinite) ?? [],
        totalCost: payloadTotalCost,
        currency: step1Data.currency,
        ...(step1Data.startDate ? { startDate: step1Data.startDate } : {}),
        ...(step1Data.endDate ? { endDate: step1Data.endDate } : {}),
        ...(step1Data.tripType ? { tripType: step1Data.tripType } : {}),
        ...(quotes ? { quotes, selectedQuote: 0 } : {}),
        ...(itineraryOptions ? { options: itineraryOptions, selectedOption: 0 } : {}),
        included,
        excluded,
        terms,
        flights: cleanFlightsForSave(flights),
      };

      await updateItinerary.mutateAsync({ id: itineraryId, data: payload });
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      toast.success('Itinerary updated!');
      clearDraft();
      router.push(`/itineraries/${itineraryId}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(e?.response?.data?.error || e?.message || 'Failed to update itinerary');
    }
  }, [
    clearDraft,
    step1Data,
    days,
    options,
    mode,
    pricingData,
    itineraryId,
    updateItinerary,
    queryClient,
    router,
    included,
    excluded,
    terms,
    flights,
  ]);

  const tripDays = step1Data ? calculateDays(step1Data.startDate, step1Data.endDate) : 0;

  const getStepLabel = () => {
    switch (step) {
      case 1:
        return 'Basic Details';
      case 2:
        return 'Choose Mode';
      case 3:
        return 'Choose Hotels';
      case 4:
        return 'Choose Transport';
      case 5:
        return 'Destinations & Activities';
      case 6:
        return 'Review Hotels';
      case 7:
        return 'Review Transport';
      case 8:
        return 'Flight Details';
      case 9:
        return 'Terms & Conditions';
      case 10:
        return 'Pricing & Summary';
      default:
        return '';
    }
  };

  if (isLoadingItinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Itinerary not found</p>
          <Button onClick={() => router.push('/itineraries')}>Go to Itineraries</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-background/95 border-b">
        <div className="max-w-5xl mx-auto">
          <div className="px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="ghost" size="sm" onClick={goBack} className="gap-1 sm:gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Pencil className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-semibold text-sm sm:text-base truncate">Edit Itinerary</h1>
                    {step1Data && (
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {step1Data.destination} · {tripDays} days · {step1Data.totalTravelers}{' '}
                        travelers
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <WizardProgress
                currentStep={step}
                canJumpTo={canJumpTo}
                onStepClick={handleProgressJump}
              />
            </div>

            {/* Step labels */}
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="mr-2 truncate">
                Step {step}: {getStepLabel()}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                {draft.status !== 'idle' && (
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      draft.status === 'saved' && 'text-neutral-600'
                    )}
                    title="Unsaved edits are kept on this device until you update the itinerary"
                  >
                    {draft.status === 'saved' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <CloudUpload className="h-3 w-3" />
                    )}
                    {draft.status === 'saved' ? 'Draft saved' : 'Saving…'}
                  </span>
                )}
                <span>{step} of 10</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resumed-draft notice */}
      {resumedAt && (
        <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-4">
          <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm">
              <RotateCcw className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                Restored your unsaved edits ·{' '}
                <span className="text-muted-foreground">
                  {format(new Date(resumedAt), 'd MMM, h:mm a')}
                </span>
              </span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResumedAt(null)}
              className="shrink-0"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <Step1DetailsForm
              lead={itinerary.lead ? { ...itinerary.lead, id: itinerary.leadId } : undefined}
              onNext={handleStep1Next}
              formId={STEP1_FORM_ID}
              prefillClientName={
                step1Data?.clientName || itinerary.clientName || itinerary.lead?.name || ''
              }
              prefillTripName={step1Data?.tripName || itinerary.title || ''}
              prefillDestination={step1Data?.destination || itinerary.destination || ''}
              prefillDestinationId={step1Data?.destinationId}
              prefillTripType={step1Data?.tripType || itinerary.tripType || ''}
              prefillStartDate={step1Data?.startDate || ''}
              prefillEndDate={step1Data?.endDate || ''}
              prefillAdults={step1Data?.adults}
              prefillChildren={step1Data?.children}
              prefillChildrenAges={step1Data?.childrenAges}
              prefillTravelers={step1Data?.totalTravelers || itinerary.totalTravelers || 2}
              prefillCurrency={step1Data?.currency || (itinerary as any).currency || 'INR'}
              templateName={itinerary.title || ''}
              daysCount={itineraryDaysCount}
            />
          </div>
        )}

        {/* Step 2: Mode Selection */}
        {step === 2 && step1Data && (
          <div className="animate-in fade-in duration-300">
            <Step2ModeSelection
              destination={step1Data.destination}
              onSelect={handleModeSelect}
              templateName={itinerary.title || ''}
              templateDaysCount={Array.isArray(itinerary.daysJson) ? itinerary.daysJson.length : 0}
            />
          </div>
        )}

        {/* Step 3: Hotels — one focused pass over every day */}
        {step === 3 && step1Data && mode === 'single' && (
          <div className="animate-in fade-in duration-300">
            <SingleOptionBuilder
              days={days}
              onChange={setDays}
              travelers={step1Data.totalTravelers}
              currency={step1Data.currency}
              destinationId={step1Data.destinationId}
              destination={step1Data.destination}
              sections={['hotel']}
              heading="Choose Hotels"
              nextLabel="Continue to Transport"
              onSave={() => goToStep(4)}
              isSaving={false}
            />
          </div>
        )}
        {step === 3 && step1Data && mode === 'multi' && (
          <div className="animate-in fade-in duration-300">
            <MultiOptionBuilder
              options={options}
              onChange={setOptions}
              travelers={step1Data.totalTravelers}
              destinationId={step1Data.destinationId}
              destination={step1Data.destination}
              sections={['hotel']}
              nextLabel="Continue to Transport"
              onSave={() => goToStep(4)}
              isSaving={false}
            />
          </div>
        )}

        {/* Step 4: Transport — one vehicle for the whole trip, with a per-day count */}
        {step === 4 && step1Data && mode === 'single' && (
          <div className="animate-in fade-in space-y-5 duration-300">
            <TransportPlanner
              days={days}
              onChange={setDays}
              heading="Choose Transport"
              nextLabel="Continue to Destinations & Activities"
              onSave={handleDaysComplete}
              isSaving={false}
              currency={step1Data.currency}
            />
          </div>
        )}
        {step === 4 && step1Data && mode === 'multi' && (
          <div className="animate-in fade-in space-y-5 duration-300">
            <MultiTransportPlanner
              options={options}
              onChange={setOptions}
              nextLabel="Continue to Destinations & Activities"
              onSave={handleDaysComplete}
              isSaving={false}
              currency={step1Data.currency}
            />
          </div>
        )}

        {/* Step 5: Destinations & Activities — day type, destination and activities for every day */}
        {step === 5 && step1Data && (
          <div className="animate-in fade-in duration-300">
            <Step5DayDetailsReview
              mode={mode === 'multi' ? 'multi' : 'single'}
              focusSection="destination"
              days={days}
              options={options}
              onDaysChange={setDays}
              onOptionsChange={setOptions}
              onNext={() => goToStep(6)}
              destinationId={step1Data.destinationId}
              destination={step1Data.destination}
              currency={step1Data.currency}
              isSaving={false}
              onBack={goBack}
            />
          </div>
        )}

        {/* Step 6: Review Hotels */}
        {step === 6 && step1Data && (
          <div className="animate-in fade-in duration-300">
            <Step5DayDetailsReview
              mode={mode === 'multi' ? 'multi' : 'single'}
              focusSection="hotel"
              days={days}
              options={options}
              onDaysChange={setDays}
              onOptionsChange={setOptions}
              onNext={() => goToStep(7)}
              destinationId={step1Data.destinationId}
              destination={step1Data.destination}
              currency={step1Data.currency}
              isSaving={updateItinerary.isPending}
              onBack={() => goToStep(5)}
              clientName={step1Data.clientName}
              salutation="Mr"
              adults={step1Data.adults}
              childrenCount={step1Data.children}
            />
          </div>
        )}

        {/* Step 7: Review Transport */}
        {step === 7 && step1Data && (
          <div className="animate-in fade-in duration-300">
            <Step5DayDetailsReview
              mode={mode === 'multi' ? 'multi' : 'single'}
              focusSection="vehicle"
              days={days}
              options={options}
              onDaysChange={setDays}
              onOptionsChange={setOptions}
              onNext={() => goToStep(8)}
              destinationId={step1Data.destinationId}
              destination={step1Data.destination}
              currency={step1Data.currency}
              isSaving={updateItinerary.isPending}
              onBack={() => goToStep(6)}
            />
          </div>
        )}

        {/* Step 8: Flight Details — trip-level, manual or fetched by flight number */}
        {step === 8 && step1Data && (
          <div className="animate-in fade-in duration-300">
            <FlightDetailsSection
              flights={flights}
              onChange={setFlights}
              startDate={step1Data.startDate}
              endDate={step1Data.endDate}
              travelers={step1Data.totalTravelers}
              currency={step1Data.currency}
              onNext={() => goToStep(9)}
              onBack={() => goToStep(7)}
              isSaving={updateItinerary.isPending}
            />
          </div>
        )}

        {/* Step 9: Terms & Conditions */}
        {step === 9 && step1Data && (
          <div className="animate-in fade-in duration-300">
            <Step6Terms
              initialIncluded={included}
              initialExcluded={excluded}
              initialTerms={terms}
              onIncludedChange={setIncluded}
              onExcludedChange={setExcluded}
              onTermsChange={setTerms}
              onSave={() => goToStep(10)}
              isSaving={updateItinerary.isPending}
              onBack={() => goToStep(8)}
            />
          </div>
        )}

        {/* Step 10: Pricing Summary — last, so it prices the finished itinerary */}
        {step === 10 && step1Data && (
          <div className="animate-in fade-in duration-300">
            <PricingSummaryForm
              step1Data={step1Data}
              days={mode === 'multi' ? options[0]?.days || [] : days}
              pricingData={pricingData}
              onPricingChange={setPricingData}
              onSave={handleSave}
              isSaving={updateItinerary.isPending}
              isMulti={mode === 'multi'}
              options={mode === 'multi' ? options : undefined}
              onOptionsChange={mode === 'multi' ? setOptions : undefined}
              currency={step1Data.currency}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditItineraryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <EditItineraryInner />
    </Suspense>
  );
}
