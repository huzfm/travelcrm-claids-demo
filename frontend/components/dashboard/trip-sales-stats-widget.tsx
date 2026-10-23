'use client';

import { useState } from 'react';
import { formatCurrencyText } from '@/lib/currency';
import { useSalesStats } from '@/hooks/useDashboard';
import type { SalesPeriod, SalesStats } from '@/types/dashboard.types';
import { TrendingUp } from 'lucide-react';
import { SegmentedControl, StatTile, TileGrid, TileGridSkeleton, WidgetCard } from './widget-shell';

const PERIODS: { value: SalesPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export interface TripSalesStatsWidgetProps {
  /** Stats from the combined overview call, used until the period is changed. */
  initialStats?: SalesStats | null;
}

export function TripSalesStatsWidget({ initialStats }: TripSalesStatsWidgetProps) {
  const [period, setPeriod] = useState<SalesPeriod>('today');

  // The overview call already returned today's numbers, so only fetch when the
  // user moves off that default.
  const { data, isLoading } = useSalesStats(period, period !== 'today' || !initialStats);
  const stats = period === 'today' ? (data ?? initialStats ?? null) : (data ?? null);

  const currency = stats?.currency ?? 'INR';
  const periodLabel = PERIODS.find(p => p.value === period)?.label.toLowerCase() ?? 'today';

  return (
    <WidgetCard
      title="Trip Sales Stats"
      href="/trips"
      icon={TrendingUp}
      tone="primary"
      meta={`Cash received ${period === 'today' ? 'today' : `this ${periodLabel}`}`}
      action={
        <SegmentedControl
          value={period}
          onChange={setPeriod}
          options={PERIODS}
          label="Sales period"
        />
      }
    >
      {isLoading && !stats ? (
        <TileGridSkeleton />
      ) : (
        <TileGrid>
          <StatTile
            label="Revenue"
            value={formatCurrencyText(stats?.revenue ?? 0, currency)}
            tone="primary"
            size="sm"
          />
          <StatTile label="Leads" value={stats?.leads ?? 0} href="/leads" />
          <StatTile label="Quotes" value={stats?.quotes ?? 0} href="/itineraries" />
          <StatTile
            label="Conversion"
            value={stats?.conversions ?? 0}
            hint={stats ? `${stats.conversionRate}% of leads` : undefined}
            tone={stats && stats.conversions > 0 ? 'success' : 'default'}
          />
        </TileGrid>
      )}
    </WidgetCard>
  );
}
