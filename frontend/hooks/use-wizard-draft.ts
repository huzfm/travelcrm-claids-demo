'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

const PREFIX = 'itinerary-draft:';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a week
const DEBOUNCE_MS = 700;

interface StoredDraft<T> {
  /** Shape version. A draft written by an older build is discarded. */
  v: number;
  savedAt: number;
  data: T;
}

export type DraftStatus = 'idle' | 'saving' | 'saved';

export interface WizardDraft<T> {
  /**
   * What was in storage when this page loaded, or null. Deliberately frozen at
   * load: it answers "is there work to resume", not "what is in storage now",
   * so saving doesn't make the resume banner reappear.
   */
  restored: { data: T; savedAt: number } | null;
  status: DraftStatus;
  /** Forget the stored draft — after a successful save, or "start fresh". */
  clear: () => void;
}

// ─── Snapshot cache ──────────────────────────────────────────────────────────
//
// `useSyncExternalStore` compares snapshots by reference, so each key's parsed
// draft is read from localStorage once and held. Writes deliberately do NOT
// refresh it (see `restored` above); only `clear` does.

const snapshots = new Map<string, StoredDraft<unknown> | null>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readFromStorage<T>(storageKey: string, version: number, ttlMs: number) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || parsed.v !== version || typeof parsed.savedAt !== 'number') {
      localStorage.removeItem(storageKey);
      return null;
    }
    if (Date.now() - parsed.savedAt > ttlMs) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return parsed;
  } catch {
    // Unparseable, or storage blocked in a private window.
    return null;
  }
}

function getSnapshot<T>(storageKey: string, version: number, ttlMs: number) {
  if (!snapshots.has(storageKey)) {
    snapshots.set(storageKey, readFromStorage<T>(storageKey, version, ttlMs));
  }
  return snapshots.get(storageKey) as StoredDraft<T> | null;
}

/**
 * Keeps a multi-step wizard's state in localStorage so leaving the page — or
 * closing the tab outright — doesn't lose the work.
 *
 * Every draft is filed under its own `key`, so one itinerary's work can never
 * be restored into another's.
 */
export function useWizardDraft<T>({
  key,
  version,
  value,
  shouldSave,
  ttlMs = DEFAULT_TTL_MS,
}: {
  /** Stable per-itinerary key, e.g. `lead:123`. null disables the draft. */
  key: string | null;
  /** Bump when the shape of `T` changes; older drafts are then discarded. */
  version: number;
  /** Current wizard state. Written on a debounce whenever it changes. */
  value: T;
  /** False while the wizard is still empty — nothing worth storing yet. */
  shouldSave: boolean;
  ttlMs?: number;
}): WizardDraft<T> {
  const storageKey = key ? PREFIX + key : null;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The status is derived, not stored: `value` is a fresh object whenever the
  // wizard changes, so anything that isn't the last written object is pending.
  // Only the write itself sets state, from inside the debounce callback.
  const [savedValue, setSavedValue] = useState<T | null>(null);
  const status: DraftStatus =
    !shouldSave || !storageKey ? 'idle' : savedValue === value ? 'saved' : 'saving';

  const stored = useSyncExternalStore(
    subscribe,
    () => (storageKey ? getSnapshot<T>(storageKey, version, ttlMs) : null),
    () => null
  );

  // Write on a debounce. The days array is large, and serialising it on every
  // keystroke is wasted work.
  useEffect(() => {
    if (!storageKey || !shouldSave) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const payload: StoredDraft<T> = { v: version, savedAt: Date.now(), data: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setSavedValue(value);
      } catch {
        // Quota exceeded or storage disabled — the wizard still works in memory.
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, version, value, shouldSave]);

  // The flush below must see the newest state without re-subscribing, or its
  // cleanup would run on every change and write synchronously each time —
  // which would defeat the debounce entirely.
  const latest = useRef({ storageKey, version, value, shouldSave });
  useEffect(() => {
    latest.current = { storageKey, version, value, shouldSave };
  }, [storageKey, version, value, shouldSave]);

  // Flush on the way out, so navigating away inside the debounce window still
  // lands. `pagehide` also covers tab close and the back/forward cache, which
  // `beforeunload` does not do reliably on mobile.
  useEffect(() => {
    const flush = () => {
      const current = latest.current;
      if (!current.storageKey || !current.shouldSave) return;
      try {
        localStorage.setItem(
          current.storageKey,
          JSON.stringify({ v: current.version, savedAt: Date.now(), data: current.value })
        );
      } catch {
        // Nothing useful to do while the page is going away.
      }
    };

    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  const clear = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore.
    }
    snapshots.set(storageKey, null);
    listeners.forEach(listener => listener());
    setSavedValue(null);
  }, [storageKey]);

  // Memoised so callers can safely list it in a dependency array: a fresh
  // object every render would re-run their effects on each keystroke. `status`
  // is deliberately left out of this object for the same reason — it flips
  // while typing, and consumers read it separately.
  const restored = useMemo(
    () => (stored ? { data: stored.data, savedAt: stored.savedAt } : null),
    [stored]
  );

  return { restored, status, clear };
}
