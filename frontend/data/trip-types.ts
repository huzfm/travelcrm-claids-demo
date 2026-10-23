// Trip types offered in the itinerary builder.
//
// The value is stored verbatim on `itinerary.tripType`, which is a free-form
// string column — the presets below are only the shortcuts, agents can type
// anything else ("Corporate Offsite", "Pilgrimage", …).

export interface TripTypePreset {
  /** Stored value. Upper snake case so legacy rows keep matching. */
  value: string;
  label: string;
  /** Emoji shown on the chip; keeps the selector readable at a glance. */
  icon: string;
}

export const TRIP_TYPE_PRESETS: TripTypePreset[] = [
  { value: 'HONEYMOON', label: 'Honeymoon', icon: '💑' },
  { value: 'FAMILY', label: 'Family', icon: '👨‍👩‍👧' },
  { value: 'SOLO', label: 'Solo', icon: '🎒' },
  { value: 'FRIENDS', label: 'Friends', icon: '🧑‍🤝‍🧑' },
  { value: 'ADVENTURE', label: 'Adventure', icon: '🏔️' },
  { value: 'LEISURE', label: 'Leisure', icon: '🏖️' },
  { value: 'PILGRIMAGE', label: 'Pilgrimage', icon: '🛕' },
  { value: 'BUSINESS', label: 'Business', icon: '💼' },
  { value: 'GROUP', label: 'Group', icon: '🚌' },
  { value: 'DOMESTIC', label: 'Domestic', icon: '🇮🇳' },
  { value: 'INTERNATIONAL', label: 'International', icon: '🌏' },
];

/** Custom trip types the agent has typed before, so they come back as chips. */
const CUSTOM_TRIP_TYPES_KEY = 'itinerary_custom_trip_types';
const MAX_REMEMBERED = 12;

/** Turns free text into the stored form: "Corporate offsite" -> "CORPORATE_OFFSITE". */
export function normalizeTripType(input: string): string {
  return input.trim().replace(/\s+/g, '_').toUpperCase();
}

/** "CORPORATE_OFFSITE" -> "Corporate Offsite". Presets keep their own label. */
export function tripTypeLabel(value?: string | null): string {
  if (!value) return '';
  const preset = TRIP_TYPE_PRESETS.find(t => t.value === value);
  if (preset) return preset.label;
  return value
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function isPresetTripType(value?: string | null): boolean {
  return !!value && TRIP_TYPE_PRESETS.some(t => t.value === value);
}

// ─── localStorage-backed store ────────────────────────────────────────────────
//
// Exposed as a `useSyncExternalStore` source so components read it without a
// setState-in-effect, and every mounted selector updates together. The snapshot
// is cached because `useSyncExternalStore` compares it by reference.

const EMPTY: readonly string[] = [];
const listeners = new Set<() => void>();
let snapshot: readonly string[] | null = null;

function readStorage(): readonly string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TRIP_TYPES_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const values = parsed.filter((v): v is string => typeof v === 'string');
    return values.length > 0 ? values : EMPTY;
  } catch {
    return EMPTY;
  }
}

function commit(next: readonly string[]): readonly string[] {
  snapshot = next;
  try {
    localStorage.setItem(CUSTOM_TRIP_TYPES_KEY, JSON.stringify(next));
  } catch {
    // Storage full or disabled — the value still saves on the itinerary, and
    // the in-memory snapshot keeps the chip around for this session.
  }
  listeners.forEach(listener => listener());
  return next;
}

export function subscribeCustomTripTypes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCustomTripTypes(): readonly string[] {
  if (typeof window === 'undefined') return EMPTY;
  if (snapshot === null) snapshot = readStorage();
  return snapshot;
}

/** Server snapshot: nothing is remembered until the browser has rendered. */
export function getServerCustomTripTypes(): readonly string[] {
  return EMPTY;
}

/** Remembers a custom value, most recent first. Presets are not stored twice. */
export function rememberCustomTripType(value: string): readonly string[] {
  const normalized = normalizeTripType(value);
  const current = getCustomTripTypes();
  if (!normalized || isPresetTripType(normalized)) return current;

  return commit([normalized, ...current.filter(v => v !== normalized)].slice(0, MAX_REMEMBERED));
}

export function forgetCustomTripType(value: string): readonly string[] {
  return commit(getCustomTripTypes().filter(v => v !== value));
}
