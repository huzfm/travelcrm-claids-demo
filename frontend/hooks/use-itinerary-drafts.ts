'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

/**
 * Incomplete itineraries: the create wizard autosaves its state to the server
 * from the moment step 1 is filled in, so the work survives leaving the page,
 * the browser or the device. Saving the finished itinerary deletes the draft.
 */
export interface ItineraryDraftSummary {
  id: string;
  title: string;
  clientName: string | null;
  destination: string | null;
  /** Wizard step the agent was last on (1-10). */
  step: number;
  leadId: string | null;
  createdAt: string;
  updatedAt: string;
  lead: { id: string; name: string; phone: string } | null;
  branch: { id: string; name: string } | null;
  creator: { id: string; name: string } | null;
}

export interface ItineraryDraftDetail<T = unknown> extends ItineraryDraftSummary {
  data: T;
}

const DRAFTS_KEY = ['itinerary-drafts'];

/** Ids are generated here so every autosave is an idempotent upsert. */
export function newItineraryDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function useItineraryDrafts() {
  return useQuery({
    queryKey: DRAFTS_KEY,
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: { drafts: ItineraryDraftSummary[] };
      }>('/itineraries/drafts');
      return response.data.data.drafts ?? [];
    },
  });
}

export function useItineraryDraft<T>(id: string | null) {
  return useQuery({
    queryKey: [...DRAFTS_KEY, id],
    enabled: Boolean(id),
    // Opened once to resume; refetching would fight the wizard's own state.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: { draft: ItineraryDraftDetail<T> };
      }>(`/itineraries/drafts/${id}`);
      return response.data.data.draft;
    },
  });
}

export function useDeleteItineraryDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/itineraries/drafts/${id}`);
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DRAFTS_KEY }),
  });
}

export type ServerDraftStatus = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DEBOUNCE_MS = 2000;

/**
 * Writes `value` to the server draft `id` on a debounce whenever it changes,
 * and straight away when the tab is hidden (switching apps, closing the lid).
 *
 * `stop()` cancels anything pending and waits for an in-flight save, so the
 * finished itinerary can be created without an autosave re-creating the
 * draft behind it. `resume()` undoes that if creating failed.
 */
export function useServerDraftAutosave<T>({
  id,
  value,
  enabled,
}: {
  id: string;
  value: T;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  // Tagged with the draft id, so switching drafts ("Start fresh") reads as idle.
  const [statusFor, setStatusFor] = useState<{ id: string; status: ServerDraftStatus }>({
    id,
    status: 'idle',
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const stoppedRef = useRef(false);
  const latestRef = useRef({ id, value, enabled });
  const lastSavedRef = useRef<{ id: string; data: T } | null>(null);
  const listedRef = useRef<string | null>(null);

  useEffect(() => {
    latestRef.current = { id, value, enabled };
  });

  const save = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // One request at a time, so an older snapshot can never land after a newer one.
    if (inFlightRef.current) await inFlightRef.current;

    const { id: draftId, value: data, enabled: on } = latestRef.current;
    const isSaved = (d: T) =>
      lastSavedRef.current?.id === draftId && lastSavedRef.current.data === d;
    if (!on || stoppedRef.current || isSaved(data)) return;

    setStatusFor({ id: draftId, status: 'saving' });
    const request = api
      .put(`/itineraries/drafts/${draftId}`, { data })
      .then(() => {
        lastSavedRef.current = { id: draftId, data };
        setStatusFor({
          id: draftId,
          status: latestRef.current.value === data ? 'saved' : 'saving',
        });
        // The first save creates the draft; let the list pick it up.
        if (listedRef.current !== draftId) {
          listedRef.current = draftId;
          queryClient.invalidateQueries({ queryKey: DRAFTS_KEY, exact: true });
        }
      })
      .catch(() => {
        // Offline or a server hiccup: the browser copy still holds the work,
        // and the next change retries.
        setStatusFor({ id: draftId, status: 'error' });
      })
      .finally(() => {
        inFlightRef.current = null;
      });
    inFlightRef.current = request;
    await request;
  }, [queryClient]);

  // Debounced save on every change.
  useEffect(() => {
    if (!enabled || stoppedRef.current) return;
    if (lastSavedRef.current?.id === id && lastSavedRef.current.data === value) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(), AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, value, enabled, save]);

  // Save immediately when the agent leaves the tab or the page.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void save();
    };
    document.addEventListener('visibilitychange', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      // Navigating elsewhere inside the app unmounts the wizard.
      void save();
    };
  }, [save]);

  const stop = useCallback(async () => {
    stoppedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (inFlightRef.current) await inFlightRef.current;
  }, []);

  const resume = useCallback(() => {
    stoppedRef.current = false;
  }, []);

  const status: ServerDraftStatus = enabled && statusFor.id === id ? statusFor.status : 'idle';
  return { status, stop, resume };
}
