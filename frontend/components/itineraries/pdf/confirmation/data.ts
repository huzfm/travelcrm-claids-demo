// Turns a saved itinerary into the handful of facts the one-page booking
// confirmation prints. Everything comes from the itinerary as built — the
// confirmation is sent first so the client can ask for changes before the
// full itinerary PDF goes out.

import { format, differenceInCalendarDays } from 'date-fns';
import { MEAL_PLAN_LABELS, type MealPlan } from '@/types/hotel.types';
import type { Itinerary, ItineraryDay } from '@/types/index';
import { parseArray } from '../single-option/utils';

export interface ConfirmationHotelRow {
  city: string;
  hotel: string;
  nights: number;
  roomType: string;
  mealPlan: string;
}

export interface ConfirmationDayRow {
  dayNumber: number;
  text: string;
}

export interface ConfirmationData {
  bookingId: string;
  greetingName: string;
  destination: string;
  travelDates: string;
  duration: string;
  travellers: string;
  contact: string;
  hotels: ConfirmationHotelRow[];
  days: ConfirmationDayRow[];
  transport: { vehicle: string; pickup: string; drop: string; sightseeing: string };
  inclusions: string[];
  exclusions: string[];
}

const DASH = '—';

const clean = (s?: string | null) => (s || '').replace(/\s+/g, ' ').trim();

// "MAP" / "MAP - Breakfast & Dinner" → "MAP (Breakfast & Dinner)", as the sample prints it.
function formatMealPlan(day: ItineraryDay): string {
  const raw = clean(day.selectedMealPlan?.type || day.selectedMealPlan?.label || day.mealPlan);
  if (!raw) return DASH;
  const code = raw.split(/[\s-]/)[0].toUpperCase() as MealPlan;
  const label = MEAL_PLAN_LABELS[code];
  if (!label) return raw;
  const meaning = label.split(' - ')[1];
  return meaning ? `${code} (${meaning})` : code;
}

function roomTypeOf(day: ItineraryDay): string {
  const name = clean(day.selectedRoomType?.name || day.customRoomCategory || day.roomCategory);
  if (!name) return DASH;
  const rooms = day.numberOfRooms || 1;
  return rooms > 1 ? `${name} × ${rooms}` : name;
}

function vehicleOf(day: ItineraryDay): string {
  return clean(day.vehicleName || day.selectedVehicle?.name || day.transport);
}

/**
 * Days as the client will travel them. When the itinerary carries package
 * options, the selected option's hotel and vehicle replace each day's own —
 * the same merge the itinerary page and full PDF do.
 */
export function resolveDays(itinerary: Itinerary): ItineraryDay[] {
  const raw = itinerary.daysJson as unknown;
  const parsed: ItineraryDay[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? JSON.parse(raw || '[]')
      : [];
  const days = parsed.filter(Boolean).sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0));

  const options = itinerary.options || [];
  const option = options.length > 0 ? options[itinerary.selectedOption ?? 0] || options[0] : null;
  if (!option) return days;

  return days.map((day, i) => {
    const dayNumber = day.dayNumber || i + 1;
    const hotel = option.hotels?.find(h => h.dayNumber === dayNumber);
    const vehicle = option.vehicles?.find(v => v.dayNumber === dayNumber);
    const merged: ItineraryDay = { ...day };
    if (hotel) {
      merged.hotel = hotel.hotelName;
      merged.numberOfRooms = hotel.numberOfRooms || 1;
      if (hotel.roomType) {
        merged.selectedRoomType = {
          ...(day.selectedRoomType || { bedType: '', basePrice: 0 }),
          name: hotel.roomType,
        };
      }
      if (hotel.mealPlan) {
        merged.selectedMealPlan = undefined;
        merged.mealPlan = hotel.mealPlan;
      }
    }
    if (vehicle) {
      merged.vehicleName = vehicle.vehicleName;
      merged.selectedVehicle = undefined;
    }
    return merged;
  });
}

/** Consecutive nights in the same hotel collapse into one row. */
function buildHotelRows(days: ItineraryDay[]): ConfirmationHotelRow[] {
  const rows: ConfirmationHotelRow[] = [];
  for (const day of days) {
    const hotel = clean(day.hotel || day.selectedHotelData?.name);
    if (!hotel) continue;
    const row: ConfirmationHotelRow = {
      city: clean(day.destination) || DASH,
      hotel,
      nights: 1,
      roomType: roomTypeOf(day),
      mealPlan: formatMealPlan(day),
    };
    const last = rows[rows.length - 1];
    if (
      last &&
      last.hotel === row.hotel &&
      last.roomType === row.roomType &&
      last.mealPlan === row.mealPlan
    ) {
      last.nights += 1;
    } else {
      rows.push(row);
    }
  }
  return rows;
}

function dayText(day: ItineraryDay): string {
  const title = clean(day.title);
  if (title) return title;
  if (day.dayType === 'leisure') return 'Leisure day at your own pace';
  const activities = (day.activities || []).map(a => clean(a.title)).filter(Boolean);
  if (activities.length) return activities.join(', ');
  return clean(day.destination) || DASH;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function travellersText(it: Itinerary): string {
  const parts: string[] = [];
  if (it.adults) parts.push(plural(it.adults, 'Adult'));
  if (it.children) parts.push(`${it.children} ${it.children === 1 ? 'Child' : 'Children'}`);
  if (parts.length) return parts.join(', ');
  return it.totalTravelers ? plural(it.totalTravelers, 'Traveller') : DASH;
}

const safeDate = (s?: string) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Lists come in as JSON arrays or one-per-line text, often with bullet marks typed in.
const listOf = (val: unknown): string[] => {
  const items: unknown = parseArray(val);
  if (!Array.isArray(items)) return [];
  return items.map(item => clean(String(item).replace(/^\s*[-•*·▪◦✓✔✗✘]\s*/, ''))).filter(Boolean);
};

function uniqueJoined(values: string[]): string {
  return [...new Set(values.filter(Boolean))].join(' / ');
}

export function buildConfirmationData(itinerary: Itinerary): ConfirmationData {
  const days = resolveDays(itinerary);

  const start = safeDate(itinerary.startDate) || safeDate(days[0]?.date);
  const end = safeDate(itinerary.endDate) || safeDate(days[days.length - 1]?.date);
  const dayCount = days.length || (start && end ? differenceInCalendarDays(end, start) + 1 : 0);

  const travelDates = start
    ? end && end.getTime() !== start.getTime()
      ? `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
      : format(start, 'd MMM yyyy')
    : DASH;

  const vehicles = uniqueJoined(days.map(vehicleOf));
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  const name = clean(itinerary.clientName || itinerary.lead?.name) || 'Valued Guest';
  const salutation = clean(itinerary.salutation) || 'Mr';

  return {
    bookingId: itinerary.tripId || `TPD-${itinerary.id.slice(0, 8).toUpperCase()}`,
    greetingName: `${salutation.replace(/\.$/, '')}. ${name}`,
    destination: clean(itinerary.destination) || DASH,
    travelDates,
    duration: dayCount
      ? `${plural(Math.max(0, dayCount - 1), 'Night')} / ${plural(dayCount, 'Day')}`
      : DASH,
    travellers: travellersText(itinerary),
    contact: clean(itinerary.lead?.phone) || DASH,
    hotels: buildHotelRows(days),
    days: days.map((day, i) => ({ dayNumber: day.dayNumber || i + 1, text: dayText(day) })),
    transport: {
      vehicle: vehicles || 'Not included',
      // Set in the transport step on the first/last day; any other day's value as a fallback.
      pickup:
        clean(firstDay?.pickupPoint) ||
        clean(days.find(d => clean(d.pickupPoint))?.pickupPoint) ||
        'As per itinerary',
      drop:
        clean(lastDay?.dropPoint) ||
        clean([...days].reverse().find(d => clean(d.dropPoint))?.dropPoint) ||
        'As per itinerary',
      sightseeing: 'As per the itinerary',
    },
    inclusions: listOf(itinerary.included),
    exclusions: listOf(itinerary.excluded),
  };
}
