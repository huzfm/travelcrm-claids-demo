'use client';

import { useMemo } from 'react';
import { Users, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrencyText } from '@/lib/currency';
import {
  alignSplit,
  allocatedTotal,
  perPersonSplitError,
  splitEqually,
  travellerLabels,
} from '@/lib/per-person-split';
import type { PerPersonShare } from '@/types/itinerary.types';

interface PerPersonSplitCardProps {
  /** The package price being divided. */
  total: number;
  adults: number;
  childCount: number;
  childrenAges?: number[];
  currency: string;
  /** Undefined while the split is switched off. */
  value?: PerPersonShare[];
  onChange: (value: PerPersonShare[] | undefined) => void;
}

/**
 * Optional: divides a package's price between its travellers for the quote.
 * The amounts may leave part of the total unallocated, never exceed it.
 */
export function PerPersonSplitCard({
  total,
  adults,
  childCount,
  childrenAges,
  currency,
  value,
  onChange,
}: PerPersonSplitCardProps) {
  const labels = useMemo(
    () => travellerLabels(adults, childCount, childrenAges),
    [adults, childCount, childrenAges]
  );
  const enabled = Boolean(value);
  // Follows the headcount if travellers changed since the split was made.
  const split = useMemo(() => (value ? alignSplit(value, labels) : []), [value, labels]);
  const allocated = allocatedTotal(split);
  const remaining = total - allocated;
  const error = perPersonSplitError(split, total, currency);

  if (labels.length === 0) return null;

  const setAmount = (idx: number, amount: number) =>
    onChange(split.map((s, i) => (i === idx ? { ...s, amount: Math.max(0, amount) } : s)));

  return (
    <Card className={cn(enabled && (error ? 'border-red-300' : 'border-primary/30'))}>
      <CardContent className="space-y-4 pt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => onChange(e.target.checked ? splitEqually(total, labels) : undefined)}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              Split price per person
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Show each traveller&apos;s share on the quote. The shares can&apos;t add up to more
              than {formatCurrencyText(total, currency)}.
            </p>
          </div>
        </label>

        {enabled && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {split.map((share, idx) => (
                <div
                  key={share.label}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <span className="text-sm font-medium">{share.label}</span>
                  <input
                    type="number"
                    min={0}
                    value={share.amount || ''}
                    placeholder="0"
                    onChange={e => setAmount(idx, Number(e.target.value) || 0)}
                    // Scrolling past a focused number box must not change a share.
                    onWheel={e => e.currentTarget.blur()}
                    aria-label={`${share.label} amount`}
                    className="w-32 rounded-md border bg-background px-2 py-1 text-right text-sm font-semibold outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>

            <div
              className={cn(
                'flex flex-col gap-2 rounded-lg px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between',
                error ? 'bg-red-50 text-red-700' : 'bg-primary/5'
              )}
            >
              <div className="flex items-start gap-2">
                {error ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
                <span>
                  {error ?? (
                    <>
                      Allocated <b>{formatCurrencyText(allocated, currency)}</b> of{' '}
                      {formatCurrencyText(total, currency)}
                      {remaining > 0 && (
                        <span className="text-muted-foreground">
                          {' '}
                          · {formatCurrencyText(remaining, currency)} unallocated
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(splitEqually(total, labels))}
                className="shrink-0"
              >
                Split equally
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
