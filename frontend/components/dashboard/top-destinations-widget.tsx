'use client';

import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard, WidgetEmpty } from './widget-shell';

export interface TopDestinationsWidgetProps {
  destinations?: Array<{ name: string; count: number; price: string }>;
}

/** Rank colour, brightest at the top of the board. */
const RANK_STYLES = [
  'bg-primary text-primary-foreground',
  'bg-accent text-accent-foreground',
  'bg-primary/15 text-primary',
  'bg-muted text-muted-foreground',
  'bg-muted text-muted-foreground',
];

/**
 * NOTE: with no `destinations` prop this falls back to sample rows. There is no
 * top-destinations endpoint yet, so the dashboard currently renders the sample.
 */
const SAMPLE_DESTINATIONS = [
  { name: 'Dubai', count: 12, price: 'From ₹1,200' },
  { name: 'Bali', count: 9, price: 'From ₹800' },
  { name: 'Paris', count: 8, price: 'From ₹1,500' },
  { name: 'Maldives', count: 6, price: 'From ₹2,000' },
  { name: 'Tokyo', count: 5, price: 'From ₹1,300' },
];

export function TopDestinationsWidget({ destinations }: TopDestinationsWidgetProps) {
  const data = destinations ?? SAMPLE_DESTINATIONS;
  const max = data.reduce((acc, d) => Math.max(acc, d.count), 0);

  return (
    <WidgetCard title="Top Destinations" icon={MapPin} tone="gold">
      {data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((dest, i) => (
            <li
              key={dest.name}
              className="flex items-center gap-2.5 rounded-lg border border-transparent bg-muted/40 p-2.5 transition-colors hover:border-border hover:bg-muted/80"
            >
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                  RANK_STYLES[i] ?? RANK_STYLES[RANK_STYLES.length - 1]
                )}
              >
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{dest.name}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{dest.price}</span>
                </div>
                {/* Share of the leading destination, so the gap between first
                    and fifth is visible without reading every number. */}
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/70">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-500"
                      style={{ width: `${max > 0 ? Math.max((dest.count / max) * 100, 4) : 4}%` }}
                    />
                  </div>
                  <span className="stat-number shrink-0 text-[11px] text-muted-foreground">
                    {dest.count} trips
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <WidgetEmpty icon={MapPin} title="No destination data yet" />
      )}
    </WidgetCard>
  );
}
