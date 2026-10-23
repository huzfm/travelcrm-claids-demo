'use client';

import { useCallback, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Loader2,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useFlightLookup, useFlightProvider } from '@/hooks/useFlightLookup';
import {
  createEmptyFlight,
  deriveDurationMinutes,
  flightsTotalFare,
  formatFlightDuration,
  formatFlightRoute,
  isFlightFilled,
  normalizeFlightNumber,
} from '@/lib/flights';
import {
  FLIGHT_CABIN_CLASSES,
  FLIGHT_DIRECTION_LABELS,
  type FlightDirection,
  type FlightSegment,
} from '@/types/itinerary.types';

const DIRECTIONS: FlightDirection[] = ['OUTBOUND', 'RETURN', 'INTERNAL'];

const CABIN_LABELS: Record<string, string> = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First',
};

/** The leg's icon. A component rather than a returned type, so React sees a
 *  stable element type across renders. */
function DirectionIcon({
  direction,
  className,
}: {
  direction: FlightDirection;
  className?: string;
}) {
  if (direction === 'RETURN') return <PlaneLanding className={className} />;
  if (direction === 'INTERNAL') return <Plane className={className} />;
  return <PlaneTakeoff className={className} />;
}

export interface FlightsEditorProps {
  flights: FlightSegment[];
  onChange: (flights: FlightSegment[]) => void;
  /** Trip dates, used to default a new segment's dates. */
  startDate?: string;
  endDate?: string;
  /** Defaults the passenger count on a new segment. */
  travelers?: number;
  currency?: string;
}

/**
 * The flights list itself — the sample-data warning, one card per segment, the
 * add buttons and the fare note. Shared by the builder's flight step and the
 * itinerary detail page's edit dialog, so both edit flights the same way.
 */
export function FlightsEditor({
  flights,
  onChange,
  startDate,
  endDate,
  travelers,
  currency = 'INR',
}: FlightsEditorProps) {
  // Collapsed by default past the first two, so a long list stays scannable.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { data: provider } = useFlightProvider();

  const isExpanded = (flight: FlightSegment, index: number) =>
    expanded[flight.id] ?? (index < 2 || !isFlightFilled(flight));

  const toggle = (id: string, next: boolean) => setExpanded(prev => ({ ...prev, [id]: next }));

  const update = useCallback(
    (id: string, patch: Partial<FlightSegment>) => {
      onChange(
        flights.map(flight => {
          if (flight.id !== id) return flight;
          const merged = { ...flight, ...patch };
          // Keep the duration honest whenever a time or date moves, unless the
          // agent typed one in themselves.
          const derived = deriveDurationMinutes(merged);
          if (derived !== undefined) merged.durationMinutes = derived;
          return merged;
        })
      );
    },
    [flights, onChange]
  );

  const addFlight = (direction: FlightDirection) => {
    // The outbound leaves on day one and the return comes back on the last day —
    // the common case, and still editable.
    const defaultDate = direction === 'RETURN' ? endDate || startDate || '' : startDate || '';
    const flight = createEmptyFlight(direction, {
      departureDate: defaultDate,
      arrivalDate: defaultDate,
      passengers: travelers && travelers > 0 ? travelers : undefined,
    });
    onChange([...flights, flight]);
    toggle(flight.id, true);
  };

  const duplicateAsReturn = (flight: FlightSegment) => {
    const copy = createEmptyFlight('RETURN', {
      // A return is the same trip backwards: swap the airports, keep the airline
      // and passengers, and clear what must be looked up or typed again.
      airline: flight.airline,
      airlineCode: flight.airlineCode,
      cabinClass: flight.cabinClass,
      departureAirport: flight.arrivalAirport,
      departureCode: flight.arrivalCode,
      departureCity: flight.arrivalCity,
      departureTerminal: flight.arrivalTerminal,
      departureDate: endDate || flight.arrivalDate,
      arrivalAirport: flight.departureAirport,
      arrivalCode: flight.departureCode,
      arrivalCity: flight.departureCity,
      arrivalTerminal: flight.departureTerminal,
      arrivalDate: endDate || flight.arrivalDate,
      passengers: flight.passengers,
      baggage: flight.baggage,
    });
    onChange([...flights, copy]);
    toggle(copy.id, true);
  };

  const remove = (id: string) => onChange(flights.filter(flight => flight.id !== id));

  const filled = flights.filter(isFlightFilled);
  const fareTotal = flightsTotalFare(filled);

  return (
    <div className="space-y-4">
      {provider?.isMock && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-red-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs">
            <span className="font-semibold">Lookup returns sample data.</span> No live flight data
            provider is connected yet, so fetched schedules are realistic placeholders — check every
            time and terminal before sending this to a client.
          </p>
        </div>
      )}

      {flights.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Plane className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">No flights added</p>
              <p className="text-sm text-muted-foreground">
                Add the outbound and return legs, plus any flights between destinations.
              </p>
            </div>
            <Button type="button" onClick={() => addFlight('OUTBOUND')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add first flight
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {flights.map((flight, index) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            index={index}
            currency={currency}
            expanded={isExpanded(flight, index)}
            onToggle={next => toggle(flight.id, next)}
            onUpdate={patch => update(flight.id, patch)}
            onRemove={() => remove(flight.id)}
            onDuplicateAsReturn={() => duplicateAsReturn(flight)}
            isMockProvider={Boolean(provider?.isMock)}
          />
        ))}
      </div>

      {flights.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {DIRECTIONS.map(direction => (
            <Button
              key={direction}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addFlight(direction)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add {FLIGHT_DIRECTION_LABELS[direction].toLowerCase()} flight
            </Button>
          ))}
        </div>
      )}

      {fareTotal > 0 && (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                Airfare across {filled.length} flight{filled.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatCurrency(fareTotal, currency)}</p>
              <p className="text-xs text-muted-foreground">
                Shown on the itinerary only — not added to the package total
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── One flight ───────────────────────────────────────────────────────────────

interface FlightCardProps {
  flight: FlightSegment;
  index: number;
  currency: string;
  expanded: boolean;
  onToggle: (next: boolean) => void;
  onUpdate: (patch: Partial<FlightSegment>) => void;
  onRemove: () => void;
  onDuplicateAsReturn: () => void;
  isMockProvider: boolean;
}

function FlightCard({
  flight,
  index,
  currency,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
  onDuplicateAsReturn,
  isMockProvider,
}: FlightCardProps) {
  const lookup = useFlightLookup();
  const [lookupNumber, setLookupNumber] = useState(flight.flightNumber || '');
  const [lookupDate, setLookupDate] = useState(flight.departureDate || '');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FlightSegment | null>(null);

  const route = formatFlightRoute(flight);
  const duration = formatFlightDuration(flight.durationMinutes);

  const runLookup = async () => {
    setLookupError(null);
    setPreview(null);
    if (!lookupNumber.trim() || !lookupDate) {
      setLookupError('Enter both a flight number and the travel date.');
      return;
    }
    try {
      const result = await lookup.mutateAsync({
        flightNumber: lookupNumber.trim(),
        date: lookupDate,
      });
      setPreview({ ...flight, ...result.flight, isSample: result.isMock });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setLookupError(
        e?.response?.data?.error || e?.message || 'Lookup failed. Enter the details manually.'
      );
    }
  };

  /**
   * Applies the fetched schedule. Only the fields a provider can know are
   * copied — the agent's own booking details (PNR, seats, passengers, fare,
   * notes) and the leg they picked are left exactly as they are.
   */
  const applyPreview = () => {
    if (!preview) return;
    onUpdate({
      airline: preview.airline,
      airlineCode: preview.airlineCode,
      flightNumber: preview.flightNumber,
      aircraft: preview.aircraft,
      cabinClass: preview.cabinClass,
      departureAirport: preview.departureAirport,
      departureCode: preview.departureCode,
      departureCity: preview.departureCity,
      departureTerminal: preview.departureTerminal,
      departureDate: preview.departureDate,
      departureTime: preview.departureTime,
      arrivalAirport: preview.arrivalAirport,
      arrivalCode: preview.arrivalCode,
      arrivalCity: preview.arrivalCity,
      arrivalTerminal: preview.arrivalTerminal,
      arrivalDate: preview.arrivalDate,
      arrivalTime: preview.arrivalTime,
      durationMinutes: preview.durationMinutes,
      stops: preview.stops,
      baggage: preview.baggage,
      source: preview.source,
      provider: preview.provider,
      isSample: preview.isSample,
      fetchedAt: preview.fetchedAt,
    });
    setPreview(null);
  };

  // What the total-fare field falls back to as a placeholder.
  const fareTotal = flight.totalFare ?? (flight.farePerPerson || 0) * (flight.passengers || 0);

  return (
    <Card className={cn(flight.direction === 'RETURN' && 'border-l-4 border-l-primary/30')}>
      <CardContent className="space-y-4 pt-4">
        {/* Summary row — always visible */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onToggle(!expanded)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <div className="rounded-lg bg-primary/10 p-2">
              <DirectionIcon direction={flight.direction} className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {FLIGHT_DIRECTION_LABELS[flight.direction]}
                </Badge>
                <span className="font-semibold">
                  {flight.flightNumber || `Flight ${index + 1}`}
                </span>
                {flight.airline && (
                  <span className="text-sm text-muted-foreground">{flight.airline}</span>
                )}
                {flight.source === 'API' && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      flight.isSample
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-neutral-300 bg-neutral-50 text-neutral-700'
                    )}
                  >
                    {flight.isSample ? 'Sample data' : 'From lookup'}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[
                  route,
                  [flight.departureDate, flight.departureTime].filter(Boolean).join(' '),
                  duration,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Not filled in yet'}
              </p>
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            {flight.direction === 'OUTBOUND' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDuplicateAsReturn}
                title="Create the return leg from this flight"
                className="gap-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add return</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggle(!expanded)}
              className="px-2"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="px-2 text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="space-y-4">
            {/* ── Lookup ─────────────────────────────────────────────────── */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Fetch by flight number</Label>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={lookupNumber}
                  onChange={e => setLookupNumber(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      runLookup();
                    }
                  }}
                  placeholder="6E 2134"
                  className="h-9 text-sm sm:max-w-[160px]"
                />
                <Input
                  type="date"
                  value={lookupDate}
                  onChange={e => setLookupDate(e.target.value)}
                  className="h-9 text-sm sm:max-w-[180px]"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={runLookup}
                  disabled={lookup.isPending}
                  className="h-9 gap-1.5"
                >
                  {lookup.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Search className="h-3.5 w-3.5" />
                  )}
                  Fetch
                </Button>
              </div>
              {lookupError && <p className="mt-2 text-xs text-red-600">{lookupError}</p>}

              {preview && (
                <div className="mt-3 rounded-md border bg-background p-3">
                  {isMockProvider && (
                    <p className="mb-2 text-[11px] font-medium text-red-700">
                      Sample schedule — verify before quoting
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-primary" />
                    <span className="font-semibold">
                      {preview.airline} {preview.flightNumber}
                    </span>
                    {preview.aircraft && (
                      <span className="text-xs text-muted-foreground">· {preview.aircraft}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm">
                    {preview.departureCode}
                    {preview.departureTerminal ? ` T${preview.departureTerminal}` : ''}{' '}
                    <span className="font-medium">{preview.departureTime}</span>
                    {'  →  '}
                    {preview.arrivalCode}
                    {preview.arrivalTerminal ? ` T${preview.arrivalTerminal}` : ''}{' '}
                    <span className="font-medium">{preview.arrivalTime}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      formatFlightDuration(preview.durationMinutes),
                      preview.stops === 0 ? 'Non-stop' : `${preview.stops} stop(s)`,
                      preview.arrivalDate && preview.arrivalDate !== preview.departureDate
                        ? `Arrives ${preview.arrivalDate}`
                        : '',
                      preview.baggage,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" onClick={applyPreview}>
                      Use these details
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreview(null)}
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Manual fields ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Leg">
                <Select
                  value={flight.direction}
                  onValueChange={value => onUpdate({ direction: value as FlightDirection })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map(direction => (
                      <SelectItem key={direction} value={direction}>
                        {FLIGHT_DIRECTION_LABELS[direction]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Flight no.">
                <Input
                  value={flight.flightNumber || ''}
                  onChange={e => onUpdate({ flightNumber: e.target.value })}
                  onBlur={e => onUpdate({ flightNumber: normalizeFlightNumber(e.target.value) })}
                  placeholder="6E-2134"
                  className="h-9 text-sm"
                />
              </Field>

              <Field label="Airline">
                <Input
                  value={flight.airline || ''}
                  onChange={e => onUpdate({ airline: e.target.value })}
                  placeholder="IndiGo"
                  className="h-9 text-sm"
                />
              </Field>

              <Field label="Aircraft">
                <Input
                  value={flight.aircraft || ''}
                  onChange={e => onUpdate({ aircraft: e.target.value })}
                  placeholder="Airbus A320"
                  className="h-9 text-sm"
                />
              </Field>
            </div>

            {/* Departure */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <PlaneTakeoff className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Departure</Label>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Field label="Airport code">
                  <Input
                    value={flight.departureCode || ''}
                    onChange={e => onUpdate({ departureCode: e.target.value.toUpperCase() })}
                    placeholder="DEL"
                    maxLength={4}
                    className="h-9 text-sm uppercase"
                  />
                </Field>
                <Field label="City / airport" className="sm:col-span-2">
                  <Input
                    value={flight.departureCity || ''}
                    onChange={e => onUpdate({ departureCity: e.target.value })}
                    placeholder="Delhi"
                    className="h-9 text-sm"
                  />
                </Field>
                <Field label="Terminal">
                  <Input
                    value={flight.departureTerminal || ''}
                    onChange={e => onUpdate({ departureTerminal: e.target.value })}
                    placeholder="3"
                    className="h-9 text-sm"
                  />
                </Field>
                <Field label="Date">
                  <Input
                    type="date"
                    value={flight.departureDate || ''}
                    onChange={e => onUpdate({ departureDate: e.target.value })}
                    className="h-9 text-sm"
                  />
                </Field>
                <Field label="Time">
                  <Input
                    type="time"
                    value={flight.departureTime || ''}
                    onChange={e => onUpdate({ departureTime: e.target.value })}
                    className="h-9 text-sm"
                  />
                </Field>
              </div>
            </div>

            {/* Arrival */}
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2">
                <PlaneLanding className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold">Arrival</Label>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <Field label="Airport code">
                  <Input
                    value={flight.arrivalCode || ''}
                    onChange={e => onUpdate({ arrivalCode: e.target.value.toUpperCase() })}
                    placeholder="SXR"
                    maxLength={4}
                    className="h-9 text-sm uppercase"
                  />
                </Field>
                <Field label="City / airport" className="sm:col-span-2">
                  <Input
                    value={flight.arrivalCity || ''}
                    onChange={e => onUpdate({ arrivalCity: e.target.value })}
                    placeholder="Srinagar"
                    className="h-9 text-sm"
                  />
                </Field>
                <Field label="Terminal">
                  <Input
                    value={flight.arrivalTerminal || ''}
                    onChange={e => onUpdate({ arrivalTerminal: e.target.value })}
                    placeholder="2"
                    className="h-9 text-sm"
                  />
                </Field>
                <Field label="Date">
                  <Input
                    type="date"
                    value={flight.arrivalDate || ''}
                    onChange={e => onUpdate({ arrivalDate: e.target.value })}
                    className="h-9 text-sm"
                  />
                </Field>
                <Field label="Time">
                  <Input
                    type="time"
                    value={flight.arrivalTime || ''}
                    onChange={e => onUpdate({ arrivalTime: e.target.value })}
                    className="h-9 text-sm"
                  />
                </Field>
              </div>
              {duration && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Flight time {duration}
                  {flight.arrivalDate &&
                    flight.departureDate &&
                    flight.arrivalDate !== flight.departureDate &&
                    ' · arrives the next day'}
                </p>
              )}
            </div>

            {/* Booking */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Class">
                <Select
                  value={flight.cabinClass || ''}
                  onValueChange={value => onUpdate({ cabinClass: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Economy" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLIGHT_CABIN_CLASSES.map(cabin => (
                      <SelectItem key={cabin} value={cabin}>
                        {CABIN_LABELS[cabin]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="PNR">
                <Input
                  value={flight.pnr || ''}
                  onChange={e => onUpdate({ pnr: e.target.value.toUpperCase() })}
                  placeholder="ABC123"
                  className="h-9 text-sm uppercase"
                />
              </Field>
              <Field label="Seats">
                <Input
                  value={flight.seats || ''}
                  onChange={e => onUpdate({ seats: e.target.value })}
                  placeholder="12A, 12B"
                  className="h-9 text-sm"
                />
              </Field>
              <Field label="Baggage">
                <Input
                  value={flight.baggage || ''}
                  onChange={e => onUpdate({ baggage: e.target.value })}
                  placeholder="15kg + 7kg"
                  className="h-9 text-sm"
                />
              </Field>
            </div>

            {/* Fare — informational, never folded into package pricing */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Passengers">
                <Input
                  type="number"
                  min={0}
                  value={flight.passengers ?? ''}
                  onChange={e =>
                    onUpdate({
                      passengers: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm"
                />
              </Field>
              <Field label={`Fare / person (${currency})`}>
                <Input
                  type="number"
                  min={0}
                  value={flight.farePerPerson ?? ''}
                  onChange={e =>
                    onUpdate({
                      farePerPerson: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="h-9 text-sm"
                />
              </Field>
              <Field label={`Total fare (${currency})`}>
                <Input
                  type="number"
                  min={0}
                  value={flight.totalFare ?? ''}
                  onChange={e =>
                    onUpdate({
                      totalFare: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder={fareTotal > 0 ? String(fareTotal) : ''}
                  className="h-9 text-sm"
                />
              </Field>
              <Field label="Stops">
                <Input
                  type="number"
                  min={0}
                  value={flight.stops ?? ''}
                  onChange={e =>
                    onUpdate({
                      stops: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="0"
                  className="h-9 text-sm"
                />
              </Field>
            </div>

            <Field label="Notes for the client">
              <Textarea
                value={flight.notes || ''}
                onChange={e => onUpdate({ notes: e.target.value })}
                placeholder="Web check-in opens 48h before departure. Reach the airport 2h early."
                rows={2}
                className="text-sm"
              />
            </Field>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
