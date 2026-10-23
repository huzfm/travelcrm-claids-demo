'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Users,
  MapPin,
  Sparkles,
  ArrowRight,
  User,
  Mail,
  Phone,
  Baby,
  Moon,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useItineraryPrefill } from '@/hooks/use-itinerary-prefill';
import { useDestinationTree } from '@/hooks/useDestinations';
import { cn } from '@/lib/utils';
import { CURRENCIES } from '@/data/currencies';
import { resizeChildrenAges, type Step1FormData } from '../types';

const MAX_CHILD_AGE = 17;
const MAX_NIGHTS = 60;
/** Matches `calculateDays`'s own fallback of a 3-day trip. */
const DEFAULT_NIGHTS = 2;

/**
 * Parses a `yyyy-MM-dd` field value in local time. `new Date(value)` reads it
 * as UTC, which lands on the previous day west of Greenwich.
 */
function parseDateInput(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/** Radix Select rejects an empty item value, so free-text legacy values need one. */
const UNLISTED = '__unlisted__';

interface Step1DetailsFormProps {
  lead?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string | null;
    destination?: string | null;
    numberOfPax?: string | null;
    childrenCount?: number;
    travelDateFrom?: string | null;
    travelDateTo?: string | null;
  } | null;
  onNext: (data: Step1FormData) => void;
  prefillClientName?: string;
  prefillTripName?: string;
  prefillDestination?: string;
  prefillDestinationId?: string;
  prefillTripType?: string;
  prefillStartDate?: string;
  prefillEndDate?: string;
  /** Total heads. Only used when `prefillAdults` is not supplied. */
  prefillTravelers?: number;
  prefillAdults?: number;
  prefillChildren?: number;
  prefillChildrenAges?: number[];
  prefillCurrency?: string;
  templateName?: string;
  daysCount?: number;
  /** Lets the wizard's progress bar submit this form before jumping to another step. */
  formId?: string;
}

// Compute initial form state from props (avoids cascading useEffect renders)
function getInitialForm(props: Step1DetailsFormProps) {
  const lead = props.lead;

  const children = props.prefillChildren ?? lead?.childrenCount ?? 0;

  // `prefillTravelers` is a head count, so back the adults out of it when the
  // caller didn't split them itself.
  const leadPax = lead?.id ? parseInt(String(lead.numberOfPax)) || 2 : 2;
  const adults =
    props.prefillAdults ??
    (props.prefillTravelers != null
      ? Math.max(1, props.prefillTravelers - children)
      : Math.max(1, leadPax));

  // Use prefill* props if provided, otherwise fall back to lead fields
  const startDate =
    props.prefillStartDate ||
    (lead?.travelDateFrom ? new Date(lead.travelDateFrom).toISOString().split('T')[0] : '');
  const endDate =
    props.prefillEndDate ||
    (lead?.travelDateTo ? new Date(lead.travelDateTo).toISOString().split('T')[0] : '');
  const destination = props.prefillDestination || lead?.destination || '';

  // The end date is derived from the nights, so an existing itinerary's dates
  // are converted back into a night count when the form loads.
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  const nights = start && end ? Math.max(0, differenceInCalendarDays(end, start)) : DEFAULT_NIGHTS;

  return {
    clientName: props.prefillClientName || lead?.name || '',
    tripName: props.prefillTripName || '',
    destination,
    destinationId: props.prefillDestinationId || '',
    tripType: props.prefillTripType || '',
    startDate,
    nights,
    adults,
    children,
    childrenAges: resizeChildrenAges(props.prefillChildrenAges ?? [], children),
    currency: props.prefillCurrency || 'INR',
  };
}

type FormState = ReturnType<typeof getInitialForm>;

// ─── Section shell ────────────────────────────────────────────────────────────

function FormSection({
  step,
  title,
  description,
  complete,
  className,
  children,
}: {
  step: number;
  title: string;
  description: string;
  complete?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        // Grid rows stretch, so the card fills the tallest card in its row.
        'flex flex-col overflow-hidden',
        // Card lifts on hover by default, which is distracting while typing.
        'hover:translate-y-0',
        className
      )}
    >
      <CardHeader className="border-b bg-muted/40 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
              complete ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
            )}
          >
            {complete ? <Check className="h-3.5 w-3.5" /> : step}
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate text-base leading-snug">{title}</CardTitle>
            <CardDescription className="text-xs leading-snug">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 p-5">{children}</CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

// ─── Counter row ──────────────────────────────────────────────────────────────

function CounterRow({
  label,
  hint,
  icon: Icon,
  value,
  min,
  onChange,
}: {
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  min: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-8 w-8"
          aria-label={`Remove one ${label.toLowerCase()}`}
        >
          –
        </Button>
        <span className="w-7 text-center text-lg font-bold tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(value + 1)}
          className="h-8 w-8"
          aria-label={`Add one ${label.toLowerCase()}`}
        >
          +
        </Button>
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function Step1DetailsForm(props: Step1DetailsFormProps) {
  const lead = props.lead;
  const templateName = props.templateName;
  const daysCount = props.daysCount;

  const [form, setForm] = useState<FormState>(() => getInitialForm(props));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const barInnerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  // The action bar is pinned to the viewport, so layout can't place it for us:
  // the sidebar is an in-flow flex sibling of <main> and changes width when it
  // collapses, and the step wrapper carries a transform while it fades in,
  // which makes `fixed` resolve against the wrapper instead of the viewport.
  // So measure where the form actually is and write the bar's box to the DOM.
  // Probing with left/bottom 0 first makes this correct under any containing
  // block. No state, no re-render.
  useEffect(() => {
    const root = rootRef.current;
    const bar = barRef.current;
    const inner = barInnerRef.current;
    const spacer = spacerRef.current;
    if (!root || !bar || !inner || !spacer) return;

    const align = () => {
      const rect = root.getBoundingClientRect();
      bar.style.left = '0px';
      bar.style.bottom = '0px';
      bar.style.width = `${rect.width}px`;
      const barRect = bar.getBoundingClientRect();
      bar.style.left = `${rect.left - barRect.left}px`;
      bar.style.bottom = `${barRect.bottom - window.innerHeight}px`;
      spacer.style.height = `${bar.offsetHeight}px`;
    };

    align();

    const observer = new ResizeObserver(align);
    observer.observe(root);
    observer.observe(bar);
    // <main> is the sidebar's flex sibling, so it resizes when the sidebar
    // collapses — which slides the form sideways without resizing it.
    const main = root.closest('main');
    if (main) observer.observe(main);
    // Re-align once the fade-in drops its transform.
    main?.addEventListener('animationend', align);
    window.addEventListener('resize', align);

    // The bar only slides in once the end of the form is on screen, so it stays
    // out of the way while the agent is filling the sections in. The spacer
    // sits at the end of the form, so it entering view *is* reaching the
    // bottom; a form shorter than the viewport shows the bar straight away.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        inner.classList.toggle('translate-y-full', !entry.isIntersecting);
        inner.classList.toggle('opacity-0', !entry.isIntersecting);
      },
      { root: main ?? null, threshold: 0 }
    );
    visibility.observe(spacer);

    return () => {
      observer.disconnect();
      visibility.disconnect();
      main?.removeEventListener('animationend', align);
      window.removeEventListener('resize', align);
    };
  }, []);

  const { data: destinationTree = [], isLoading: destinationsLoading } = useDestinationTree(true);

  // Re-initialize form whenever prefill props change from the parent
  // (e.g. when edit page loads itinerary data from API)
  const prefKeys = {
    clientName: props.prefillClientName,
    destination: props.prefillDestination,
    destinationId: props.prefillDestinationId,
    tripType: props.prefillTripType,
    startDate: props.prefillStartDate,
    endDate: props.prefillEndDate,
    travelers: props.prefillTravelers,
    adults: props.prefillAdults,
    children: props.prefillChildren,
    tripName: props.prefillTripName,
    currency: props.prefillCurrency,
  };
  const prevPrefs = useRef(prefKeys);
  // Once the agent has typed a night count, a late prefill (draft restore,
  // template load) must not overwrite it with one derived from stale dates.
  const nightsEdited = useRef(false);
  useEffect(() => {
    const changed = (Object.keys(prefKeys) as (keyof typeof prefKeys)[]).some(
      key => prefKeys[key] !== prevPrefs.current[key]
    );
    if (changed) {
      const next = getInitialForm(props);
      setForm(f => (nightsEdited.current ? { ...next, nights: f.nights } : next));
      prevPrefs.current = prefKeys;
    }
  });

  // Master destinations only — the per-day planner picks the places inside them.
  const masters = useMemo(() => destinationTree.filter(node => !node.parentId), [destinationTree]);

  // An itinerary saved before the master list existed keeps free text; surface
  // it as its own option so the value isn't silently dropped on edit.
  const matchedMaster = useMemo(
    () =>
      masters.find(
        node =>
          node.id === form.destinationId ||
          node.name.toLowerCase() === form.destination.trim().toLowerCase()
      ),
    [masters, form.destinationId, form.destination]
  );
  const unlistedDestination = !matchedMaster && form.destination.trim() ? form.destination : '';

  const totalTravelers = form.adults + form.children;

  // Start date + nights is what the agent enters; the end date is computed from
  // them and is what the rest of the wizard and the API consume.
  const nightsValid = Number.isFinite(form.nights) && form.nights >= 0 && form.nights <= MAX_NIGHTS;
  const startDateObj = parseDateInput(form.startDate);
  const endDateObj = startDateObj && nightsValid ? addDays(startDateObj, form.nights) : null;
  const endDate = endDateObj ? format(endDateObj, 'yyyy-MM-dd') : '';
  const days = startDateObj && nightsValid ? form.nights + 1 : 0;

  const { prefillData: _prefillData } = useItineraryPrefill({
    leadId: lead?.id || undefined,
    destination: form.destination || undefined,
    startDate: startDateObj ?? undefined,
    endDate: endDateObj ?? undefined,
    paxCount: totalTravelers,
  });

  const update = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const setNights = (raw: string) => {
    nightsEdited.current = true;
    setForm(f => ({ ...f, nights: raw === '' ? Number.NaN : Number(raw) }));
  };

  const setChildren = (count: number) =>
    setForm(f => ({
      ...f,
      children: count,
      childrenAges: resizeChildrenAges(f.childrenAges, count),
    }));

  const setChildAge = (index: number, raw: string) =>
    setForm(f => {
      const ages = resizeChildrenAges(f.childrenAges, f.children);
      ages[index] = raw === '' ? Number.NaN : Number(raw);
      return { ...f, childrenAges: ages };
    });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.clientName.trim()) errs.clientName = "Enter the client's name";
    if (!form.destination.trim()) errs.destination = 'Pick a destination from the master list';
    if (!form.startDate) errs.startDate = 'When does the trip start?';
    if (!Number.isFinite(form.nights)) errs.nights = 'How many nights?';
    else if (form.nights < 0) errs.nights = "Can't be negative";
    else if (form.nights > MAX_NIGHTS) errs.nights = `Up to ${MAX_NIGHTS} nights`;
    if (form.adults < 1) errs.adults = 'At least 1 adult is required';

    // Children drive child pricing downstream, so every age has to be filled in.
    const ages = resizeChildrenAges(form.childrenAges, form.children);
    ages.forEach((age, i) => {
      if (!Number.isFinite(age)) {
        errs[`childAge-${i}`] = 'Required';
      } else if (age < 0 || age > MAX_CHILD_AGE) {
        errs[`childAge-${i}`] = `0–${MAX_CHILD_AGE}`;
      }
    });
    if (form.children > 0 && Object.keys(errs).some(k => k.startsWith('childAge-'))) {
      errs.childrenAges = `Enter an age (0–${MAX_CHILD_AGE}) for each child`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    props.onNext({
      clientName: form.clientName.trim(),
      tripName: form.tripName.trim(),
      leadId: lead?.id || '',
      destination: form.destination,
      destinationId: matchedMaster?.id || form.destinationId || undefined,
      tripType: form.tripType,
      startDate: form.startDate,
      endDate,
      adults: form.adults,
      children: form.children,
      childrenAges: resizeChildrenAges(form.childrenAges, form.children),
      totalTravelers,
      currency: form.currency,
    });
  };

  const fallbackTitle = form.clientName.trim() ? `${form.clientName.trim()}'s Trip` : '';

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-5xl space-y-5">
      {templateName && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-3">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Using template</p>
              <p className="truncate text-sm font-semibold">{templateName}</p>
            </div>
            {daysCount != null && daysCount > 0 && (
              <Badge
                variant="outline"
                className="shrink-0 border-primary/30 bg-primary/10 text-primary"
              >
                {daysCount} days
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold sm:text-2xl">Plan Your Trip</h1>
        <p className="text-sm text-muted-foreground">Tell us who is travelling, where, and when</p>
      </div>

      {lead && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold sm:text-base">{lead.name}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {lead.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {lead.phone}
                  </span>
                )}
                {lead.email && (
                  <span className="flex min-w-0 items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </span>
                )}
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 bg-primary/10">
              Client
            </Badge>
          </CardContent>
        </Card>
      )}

      <form id={props.formId} onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <FormSection
            step={1}
            title="Client & Trip"
            description="Who the itinerary is for, and what to call it"
            complete={!!form.clientName.trim()}
          >
            <div className="space-y-1.5">
              <Label htmlFor="f-client" className="text-sm font-medium">
                Client Name *
              </Label>
              <Input
                id="f-client"
                icon={<User className="h-4 w-4" />}
                value={form.clientName}
                onChange={e => update({ clientName: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                error={errors.clientName}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-trip" className="text-sm font-medium">
                Trip Name <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="f-trip"
                value={form.tripName}
                onChange={e => update({ tripName: e.target.value })}
                placeholder={fallbackTitle || 'e.g. Kashmir Honeymoon Trip'}
                hint={
                  fallbackTitle
                    ? `Leave blank to use "${fallbackTitle}"`
                    : "Leave blank to use the client's name"
                }
                className="h-11"
              />
            </div>
          </FormSection>

          <FormSection
            step={2}
            title="Travel Dates"
            description="Start date and how many nights — the end date follows"
            complete={!!form.startDate && nightsValid}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-start" className="text-sm font-medium">
                  Start Date *
                </Label>
                <Input
                  id="f-start"
                  type="date"
                  value={form.startDate}
                  onChange={e => update({ startDate: e.target.value })}
                  error={errors.startDate}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-nights" className="text-sm font-medium">
                  Nights *
                </Label>
                <Input
                  id="f-nights"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_NIGHTS}
                  icon={<Moon className="h-4 w-4" />}
                  value={Number.isFinite(form.nights) ? String(form.nights) : ''}
                  onChange={e => setNights(e.target.value)}
                  // Chrome steps a focused number field on wheel, so scrolling
                  // down to the action bar would quietly drop the count to 0.
                  onWheel={e => e.currentTarget.blur()}
                  error={errors.nights}
                  hint={!errors.nights ? '0 nights = a single-day trip' : undefined}
                  className="h-11"
                />
              </div>
            </div>

            <div
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                days > 0 ? 'border-primary/30 bg-primary/10' : 'border-dashed bg-muted/30'
              )}
            >
              <Calendar
                className={cn(
                  'h-4 w-4 shrink-0',
                  days > 0 ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              {days > 0 && startDateObj && endDateObj ? (
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">
                    {days} Day{days !== 1 ? 's' : ''} · {form.nights} Night
                    {form.nights !== 1 ? 's' : ''}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {format(startDateObj, 'EEE, MMM d')} → {format(endDateObj, 'EEE, MMM d, yyyy')}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pick a start date and the number of nights
                </p>
              )}
            </div>
          </FormSection>

          <FormSection
            step={3}
            title="Destination"
            description="Where they're going"
            complete={!!form.destination.trim()}
            className="lg:col-span-2"
          >
            <div className="space-y-1.5 sm:max-w-sm">
              <Label className="text-sm font-medium">Destination *</Label>
              <Select
                value={matchedMaster?.id || (unlistedDestination ? UNLISTED : '')}
                onValueChange={id => {
                  if (id === UNLISTED) return;
                  const node = masters.find(m => m.id === id);
                  update({ destination: node?.name || '', destinationId: node?.id || '' });
                }}
                disabled={destinationsLoading}
              >
                {/* A <div> wrapper, not a <span>: the trigger applies
                    `[&>span]:line-clamp-1`, which would break a flex span. */}
                <SelectTrigger
                  className={cn('h-11', errors.destination && 'border-destructive')}
                  aria-label="Destination"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue
                      placeholder={
                        destinationsLoading ? 'Loading destinations…' : 'Select a destination'
                      }
                    />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {unlistedDestination && (
                    <SelectItem value={UNLISTED}>{unlistedDestination} (not in list)</SelectItem>
                  )}
                  {masters.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name}
                      {node.country ? (
                        <span className="ml-2 text-xs text-muted-foreground">{node.country}</span>
                      ) : null}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.destination} />
              {unlistedDestination && !errors.destination && (
                <p className="text-xs text-red-600 dark:text-red-500">
                  Not a master destination — pick one to link hotels and activities.
                </p>
              )}
              {!destinationsLoading && masters.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No destinations yet — add one on the Destinations page first.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection
            step={4}
            title="Travellers"
            description="How many adults and children are going"
            complete={form.adults >= 1 && !errors.childrenAges}
          >
            <div className="space-y-2.5">
              <CounterRow
                label="Adults"
                hint="12 years and above"
                icon={Users}
                value={form.adults}
                min={1}
                onChange={next => update({ adults: next })}
              />
              <CounterRow
                label="Children"
                hint={`Under ${MAX_CHILD_AGE + 1} years`}
                icon={Baby}
                value={form.children}
                min={0}
                onChange={setChildren}
              />
            </div>

            {form.children > 0 && (
              <div className="space-y-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                <div>
                  <p className="text-sm font-medium">Age of each child *</p>
                  <p className="text-xs text-muted-foreground">
                    Hotels and activities price children by age.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                  {Array.from({ length: form.children }).map((_, i) => {
                    const age = form.childrenAges[i];
                    return (
                      <div key={i} className="space-y-1">
                        <Label htmlFor={`f-child-${i}`} className="text-xs text-muted-foreground">
                          Child {i + 1}
                        </Label>
                        <Input
                          id={`f-child-${i}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={MAX_CHILD_AGE}
                          value={Number.isFinite(age) ? String(age) : ''}
                          onChange={e => setChildAge(i, e.target.value)}
                          onWheel={e => e.currentTarget.blur()}
                          placeholder="—"
                          className={cn(
                            'h-10 px-2 text-center',
                            errors[`childAge-${i}`] && 'border-2 border-destructive'
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
                <FieldError message={errors.childrenAges} />
              </div>
            )}

            <div className="flex flex-wrap items-baseline justify-center gap-x-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="font-bold">
                {totalTravelers} traveller{totalTravelers !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                {form.adults} adult{form.adults !== 1 ? 's' : ''}
                {form.children > 0 && `, ${form.children} child${form.children !== 1 ? 'ren' : ''}`}
              </span>
            </div>

            <FieldError message={errors.adults} />
          </FormSection>

          <FormSection
            step={5}
            title="Pricing Currency"
            description="The currency prices are shown in on this itinerary"
            complete={!!form.currency}
          >
            <div className="grid grid-cols-3 gap-2">
              {CURRENCIES.map(curr => (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => update({ currency: curr.code })}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 text-center transition-colors',
                    form.currency === curr.code
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background hover:border-primary/60'
                  )}
                >
                  <span className="text-sm font-bold leading-none">
                    {curr.symbol} {curr.code}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{curr.name}</span>
                </button>
              ))}
            </div>
          </FormSection>
        </div>

        {/* Keeps the last card clear of the fixed bar; height is set from JS. */}
        <div ref={spacerRef} aria-hidden className="h-24 max-lg:hidden" />

        {/* Outer shell only positions; it must stay transform-free so the
            aligner can measure it. The inner element is what slides in.
            Below lg the bar sits in flow instead: mobile browser toolbars
            resize the viewport while scrolling, which leaves the pinned bar
            floating mid-screen. */}
        <div
          ref={barRef}
          className="pointer-events-none fixed bottom-0 left-0 z-30 w-full max-lg:static"
        >
          <div
            ref={barInnerRef}
            className="pointer-events-auto translate-y-full border-t bg-background/95 px-4 py-3 opacity-0 shadow-lg backdrop-blur transition-[transform,opacity] duration-200 ease-out max-lg:translate-y-0 max-lg:border-0 max-lg:pb-0 max-lg:bg-transparent max-lg:px-0 max-lg:opacity-100 max-lg:shadow-none max-lg:backdrop-blur-none"
          >
            {days > 0 && form.destination && (
              <p className="mb-2 truncate text-center text-xs text-muted-foreground">
                {form.destination} · {days} days · {totalTravelers} traveller
                {totalTravelers !== 1 ? 's' : ''} · {form.currency}
              </p>
            )}
            <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base font-semibold">
              Continue to Build Itinerary
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
