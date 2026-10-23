'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserPlus, Plane, Star, Gauge, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionHeading, TONE_CHIP, type WidgetTone } from './widget-shell';

export interface TravelStatsWidgetProps {
  totalLeads: number;
  newLeadsCount: number;
  bookedCount: number;
  hotCount: number;
}

const VALUE_TEXT: Partial<Record<WidgetTone, string>> = {
  primary: 'text-primary',
  gold: 'text-gold-dark',
  success: 'text-success',
  warning: 'text-warning',
};

export function TravelStatsWidget({
  totalLeads,
  newLeadsCount,
  bookedCount,
  hotCount,
}: TravelStatsWidgetProps) {
  const stats: {
    href: string;
    title: string;
    value: number;
    description: string;
    icon: LucideIcon;
    tone: WidgetTone;
  }[] = [
    {
      href: '/leads',
      title: 'Total Leads',
      value: totalLeads,
      description: 'All time travelers',
      icon: Users,
      tone: 'primary',
    },
    {
      href: '/leads?status=FRESH',
      title: 'New This Week',
      value: newLeadsCount,
      description: 'Fresh inquiries',
      icon: UserPlus,
      tone: 'gold',
    },
    {
      href: '/booked-clients',
      title: 'Booked Trips',
      value: bookedCount,
      description: 'Total confirmed',
      icon: Plane,
      tone: 'success',
    },
    {
      href: '/leads?status=HOT',
      title: 'Hot Leads',
      value: hotCount,
      description: 'Need immediate follow-up',
      icon: Star,
      tone: 'warning',
    },
  ];

  return (
    <section className="space-y-3">
      <SectionHeading title="Travel Stats" icon={Gauge} />

      <div className="stagger-children grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href} className="block">
              <Card className="h-full">
                <CardContent className="flex items-start justify-between gap-2 p-3 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                      {stat.title}
                    </p>
                    <p
                      className={cn(
                        'stat-number text-2xl sm:text-3xl',
                        VALUE_TEXT[stat.tone] ?? 'text-foreground'
                      )}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-1 hidden truncate text-[10px] text-muted-foreground sm:block sm:text-xs">
                      {stat.description}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                      TONE_CHIP[stat.tone]
                    )}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
