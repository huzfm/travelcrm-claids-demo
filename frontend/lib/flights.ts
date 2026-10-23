import type { FlightDirection, FlightSegment } from '@/types/itinerary.types';

/** A blank segment for the "Add flight" button. */
export function createEmptyFlight(
  direction: FlightDirection = 'OUTBOUND',
  defaults: Partial<FlightSegment> = {}
): FlightSegment {
  return {
    id: `flight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    direction,
    flightNumber: '',
    source: 'MANUAL',
    ...defaults,
  };
}

/** "6e2134", "6E 2134" and "6E-2134" all become "6E-2134". */
export function normalizeFlightNumber(input: string): string {
  const raw = (input || '').toUpperCase().replace(/[\s-]/g, '');
  const match = raw.match(/^([A-Z0-9]{2,3}?)(\d{1,4})$/);
  if (!match) return (input || '').toUpperCase().trim();
  return `${match[1]}-${match[2]}`;
}

/** 165 → "2h 45m". Returns '' when the duration is unknown. */
export function formatFlightDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Minutes between departure and arrival, for flights typed by hand. Arrival on
 * the next calendar day is handled through the dates; when the arrival date is
 * missing, a clock that runs backwards is read as an overnight flight.
 */
export function deriveDurationMinutes(flight: FlightSegment): number | undefined {
  const { departureDate, departureTime, arrivalDate, arrivalTime } = flight;
  if (!departureTime || !arrivalTime) return undefined;

  const toMinutes = (time: string): number | undefined => {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return undefined;
    const hours = Number(match[1]);
    const mins = Number(match[2]);
    if (hours > 23 || mins > 59) return undefined;
    return hours * 60 + mins;
  };

  const start = toMinutes(departureTime);
  const end = toMinutes(arrivalTime);
  if (start === undefined || end === undefined) return undefined;

  let dayOffset = 0;
  if (departureDate && arrivalDate) {
    const from = Date.parse(`${departureDate}T00:00:00`);
    const to = Date.parse(`${arrivalDate}T00:00:00`);
    if (Number.isFinite(from) && Number.isFinite(to)) {
      dayOffset = Math.round((to - from) / 86400000);
    }
  } else if (end < start) {
    dayOffset = 1;
  }

  const duration = end - start + dayOffset * 1440;
  return duration > 0 ? duration : undefined;
}

/** "DEL → SXR", or whatever half of it is known. */
export function formatFlightRoute(flight: FlightSegment): string {
  const from = flight.departureCode || flight.departureCity || '';
  const to = flight.arrivalCode || flight.arrivalCity || '';
  if (from && to) return `${from} → ${to}`;
  return from || to;
}

/** A one-line summary for lists and share messages. */
export function formatFlightSummary(flight: FlightSegment): string {
  const parts = [flight.flightNumber, formatFlightRoute(flight)].filter(Boolean);
  const time = [flight.departureDate, flight.departureTime].filter(Boolean).join(' ');
  if (time) parts.push(time);
  return parts.join(' · ');
}

/** Whether a segment carries enough to be worth saving or showing. */
export function isFlightFilled(flight: FlightSegment): boolean {
  return Boolean(
    (flight.flightNumber || '').trim() ||
    (flight.departureCode || '').trim() ||
    (flight.arrivalCode || '').trim()
  );
}

/** Informational only — flight fares are not part of package pricing. */
export function flightsTotalFare(flights: FlightSegment[]): number {
  return flights.reduce((sum, flight) => {
    const explicit = flight.totalFare;
    if (typeof explicit === 'number' && Number.isFinite(explicit)) return sum + explicit;
    const per = flight.farePerPerson || 0;
    const pax = flight.passengers || 0;
    return sum + per * pax;
  }, 0);
}

/** Drops blank rows the agent added and never filled. */
export function cleanFlightsForSave(flights: FlightSegment[]): FlightSegment[] {
  return flights.filter(isFlightFilled);
}
