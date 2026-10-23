'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface ItineraryStatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export function ItineraryStatsCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: ItineraryStatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-3 sm:pt-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] sm:text-sm text-muted-foreground">{label}</p>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
          </div>
          <div
            className={cn(
              'h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0',
              iconBg
            )}
          >
            <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
