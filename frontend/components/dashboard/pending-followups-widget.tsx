'use client';

import type { FollowUpSummary } from '@/types/dashboard.types';
import { BellRing } from 'lucide-react';
import { StatTile, TileGrid, TileGridSkeleton, WidgetCard } from './widget-shell';

export interface PendingFollowUpsWidgetProps {
  summary?: FollowUpSummary | null;
  isLoading?: boolean;
}

/**
 * Pending follow-ups for today, yesterday and the coming week.
 * A tick means nothing is outstanding in that bucket.
 */
export function PendingFollowUpsWidget({ summary, isLoading }: PendingFollowUpsWidgetProps) {
  const due = summary?.due;
  const dueCount = due?.count ?? 0;

  return (
    <WidgetCard
      title="Pending Follow-ups"
      href="/followups"
      icon={BellRing}
      // The header carries the state of the worst bucket, so a late call is
      // visible before anyone reads the numbers.
      tone={dueCount > 0 ? 'danger' : 'success'}
      meta={
        summary
          ? dueCount > 0
            ? `${dueCount} past their scheduled time`
            : 'Nothing overdue right now'
          : undefined
      }
    >
      {isLoading && !summary ? (
        <TileGridSkeleton />
      ) : (
        <TileGrid>
          <StatTile
            label="Due Now"
            value={dueCount}
            href="/followups?range=overdue"
            hint={
              summary && summary.overdue > 0 ? `${summary.overdue} from earlier days` : undefined
            }
            tone="danger"
            cleared={due?.cleared ?? dueCount === 0}
            clearedLabel="Clear"
          />
          <StatTile
            label="Today"
            value={summary?.today.count ?? 0}
            href="/followups?range=today"
            hint={summary?.today.remaining ? `${summary.today.remaining} still to come` : undefined}
            cleared={summary?.today.cleared ?? (summary?.today.count ?? 0) === 0}
            clearedLabel="Done"
          />
          <StatTile
            label="Yesterday"
            value={summary?.yesterday.count ?? 0}
            href="/followups?range=overdue"
            tone="danger"
            cleared={summary?.yesterday.cleared ?? (summary?.yesterday.count ?? 0) === 0}
            clearedLabel="Clear"
          />
          <StatTile
            label="Next 7 Days"
            value={summary?.next7Days.count ?? 0}
            href="/followups?range=upcoming"
            tone="muted"
            cleared={summary?.next7Days.cleared ?? (summary?.next7Days.count ?? 0) === 0}
            clearedLabel="Empty"
          />
        </TileGrid>
      )}
    </WidgetCard>
  );
}
