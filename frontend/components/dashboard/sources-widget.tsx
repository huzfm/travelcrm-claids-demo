'use client';

import Link from 'next/link';
import { LeadSourceBadge } from '@/components/ui/travel-card';
import { Globe, Lock } from 'lucide-react';
import { useAuthContext } from '@/components/providers';
import { WidgetCard, WidgetEmpty } from './widget-shell';

export interface SourcesWidgetProps {
  sourceCounts?: Record<string, number>;
}

export function SourcesWidget({ sourceCounts }: SourcesWidgetProps) {
  const { user } = useAuthContext();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const entries = Object.entries(sourceCounts || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((acc, [, count]) => acc + count, 0);

  return (
    <WidgetCard
      title="Lead Sources"
      href={isAdminOrManager ? '/leads' : undefined}
      icon={Globe}
      tone="info"
      meta={
        isAdminOrManager && total > 0
          ? `${total} leads across ${entries.length} ${entries.length === 1 ? 'source' : 'sources'}`
          : undefined
      }
    >
      {!isAdminOrManager ? (
        <WidgetEmpty
          icon={Lock}
          title="Source data restricted"
          description="Contact an admin if you need access to lead source breakdowns."
        />
      ) : entries.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {entries.map(([source, count]) => (
            <Link
              key={source}
              href={`/leads?source=${source}`}
              className="group rounded-lg border border-transparent bg-muted/40 p-2.5 text-center transition-colors hover:border-border hover:bg-muted/80"
            >
              <LeadSourceBadge source={source} className="mb-1.5 justify-center text-xs" />
              <p className="stat-number text-xl text-foreground transition-colors group-hover:text-primary sm:text-2xl">
                {count}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {total > 0 ? `${Math.round((count / total) * 100)}% of leads` : 'leads'}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <WidgetEmpty icon={Globe} title="No source data yet" />
      )}
    </WidgetCard>
  );
}
