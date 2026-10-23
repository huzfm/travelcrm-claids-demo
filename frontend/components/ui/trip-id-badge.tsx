'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Check, Copy, Hash } from 'lucide-react';

export interface TripIdBadgeProps {
  tripId?: string | null;
  className?: string;
  /** Hide the leading hash icon where space is tight. */
  compact?: boolean;
}

/**
 * A trip's reference code, shown wherever a trip is listed.
 *
 * Staff read this out to customers and paste it into the search box, so it is
 * click-to-copy rather than plain text.
 */
export function TripIdBadge({ tripId, className, compact }: TripIdBadgeProps) {
  const [copied, setCopied] = useState(false);

  if (!tripId) {
    return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  }

  const copy = async (event: React.MouseEvent) => {
    // Rows and cards are usually wrapped in a link; copying should not navigate.
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(tripId);
      setCopied(true);
      toast.success(`Copied ${tripId}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy the trip ID');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${tripId}`}
      className={cn(
        'group/trip inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5',
        'font-mono text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20',
        className
      )}
    >
      {!compact && <Hash className="h-3 w-3 shrink-0 opacity-70" />}
      <span className="truncate">{tripId}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0" />
      ) : (
        <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/trip:opacity-70" />
      )}
    </button>
  );
}
