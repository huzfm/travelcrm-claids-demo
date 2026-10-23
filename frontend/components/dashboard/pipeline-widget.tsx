'use client';

import Link from 'next/link';
import { BarChart3, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-shell';

export interface PipelineWidgetProps {
  totalLeads: number;
  newLeadsCount: number;
  followUpCount: number;
  hotCount: number;
  bookedCount: number;
}

export function PipelineWidget({
  totalLeads,
  newLeadsCount,
  followUpCount,
  hotCount,
  bookedCount,
}: PipelineWidgetProps) {
  const stages = [
    { label: 'Fresh', count: newLeadsCount, color: 'bg-stage-fresh', href: '/leads?status=FRESH' },
    {
      label: 'Follow Up',
      count: followUpCount,
      color: 'bg-stage-followup',
      href: '/leads?status=FOLLOWUP',
    },
    { label: 'Hot', count: hotCount, color: 'bg-stage-hot', href: '/leads?status=HOT' },
    { label: 'Booked', count: bookedCount, color: 'bg-stage-won', href: '/booked-clients' },
  ];

  const conversionRate = totalLeads > 0 ? (bookedCount / totalLeads) * 100 : 0;

  return (
    <WidgetCard
      title="Lead Pipeline"
      href="/leads"
      icon={BarChart3}
      tone="primary"
      className="lg:col-span-2"
      action={
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {totalLeads} total
        </span>
      }
      footer={
        totalLeads > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-muted-foreground">Conversion Rate</span>
              <span className="stat-number text-xs text-success">{conversionRate.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${Math.max(conversionRate, 1)}%` }}
              />
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {stages.map(stage => {
          const share = totalLeads > 0 ? (stage.count / totalLeads) * 100 : 0;

          return (
            <Link
              key={stage.label}
              href={stage.href}
              className="group space-y-2 rounded-lg border border-transparent bg-muted/40 p-3 transition-colors hover:border-border hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', stage.color)} aria-hidden />
                <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {stage.label}
                </span>
                <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              <div className="flex items-baseline gap-1.5">
                <p className="stat-number text-xl text-foreground sm:text-2xl">{stage.count}</p>
                {totalLeads > 0 && (
                  <span className="text-[10px] text-muted-foreground">{Math.round(share)}%</span>
                )}
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/70">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', stage.color)}
                  style={{ width: `${Math.max(share, 3)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </WidgetCard>
  );
}
