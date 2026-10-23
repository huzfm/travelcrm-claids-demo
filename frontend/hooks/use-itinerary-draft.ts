'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WizardDraft, Step1Data } from '@/components/itinerary/wizard-types';
import {
  DEFAULT_STEP1,
  DEFAULT_STEP4,
  createEmptyStep2,
  createEmptyStep3,
} from '@/components/itinerary/wizard-types';

// ─── Storage Keys & Config ─────────────────────────────────────────────────────

const DRAFT_STORAGE_PREFIX = 'itinerary_wizard_draft_';
const DRAFT_EXPIRY_HOURS = 24;
const DEBOUNCE_DELAY_MS = 1000;

// ─── Storage Utilities ─────────────────────────────────────────────────────────

function getDraftKey(leadId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${leadId}`;
}

function getDraftFromStorage(leadId: string): WizardDraft | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(getDraftKey(leadId));
    if (!raw) return null;

    const draft = JSON.parse(raw) as WizardDraft;

    // Validate basic structure
    if (!draft.leadId || !draft.currentStep || !draft.createdAt || !draft.updatedAt) {
      localStorage.removeItem(getDraftKey(leadId));
      return null;
    }

    return draft;
  } catch {
    // Corrupted data - clean up
    localStorage.removeItem(getDraftKey(leadId));
    return null;
  }
}

function saveDraftToStorage(draft: WizardDraft): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(getDraftKey(draft.leadId), JSON.stringify(draft));
    return true;
  } catch {
    // Storage might be full or disabled
    return false;
  }
}

function removeDraftFromStorage(leadId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(getDraftKey(leadId));
  } catch {
    // Ignore cleanup errors
  }
}

function isDraftExpired(draft: WizardDraft): boolean {
  const updatedAt = new Date(draft.updatedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff > DRAFT_EXPIRY_HOURS;
}

function getDraftAge(draft: WizardDraft): string {
  const updatedAt = new Date(draft.updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updatedAt.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// ─── Hook Interface ────────────────────────────────────────────────────────────

export interface UseItineraryDraftResult {
  draft: WizardDraft | null;
  hasDraft: boolean;
  showResumePrompt: boolean;
  draftAge: string | null;
  isLoading: boolean;
  saveDraft: (partial: Partial<WizardDraft>) => void;
  clearDraft: () => void;
  dismissResumePrompt: () => void;
  resumeDraft: () => WizardDraft | null;
  startFresh: () => void;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

/**
 * Manages itinerary wizard draft state with localStorage persistence.
 *
 * Features:
 * - Auto-saves draft on every change (debounced)
 * - Restores draft from localStorage on mount
 * - Shows "Resume draft?" prompt for old drafts (>24 hours)
 * - Auto-resumes drafts newer than 24 hours
 * - Clears draft on successful submission
 * - Survives page refresh and browser close
 */
export function useItineraryDraft(leadId: string): UseItineraryDraftResult {
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [draftAge, setDraftAge] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft from storage on mount
  useEffect(() => {
    if (!leadId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mount
      setIsLoading(false);
      return;
    }

    const storedDraft = getDraftFromStorage(leadId);

    if (storedDraft) {
      const expired = isDraftExpired(storedDraft);

      setDraft(storedDraft);
      setHasDraft(true);
      setDraftAge(getDraftAge(storedDraft));

      if (expired) {
        // Show prompt for old drafts
        setShowResumePrompt(true);
      }
      // Auto-resume for fresh drafts (showResumePrompt stays false)
    } else {
      // No draft exists - initialize empty
      const now = new Date().toISOString();
      const newDraft: WizardDraft = {
        leadId,
        currentStep: 1,
        createdAt: now,
        updatedAt: now,
        step1: { ...DEFAULT_STEP1 },
        step2: {},
        step3: {},
        step4: { ...DEFAULT_STEP4 },
        step5: {},
      };
      setDraft(newDraft);
      setHasDraft(false);
    }

    setIsLoading(false);
  }, [leadId]);

  /**
   * Save draft to localStorage (debounced).
   * Accepts partial updates and merges with existing draft.
   */
  const saveDraft = useCallback((partial: Partial<WizardDraft>) => {
    setDraft(prevDraft => {
      if (!prevDraft) return prevDraft;

      const now = new Date().toISOString();
      const updatedDraft: WizardDraft = {
        ...prevDraft,
        ...partial,
        leadId: prevDraft.leadId, // Preserve leadId
        updatedAt: now,
      };

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the actual storage write
      debounceTimerRef.current = setTimeout(() => {
        saveDraftToStorage(updatedDraft);
        setHasDraft(true);
        setDraftAge('just now');
      }, DEBOUNCE_DELAY_MS);

      return updatedDraft;
    });
  }, []);

  /**
   * Clear draft from state and localStorage.
   */
  const clearDraft = useCallback(() => {
    // Clear debounce timer if pending
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    removeDraftFromStorage(leadId);
    setDraft(null);
    setHasDraft(false);
    setShowResumePrompt(false);
    setDraftAge(null);
  }, [leadId]);

  /**
   * Dismiss the resume prompt (user chose not to resume).
   */
  const dismissResumePrompt = useCallback(() => {
    setShowResumePrompt(false);
  }, []);

  /**
   * Resume the saved draft.
   * Returns the draft data or null if no draft exists.
   */
  const resumeDraft = useCallback((): WizardDraft | null => {
    const storedDraft = getDraftFromStorage(leadId);
    if (storedDraft) {
      setDraft(storedDraft);
      setShowResumePrompt(false);
      setDraftAge(getDraftAge(storedDraft));
      return storedDraft;
    }
    return null;
  }, [leadId]);

  /**
   * Start fresh - clears draft and initializes empty state.
   */
  const startFresh = useCallback(() => {
    clearDraft();

    const now = new Date().toISOString();
    const newDraft: WizardDraft = {
      leadId,
      currentStep: 1,
      createdAt: now,
      updatedAt: now,
      step1: { ...DEFAULT_STEP1 },
      step2: {},
      step3: {},
      step4: { ...DEFAULT_STEP4 },
      step5: {},
    };
    setDraft(newDraft);
  }, [leadId, clearDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    draft,
    hasDraft,
    showResumePrompt,
    draftAge,
    isLoading,
    saveDraft,
    clearDraft,
    dismissResumePrompt,
    resumeDraft,
    startFresh,
  };
}

// ─── Draft Management Utilities ───────────────────────────────────────────────

/**
 * Check if any draft exists for a given lead ID.
 * Use this before mounting the hook to conditionally render UI.
 */
export function checkDraftExists(leadId: string): boolean {
  return getDraftFromStorage(leadId) !== null;
}

/**
 * Get draft age without mounting the hook.
 */
export function getDraftAgeInfo(leadId: string): {
  exists: boolean;
  expired: boolean;
  age: string | null;
} {
  const draft = getDraftFromStorage(leadId);

  if (!draft) {
    return { exists: false, expired: false, age: null };
  }

  return {
    exists: true,
    expired: isDraftExpired(draft),
    age: getDraftAge(draft),
  };
}

/**
 * Clear all wizard drafts from localStorage.
 * Useful for cleanup operations or testing.
 */
export function clearAllDrafts(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

// ─── Draft Initialization Helpers ─────────────────────────────────────────────

/**
 * Create an initial draft from lead data.
 * Use this when starting a new wizard with pre-filled values.
 */
export function createDraftFromLead(
  leadId: string,
  leadData: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    tripType?: string;
    paxCount?: number;
    name?: string;
  },
  templateData?: {
    id?: string;
    title?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    tripType?: string;
  }
): WizardDraft {
  const now = new Date().toISOString();

  // Calculate days from dates
  const startDate = templateData?.startDate || leadData.startDate || '';
  const endDate = templateData?.endDate || leadData.endDate || '';
  const daysCount = calculateDays(startDate, endDate);

  const step1: Step1Data = {
    quoteMode: 'single',
    title: templateData?.title || `${leadData.name || 'Trip'} - ${leadData.destination || ''}`,
    destination: templateData?.destination || leadData.destination || '',
    templateId: templateData?.id,
    startDate,
    endDate,
    totalTravelers: leadData.paxCount || 1,
    tripType: (templateData?.tripType || leadData.tripType) as Step1Data['tripType'],
  };

  return {
    leadId,
    currentStep: 1,
    createdAt: now,
    updatedAt: now,
    step1,
    step2: createEmptyStep2(daysCount),
    step3: createEmptyStep3(daysCount),
    step4: { ...DEFAULT_STEP4 },
    step5: {},
  };
}

function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 3;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 3;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, Math.min(diff, 365)); // Clamp between 1 and 365 days
}
