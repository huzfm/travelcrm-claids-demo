'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { WidgetCard, WidgetEmpty } from './widget-shell';

export interface FollowUpItem {
  id: string;
  lead?: { name?: string };
  assignee?: { name?: string };
  scheduledAt: string;
  type: string;
  status: string;
}

export interface FollowUpsWidgetProps {
  followUpDashboard?: {
    todaysPending?: { items?: FollowUpItem[] };
    overdue?: { count?: number };
    upcoming?: { count?: number };
  };
}

const initials = (name: string) =>
  name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function FollowUpsWidget({ followUpDashboard }: FollowUpsWidgetProps) {
  const todaysPending = followUpDashboard?.todaysPending?.items || [];
  const overdueCount = followUpDashboard?.overdue?.count || 0;
  const upcomingCount = followUpDashboard?.upcoming?.count || 0;

  return (
    <WidgetCard
      title="Today's Follow-ups"
      href="/followups"
      icon={Calendar}
      tone={overdueCount > 0 ? 'danger' : 'primary'}
      action={
        <div className="flex gap-1.5">
          {overdueCount > 0 && (
            <Badge variant="destructive" className="h-5 gap-1 py-0 text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5" />
              {overdueCount} Overdue
            </Badge>
          )}
          {upcomingCount > 0 && (
            <Badge variant="outline" className="h-5 gap-1 py-0 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {upcomingCount} Upcoming
            </Badge>
          )}
        </div>
      }
      footer={
        <Link
          href="/followups"
          className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
        >
          View all follow-ups →
        </Link>
      }
    >
      {todaysPending.length > 0 ? (
        <ul className="space-y-2">
          {todaysPending.slice(0, 5).map(followUp => (
            <li key={followUp.id}>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-transparent bg-muted/40 p-2.5 transition-colors hover:border-border hover:bg-muted/80">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-[11px] font-semibold text-primary-foreground">
                    {initials(followUp.lead?.name || '?')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                      {followUp.lead?.name || 'Unknown'}
                    </p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                      <Clock className="h-2.5 w-2.5 shrink-0" />
                      <span>{format(new Date(followUp.scheduledAt), 'p')}</span>
                      <span className="hidden sm:inline">• {followUp.type}</span>
                    </p>
                    {followUp.assignee?.name && (
                      <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary sm:text-xs">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          <span className="font-normal opacity-80">Assigned to </span>
                          {followUp.assignee.name}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <Badge
                  variant={followUp.status === 'OVERDUE' ? 'destructive' : 'secondary'}
                  className="shrink-0 text-[10px]"
                >
                  {followUp.status}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <WidgetEmpty
          icon={CheckCircle2}
          title="All caught up!"
          description="No follow-ups scheduled for today."
        />
      )}
    </WidgetCard>
  );
}
