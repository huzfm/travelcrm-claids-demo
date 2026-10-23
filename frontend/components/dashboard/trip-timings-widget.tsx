'use client';

import type { TripTimings } from '@/types/dashboard.types';
import { PlaneLanding, PlaneTakeoff, CalendarRange } from 'lucide-react';
import {
  SectionHeading,
  StatTile,
  TileGrid,
  TileGridSkeleton,
  WidgetCard,
  type WidgetTone,
} from './widget-shell';

export interface TripTimingsWidgetProps {
  timings?: TripTimings | null;
  isLoading?: boolean;
}

/** Local 'YYYY-MM-DD' for a day offset from today, for the trip-list links. */
const dayParam = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

/**
 * How many trips begin and end around now, so staff can see the day's
 * departures and arrivals at a glance.
 */
export function TripTimingsWidget({ timings, isLoading }: TripTimingsWidgetProps) {
  const loading = isLoading && !timings;

  return (
    <section className="space-y-3">
      <SectionHeading title="Trip Starts and Endings" icon={CalendarRange} />

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <TimingCard
          title="Trips Starting"
          href="/trips?status=UPCOMING"
          icon={PlaneTakeoff}
          tone="info"
          loading={loading}
          buckets={[
            {
              label: 'Today',
              value: timings?.starting.today,
              href: `/trips?startDateFrom=${dayParam(0)}&startDateTo=${dayParam(0)}`,
            },
            {
              label: 'Yesterday',
              value: timings?.starting.yesterday,
              href: `/trips?startDateFrom=${dayParam(-1)}&startDateTo=${dayParam(-1)}`,
            },
            {
              label: 'Next 7 Days',
              value: timings?.starting.next7Days,
              href: `/trips?startDateFrom=${dayParam(1)}&startDateTo=${dayParam(7)}`,
            },
          ]}
        />

        <TimingCard
          title="Trips Ending"
          href="/trips?status=ONGOING"
          icon={PlaneLanding}
          tone="gold"
          loading={loading}
          buckets={[
            {
              label: 'Today',
              value: timings?.ending.today,
              href: `/trips?endDateFrom=${dayParam(0)}&endDateTo=${dayParam(0)}`,
            },
            {
              label: 'Tomorrow',
              value: timings?.ending.tomorrow,
              href: `/trips?endDateFrom=${dayParam(1)}&endDateTo=${dayParam(1)}`,
            },
            {
              label: 'Prev 7 Days',
              value: timings?.ending.prev7Days,
              href: `/trips?endDateFrom=${dayParam(-7)}&endDateTo=${dayParam(-1)}`,
            },
          ]}
        />
      </div>
    </section>
  );
}

function TimingCard({
  title,
  href,
  icon,
  tone,
  buckets,
  loading,
}: {
  title: string;
  href: string;
  icon: typeof PlaneTakeoff;
  tone: WidgetTone;
  buckets: { label: string; value?: number; href: string }[];
  loading?: boolean;
}) {
  const todayCount = buckets[0]?.value ?? 0;

  return (
    <WidgetCard
      title={title}
      href={href}
      icon={icon}
      tone={tone}
      meta={
        loading
          ? undefined
          : todayCount > 0
            ? `${todayCount} ${todayCount === 1 ? 'trip' : 'trips'} today`
            : 'None today'
      }
    >
      {loading ? (
        <TileGridSkeleton cols={3} />
      ) : (
        <TileGrid cols={3}>
          {buckets.map(bucket => (
            <StatTile
              key={bucket.label}
              label={bucket.label}
              value={bucket.value ?? 0}
              href={bucket.href}
              tone={(bucket.value ?? 0) === 0 ? 'muted' : 'default'}
            />
          ))}
        </TileGrid>
      )}
    </WidgetCard>
  );
}
