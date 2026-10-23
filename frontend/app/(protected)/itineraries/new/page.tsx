'use client';

import { useState, useCallback, Suspense, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import {
  ChevronLeft,
  Plane,
  Loader2,
  User,
  Search,
  Clock,
  MapPin,
  RotateCcw,
  CloudUpload,
  CloudOff,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Step1DetailsForm } from './components/Step1DetailsForm';
import { Step2ModeSelection } from './components/Step2ModeSelection';
import { SingleOptionBuilder } from './components/SingleOptionBuilder';
import { MultiOptionBuilder } from './components/MultiOptionBuilder';
import { TransportPlanner } from './components/TransportPlanner';
import { MultiTransportPlanner } from './components/MultiTransportPlanner';
import { PricingSummaryForm } from './components/PricingSummaryForm';
import { Step5DayDetailsReview } from './components/Step5DayDetailsReview';
import { Step6Terms } from './components/Step6Terms';
import { WizardProgress } from './components/WizardProgress';
import { FlightDetailsSection } from './components/FlightDetailsSection';
import { TemplateSuggestionPage, TemplateNoMatchNote } from './components/TemplateSuggestions';
import { useTemplateSuggestions } from '@/hooks/use-template-suggestions';
import { useCreateItinerary, useItinerary } from '@/hooks/useItineraries';
import { useWizardDraft } from '@/hooks/use-wizard-draft';
import {
  newItineraryDraftId,
  useDeleteItineraryDraft,
  useItineraryDraft,
  useServerDraftAutosave,
} from '@/hooks/use-itinerary-drafts';
import type { TemplateCandidate, TripContext } from '@/lib/itinerary-template-match';
import { useLeads, useLead } from '@/hooks/useLeads';
import { useAuthContext } from '@/components/providers';
import type { Step1FormData, DayBuilderData, OptionBuilder, PricingData } from './types';
import type {
  FlightSegment,
  HotelAlternative,
  ItineraryOption,
  Lead,
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
  deriveItineraryTitle,
  adaptDaysToTrip,
  hotelNightCost,
  vehicleDayCost,
  resolveOptionPricing,
  singlePricingOverrides,
  sumAdditionalCharges,
} from './types';

// 3: Destinations & Activities, 4: Hotels, 5: Transport (was one combined day
// planner step); 6: Review Hotels, 7: Review Transport (was one combined day
// details review step); 8: Flights, 9: Terms, 10: Pricing (each shifted by 3).
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// ─── Lead Selector Step (Phase 0) ─────────────────────────────────────────────

function LeadSelectorStep({
  templateName,
  destination,
  daysCount,
  onSelect,
  isMultiMode,
}: {
  templateName: string;
  destination: string;
  daysCount: number;
  onSelect: (lead: Lead) => void;
  isMultiMode: boolean;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data: leadsData, isLoading } = useLeads({ search: debouncedSearch, limit: 50 });

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const leads = leadsData?.leads ?? leadsData?.data?.leads ?? [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-2 sm:px-0">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <User className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">Select Client</h1>
        <p className="text-sm text-muted-foreground">Which client is this itinerary for?</p>
      </div>

      {/* Template info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 text-xs"
            >
              Template
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
              {isMultiMode ? 'Multiple Options' : 'Single Package'}
            </Badge>
          </div>
          <p className="font-semibold">{templateName}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {destination && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {destination}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {daysCount} days
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by name, phone or email..."
          className="h-11 pl-10 text-base"
          autoFocus
        />
      </div>

      {/* Leads list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : leads.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          {debouncedSearch ? 'No clients match your search' : 'No clients available'}
        </p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead: Lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              onClick={() => onSelect(lead)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

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
  /** The server copy ("Incomplete" itinerary) this work autosaves to. */
  draftId?: string;
}

/**
 * Header save indicator. The server copy is what makes the work show up as an
 * "Incomplete" itinerary; the browser copy covers the gap before step 1 is
 * done and any moment the server can't be reached.
 */
function SaveStatus({
  server,
  local,
}: {
  server: 'idle' | 'saving' | 'saved' | 'error';
  local: 'idle' | 'saving' | 'saved';
}) {
  if (server === 'idle' && local === 'idle') return null;

  if (server === 'error') {
    return (
      <span
        className="flex items-center gap-1 text-amber-600"
        title="Couldn't reach the server, so your progress is kept on this device for now. It syncs on your next change."
      >
        <CloudOff className="h-3 w-3" />
        Saved on this device
      </span>
    );
  }

  const saved = server === 'idle' ? local === 'saved' : server === 'saved';
  return (
    <span
      className={cn('flex items-center gap-1', saved && 'text-neutral-600')}
      title={
        server === 'idle'
          ? 'Your progress is kept on this device until you save the itinerary'
          : 'Saved as an incomplete itinerary. Continue it any time from Itineraries > Incomplete.'
      }
    >
      {saved ? <CheckCircle2 className="h-3 w-3" /> : <CloudUpload className="h-3 w-3" />}
      {saved ? (server === 'idle' ? 'Draft saved' : 'Saved as incomplete') : 'Saving…'}
    </span>
  );
}

function NewItineraryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const createItinerary = useCreateItinerary();

  const leadId = searchParams.get('leadId') || '';
  const templateId = searchParams.get('templateId') || '';
  // Set when continuing an incomplete itinerary from the list.
  const draftParam = searchParams.get('draft') || '';
  const { data: lead } = useLead(leadId);

  // Fetch template data if templateId is provided
  const { data: templateData, isLoading: _isLoadingTemplate } = useItinerary(templateId);

  // Prefill state from template
  const [prefilledDays, setPrefilledDays] = useState<any[] | null>(null);
  const [prefilledDestination, setPrefilledDestination] = useState<string>('');
  const [prefilledStartDate, setPrefilledStartDate] = useState<string>('');
  const [prefilledEndDate, setPrefilledEndDate] = useState<string>('');
  const [prefilledTravelers, setPrefilledTravelers] = useState<number>(2);
  const [templateName, setTemplateName] = useState<string>('');
  const [templateMode, setTemplateMode] = useState<'single' | 'multi' | null>(null);
  // Which template this itinerary was built from, for the usage counts that
  // feed template suggestions. An applied suggestion overrides the URL one.
  const [sourceTemplateId, setSourceTemplateId] = useState<string>('');
  // Step 3 has two screens: the template offer, then the day planner. Defaults
  // to 'build' so a resumed draft never covers work already done with a picker.
  const [templateStage, setTemplateStage] = useState<'suggest' | 'build'>('build');

  const [step, setStep] = useState<Step>(templateId && !leadId ? 0 : 1); // 0 = lead selection
  const [mode, setMode] = useState<'single' | 'multi' | null>(templateMode ?? null);
  const [step1Data, setStep1Data] = useState<Step1FormData | null>(null);
  // Derive currency from step1Data, fallback to user's branch currency
  const { user } = useAuthContext();
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
    hotelPrices: {},
  });
  const [included, setIncluded] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [terms, setTerms] = useState('');
  // Trip-level flights — outbound, return and any hops between destinations.
  const [flights, setFlights] = useState<FlightSegment[]>([]);

  // Sync mode state with templateMode when template is loaded
  useEffect(() => {
    if (templateMode && mode !== templateMode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- applies the template mode from the URL
      setMode(templateMode);
    }
  }, [templateMode]);

  // Autosave. The key is per-itinerary so one client's draft can never be
  // restored into another's — the old single global key did exactly that,
  // carrying the wrong leadId with it.
  const draftKey = draftParam
    ? `draft:${draftParam}`
    : templateId
      ? `template:${templateId}`
      : leadId
        ? `lead:${leadId}`
        : 'blank';

  // Id of the server-side incomplete itinerary. Generated up front so every
  // autosave is an idempotent upsert; replaced by a resumed draft's own id.
  const [serverDraftId, setServerDraftId] = useState(() => draftParam || newItineraryDraftId());
  const serverDraftQuery = useItineraryDraft<WizardSnapshot>(draftParam || null);
  const deleteServerDraft = useDeleteItineraryDraft();
  const provenanceTemplateId = sourceTemplateId || templateId || '';

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
      draftId: serverDraftId,
    }),
    [
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
      serverDraftId,
    ]
  );

  const draft = useWizardDraft<WizardSnapshot>({
    key: draftKey,
    version: DRAFT_VERSION,
    value: wizardSnapshot,
    // Nothing worth keeping until the trip details exist.
    shouldSave: Boolean(step1Data) || days.length > 0 || options.length > 0,
  });

  const clearDraft = draft.clear;

  // Apply a recovered draft on the first render that has one. Adjusting state
  // during render (rather than in an effect) avoids painting the empty wizard
  // first and then snapping to the restored step.
  const [draftApplied, setDraftApplied] = useState(false);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  // Continuing an incomplete itinerary: wait for the server copy, then take
  // whichever of it and this browser's copy was saved last (the browser one
  // wins when the last autosave never reached the server).
  const serverCopy = serverDraftQuery.data
    ? { data: serverDraftQuery.data.data, savedAt: Date.parse(serverDraftQuery.data.updatedAt) }
    : null;
  const restoreFrom = draftParam
    ? serverCopy && draft.restored && draft.restored.savedAt > serverCopy.savedAt
      ? draft.restored
      : serverCopy
    : draft.restored;
  if (restoreFrom && !draftApplied) {
    const saved = restoreFrom.data;
    setDraftApplied(true);
    setResumedAt(restoreFrom.savedAt);
    if (draftParam) setServerDraftId(draftParam);
    else if (saved.draftId) setServerDraftId(saved.draftId);
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
  }

  // Bumped by "Start fresh" so step 1 remounts empty — the form keeps what the
  // agent typed (e.g. the nights) across prefill changes, which a discard isn't.
  const [step1FormKey, setStep1FormKey] = useState(0);

  const discardDraft = useCallback(() => {
    setStep1FormKey(k => k + 1);
    draft.clear();
    // "Start fresh" throws the incomplete itinerary away too.
    deleteServerDraft.mutate(serverDraftId);
    setServerDraftId(newItineraryDraftId());
    if (draftParam) router.replace('/itineraries/new');
    setResumedAt(null);
    setStep(templateId && !leadId ? 0 : 1);
    setMode(null);
    setStep1Data(null);
    setDays([]);
    setOptions([]);
    setIncluded([]);
    setExcluded([]);
    setTerms('');
    setFlights([]);
  }, [draft, templateId, leadId, deleteServerDraft, serverDraftId, draftParam, router]);

  // Server autosave, from the moment step 1 is filled in. When continuing,
  // hold off until the saved copy has been applied so it is never overwritten.
  const serverAutosave = useServerDraftAutosave({
    id: serverDraftId,
    value: wizardSnapshot,
    enabled: Boolean(step1Data) && (!draftParam || draftApplied),
  });

  // Process template data when loaded
  useEffect(() => {
    if (templateData?.isTemplate && templateData?.daysJson) {
      const templateDays = Array.isArray(templateData.daysJson)
        ? templateData.daysJson
        : JSON.parse(templateData.daysJson as string);

      if (templateDays.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the wizard from the loaded template
        setPrefilledDays(templateDays);
        if (templateData.destination) setPrefilledDestination(templateData.destination);
        if (templateData.startDate) setPrefilledStartDate(templateData.startDate);
        if (templateData.endDate) setPrefilledEndDate(templateData.endDate);
        if (templateData.totalTravelers) setPrefilledTravelers(templateData.totalTravelers);
        const name = templateData.templateName || templateData.title || 'Template';
        setTemplateName(name);
        // Determine if template is multi-option (has options/quotes)
        if ((templateData.options?.length ?? 0) > 1 || (templateData.quotes?.length ?? 0) > 1) {
          setTemplateMode('multi');
        } else {
          setTemplateMode('single');
        }
      }
    }
  }, [templateData]);

  const goToStep = (s: Step) => setStep(s);

  const goBack = () => {
    if (step === 10) goToStep(9);
    else if (step === 9) goToStep(8);
    else if (step === 8) goToStep(7);
    else if (step === 7) goToStep(6);
    else if (step === 6) goToStep(5);
    else if (step === 5) goToStep(4);
    else if (step === 4) goToStep(3);
    else if (step === 3) {
      // The template offer is its own screen inside step 3, so Back returns to
      // it before leaving for the mode picker.
      if (templateStage === 'build' && templateSuggestions.length > 0) {
        setTemplateStage('suggest');
      } else {
        goToStep(2);
      }
    } else if (step === 2) goToStep(1);
    else if (step === 1) {
      // If we have a leadId, go back to lead detail page
      if (step1Data?.leadId) {
        router.push(`/leads/${step1Data.leadId}`);
      } else {
        router.push('/leads');
      }
    } else if (step === 0) {
      // From lead selection step, go to leads list
      router.push('/leads');
    }
  };

  const handleLeadSelect = (selectedLead: Lead) => {
    const leadChildren = selectedLead.childrenCount || 0;
    setStep1Data({
      clientName: selectedLead.name || '',
      tripName: '',
      leadId: selectedLead.id,
      destination: prefilledDestination || selectedLead.destination || '',
      tripType: (selectedLead.tripType || '') as TripType,
      startDate:
        prefilledStartDate ||
        (selectedLead.travelDateFrom
          ? new Date(selectedLead.travelDateFrom).toISOString().split('T')[0]
          : ''),
      endDate:
        prefilledEndDate ||
        (selectedLead.travelDateTo
          ? new Date(selectedLead.travelDateTo).toISOString().split('T')[0]
          : ''),
      adults: prefilledTravelers || parseInt(selectedLead.numberOfPax || '2') || 2,
      children: leadChildren,
      childrenAges: new Array(leadChildren).fill(Number.NaN),
      totalTravelers:
        (prefilledTravelers || parseInt(selectedLead.numberOfPax || '2') || 2) + leadChildren,
      currency: 'INR',
    });
    goToStep(1);
  };

  const loadTemplateDays = useCallback(
    (selectedMode: 'single' | 'multi', daysOverride?: any[]) => {
      const sourceDays = daysOverride ?? prefilledDays;
      if (sourceDays && sourceDays.length > 0) {
        if (selectedMode === 'single') {
          setMode('single');
          const convertedDays: DayBuilderData[] = sourceDays.map((d: any, i: number) => ({
            id: `day-${i}`,
            dayNumber: d.dayNumber || i + 1,
            date: d.date || '',
            location: d.title || d.location || '',
            destinationId: d.destinationId || undefined,
            destination: d.destination || undefined,
            destinationAddress: d.destinationAddress || undefined,
            destinationHighlights: d.destinationHighlights || [],
            destinationShortDescription: d.destinationShortDescription,
            destinationDescription: d.destinationDescription,
            destinationAmenities: d.destinationAmenities,
            destinationBestTimeToVisit: d.destinationBestTimeToVisit,
            destinationAverageTemperature: d.destinationAverageTemperature,
            destinationLanguage: d.destinationLanguage,
            destinationCurrency: d.destinationCurrency,
            destinationTimezone: d.destinationTimezone,
            destinationThingsToKnow: d.destinationThingsToKnow,
            description: d.description || '',
            activities: (d.activities || []).map((a: any, idx: number) => ({
              id: `act-${idx}`,
              name: a.title || '',
              description: a.description || '',
              time: a.time || '',
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
            extraBedPrice: d.selectedRoomType?.extraBedPrice || d.extraBedCost,
            mealPlan: d.selectedMealPlan?.type || undefined,
            mealPlanLabel: d.selectedMealPlan?.label || undefined,
            mealPlanPrice: d.selectedMealPlan?.pricePerNight || undefined,
            roomCount: d.numberOfRooms || 1,
            vehicleId: d.vehicleId || '',
            vehicleName: d.vehicleName || '',
            vehicleType: d.vehicleType || '',
            driverIncluded: d.driverIncluded ?? true,
            ratePerDay: d.vehicleRatePerDay || 0,
            pickupPoint: d.pickupPoint || '',
            dropPoint: d.dropPoint || '',
            vehicleCount: d.numberOfVehicles || 1,
            vehicleImage: d.vehicleImage || null,
            notes: d.notes || '',
            images: d.images || [],
            extraBedCount: d.extraBeds || 0,
            childPrice: d.childPrice || 0,
            childCount: d.childrenNoBed || 0,
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
          }));
          setDays(
            adaptDaysToTrip(
              convertedDays,
              calculateDays(step1Data!.startDate, step1Data!.endDate),
              step1Data!.startDate
            )
          );
        } else {
          setMode('multi');
          const baseDays: DayBuilderData[] = sourceDays.map((d: any, i: number) => ({
            id: `day-${i}`,
            dayNumber: d.dayNumber || i + 1,
            date: d.date || '',
            location: d.title || d.location || '',
            destinationId: d.destinationId || undefined,
            destination: d.destination || undefined,
            destinationAddress: d.destinationAddress || undefined,
            destinationHighlights: d.destinationHighlights || [],
            destinationShortDescription: d.destinationShortDescription,
            destinationDescription: d.destinationDescription,
            destinationAmenities: d.destinationAmenities,
            destinationBestTimeToVisit: d.destinationBestTimeToVisit,
            destinationAverageTemperature: d.destinationAverageTemperature,
            destinationLanguage: d.destinationLanguage,
            destinationCurrency: d.destinationCurrency,
            destinationTimezone: d.destinationTimezone,
            destinationThingsToKnow: d.destinationThingsToKnow,
            description: d.description || '',
            activities: (d.activities || []).map((a: any, idx: number) => ({
              id: `act-${idx}`,
              name: a.title || '',
              description: a.description || '',
              time: a.time || '',
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
            mealPlan: d.selectedMealPlan?.type || undefined,
            mealPlanLabel: d.selectedMealPlan?.label || undefined,
            mealPlanPrice: d.selectedMealPlan?.pricePerNight || undefined,
            roomCount: d.numberOfRooms || 1,
            extraBedPrice: d.selectedRoomType?.extraBedPrice || 0,
            extraBedCount: d.extraBeds || 0,
            childPrice: d.selectedRoomType?.childPrice || 0,
            childCount: d.childrenNoBed || 0,
            vehicleId: d.vehicleId || '',
            vehicleName: d.vehicleName || '',
            vehicleType: d.vehicleType || '',
            driverIncluded: true,
            ratePerDay: d.vehicleRatePerDay || 0,
            vehicleCount: d.numberOfVehicles || 1,
            pickupPoint: d.pickupPoint || '',
            dropPoint: d.dropPoint || '',
            vehicleImage: d.vehicleImage || null,
            notes: d.notes || '',
            images: d.images || [],
            hotelAlts: [],
            vehicleAlts: [],
            _isManualHotelEntry: false,
            _isManualVehicleEntry: false,
          }));
          const travelers = step1Data!.totalTravelers;
          const adaptedBaseDays = adaptDaysToTrip(
            baseDays,
            calculateDays(step1Data!.startDate, step1Data!.endDate),
            step1Data!.startDate
          );
          setOptions([
            { ...createOptionBuilder(adaptedBaseDays, travelers), label: 'Basic' },
            {
              ...createOptionBuilderWithClearedDays(adaptedBaseDays, travelers),
              label: 'Standard',
            },
            {
              ...createOptionBuilderWithClearedDays(adaptedBaseDays, travelers),
              label: 'Premium',
            },
          ]);
        }
        goToStep(3);
        return;
      }

      const count = calculateDays(step1Data!.startDate, step1Data!.endDate);
      const generatedDays: DayBuilderData[] = Array.from({ length: Math.max(1, count) }, (_, i) => {
        const dayNum = i + 1;
        const date = step1Data!.startDate
          ? format(addDays(new Date(step1Data!.startDate), i), 'yyyy-MM-dd')
          : '';
        return createEmptyDay(dayNum, date);
      });

      if (selectedMode === 'single') {
        setMode('single');
        setDays(generatedDays);
      } else {
        setMode('multi');
        const travelers = step1Data!.totalTravelers;
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
    [prefilledDays, step1Data]
  );

  const handleModeSelect = useCallback(
    (selectedMode: 'single' | 'multi') => {
      // Days are generated either way; the offer screen sits in front of the
      // planner so skipping it costs nothing.
      loadTemplateDays(selectedMode);
      setTemplateStage('suggest');
    },
    [loadTemplateDays]
  );

  // Set while the progress bar submits step 1, so its Next lands on the
  // clicked step instead of the usual next one.
  const STEP1_FORM_ID = 'itinerary-step1-form';
  const pendingJumpRef = useRef<Step | null>(null);

  const handleStep1Next = useCallback(
    (data: Step1FormData) => {
      // Preserve leadId if already set (from step 0 lead selection)
      setStep1Data({ ...data, leadId: data.leadId || step1Data?.leadId || '' });

      // Jumping from step 1 via the progress bar onto days already built: keep
      // the agent's work and only reshape it if the trip length or dates moved.
      const jumpTarget = pendingJumpRef.current;
      const hasBuiltDays = mode === 'multi' ? options.length > 0 : days.length > 0;
      if (jumpTarget && (jumpTarget <= 2 || (mode && hasBuiltDays))) {
        if (
          mode &&
          hasBuiltDays &&
          (data.startDate !== step1Data?.startDate || data.endDate !== step1Data?.endDate)
        ) {
          const count = calculateDays(data.startDate, data.endDate);
          if (mode === 'single') {
            setDays(prev => adaptDaysToTrip(prev, count, data.startDate));
          } else {
            setOptions(prev =>
              prev.map(o => ({ ...o, days: adaptDaysToTrip(o.days, count, data.startDate) }))
            );
          }
        }
        goToStep(jumpTarget);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (templateMode) {
        setMode(templateMode);
        loadTemplateDays(templateMode);
        goToStep(3);
      } else {
        goToStep(2);
      }
    },
    [templateMode, loadTemplateDays, step1Data, mode, days.length, options.length]
  );

  // Progress-bar navigation. A step is reachable once the data it renders
  // from exists; leaving step 1 submits its form first so edits there are
  // validated and kept rather than silently dropped.

  const canJumpTo = (target: number) => {
    if (step === 0) return false;
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
    if (step === 3) setTemplateStage('build');
    goToStep(target as Step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // What the template scorer ranks against. Rebuilt only when the trip facts
  // change, so the suggestion list doesn't churn while the days are edited.
  const templateTripContext: TripContext | null = useMemo(() => {
    if (!step1Data) return null;
    const dayCount = calculateDays(step1Data.startDate, step1Data.endDate);
    if (!step1Data.destination || dayCount < 1) return null;
    return {
      destination: step1Data.destination,
      dayCount,
      adults: step1Data.adults,
      children: step1Data.children,
      totalTravelers: step1Data.totalTravelers,
      tripType: step1Data.tripType,
      startDate: step1Data.startDate,
      currentUserId: user?.id,
      branchId: user?.branchId,
    };
  }, [step1Data, user?.id, user?.branchId]);

  const { suggestions: templateSuggestions } = useTemplateSuggestions(templateTripContext);

  const applySuggestedTemplate = useCallback(
    (candidate: TemplateCandidate) => {
      // Reuses the template pipeline: convert, reshape to this trip's length
      // and dates, then drop the agent back on the day planner.
      loadTemplateDays(mode ?? 'single', candidate.daysJson as any[]);
      setSourceTemplateId(candidate.id);
      setTemplateStage('build');
      toast.success(`Applied "${candidate.name}" — every day is still editable`);
    },
    [loadTemplateDays, mode]
  );

  // Fires when the Transport step is done, moving on to Destinations &
  // Activities. Do NOT seed customGrandTotal here — only the user's typed
  // value in the "Grand Total (Editable)" input should set it; otherwise the
  // live computed total (derived from `days` in PricingSummaryForm) is the
  // source of truth.
  const handleDaysComplete = useCallback(() => {
    goToStep(5);
  }, []);

  const handleSave = useCallback(async () => {
    // Allow saving without lead - just show warning if no lead selected
    if (!step1Data || !step1Data.leadId) {
      // Check if we have at least basic data
      if (!step1Data?.destination) {
        toast.error('Please fill in destination before saving');
        goToStep(1);
        return;
      }
      // Continue without lead - this is allowed
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
              destinationShortDescription: d.destinationShortDescription,
              destinationDescription: d.destinationDescription,
              destinationAmenities: d.destinationAmenities,
              destinationBestTimeToVisit: d.destinationBestTimeToVisit,
              destinationAverageTemperature: d.destinationAverageTemperature,
              destinationLanguage: d.destinationLanguage,
              destinationCurrency: d.destinationCurrency,
              destinationTimezone: d.destinationTimezone,
              destinationThingsToKnow: d.destinationThingsToKnow,
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
              extraBedCost: (d.extraBedCount || 0) * (d.extraBedPrice || 0),
              childWithoutBedCost: (d.childCount || 0) * (d.childPrice || 0),
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

    // Build itinerary options with full per-option hotel/vehicle/activity data for PDF
    const itineraryOptions: ItineraryOption[] | undefined =
      mode === 'multi'
        ? options.map((opt, optIdx) => {
            // Same calculation the pricing screen shows (see resolveOptionPricing).
            const pricing = optionPricings[optIdx];
            const finalPrice = pricing.effectiveTotal;
            const marginAmount = pricing.marginAmount;

            return {
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
              alternatives: opt.days
                .filter(d => d.hotelAlts && d.hotelAlts.length > 0)
                .map(d => ({
                  dayNumber: d.dayNumber,
                  hotelOptions: d.hotelAlts.map(a => ({
                    hotelId: a.hotelId,
                    hotelName: a.hotelName,
                    hotelAddress: a.hotelAddress,
                    hotelImage: a.hotelImage ?? undefined,
                    roomType: a.roomType,
                    bedType: a.bedType,
                    pricePerNight: a.basePrice,
                    extraBedPrice: a.extraBedPrice || 0,
                    mealPlan: a.mealPlan ?? '',
                    pricePerNightAlt: a.mealPlanPrice,
                  })),
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
              totalCost: pricing.totalCost,
              finalPrice,
              margin: marginAmount,
              breakdown: {
                hotelCost: pricing.hotelCost,
                vehicleCost: pricing.vehicleCost,
                activityCost: pricing.activityCost,
                miscCost: pricing.miscCost,
                manualHotelCost: pricing.manualHotelCost,
                manualVehicleCost: pricing.manualVehicleCost,
                manualTotal: pricing.manualTotal,
                customTotal: finalPrice,
                finalPrice,
              },
              marginPercent: pricing.marginPercent,
              gstPercent: pricing.gstPercent,
              discountPercent: pricing.discountPercent,
              roundOff: pricing.roundOff,
              additionalCharges: pricingData.additionalCharges.filter(c => c.label && c.amount > 0),
              perPersonSplit: splitForTravellers(opt.perPersonSplit, step1Data),
            };
          })
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
            // when the user actually typed one. A stale/seeded value must
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

    // Build quotes for multi mode with per-option pricing AND embedded days
    const quotes =
      mode === 'multi'
        ? options.map((opt, optIdx) => {
            const pricing = optionPricings[optIdx];
            // Convert OptionBuilder days to ItineraryDay format for embedded storage
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
              ...(d.destinationId
                ? {
                    destinationId: d.destinationId,
                    destination: d.destination,
                    destinationAddress: d.destinationAddress,
                    destinationHighlights: d.destinationHighlights || [],
                  }
                : {}),
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
              extraBedPrice: d.extraBedPrice || 0,
              childPrice: d.childPrice || 0,
              extraBedCost: d.extraBedPrice || 0,
              childWithoutBedCost: d.childPrice || 0,
              vehicleId: d.vehicleId,
              vehicleName: d.vehicleName,
              vehicleType: d.vehicleType,
              vehicleRatePerDay: d.ratePerDay,
              vehicleImage: d.vehicleImage ?? undefined,
              pickupPoint: d.pickupPoint || undefined,
              dropPoint: d.dropPoint || undefined,
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
              additionalCharges: pricingData.additionalCharges.filter(c => c.label && c.amount > 0),
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
      const payloadTotalCost =
        mode === 'multi'
          ? optionPricings.reduce((max, p) => Math.max(max, p.effectiveTotal), 0)
          : (singleModeQuote?.totalCost ?? 0);

      // Let any autosave finish first, so none can re-create the draft after
      // the itinerary is saved and the server has deleted it.
      await serverAutosave.stop();
      const result = await createItinerary.mutateAsync({
        draftId: serverDraftId,
        title: deriveItineraryTitle(step1Data),
        clientName: step1Data.clientName || undefined,
        ...(provenanceTemplateId ? { sourceTemplateId: provenanceTemplateId } : {}),
        destination: step1Data.destination,
        leadId: step1Data.leadId || undefined,
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
      });
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['itinerary-drafts'] });
      // The template that produced this itinerary just became more popular.
      queryClient.invalidateQueries({ queryKey: ['itinerary-template-usage'] });
      toast.success('Itinerary created!');
      clearDraft();
      router.push(`/itineraries/${result.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(e?.response?.data?.error || e?.message || 'Failed to create itinerary');
      serverAutosave.resume();
    }
  }, [
    step1Data,
    days,
    options,
    mode,
    pricingData,
    provenanceTemplateId,
    flights,
    // These were missing: the callback only picked them up because `pricingData`
    // changes on the pricing step and forces a rebuild. Listing them makes the
    // saved payload independent of that accident.
    included,
    excluded,
    terms,
    createItinerary,
    queryClient,
    router,
    serverAutosave,
    serverDraftId,
  ]);

  // Calculate trip summary
  const tripDays = step1Data ? calculateDays(step1Data.startDate, step1Data.endDate) : 0;

  // Get step labels
  // Step 3 shows the template offer first when there is something worth offering.
  const showTemplatePicker =
    step === 3 && templateStage === 'suggest' && templateSuggestions.length > 0;

  const getStepLabel = () => {
    switch (step) {
      case 0:
        return 'Select Client';
      case 1:
        return 'Basic Details';
      case 2:
        return 'Choose Mode';
      case 3:
        if (showTemplatePicker) return 'Start From a Template';
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

  if (draftParam && !draftApplied) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        {serverDraftQuery.isError ? (
          <div className="max-w-sm space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This incomplete itinerary no longer exists. It may have been finished or deleted.
            </p>
            <Button onClick={() => router.push('/itineraries')}>Go to Itineraries</Button>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Opening incomplete itinerary...</p>
          </div>
        )}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  disabled={step === 0}
                  className="gap-1 sm:gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Plane className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-semibold text-sm sm:text-base truncate">
                      Create Itinerary
                    </h1>
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
                <SaveStatus server={serverAutosave.status} local={draft.status} />
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
                Picked up where you left off
                {step1Data?.clientName ? ` on ${step1Data.clientName}'s trip` : ''} ·{' '}
                <span className="text-muted-foreground">
                  {format(new Date(resumedAt), 'd MMM, h:mm a')}
                </span>
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setResumedAt(null)}>
                Keep it
              </Button>
              <Button variant="outline" size="sm" onClick={discardDraft}>
                Start fresh
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 pb-2 sm:py-8">
        {/* Step 0: Lead Selection (template flow) */}
        {step === 0 && templateId && (
          <div className="animate-in fade-in duration-300">
            <LeadSelectorStep
              templateName={templateName}
              destination={prefilledDestination}
              daysCount={(prefilledDays || []).length}
              onSelect={handleLeadSelect}
              isMultiMode={templateMode === 'multi'}
            />
          </div>
        )}

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <Step1DetailsForm
              key={step1FormKey}
              lead={lead}
              onNext={handleStep1Next}
              formId={STEP1_FORM_ID}
              prefillClientName={step1Data?.clientName}
              prefillTripName={step1Data?.tripName}
              prefillDestination={step1Data?.destination || prefilledDestination}
              prefillDestinationId={step1Data?.destinationId}
              prefillTripType={step1Data?.tripType}
              prefillStartDate={step1Data?.startDate || prefilledStartDate}
              prefillEndDate={step1Data?.endDate || prefilledEndDate}
              prefillAdults={step1Data?.adults}
              prefillChildren={step1Data?.children}
              prefillChildrenAges={step1Data?.childrenAges}
              prefillTravelers={prefilledTravelers}
              prefillCurrency={step1Data?.currency}
              templateName={templateName}
              daysCount={(prefilledDays || []).length}
            />
          </div>
        )}

        {/* Step 2: Mode Selection */}
        {step === 2 && step1Data && (
          <div className="animate-in fade-in duration-300">
            <Step2ModeSelection
              destination={step1Data.destination}
              onSelect={handleModeSelect}
              templateName={templateName}
              templateDaysCount={(prefilledDays || []).length}
            />
          </div>
        )}

        {/* Step 3a: start from a past itinerary */}
        {showTemplatePicker && step1Data && (
          <div className="animate-in fade-in duration-300">
            <TemplateSuggestionPage
              trip={templateTripContext}
              onApply={applySuggestedTemplate}
              onSkip={() => setTemplateStage('build')}
            />
          </div>
        )}

        {/* Step 3: Hotels — one focused pass over every day */}
        {step === 3 && !showTemplatePicker && step1Data && mode === 'single' && (
          <div className="animate-in fade-in space-y-5 duration-300">
            <div className="mx-auto w-full max-w-5xl">
              <TemplateNoMatchNote trip={templateTripContext} />
            </div>
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
        {step === 3 && !showTemplatePicker && step1Data && mode === 'multi' && (
          <div className="animate-in fade-in space-y-5 duration-300">
            <div className="mx-auto w-full max-w-5xl">
              <TemplateNoMatchNote trip={templateTripContext} />
            </div>
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
          <div className="animate-in fade-in space-y-5 duration-300">
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
              isSaving={createItinerary.isPending}
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
              isSaving={createItinerary.isPending}
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
              isSaving={createItinerary.isPending}
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
              isSaving={createItinerary.isPending}
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
              isSaving={createItinerary.isPending}
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

export default function NewItineraryPage() {
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
      <NewItineraryInner />
    </Suspense>
  );
}
