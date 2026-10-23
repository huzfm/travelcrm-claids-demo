// Itinerary types
import type { MealPlan } from './hotel.types';

// Re-export for backward compatibility
export type { MealPlan };

export type ActivityCategory =
  | 'FLIGHT'
  | 'HOTEL'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | 'FOOD'
  | 'SHOPPING'
  | 'OTHER';

/**
 * The trip types that ship with the app. Agents can also type their own, so
 * anything persisted is a plain string — see `TripTypeValue` and
 * `TRIP_TYPE_PRESETS` in `@/data/trip-types`.
 */
export type TripType =
  | 'HONEYMOON'
  | 'FAMILY'
  | 'ADVENTURE'
  | 'BUSINESS'
  | 'SOLO'
  | 'GROUP'
  | 'DOMESTIC'
  | 'INTERNATIONAL';

/** A preset above, or a custom value the agent typed ("CORPORATE_OFFSITE"). */
export type TripTypeValue = TripType | (string & {});

// ─── Flights ──────────────────────────────────────────────────────────────────

/** Which leg of the trip a flight covers. */
export type FlightDirection = 'OUTBOUND' | 'RETURN' | 'INTERNAL';

/** Whether the agent typed the details or a flight-number lookup filled them. */
export type FlightSource = 'MANUAL' | 'API';

export const FLIGHT_DIRECTION_LABELS: Record<FlightDirection, string> = {
  OUTBOUND: 'Outbound',
  RETURN: 'Return',
  INTERNAL: 'Internal',
};

export const FLIGHT_CABIN_CLASSES = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;

export type FlightCabinClass = (typeof FLIGHT_CABIN_CLASSES)[number];

/**
 * One flight on the trip. Every field past the id and direction is optional so a
 * half-known flight ("6E-2134, times to follow") can still be saved, and every
 * API-filled field stays editable — the lookup is a starting point, not a lock.
 *
 * Fares are informational: they show on the itinerary and the PDF but are not
 * part of the package pricing engine, which prices hotels, vehicles and
 * activities per day.
 */
export interface FlightSegment {
  id: string;
  direction: FlightDirection;
  airline?: string;
  airlineCode?: string;
  /** Normalized as "6E-2134", but stored as typed if the agent insists. */
  flightNumber?: string;
  aircraft?: string;
  cabinClass?: FlightCabinClass | (string & {});

  departureAirport?: string;
  departureCode?: string;
  departureCity?: string;
  departureTerminal?: string;
  /** yyyy-MM-dd */
  departureDate?: string;
  /** HH:mm, 24-hour */
  departureTime?: string;

  arrivalAirport?: string;
  arrivalCode?: string;
  arrivalCity?: string;
  arrivalTerminal?: string;
  arrivalDate?: string;
  arrivalTime?: string;

  durationMinutes?: number;
  stops?: number;
  baggage?: string;
  pnr?: string;
  seats?: string;

  passengers?: number;
  farePerPerson?: number;
  totalFare?: number;
  notes?: string;

  source?: FlightSource;
  /** Which provider filled it, kept for traceability. */
  provider?: string;
  /** Set when the provider was the built-in sample generator, not a live feed. */
  isSample?: boolean;
  fetchedAt?: string;
}

export interface DayActivity {
  id?: string;
  time?: string;
  title: string;
  description?: string;
  location?: string;
  category?: ActivityCategory;
  cost?: number;
  bookingRef?: string;
  contactNumber?: string;
  duration?: string;
}

export interface DayMeals {
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
  breakfastNote?: string;
  lunchNote?: string;
  dinnerNote?: string;
}

export interface HotelAlternative {
  hotelId: string;
  hotelName: string;
  hotelAddress?: string;
  hotelContact?: string;
  hotelImage?: string;
  hotelStars?: number;
  isSimilar?: boolean; // true if this is a backup/fallback hotel
  selectedRoomType?: {
    name: string;
    bedType: string;
    basePrice: number;
    extraBedPrice?: number;
    childPrice?: number;
  };
  selectedMealPlan?: {
    type: MealPlan;
    label: string;
    pricePerNight: number;
  };
  extraBedCost?: number;
  childWithoutBedCost?: number;
}

export interface VehicleAlternative {
  vehicleId: string;
  vehicleName: string;
  vehicleType?: string;
  vehicleImage?: string;
  vehicleRatePerDay?: number;
  selectedVehicle?: {
    name: string;
    brand?: string;
    vehicleType: string;
    seatingCapacity: number;
    driverName?: string;
    driverPhone?: string;
    ratePerDay?: number;
  };
  vehicleFeatures?: string[];
}

export interface DayAlternatives {
  hotelOptions: HotelAlternative[];
  vehicleOptions: VehicleAlternative[];
}

export type DayType = 'activity' | 'leisure';

export interface ItineraryDay {
  id?: string;
  dayNumber: number;
  date?: string;
  title?: string;
  description?: string;
  /** 'activity' = normal day with planned itinerary; 'leisure' = rest/free day */
  dayType?: DayType;
  /** Custom guidelines/notes shown to the client for leisure days (supports bullet points) */
  leisureGuidelines?: string;
  activities: DayActivity[];
  // Day images — uploaded by user and embedded in PDF
  images?: string[];
  // Destination/place visited this day
  destinationId?: string;
  destination?: string; // fallback manual entry
  destinationAddress?: string; // address/country from destination db
  destinationShortDescription?: string; // short description from destination db
  destinationDescription?: string; // full description from destination db
  destinationHighlights?: string[]; // highlights from destination db
  destinationAmenities?: string[]; // amenities from destination db
  destinationBestTimeToVisit?: string; // best time from destination db
  destinationAverageTemperature?: string; // temperature from destination db
  destinationLanguage?: string; // language from destination db
  destinationCurrency?: string; // currency from destination db
  destinationTimezone?: string; // timezone from destination db
  destinationThingsToKnow?: string; // things to know from destination db
  activitiesLocation?: string; // where activities happen
  hotel?: string;
  hotelId?: string;
  hotelIds?: string[]; // supports multiple hotels (up to 2)
  hotelAddress?: string;
  hotelContact?: string;
  hotelImage?: string;
  hotelStars?: number;
  // Room type from hotel database
  selectedRoomType?: {
    name: string;
    bedType: string;
    basePrice: number;
    extraBedPrice?: number;
    childPrice?: number;
  };
  // Number of rooms for this day (default 1)
  numberOfRooms?: number;
  // Extra beds needed (default 0)
  extraBeds?: number;
  // Children (no bed) count (default 0)
  childrenNoBed?: number;
  // Fallback to manual entry
  roomCategory?: string;
  customRoomCategory?: string;
  extraBedCost?: number;
  childWithoutBedCost?: number;
  // Meal plan from hotel database
  selectedMealPlan?: {
    type: MealPlan;
    label: string;
    pricePerNight: number;
  };
  // Fallback to manual entry
  mealPlan?: string;
  // Full hotel data from DB (used for room/meal selectors)
  selectedHotelData?: {
    id: string;
    name: string;
    image?: string;
    images?: string[];
    roomTypes: Array<{
      name: string;
      bedType: string;
      basePrice: number;
      extraBedPrice?: number;
      childPrice?: number;
    }>;
    mealPlans: Array<{
      type: string;
      label: string;
      pricePerNight: number;
    }>;
  };
  // Vehicle from vehicle database
  vehicleId?: string;
  vehicleName?: string;
  vehicleType?: string;
  vehicleImage?: string;
  vehicleRegistration?: string;
  vehicleDriver?: string;
  vehicleDriverPhone?: string;
  vehicleRatePerDay?: number;
  vehicleFeatures?: string[];
  // Number of vehicles for this day (default 1)
  numberOfVehicles?: number;
  pickupPoint?: string;
  dropPoint?: string;
  // Full vehicle data from DB (enriched on create)
  selectedVehicle?: {
    name: string;
    brand?: string;
    vehicleType: string;
    seatingCapacity: number;
    driverName?: string;
    driverPhone?: string;
    ratePerDay?: number;
  };
  transport?: string;
  meals?: DayMeals;
  notes?: string;
  weather?: string;
  // Alternatives for multi-quote support
  alternatives?: DayAlternatives;
  // Backup hotels when primary isn't available (max 2)
  similarHotels?: HotelAlternative[];
}

// ─── Option types (for multi-package itineraries) ───────────────────────────

export interface OptionHotel {
  dayNumber?: number; // which day this hotel is for
  hotelId: string;
  hotelName: string;
  hotelAddress?: string;
  hotelContact?: string;
  hotelImage?: string;
  hotelStars?: number;
  roomType?: string;
  bedType?: string;
  numberOfRooms?: number;
  extraBeds?: number;
  childWithoutBed?: number;
  extraBedPrice?: number; // per-night extra bed charge
  childPrice?: number; // per-night child (no bed) charge
  mealPlan?: string;
  pricePerNight?: number;
  totalCost?: number;
}

export interface OptionVehicle {
  dayNumber?: number; // which day this vehicle is for
  vehicleId: string;
  vehicleName: string;
  vehicleType?: string;
  vehicleImage?: string;
  vehicleRegistration?: string;
  driverName?: string;
  driverPhone?: string;
  numberOfVehicles?: number;
  ratePerDay?: number;
  totalCost?: number;
  seatingCapacity?: number;
}

export interface OptionActivity {
  id?: string;
  dayNumber: number;
  title: string;
  description?: string;
  location?: string;
  time?: string;
  cost?: number;
}

/** One traveller's share of a package price, e.g. { label: 'Adult 1', amount: 45000 }. */
export interface PerPersonShare {
  label: string;
  amount: number;
}

export interface ItineraryOption {
  name: string; // e.g., "Basic", "Premium"
  description?: string;
  hotels: OptionHotel[];
  vehicles: OptionVehicle[];
  activities: OptionActivity[];
  // Similar hotel/vehicle options for multi-quote
  alternatives?: Array<{
    dayNumber: number;
    hotelOptions: Array<{
      hotelId: string;
      hotelName: string;
      hotelAddress?: string;
      hotelImage?: string;
      roomType: string;
      bedType: string;
      pricePerNight: number;
      extraBedPrice?: number;
      mealPlan: string;
      pricePerNightAlt?: number;
    }>;
  }>;
  // Per-day images stored as array of { dayNumber, images }
  images?: Array<{ dayNumber: number; images: string[] }>;
  totalCost: number; // base cost (sum of hotel + vehicle + activity + misc)
  margin?: number; // absolute margin amount to add (finalPrice = totalCost + margin)
  finalPrice?: number; // totalCost + margin (shown to customer)
  breakdown?: {
    hotelCost?: number;
    vehicleCost?: number;
    activityCost?: number;
    miscCost?: number;
    customTotal?: number; // manual total override set in Step 4 Pricing
    // Manual overrides set in Step 4 (take precedence over calculated costs)
    manualHotelCost?: number;
    manualVehicleCost?: number;
    manualTotal?: number; // explicit manual total (same as customTotal but more descriptive)
    finalPrice?: number; // definitive user-set final price
  };
  features?: string[];
  marginPercent?: number;
  gstPercent?: number;
  discountPercent?: number;
  roundOff?: number;
  additionalCharges?: Array<{ label: string; amount: number }>;
  /** Optional per-traveller split of this option's price; never more than it. */
  perPersonSplit?: PerPersonShare[];
}

export interface Quote {
  label: string;
  description?: string;
  totalCost: number;
  breakdown?: {
    hotelCost?: number;
    vehicleCost?: number;
    activityCost?: number;
    miscCost?: number;
    customTotal?: number; // manual total override set in Step 4 Pricing
    // Manual overrides set in Step 4 (take precedence over calculated costs)
    manualHotelCost?: number;
    manualVehicleCost?: number;
    manualTotal?: number; // explicit manual total (same as customTotal but more descriptive)
  };
  additionalCharges?: Array<{ label: string; amount: number }>;
  discountPercent?: number;
  marginPercent?: number;
  gstPercent?: number;
  roundOff?: number;
  features?: string[];
  // Which alternatives this quote uses (key = day index as string)
  dayAlternatives?: Record<string, { hotelAltIndex?: number; vehicleAltIndex?: number }>;
  /** Optional per-traveller split of this quote's price; never more than it. */
  perPersonSplit?: PerPersonShare[];
}

export interface Itinerary {
  id: string;
  leadId: string;
  lead?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    /** Staff the lead is assigned to — sent by the single-itinerary endpoint. */
    assignee?: { id: string; name: string } | null;
  };
  branchId: string;
  branch?: {
    id: string;
    name: string;
    country?: string;
    whatsappNumber?: string;
    email?: string;
    address?: string;
    instagram?: string;
    currency?: string;
  };
  title: string;
  /** Who the trip is for. Separate from `title`, which is the trip's label. */
  clientName?: string;
  /** Shown before clientName on the PDF cover page. Defaults to "Mr". */
  salutation?: string;
  destination: string;
  templateId: string | null;
  /** Template this itinerary was built from — either kind. Drives usage counts. */
  sourceTemplateId?: string | null;
  daysJson: ItineraryDay[];
  days?: ItineraryDay[];
  version: number;
  pdfPath: string | null;
  sharedVia: string | null;
  createdBy: string;
  creator?: { id: string; name: string; phone?: string; avatarUrl?: string };
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  tripType?: TripTypeValue;
  totalTravelers?: number;
  adults?: number;
  children?: number;
  /** One age per child, same length as `children`. */
  childrenAges?: number[];
  budget?: string;
  currency?: string; // Currency code (INR, MUR, MYR, USD, EUR, THB)
  totalCost?: number;
  notes?: string;
  terms?: string;
  /** A `String?` column holding a JSON array — parse before use. */
  included?: string[] | string;
  excluded?: string[] | string;
  // Legacy single-quote support (backward compatibility)
  quotes?: Quote[];
  selectedQuote?: number | number[];
  /** Trip-level flights — outbound, return and any internal hops, in order. */
  flights?: FlightSegment[];
  // Multi-option support (supersedes quotes when present)
  options?: ItineraryOption[];
  // Active option index for display
  selectedOption?: number;
  tripId?: string;
  // Template fields
  isTemplate?: boolean;
  templateName?: string;
}

export interface ItineraryTemplate {
  id: string;
  branchId: string | null;
  name: string;
  destination: string;
  daysJson: ItineraryDay[];
  isGlobal: boolean;
  createdBy: string;
  createdAt: string;
  totalTravelers?: number;
  startDate?: string;
  endDate?: string;
  tripType?: string;
}

// ─── Destination / Place types ─────────────────────────────────────────────────

export type PlaceType =
  | 'MOUNTAIN'
  | 'BEACH'
  | 'CITY'
  | 'DESERT'
  | 'FOREST'
  | 'HISTORICAL'
  | 'ADVENTURE'
  | 'RELIGIOUS'
  | 'OTHER';

export interface Destination {
  id: string;
  name: string;
  address: string;
  placeType: PlaceType;
  shortDescription?: string;
  description?: string;
  highlights: string[];
  amenities: string[];
  bestTimeToVisit?: string;
  averageTemperature?: string;
  language?: string;
  currency?: string;
  timezone?: string;
  thingsToKnow?: string;
  images: string[];
  coverImage?: string;
  altNames: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
