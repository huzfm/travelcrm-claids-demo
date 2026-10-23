// Optional per-traveller split of a package's total price ("Adult 1: 45,000,
// Adult 2: 35,000, Child 1: 20,000"). Shown in the pricing step and on the
// client's quote PDF. It may leave part of the total unallocated, but never
// adds up to more than the total — perPersonSplitError enforces that.

import { formatCurrencyText } from '@/lib/currency';
import type { PerPersonShare } from '@/types/itinerary.types';

/** One label per traveller: "Adult 1", "Adult 2", "Child 1 (7 yrs)". */
export function travellerLabels(adults: number, children: number, childrenAges: number[] = []) {
  const labels: string[] = [];
  for (let i = 0; i < Math.max(0, adults); i++) labels.push(`Adult ${i + 1}`);
  for (let i = 0; i < Math.max(0, children); i++) {
    const age = childrenAges[i];
    labels.push(Number.isFinite(age) ? `Child ${i + 1} (${age} yrs)` : `Child ${i + 1}`);
  }
  return labels;
}

/** The total divided evenly in whole rupees; the first traveller takes any remainder. */
export function splitEqually(total: number, labels: string[]): PerPersonShare[] {
  if (labels.length === 0) return [];
  const each = Math.floor(Math.max(0, total) / labels.length);
  const remainder = Math.max(0, Math.round(total)) - each * labels.length;
  return labels.map((label, i) => ({ label, amount: each + (i === 0 ? remainder : 0) }));
}

// "Child 1 (7 yrs)" -> "Child 1", so a share survives a child's age being edited.
const travellerKey = (label: string) => label.replace(/\s*\(.*\)$/, '');

/**
 * Keeps a saved split lined up with the current travellers: labels follow the
 * headcount, each traveller keeps their own amount, new travellers start at 0.
 */
export function alignSplit(split: PerPersonShare[], labels: string[]): PerPersonShare[] {
  const byTraveller = new Map(split.map(s => [travellerKey(s.label), s.amount]));
  return labels.map(label => ({ label, amount: byTraveller.get(travellerKey(label)) ?? 0 }));
}

export function allocatedTotal(split: PerPersonShare[] | undefined) {
  return (split || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
}

/** Why a split can't be saved, or null when it's fine (or not used). */
export function perPersonSplitError(
  split: PerPersonShare[] | undefined,
  total: number,
  currency = 'INR'
): string | null {
  if (!split || split.length === 0) return null;
  const allocated = allocatedTotal(split);
  if (allocated > total) {
    return `Per-person prices add up to ${formatCurrencyText(allocated, currency)}, ${formatCurrencyText(allocated - total, currency)} more than the total of ${formatCurrencyText(total, currency)}.`;
  }
  return null;
}

/** The split to save for these travellers, or undefined when it's switched off. */
export function splitForTravellers(
  split: PerPersonShare[] | undefined,
  travellers: { adults: number; children: number; childrenAges?: number[] }
): PerPersonShare[] | undefined {
  if (!split) return undefined;
  return alignSplit(
    split,
    travellerLabels(travellers.adults, travellers.children, travellers.childrenAges)
  );
}
