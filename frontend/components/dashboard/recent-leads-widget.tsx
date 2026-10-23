'use client';

import Link from 'next/link';
import { LeadSourceBadge, TravelStatusBadge } from '@/components/ui/travel-card';
import { Users } from 'lucide-react';
import type { Lead } from '@/types';
import { useAuthContext } from '@/components/providers';
import { WidgetCard, WidgetEmpty } from './widget-shell';

export interface RecentLeadsWidgetProps {
  leads?: Lead[];
}

const initials = (name: string) =>
  name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function RecentLeadsWidget({ leads }: RecentLeadsWidgetProps) {
  const { user } = useAuthContext();
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <WidgetCard
      title="Recent Leads"
      href="/leads"
      icon={Users}
      tone="primary"
      footer={
        <Link
          href="/leads"
          className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
        >
          View all leads →
        </Link>
      }
    >
      {leads && leads.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {leads.slice(0, 6).map(lead => (
            <li key={lead.id}>
              <Link
                href={`/leads/${lead.id}`}
                className="group flex items-center justify-between gap-2 rounded-lg border border-transparent bg-muted/40 p-2.5 transition-colors hover:border-border hover:bg-muted/80"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-[11px] font-semibold text-primary-foreground">
                    {initials(lead.name || '?')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground transition-colors group-hover:text-primary sm:text-sm">
                      {lead.name}
                    </p>
                    <p className="hidden truncate font-mono text-[10px] text-muted-foreground sm:block">
                      {lead.phone}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {lead.source && isAdminOrManager && (
                    <span className="hidden lg:inline">
                      <LeadSourceBadge source={lead.source} />
                    </span>
                  )}
                  <TravelStatusBadge status={lead.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <WidgetEmpty
          icon={Users}
          title="No leads yet"
          description="New inquiries will show up here as they come in."
        />
      )}
    </WidgetCard>
  );
}
