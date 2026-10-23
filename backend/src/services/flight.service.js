/**
 * Flight lookup — resolves a flight number + date into schedule details the
 * itinerary builder can drop straight into a flight segment.
 *
 * The provider is pluggable on purpose: no real flight data account is wired up
 * yet, so `mock` ships as the default and returns believable sample schedules so
 * the whole UI path (fetch → review → use these details) is testable end to end.
 * Every response carries `isMock`, and the builder badges sample data as such —
 * an agent must never mistake invented times for a real airline schedule.
 *
 * Adding a real provider:
 *   1. Write `async lookup({ airlineCode, flightDigits, date })` returning the
 *      same normalized shape as `mockProvider.lookup` (or null when not found).
 *   2. Register it in PROVIDERS below.
 *   3. Set FLIGHT_API_PROVIDER=<name> plus whatever keys it needs.
 * Nothing outside this file needs to change.
 */

const PROVIDER_NAME = process.env.FLIGHT_API_PROVIDER || 'mock';

// ─── Reference data ───────────────────────────────────────────────────────────

/** IATA airline codes the mock knows by name. Unknown codes still resolve. */
const AIRLINES = {
  '6E': { name: 'IndiGo', fleet: ['Airbus A320neo', 'Airbus A321neo', 'ATR 72-600'] },
  AI: { name: 'Air India', fleet: ['Airbus A320neo', 'Boeing 787-8', 'Airbus A321'] },
  UK: { name: 'Vistara', fleet: ['Airbus A320neo', 'Boeing 787-9'] },
  SG: { name: 'SpiceJet', fleet: ['Boeing 737-800', 'De Havilland Q400'] },
  QP: { name: 'Akasa Air', fleet: ['Boeing 737 MAX 8'] },
  IX: { name: 'Air India Express', fleet: ['Boeing 737-800'] },
  EK: { name: 'Emirates', fleet: ['Boeing 777-300ER', 'Airbus A380-800'] },
  QR: { name: 'Qatar Airways', fleet: ['Airbus A350-900', 'Boeing 777-300ER'] },
  EY: { name: 'Etihad Airways', fleet: ['Boeing 787-9'] },
  SQ: { name: 'Singapore Airlines', fleet: ['Boeing 737-8', 'Airbus A350-900'] },
  TG: { name: 'Thai Airways', fleet: ['Boeing 787-8', 'Airbus A350-900'] },
  MH: { name: 'Malaysia Airlines', fleet: ['Boeing 737-800'] },
  MK: { name: 'Air Mauritius', fleet: ['Airbus A330-900neo'] },
  FZ: { name: 'flydubai', fleet: ['Boeing 737 MAX 8'] },
  WY: { name: 'Oman Air', fleet: ['Boeing 737-900ER'] },
};

/** Airports the mock routes between, keyed by IATA code. */
const AIRPORTS = {
  DEL: {
    name: 'Indira Gandhi International',
    city: 'Delhi',
    country: 'India',
    terminals: ['1', '2', '3'],
  },
  BOM: {
    name: 'Chhatrapati Shivaji Maharaj International',
    city: 'Mumbai',
    country: 'India',
    terminals: ['1', '2'],
  },
  SXR: {
    name: 'Sheikh ul-Alam International',
    city: 'Srinagar',
    country: 'India',
    terminals: ['1', '2'],
  },
  IXJ: { name: 'Jammu Airport', city: 'Jammu', country: 'India', terminals: ['1'] },
  BLR: {
    name: 'Kempegowda International',
    city: 'Bengaluru',
    country: 'India',
    terminals: ['1', '2'],
  },
  MAA: { name: 'Chennai International', city: 'Chennai', country: 'India', terminals: ['1', '4'] },
  CCU: {
    name: 'Netaji Subhas Chandra Bose International',
    city: 'Kolkata',
    country: 'India',
    terminals: ['1'],
  },
  HYD: {
    name: 'Rajiv Gandhi International',
    city: 'Hyderabad',
    country: 'India',
    terminals: ['1'],
  },
  GOI: { name: 'Manohar International', city: 'Goa', country: 'India', terminals: ['1'] },
  COK: { name: 'Cochin International', city: 'Kochi', country: 'India', terminals: ['1', '3'] },
  DXB: { name: 'Dubai International', city: 'Dubai', country: 'UAE', terminals: ['1', '2', '3'] },
  DOH: { name: 'Hamad International', city: 'Doha', country: 'Qatar', terminals: ['1'] },
  SIN: { name: 'Changi', city: 'Singapore', country: 'Singapore', terminals: ['1', '2', '3', '4'] },
  BKK: { name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', terminals: ['1'] },
  KUL: {
    name: 'Kuala Lumpur International',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    terminals: ['1', '2'],
  },
  MRU: {
    name: 'Sir Seewoosagur Ramgoolam International',
    city: 'Port Louis',
    country: 'Mauritius',
    terminals: ['1'],
  },
  CMB: {
    name: 'Bandaranaike International',
    city: 'Colombo',
    country: 'Sri Lanka',
    terminals: ['1'],
  },
  MLE: { name: 'Velana International', city: 'Male', country: 'Maldives', terminals: ['1'] },
  KTM: { name: 'Tribhuvan International', city: 'Kathmandu', country: 'Nepal', terminals: ['1'] },
};

/** Routes the mock picks from, so a looked-up flight is always plausible. */
const ROUTES = [
  ['DEL', 'SXR'],
  ['BOM', 'SXR'],
  ['DEL', 'BOM'],
  ['BLR', 'DEL'],
  ['MAA', 'DEL'],
  ['CCU', 'DEL'],
  ['HYD', 'GOI'],
  ['COK', 'BOM'],
  ['DEL', 'IXJ'],
  ['BOM', 'DXB'],
  ['DEL', 'DOH'],
  ['BLR', 'SIN'],
  ['DEL', 'BKK'],
  ['MAA', 'KUL'],
  ['BOM', 'MRU'],
  ['COK', 'CMB'],
  ['BLR', 'MLE'],
  ['DEL', 'KTM'],
];

const CABIN_CLASSES = ['ECONOMY', 'ECONOMY', 'ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS'];

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Splits agent input into an airline code and flight digits. Accepts what people
 * actually type: "6E2134", "6e 2134", "6E-2134", "AI 825".
 */
export function parseFlightNumber(input) {
  const raw = String(input || '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
  const match = raw.match(/^([A-Z0-9]{2,3}?)(\d{1,4})$/);
  if (!match) return null;
  const [, airlineCode, flightDigits] = match;
  // A two-character code must contain at least one letter — "12 345" is not an
  // airline. Three-character codes are always letter-led in IATA.
  if (!/[A-Z]/.test(airlineCode)) return null;
  return { airlineCode, flightDigits, normalized: `${airlineCode}-${flightDigits}` };
}

// ─── Deterministic pseudo-randomness ──────────────────────────────────────────

/**
 * Same flight number + date always yields the same schedule. Without this the
 * mock would invent new times on every re-fetch, which looks like a bug.
 */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = (list, seed) => list[seed % list.length];

const pad = n => String(n).padStart(2, '0');

/** Minutes past midnight → "HH:mm", rolling past 24h back to the next day. */
function toClock(minutes) {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** Adds whole days to a yyyy-MM-dd string without dragging in a date library. */
function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// ─── Mock provider ────────────────────────────────────────────────────────────

const mockProvider = {
  name: 'mock',
  isMock: true,

  async lookup({ airlineCode, flightDigits, date }) {
    const seed = hash(`${airlineCode}${flightDigits}${date}`);
    const airline = AIRLINES[airlineCode];

    const [fromCode, toCode] = pick(ROUTES, seed);
    // Odd flight numbers fly outbound, even ones fly back — the convention most
    // carriers actually use, so an agent's "return" lookup looks right.
    const isReturnLeg = Number(flightDigits) % 2 === 0;
    const originCode = isReturnLeg ? toCode : fromCode;
    const destinationCode = isReturnLeg ? fromCode : toCode;
    const origin = AIRPORTS[originCode];
    const destination = AIRPORTS[destinationCode];

    // Depart between 05:00 and 22:00, on a five-minute boundary.
    const departureMinutes = 300 + (seed % 205) * 5;
    const international = origin.country !== destination.country;
    const durationMinutes = international ? 150 + (seed % 17) * 15 : 75 + (seed % 9) * 15;
    const arrivalMinutes = departureMinutes + durationMinutes;
    const arrivesNextDay = arrivalMinutes >= 1440;

    return {
      airline: airline?.name || `${airlineCode} Airlines`,
      airlineCode,
      flightNumber: `${airlineCode}-${flightDigits}`,
      aircraft: pick(airline?.fleet || ['Airbus A320'], seed >> 3),
      cabinClass: pick(CABIN_CLASSES, seed >> 5),

      departureCode: originCode,
      departureAirport: origin.name,
      departureCity: origin.city,
      departureTerminal: pick(origin.terminals, seed >> 7),
      departureDate: date,
      departureTime: toClock(departureMinutes),

      arrivalCode: destinationCode,
      arrivalAirport: destination.name,
      arrivalCity: destination.city,
      arrivalTerminal: pick(destination.terminals, seed >> 9),
      arrivalDate: arrivesNextDay ? addDays(date, 1) : date,
      arrivalTime: toClock(arrivalMinutes),

      durationMinutes,
      stops: 0,
      baggage: international ? '30kg check-in + 7kg cabin' : '15kg check-in + 7kg cabin',
    };
  },
};

const PROVIDERS = {
  mock: mockProvider,
};

// ─── Public API ───────────────────────────────────────────────────────────────

function activeProvider() {
  const provider = PROVIDERS[PROVIDER_NAME];
  if (provider) return provider;
  // An unknown FLIGHT_API_PROVIDER must not take the builder down; fall back to
  // the mock and say so once at startup.
  console.warn(
    `[flight.service] Unknown FLIGHT_API_PROVIDER "${PROVIDER_NAME}" — falling back to "mock".`
  );
  return mockProvider;
}

export function getFlightProviderInfo() {
  const provider = activeProvider();
  return { provider: provider.name, isMock: Boolean(provider.isMock) };
}

/**
 * Looks a flight up by number and date.
 *
 * @returns {Promise<{ found: boolean, provider: string, isMock: boolean, flight?: object, error?: string }>}
 */
export async function lookupFlight({ flightNumber, date }) {
  const parsed = parseFlightNumber(flightNumber);
  const provider = activeProvider();
  const meta = { provider: provider.name, isMock: Boolean(provider.isMock) };

  if (!parsed) {
    return {
      ...meta,
      found: false,
      error: 'Enter a flight number like 6E 2134, AI825 or UK-611.',
    };
  }

  const flight = await provider.lookup({
    airlineCode: parsed.airlineCode,
    flightDigits: parsed.flightDigits,
    date,
  });

  if (!flight) {
    return {
      ...meta,
      found: false,
      error: `No schedule found for ${parsed.normalized} on ${date}.`,
    };
  }

  return {
    ...meta,
    found: true,
    flight: {
      ...flight,
      source: 'API',
      provider: provider.name,
      fetchedAt: new Date().toISOString(),
    },
  };
}
