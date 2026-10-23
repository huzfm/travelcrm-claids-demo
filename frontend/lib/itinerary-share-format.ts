/**
 * Turns an itinerary into something you can paste into WhatsApp or an email.
 *
 * Both formats are built from the same tree of sections so that a toggle means
 * the same thing in either one, and so the WhatsApp text and the email never
 * drift apart. Nothing here touches React or the DOM.
 */

import { formatCurrency } from '@/lib/currency';
import { activitiesNotInDescription } from '@/lib/activities-in-description';
import type { FlightSegment, ItineraryDay } from '@/types/itinerary.types';

/* ─── options ──────────────────────────────────────────────────────────── */

export interface ShareOptions {
  /** Opening line and the sign-off with the agency's contact details. */
  greeting: boolean;
  tripId: boolean;
  totalPrice: boolean;
  /** Hotels / transport / activities subtotals under the total. */
  priceBreakup: boolean;
  /** The trip's flights, when the agency booked them. */
  flights: boolean;
  hotels: boolean;
  hotelPrices: boolean;
  transport: boolean;
  transportPrices: boolean;
  /** The day-by-day plan with descriptions and activities. */
  itinerary: boolean;
  activityPrices: boolean;
  meals: boolean;
  inclusions: boolean;
  exclusions: boolean;
  notes: boolean;
  terms: boolean;
}

export const DEFAULT_SHARE_OPTIONS: ShareOptions = {
  greeting: true,
  tripId: true,
  totalPrice: true,
  priceBreakup: false,
  flights: true,
  hotels: true,
  hotelPrices: false,
  transport: true,
  transportPrices: false,
  itinerary: true,
  activityPrices: false,
  meals: true,
  inclusions: true,
  exclusions: true,
  notes: false,
  terms: false,
};

/** Grouped for the toggle row, in the order they are shown. */
export const SHARE_OPTION_GROUPS: {
  label: string;
  options: { key: keyof ShareOptions; label: string; hint?: string }[];
}[] = [
  {
    label: 'Sections',
    options: [
      { key: 'greeting', label: 'Greeting & signature' },
      { key: 'tripId', label: 'Trip ID' },
      { key: 'flights', label: 'Flights' },
      { key: 'hotels', label: 'Hotels' },
      { key: 'transport', label: 'Transport' },
      { key: 'itinerary', label: 'Day-wise itinerary' },
      { key: 'meals', label: 'Meals' },
      { key: 'inclusions', label: 'Inclusions' },
      { key: 'exclusions', label: 'Exclusions' },
      { key: 'notes', label: 'Notes' },
      { key: 'terms', label: 'Terms' },
    ],
  },
  {
    label: 'Pricing',
    options: [
      { key: 'totalPrice', label: 'Total price' },
      { key: 'priceBreakup', label: 'Price breakup', hint: 'Component-wise totals' },
      { key: 'hotelPrices', label: 'Hotel prices' },
      { key: 'transportPrices', label: 'Transport prices' },
      { key: 'activityPrices', label: 'Activity prices' },
    ],
  },
];

/* ─── input ────────────────────────────────────────────────────────────── */

export interface ShareItineraryData {
  title: string;
  destination: string;
  tripId?: string | null;
  refId?: string;
  clientName?: string;
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
  travelers: number;
  currency: string;
  totalCost: number;
  days: ItineraryDay[];
  /** Trip-level flights, in order. */
  flights?: FlightSegment[];
  /** Stored as a JSON array in a string column, so both shapes turn up. */
  included?: string[] | string;
  excluded?: string[] | string;
  notes?: string;
  terms?: string;
  agencyName?: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyInstagram?: string;
}

/* ─── small helpers ────────────────────────────────────────────────────── */

const MEAL_PLAN_TEXT: Record<string, string> = {
  EP: 'Room Only',
  CP: 'Breakfast',
  MAP: 'Breakfast + Dinner',
  APAI: 'All Meals',
};

/** 1 -> "1st", 22 -> "22nd". */
export function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function shortDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function longDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addDays(value: string, count: number): string {
  const date = new Date(value);
  date.setDate(date.getDate() + count);
  return date.toISOString();
}

function joinList(values: string[]): string {
  return values.filter(Boolean).join(' • ');
}

/**
 * Inclusions and exclusions live in a `String?` column holding a JSON array,
 * so a plain array, a JSON string, or free text typed by hand all reach here.
 */
function toList(value?: string[] | string | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch {
    // Not JSON — fall through and treat it as typed text.
  }
  return value
    .split(/\r?\n/)
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

/* ─── day details ──────────────────────────────────────────────────────── */

/**
 * Agents type descriptions one sentence per line, often with their own bullet
 * marks — each non-empty line becomes one clean bullet, as in the PDF.
 */
function textLines(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*[-•*·▪◦▫]\s*/, '').trim())
    .filter(Boolean);
}

interface DayDetails {
  /** Destination write-up plus the day's own description, one line each. */
  lines: string[];
  notes: string;
}

/**
 * What a day says beyond its heading. Most days carry no description of their
 * own — the text lives on the destination record — so, like the PDF, the
 * destination's write-up is used, and only once across consecutive days at
 * the same place.
 */
function dayDetails(day: ItineraryDay, previous?: ItineraryDay): DayDetails {
  if (day.dayType === 'leisure') {
    const text = day.description?.trim() || day.leisureGuidelines?.trim();
    return {
      lines: text ? textLines(text) : ['Leisure day — relax or explore at your own pace.'],
      notes: day.notes?.trim() || '',
    };
  }
  const repeatsPlace =
    previous &&
    previous.dayType !== 'leisure' &&
    previous.destination === day.destination &&
    previous.destinationDescription === day.destinationDescription;
  const destinationLines = repeatsPlace ? [] : textLines(day.destinationDescription);
  const ownLines = textLines(day.description).filter(line => !destinationLines.includes(line));
  return { lines: [...destinationLines, ...ownLines], notes: day.notes?.trim() || '' };
}

/* ─── flights ──────────────────────────────────────────────────────────── */

const FLIGHT_LEG_TEXT: Record<string, string> = {
  OUTBOUND: 'Outbound',
  RETURN: 'Return',
  INTERNAL: 'Connecting',
};

/** Flights worth putting in front of a client — a number or a route, at least. */
function printableFlights(flights?: FlightSegment[]): FlightSegment[] {
  if (!Array.isArray(flights)) return [];
  return flights.filter(
    flight => flight?.flightNumber || flight?.departureCode || flight?.arrivalCode
  );
}

function flightRouteText(flight: FlightSegment): string {
  const from = [flight.departureCity, flight.departureCode].filter(Boolean).join(' ');
  const to = [flight.arrivalCity, flight.arrivalCode].filter(Boolean).join(' ');
  if (from && to) return `${from} → ${to}`;
  return from || to || '—';
}

function flightDurationText(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/* ─── derived figures ──────────────────────────────────────────────────── */

export function hotelCostForDay(day: ItineraryDay, travelers: number): number {
  const rooms = day.numberOfRooms || 1;
  const roomPrice = day.selectedRoomType?.basePrice || 0;
  const extraBedPrice = day.selectedRoomType?.extraBedPrice || day.extraBedCost || 0;
  const childPrice = day.selectedRoomType?.childPrice || day.childWithoutBedCost || 0;
  const mealPlanPrice = day.selectedMealPlan?.pricePerNight || 0;
  return (
    roomPrice * rooms +
    extraBedPrice * (day.extraBeds || 0) +
    childPrice * (day.childrenNoBed || 0) +
    mealPlanPrice * rooms * travelers
  );
}

export function vehicleCostForDay(day: ItineraryDay): number {
  const rate = day.vehicleRatePerDay || day.selectedVehicle?.ratePerDay || 0;
  return rate * (day.numberOfVehicles || 1);
}

export function activityCostForDay(day: ItineraryDay): number {
  return (day.activities ?? []).reduce((sum, activity) => sum + (activity.cost || 0), 0);
}

export interface CostBreakup {
  hotels: number;
  transport: number;
  activities: number;
  total: number;
}

export function costBreakup(days: ItineraryDay[], travelers: number): CostBreakup {
  const hotels = days.reduce((sum, day) => sum + hotelCostForDay(day, travelers), 0);
  const transport = days.reduce((sum, day) => sum + vehicleCostForDay(day), 0);
  const activities = days.reduce((sum, day) => sum + activityCostForDay(day), 0);
  return { hotels, transport, activities, total: hotels + transport + activities };
}

/**
 * Consecutive nights in the same hotel, collapsed into one block.
 *
 * A five-night trip with two hotels should read "1st, 2nd, 3rd Nights" and
 * "4th, 5th Nights", not five near-identical paragraphs.
 */
export interface HotelStay {
  nights: number[];
  place: string;
  hotel: string;
  stars?: number;
  roomLabel?: string;
  mealText?: string;
  rooms: number;
  checkIn?: string;
  checkOut?: string;
  cost: number;
}

export function groupHotelStays(days: ItineraryDay[], travelers: number): HotelStay[] {
  const stays: (HotelStay & { key: string; lastNight: number })[] = [];

  days.forEach((day, index) => {
    if (!day.hotel) return;

    const night = index + 1;
    const key = day.hotelId || day.hotel;
    const previous = stays[stays.length - 1];
    const mealType = day.selectedMealPlan?.type;
    const mealText = mealType
      ? MEAL_PLAN_TEXT[mealType] || day.selectedMealPlan?.label
      : day.mealPlan;

    // Same hotel as the night immediately before: extend that block.
    if (previous && previous.key === key && previous.lastNight === night - 1) {
      previous.nights.push(night);
      previous.lastNight = night;
      previous.checkOut = day.date ? addDays(day.date, 1) : previous.checkOut;
      previous.cost += hotelCostForDay(day, travelers);
      return;
    }

    stays.push({
      key,
      lastNight: night,
      nights: [night],
      place: day.destination || day.activitiesLocation || '',
      hotel: day.hotel,
      stars: day.hotelStars,
      roomLabel: day.selectedRoomType?.name || day.customRoomCategory || day.roomCategory,
      mealText: mealText || undefined,
      rooms: day.numberOfRooms || 1,
      checkIn: day.date,
      checkOut: day.date ? addDays(day.date, 1) : undefined,
      cost: hotelCostForDay(day, travelers),
    });
  });

  return stays.map(({ key, lastNight, ...stay }) => {
    void key;
    void lastNight;
    return stay;
  });
}

/**
 * Consecutive days on the same vehicle, collapsed into one line.
 *
 * Most trips keep one car for the whole stay, which would otherwise repeat the
 * same sentence once per day.
 */
export interface VehicleRun {
  days: number[];
  name: string;
  seats?: number;
  vehicles: number;
  cost: number;
}

export function groupVehicleRuns(days: ItineraryDay[]): VehicleRun[] {
  const runs: (VehicleRun & { key: string; lastDay: number })[] = [];

  days.forEach((day, index) => {
    if (!day.vehicleName) return;

    const dayNumber = day.dayNumber || index + 1;
    const key = [day.vehicleId || day.vehicleName, day.numberOfVehicles || 1].join('|');
    const previous = runs[runs.length - 1];

    if (previous && previous.key === key && previous.lastDay === dayNumber - 1) {
      previous.days.push(dayNumber);
      previous.lastDay = dayNumber;
      previous.cost += vehicleCostForDay(day);
      return;
    }

    runs.push({
      key,
      lastDay: dayNumber,
      days: [dayNumber],
      name: day.vehicleName,
      seats: day.selectedVehicle?.seatingCapacity,
      vehicles: day.numberOfVehicles || 1,
      cost: vehicleCostForDay(day),
    });
  });

  return runs.map(({ key, lastDay, ...run }) => {
    void key;
    void lastDay;
    return run;
  });
}

/** "Day 1", or "Day 1-3" for a run. */
export function dayRangeLabel(days: number[]): string {
  if (days.length === 1) return `Day ${days[0]}`;
  const first = days[0];
  const last = days[days.length - 1];
  const isContiguous = last - first + 1 === days.length;
  return isContiguous ? `Day ${first}-${last}` : `Days ${days.join(', ')}`;
}

/* ─── WhatsApp ─────────────────────────────────────────────────────────── */

const RULE = '--------------------';

function nightsLabel(stay: HotelStay): string {
  const list = stay.nights.map(ordinal).join(', ');
  return `${list} ${stay.nights.length > 1 ? 'Nights' : 'Night'}`;
}

/**
 * WhatsApp's own markup: *bold*, _italic_. Anything else is plain text, so the
 * layout has to come from blank lines and rules.
 */
export function buildWhatsAppMessage(
  data: ShareItineraryData,
  options: ShareOptions = DEFAULT_SHARE_OPTIONS
): string {
  const lines: string[] = [];
  const money = (amount: number) => formatCurrency(amount, data.currency);
  const nights = Math.max(0, data.days.length - 1);
  const breakup = costBreakup(data.days, data.travelers);

  const section = (emoji: string, title: string) => {
    lines.push('', `${emoji} _${title}_`, RULE);
  };

  if (options.greeting) {
    lines.push(`Hi ${data.clientName || 'there'},`, '');
    if (data.agencyName) lines.push(`Greetings from ${data.agencyName}.`, '');
    lines.push(
      'Thank you for your query with us. As per your requirements, following are the package details.',
      ''
    );
  }

  if (options.tripId && data.tripId) {
    lines.push(`*Trip ID ${data.tripId}*`, RULE);
  }

  lines.push(`*${data.title || `${data.destination} Trip`}*`);
  if (data.startDate) {
    lines.push(
      `• ${longDate(data.startDate)} _for_ ${nights} ${nights === 1 ? 'Night' : 'Nights'}, ${
        data.days.length
      } ${data.days.length === 1 ? 'Day' : 'Days'}`
    );
  }
  const party = [
    data.adults ? `${data.adults} ${data.adults === 1 ? 'Adult' : 'Adults'}` : '',
    data.children ? `${data.children} ${data.children === 1 ? 'Child' : 'Children'}` : '',
  ].filter(Boolean);
  lines.push(`• ${party.length ? party.join(', ') : `${data.travelers} Travellers`}`);
  if (data.destination) lines.push(`• ${data.destination}`);
  if (data.refId) lines.push(`• Ref ID: ${data.refId}`);

  if (options.totalPrice && data.totalCost > 0) {
    const plain = data.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 });
    lines.push('', `*Total Price (${data.currency}): ${plain} /-*`);
  }

  if (options.priceBreakup && breakup.total > 0) {
    section('💰', 'Price Breakup');
    if (breakup.hotels > 0) lines.push(`*Hotels:* ${money(breakup.hotels)}`);
    if (breakup.transport > 0) lines.push(`*Transport:* ${money(breakup.transport)}`);
    if (breakup.activities > 0) lines.push(`*Activities:* ${money(breakup.activities)}`);
  }

  if (options.flights) {
    const legs = printableFlights(data.flights);
    if (legs.length > 0) {
      section('✈️', 'Flights');
      legs.forEach((flight, index) => {
        if (index > 0) lines.push('');
        lines.push(
          `*${FLIGHT_LEG_TEXT[flight.direction] || 'Flight'}${
            flight.flightNumber ? ` — ${flight.flightNumber}` : ''
          }*${flight.airline ? ` _${flight.airline}_` : ''}`
        );
        lines.push(
          `${flightRouteText(flight)}${
            flight.departureDate ? ` _on ${shortDate(flight.departureDate)}_` : ''
          }`
        );
        const detail = joinList([
          flight.departureTime && flight.arrivalTime
            ? `${flight.departureTime} → ${flight.arrivalTime}`
            : flight.departureTime || '',
          flightDurationText(flight.durationMinutes),
          flight.baggage ? `Baggage ${flight.baggage}` : '',
          flight.pnr ? `PNR ${flight.pnr}` : '',
        ]);
        if (detail) lines.push(detail);
      });
    }
  }

  if (options.hotels) {
    const stays = groupHotelStays(data.days, data.travelers);
    if (stays.length > 0) {
      section('🏨', 'Hotels');
      stays.forEach((stay, index) => {
        if (index > 0) lines.push('');
        lines.push(`*${nightsLabel(stay)}*${stay.place ? ` _at ${stay.place}_` : ''}`);
        if (stay.checkIn) {
          lines.push(
            `_Check-in: ${shortDate(stay.checkIn)} & Check-out: ${shortDate(stay.checkOut)}_`
          );
        }
        lines.push(`*${stay.hotel}${stay.stars ? ` (${stay.stars}*)` : ''}*`);
        const detail = joinList([
          options.meals ? stay.mealText || '' : '',
          stay.roomLabel ? `${stay.rooms} ${stay.roomLabel} (${data.travelers} Pax)` : '',
        ]);
        if (detail) lines.push(detail);
        if (options.hotelPrices && stay.cost > 0) lines.push(`${money(stay.cost)}`);
      });
    }
  }

  if (options.transport) {
    const runs = groupVehicleRuns(data.days);
    if (runs.length > 0) {
      section('🚗', 'Transport');
      runs.forEach(run => {
        const detail = joinList([
          run.name,
          run.seats ? `${run.seats} Seater` : '',
          run.vehicles > 1 ? `${run.vehicles} vehicles` : '',
        ]);
        lines.push(
          `*${dayRangeLabel(run.days)}:* ${detail}${
            options.transportPrices && run.cost > 0 ? ` — ${money(run.cost)}` : ''
          }`
        );
      });
    }
  }

  if (options.itinerary) {
    section('📋', 'Day-wise Itinerary');
    data.days.forEach((day, index) => {
      const details = dayDetails(day, data.days[index - 1]);
      lines.push(
        '',
        `*Day ${day.dayNumber}${day.date ? ` — ${shortDate(day.date)}` : ''}: ${
          day.dayType === 'leisure' ? 'Leisure Day' : day.title || day.destination || 'Day plan'
        }*`
      );
      details.lines.forEach(line => lines.push(`• ${line}`));
      const activities =
        day.dayType === 'leisure' ? [] : activitiesNotInDescription(day.activities, day.description);
      if (activities.length) {
        lines.push('_Activities:_');
        activities.forEach(activity => {
          const cost = options.activityPrices && activity.cost ? ` — ${money(activity.cost)}` : '';
          lines.push(`▸ ${activity.time ? `${activity.time} ` : ''}${activity.title}${cost}`);
          if (activity.description?.trim()) lines.push(`   ${activity.description.trim()}`);
        });
      }
      if (details.notes) lines.push(`_Note: ${details.notes}_`);
      if (options.meals && day.meals) {
        const meals = [
          day.meals.breakfast && 'Breakfast',
          day.meals.lunch && 'Lunch',
          day.meals.dinner && 'Dinner',
        ].filter(Boolean) as string[];
        if (meals.length) lines.push(`_Meals: ${meals.join(', ')}_`);
      }
    });
  }

  const included = toList(data.included);
  if (options.inclusions && included.length) {
    section('✅', 'Inclusions');
    included.forEach(item => lines.push(`• ${item}`));
  }

  const excluded = toList(data.excluded);
  if (options.exclusions && excluded.length) {
    section('❌', 'Exclusions');
    excluded.forEach(item => lines.push(`• ${item}`));
  }

  if (options.notes && data.notes) {
    section('📝', 'Notes');
    lines.push(data.notes);
  }

  if (options.terms && data.terms) {
    section('📃', 'Terms & Conditions');
    lines.push(data.terms);
  }

  if (options.greeting) {
    lines.push('', RULE);
    if (data.agencyName) lines.push(`*${data.agencyName}*`);
    const contact = joinList([
      data.agencyPhone ? `📞 ${data.agencyPhone}` : '',
      data.agencyEmail ? `✉️ ${data.agencyEmail}` : '',
      data.agencyInstagram ? `📷 ${data.agencyInstagram}` : '',
    ]);
    if (contact) lines.push(contact);
  }

  // Collapse the runs of blank lines the sections can leave behind.
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ─── Email ────────────────────────────────────────────────────────────── */

export function buildEmailSubject(data: ShareItineraryData): string {
  const nights = Math.max(0, data.days.length - 1);
  const duration = nights > 0 ? ` — ${nights}N/${data.days.length}D` : '';
  return `${data.title || `${data.destination} Trip`}${duration}`;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A self-contained HTML email.
 *
 * Inline styles and table layout only — mail clients strip <style> blocks and
 * flexbox support is patchy, so this deliberately reads like 2005 markup.
 */
export function buildEmailBodyHtml(
  data: ShareItineraryData,
  options: ShareOptions = DEFAULT_SHARE_OPTIONS
): string {
  const money = (amount: number) => formatCurrency(amount, data.currency);
  const nights = Math.max(0, data.days.length - 1);
  const breakup = costBreakup(data.days, data.travelers);
  const parts: string[] = [];

  const PURPLE = '#db0201';
  const INK = '#1a1918';
  const MUTED = '#78736f';
  const LINE = '#e8e6e4';

  const heading = (emoji: string, title: string) => `
    <tr><td style="padding:26px 0 8px;">
      <div style="font:600 13px/1.4 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${PURPLE};">
        ${emoji} ${escapeHtml(title)}
      </div>
      <div style="height:2px;width:44px;background:${PURPLE};margin-top:6px;"></div>
    </td></tr>`;

  const row = (content: string) => `<tr><td style="padding:0 0 10px;">${content}</td></tr>`;

  parts.push(`
    <tr><td style="background:${PURPLE};padding:28px 32px;">
      <div style="font:700 22px/1.3 Arial,sans-serif;color:#ffffff;">
        ${escapeHtml(data.title || `${data.destination} Trip`)}
      </div>
      <div style="font:400 14px/1.5 Arial,sans-serif;color:#fbe3e3;margin-top:6px;">
        ${escapeHtml(data.destination)}${
          data.startDate
            ? ` &nbsp;•&nbsp; ${escapeHtml(longDate(data.startDate))} &nbsp;•&nbsp; ${nights}N / ${data.days.length}D`
            : ''
        }
      </div>
      ${
        options.tripId && data.tripId
          ? `<div style="display:inline-block;margin-top:12px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.18);font:600 12px Arial,sans-serif;color:#ffffff;">Trip ID ${escapeHtml(
              data.tripId
            )}</div>`
          : ''
      }
    </td></tr>`);

  const body: string[] = [];

  if (options.greeting) {
    body.push(
      row(
        `<div style="font:400 15px/1.7 Arial,sans-serif;color:${INK};">Hi ${escapeHtml(
          data.clientName || 'there'
        )},<br/><br/>${
          data.agencyName ? `Greetings from <strong>${escapeHtml(data.agencyName)}</strong>. ` : ''
        }Thank you for your query. Here are your package details.</div>`
      )
    );
  }

  if (options.totalPrice && data.totalCost > 0) {
    body.push(
      row(`
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;background:#fafaf9;">
          <tr><td style="padding:16px 18px;">
            <div style="font:600 12px Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${MUTED};">Total package price</div>
            <div style="font:700 26px Arial,sans-serif;color:${PURPLE};margin-top:4px;">${escapeHtml(
              money(data.totalCost)
            )}</div>
            <div style="font:400 12px Arial,sans-serif;color:${MUTED};margin-top:2px;">for ${
              data.travelers
            } traveller${data.travelers === 1 ? '' : 's'}</div>
          </td></tr>
        </table>`)
    );
  }

  if (options.priceBreakup && breakup.total > 0) {
    const line = (label: string, amount: number) =>
      amount > 0
        ? `<tr>
             <td style="padding:7px 0;font:400 14px Arial,sans-serif;color:${INK};border-bottom:1px solid ${LINE};">${label}</td>
             <td align="right" style="padding:7px 0;font:600 14px Arial,sans-serif;color:${INK};border-bottom:1px solid ${LINE};">${escapeHtml(
               money(amount)
             )}</td>
           </tr>`
        : '';
    body.push(heading('💰', 'Price breakup'));
    body.push(
      row(
        `<table width="100%" cellpadding="0" cellspacing="0">${line('Hotels', breakup.hotels)}${line(
          'Transport',
          breakup.transport
        )}${line('Activities', breakup.activities)}</table>`
      )
    );
  }

  if (options.flights) {
    const legs = printableFlights(data.flights);
    if (legs.length > 0) {
      body.push(heading('✈️', 'Flights'));
      legs.forEach(flight => {
        const detail = [
          flight.departureTime && flight.arrivalTime
            ? `${flight.departureTime} → ${flight.arrivalTime}`
            : flight.departureTime || '',
          flightDurationText(flight.durationMinutes),
          flight.baggage ? `Baggage ${flight.baggage}` : '',
          flight.pnr ? `PNR ${flight.pnr}` : '',
        ]
          .filter(Boolean)
          .map(escapeHtml)
          .join(' &nbsp;•&nbsp; ');
        body.push(
          row(`
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;">
              <tr><td style="padding:14px 16px;">
                <div style="font:600 12px Arial,sans-serif;color:${MUTED};">${escapeHtml(
                  FLIGHT_LEG_TEXT[flight.direction] || 'Flight'
                )}${
                  flight.departureDate
                    ? ` &nbsp;•&nbsp; ${escapeHtml(shortDate(flight.departureDate))}`
                    : ''
                }</div>
                <div style="font:700 16px Arial,sans-serif;color:${INK};margin-top:4px;">${escapeHtml(
                  flight.flightNumber || 'Flight'
                )}${
                  flight.airline
                    ? ` <span style="font:400 13px Arial,sans-serif;color:${MUTED};">${escapeHtml(
                        flight.airline
                      )}</span>`
                    : ''
                }</div>
                <div style="font:400 13px Arial,sans-serif;color:${INK};margin-top:4px;">${escapeHtml(
                  flightRouteText(flight)
                )}</div>
                ${
                  detail
                    ? `<div style="font:400 13px Arial,sans-serif;color:${MUTED};margin-top:6px;">${detail}</div>`
                    : ''
                }
              </td></tr>
            </table>`)
        );
      });
    }
  }

  if (options.hotels) {
    const stays = groupHotelStays(data.days, data.travelers);
    if (stays.length > 0) {
      body.push(heading('🏨', 'Hotels'));
      stays.forEach(stay => {
        const detail = [
          options.meals ? stay.mealText : '',
          stay.roomLabel ? `${stay.rooms} × ${stay.roomLabel}` : '',
        ]
          .filter(Boolean)
          .join(' &nbsp;•&nbsp; ');
        body.push(
          row(`
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${LINE};border-radius:10px;">
              <tr><td style="padding:14px 16px;">
                <div style="font:600 12px Arial,sans-serif;color:${MUTED};">${escapeHtml(
                  nightsLabel(stay)
                )}${stay.place ? ` &nbsp;•&nbsp; ${escapeHtml(stay.place)}` : ''}</div>
                <div style="font:700 16px Arial,sans-serif;color:${INK};margin-top:4px;">${escapeHtml(
                  stay.hotel
                )}${stay.stars ? ` <span style="color:#1a1918;">${'★'.repeat(stay.stars)}</span>` : ''}</div>
                ${
                  stay.checkIn
                    ? `<div style="font:400 13px Arial,sans-serif;color:${MUTED};margin-top:4px;">Check-in ${escapeHtml(
                        shortDate(stay.checkIn)
                      )} &nbsp;→&nbsp; Check-out ${escapeHtml(shortDate(stay.checkOut))}</div>`
                    : ''
                }
                ${
                  detail
                    ? `<div style="font:400 13px Arial,sans-serif;color:${INK};margin-top:6px;">${detail}</div>`
                    : ''
                }
                ${
                  options.hotelPrices && stay.cost > 0
                    ? `<div style="font:600 14px Arial,sans-serif;color:${PURPLE};margin-top:8px;">${escapeHtml(
                        money(stay.cost)
                      )}</div>`
                    : ''
                }
              </td></tr>
            </table>`)
        );
      });
    }
  }

  if (options.transport) {
    const runs = groupVehicleRuns(data.days);
    if (runs.length > 0) {
      body.push(heading('🚗', 'Transport'));
      const rows = runs
        .map(run => {
          const seats = run.seats;
          const cost = run.cost;
          return `<tr>
            <td style="padding:7px 0;font:400 14px Arial,sans-serif;color:${INK};border-bottom:1px solid ${LINE};">
              <strong>${escapeHtml(dayRangeLabel(run.days))}</strong> &nbsp;•&nbsp; ${escapeHtml(
                run.name
              )}${seats ? ` (${seats} seater)` : ''}
            </td>
            ${
              options.transportPrices && cost > 0
                ? `<td align="right" style="padding:7px 0;font:600 14px Arial,sans-serif;color:${INK};border-bottom:1px solid ${LINE};">${escapeHtml(
                    money(cost)
                  )}</td>`
                : '<td style="border-bottom:1px solid ' + LINE + ';"></td>'
            }
          </tr>`;
        })
        .join('');
      body.push(row(`<table width="100%" cellpadding="0" cellspacing="0">${rows}</table>`));
    }
  }

  if (options.itinerary) {
    body.push(heading('📋', 'Day-wise itinerary'));
    data.days.forEach((day, index) => {
      const details = dayDetails(day, data.days[index - 1]);
      const activities = (day.dayType === 'leisure' ? [] : (day.activities ?? []))
        .map(activity => {
          const cost =
            options.activityPrices && activity.cost
              ? ` <span style="color:${MUTED};">— ${escapeHtml(money(activity.cost))}</span>`
              : '';
          return `<li style="margin:3px 0;">${
            activity.time ? `<strong>${escapeHtml(activity.time)}</strong> ` : ''
          }${escapeHtml(activity.title)}${cost}${
            activity.description?.trim()
              ? `<div style="color:${MUTED};font-size:13px;">${escapeHtml(activity.description.trim())}</div>`
              : ''
          }</li>`;
        })
        .join('');
      const meals =
        options.meals && day.meals
          ? [
              day.meals.breakfast && 'Breakfast',
              day.meals.lunch && 'Lunch',
              day.meals.dinner && 'Dinner',
            ]
              .filter(Boolean)
              .join(', ')
          : '';
      body.push(
        row(`
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="46" valign="top" style="padding-top:2px;">
                <div style="width:36px;height:36px;border-radius:9px;background:${PURPLE};color:#fff;font:700 15px/36px Arial,sans-serif;text-align:center;">${
                  day.dayNumber
                }</div>
              </td>
              <td valign="top" style="padding-bottom:6px;">
                <div style="font:700 15px Arial,sans-serif;color:${INK};">${escapeHtml(
                  day.dayType === 'leisure'
                    ? 'Leisure Day'
                    : day.title || day.destination || 'Day plan'
                )}</div>
                ${
                  day.date
                    ? `<div style="font:400 12px Arial,sans-serif;color:${MUTED};margin-top:2px;">${escapeHtml(
                        longDate(day.date)
                      )}</div>`
                    : ''
                }
                ${
                  details.lines.length
                    ? `<ul style="margin:6px 0 0;padding-left:18px;font:400 14px/1.6 Arial,sans-serif;color:${INK};">${details.lines
                        .map(line => `<li style="margin:2px 0;">${escapeHtml(line)}</li>`)
                        .join('')}</ul>`
                    : ''
                }
                ${
                  activities
                    ? `<div style="font:700 12px Arial,sans-serif;color:${PURPLE};margin-top:8px;">Activities</div><ul style="margin:4px 0 0;padding-left:18px;font:400 14px/1.6 Arial,sans-serif;color:${INK};">${activities}</ul>`
                    : ''
                }
                ${
                  meals
                    ? `<div style="font:400 12px Arial,sans-serif;color:${MUTED};margin-top:6px;">Meals: ${escapeHtml(
                        meals
                      )}</div>`
                    : ''
                }
                ${
                  details.notes
                    ? `<div style="font:400 13px/1.5 Arial,sans-serif;color:${MUTED};margin-top:6px;"><strong>Note:</strong> ${escapeHtml(
                        details.notes
                      )}</div>`
                    : ''
                }
              </td>
            </tr>
          </table>`)
      );
    });
  }

  const bullets = (items: string[], color: string) =>
    `<ul style="margin:0;padding-left:18px;font:400 14px/1.7 Arial,sans-serif;color:${color};">${items
      .map(item => `<li>${escapeHtml(item)}</li>`)
      .join('')}</ul>`;

  const included = toList(data.included);
  if (options.inclusions && included.length) {
    body.push(heading('✅', 'Inclusions'));
    body.push(row(bullets(included, INK)));
  }

  const excluded = toList(data.excluded);
  if (options.exclusions && excluded.length) {
    body.push(heading('❌', 'Exclusions'));
    body.push(row(bullets(excluded, INK)));
  }

  if (options.notes && data.notes) {
    body.push(heading('📝', 'Notes'));
    body.push(
      row(
        `<div style="font:400 14px/1.7 Arial,sans-serif;color:${INK};white-space:pre-line;">${escapeHtml(
          data.notes
        )}</div>`
      )
    );
  }

  if (options.terms && data.terms) {
    body.push(heading('📃', 'Terms &amp; conditions'));
    body.push(
      row(
        `<div style="font:400 12px/1.7 Arial,sans-serif;color:${MUTED};white-space:pre-line;">${escapeHtml(
          data.terms
        )}</div>`
      )
    );
  }

  parts.push(
    `<tr><td style="padding:8px 32px 28px;"><table width="100%" cellpadding="0" cellspacing="0">${body.join(
      ''
    )}</table></td></tr>`
  );

  if (options.greeting) {
    const contact = [
      data.agencyPhone ? escapeHtml(data.agencyPhone) : '',
      data.agencyEmail ? escapeHtml(data.agencyEmail) : '',
      data.agencyInstagram ? escapeHtml(data.agencyInstagram) : '',
    ]
      .filter(Boolean)
      .join(' &nbsp;•&nbsp; ');
    parts.push(`
      <tr><td style="background:#fafaf9;border-top:1px solid ${LINE};padding:20px 32px;">
        ${
          data.agencyName
            ? `<div style="font:700 15px Arial,sans-serif;color:${PURPLE};">${escapeHtml(
                data.agencyName
              )}</div>`
            : ''
        }
        ${
          contact
            ? `<div style="font:400 13px Arial,sans-serif;color:${MUTED};margin-top:5px;">${contact}</div>`
            : ''
        }
      </td></tr>`);
  }

  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f3;"><tr><td align="center" style="padding:24px 12px;">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
${parts.join('')}
</table>
</td></tr></table>`;
}

/**
 * The email as a standalone document, for the preview frame and for opening in
 * a tab.
 *
 * The clipboard gets `buildEmailBodyHtml` instead: a `text/html` flavour that
 * starts with a doctype is treated as text by many paste targets, which is how
 * you end up pasting tags into a compose window instead of a styled email.
 */
export function buildEmailHtml(
  data: ShareItineraryData,
  options: ShareOptions = DEFAULT_SHARE_OPTIONS
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(buildEmailSubject(data))}</title></head>
<body style="margin:0;padding:0;background:#f5f4f3;">
${buildEmailBodyHtml(data, options)}
</body></html>`;
}

/** The same content as the HTML email, for clients that refuse it. */
export function buildEmailText(
  data: ShareItineraryData,
  options: ShareOptions = DEFAULT_SHARE_OPTIONS
): string {
  // WhatsApp's markers are the only difference worth stripping.
  return buildWhatsAppMessage(data, options).replace(/[*_]/g, '');
}
