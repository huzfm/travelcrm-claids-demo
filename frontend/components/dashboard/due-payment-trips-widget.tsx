'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrencyText } from '@/lib/currency';
import { useDueTrips } from '@/hooks/useDashboard';
import type { DueTrip, DueTripScope, DueTripsResponse } from '@/types/dashboard.types';
import { CheckCircle2, Phone, Receipt } from 'lucide-react';
import { SegmentedControl, WidgetCard, WidgetEmpty } from './widget-shell';

const SCOPES: { value: DueTripScope; label: string }[] = [
  { value: 'live', label: 'Ongoing' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'ended_yesterday', label: 'Ended Yesterday' },
  { value: 'starts_in_7_days', label: 'Starts in 7 Days' },
];

export interface DuePaymentTripsWidgetProps {
  /** Live trips from the combined overview call, used until the tab changes. */
  initialData?: DueTripsResponse | null;
}

/**
 * Trips with money still outstanding, split by where they sit relative to
 * today. This is the collections worklist.
 */
export function DuePaymentTripsWidget({ initialData }: DuePaymentTripsWidgetProps) {
  const [scope, setScope] = useState<DueTripScope>('live');

  const { data, isLoading } = useDueTrips(scope, scope !== 'live' || !initialData);
  const result = scope === 'live' ? (data ?? initialData ?? null) : (data ?? null);
  const trips = result?.trips ?? [];
  const currency = trips[0]?.currency ?? 'INR';

  return (
    <WidgetCard
      title="Trips with Due Payments"
      href="/trips"
      icon={Receipt}
      tone="danger"
      meta={
        result && result.totalDue > 0
          ? `${formatCurrencyText(result.totalDue, currency)} outstanding across ${result.count} ${
              result.count === 1 ? 'trip' : 'trips'
            }`
          : undefined
      }
      action={
        <SegmentedControl
          value={scope}
          onChange={setScope}
          options={SCOPES}
          label="Trip scope"
          className="max-w-[min(100%,15rem)] sm:max-w-none"
        />
      }
      contentClassName="p-0 sm:p-0"
      footer={
        trips.length > 0 ? (
          <Link
            href="/trips?paymentStatus=PENDING"
            className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            View all trips with a balance →
          </Link>
        ) : undefined
      }
    >
      {isLoading && !result ? (
        <div className="space-y-2 p-4 sm:p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <WidgetEmpty
          icon={CheckCircle2}
          title="Nothing outstanding here"
          description="Every trip in this view is fully paid up."
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {trips.map(trip => (
            <DueTripRow key={trip.id} trip={trip} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

/** "13 Sep" for the trip start date. */
const shortDate = (value: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const ordinal = (n: number) => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

/** "2nd Day of 5", "Starts tomorrow", "Ended 3 days ago". */
const progressBadge = (trip: DueTrip): { label: string; className: string } | null => {
  switch (trip.phase) {
    case 'ongoing': {
      if (!trip.currentDay) return null;
      const isLast = trip.totalDays != null && trip.currentDay === trip.totalDays;
      return {
        label: `${ordinal(trip.currentDay)} Day${trip.totalDays ? ` of ${trip.totalDays}` : ''}${
          isLast ? ' · Last day' : ''
        }`,
        className: 'bg-success/10 text-success',
      };
    }
    case 'upcoming': {
      const n = trip.startsInDays ?? 0;
      return {
        label: n <= 1 ? 'Starts tomorrow' : `Starts in ${n} days`,
        className: 'bg-primary/10 text-primary',
      };
    }
    case 'ended': {
      const n = trip.endedDaysAgo ?? 0;
      return {
        label: n <= 1 ? 'Ended yesterday' : `Ended ${n} days ago`,
        className: 'bg-muted text-muted-foreground',
      };
    }
    default:
      return null;
  }
};

function DueTripRow({ trip }: { trip: DueTrip }) {
  const pax = [
    trip.adults ? `${trip.adults}A` : null,
    trip.children ? `${trip.children}C` : null,
  ].filter(Boolean);

  const meta = [
    shortDate(trip.startDate),
    trip.days > 0 ? `${trip.nights}N, ${trip.days}D` : null,
    pax.length > 0 ? pax.join(', ') : trip.totalTravelers ? `${trip.totalTravelers} pax` : null,
  ].filter(Boolean);

  const badge = progressBadge(trip);
  const name = trip.lead?.name ?? trip.title;
  const paidPct =
    trip.totalCost > 0 ? Math.min(100, Math.max(0, (trip.totalPaid / trip.totalCost) * 100)) : 0;

  return (
    <li>
      <Link
        href={`/trips/${trip.id}`}
        className="flex flex-col gap-2.5 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
      >
        {/* Customer */}
        <div className="flex min-w-0 items-center gap-2.5 sm:w-1/3">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold uppercase text-primary"
            aria-hidden
          >
            {name.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium">{name}</span>
              {trip.lead?.phone && <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />}
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {trip.lead?.source && (
                <span className="capitalize">{formatSource(trip.lead.source)}</span>
              )}
              {trip.lead?.source && trip.tripId && ' • '}
              {trip.tripId && <span className="text-primary">{trip.tripId}</span>}
            </p>
          </div>
        </div>

        {/* Trip */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm">{trip.destination || trip.title}</p>
            {badge && (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  badge.className
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
          {meta.length > 0 && (
            <p className="truncate text-[11px] text-muted-foreground">
              {meta.map((m, i) => (
                <span key={i}>
                  {i > 0 && ' • '}
                  {m}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Money */}
        <div className="shrink-0 sm:w-40 sm:text-right">
          <p className="stat-number text-sm font-semibold text-destructive">
            {formatCurrencyText(trip.balance, trip.currency)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            of {formatCurrencyText(trip.totalCost, trip.currency)}
          </p>
          {/* How far through the bill they are, so a nearly-settled trip reads
              differently from one that has paid nothing. */}
          <div
            className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${Math.round(paidPct)}% paid`}
          >
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                paidPct >= 75 ? 'bg-success' : paidPct >= 40 ? 'bg-warning' : 'bg-destructive'
              )}
              style={{ width: `${Math.max(paidPct, 2)}%` }}
            />
          </div>
        </div>
      </Link>
    </li>
  );
}

/** META_ADS -> Meta Ads */
const formatSource = (source: string) =>
  source
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
