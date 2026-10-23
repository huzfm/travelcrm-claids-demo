'use client';

import Link from 'next/link';
import { Users, Calendar, Plane, MessageSquare, Compass, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_CHIP, WidgetCard, type WidgetTone } from './widget-shell';

const ACTIONS: {
  href: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  tone: WidgetTone;
}[] = [
  { href: '/leads', icon: Users, label: 'Add Lead', desc: 'New inquiry', tone: 'primary' },
  { href: '/followups', icon: Calendar, label: 'Follow-ups', desc: 'Manage tasks', tone: 'gold' },
  { href: '/itineraries', icon: Plane, label: 'Itinerary', desc: 'Plan trips', tone: 'info' },
  {
    href: '/whatsapp',
    icon: MessageSquare,
    label: 'WhatsApp',
    desc: 'Send messages',
    tone: 'success',
  },
];

export function QuickActionsWidget() {
  return (
    <WidgetCard title="Quick Actions" icon={Compass} tone="gold">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-2.5 rounded-lg border border-transparent bg-muted/40 p-2.5 transition-colors hover:border-border hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:p-3"
            >
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105',
                  TONE_CHIP[action.tone]
                )}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                  {action.label}
                </p>
                <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                  {action.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </WidgetCard>
  );
}
