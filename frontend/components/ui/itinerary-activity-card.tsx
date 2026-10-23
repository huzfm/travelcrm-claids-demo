'use client';

import { cn } from '@/lib/utils';

export type ActivityType = 'flight' | 'hotel' | 'activity' | 'transport' | 'food' | 'other';

export interface ItineraryActivityCardProps extends React.HTMLAttributes<HTMLDivElement> {
  type: ActivityType;
  time?: string;
  title: string;
  subtitle?: string;
  duration?: string;
  icon?: React.ReactNode;
}

const activityColors: Record<
  ActivityType,
  { bg: string; border: string; icon: string; label: string }
> = {
  flight: { bg: 'bg-neutral-50', border: 'border-neutral-200', icon: 'text-neutral-500', label: 'Flight' },
  hotel: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    icon: 'text-neutral-500',
    label: 'Hotel',
  },
  activity: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    icon: 'text-neutral-500',
    label: 'Activity',
  },
  transport: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    label: 'Transport',
  },
  food: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', label: 'Dining' },
  other: { bg: 'bg-neutral-50', border: 'border-neutral-200', icon: 'text-neutral-500', label: 'Other' },
};

const activityIcons: Record<ActivityType, React.ElementType> = {
  flight: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  ),
  hotel: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4zm2 8h-8V9h6c1.1 0 2 .9 2 2v4z" />
    </svg>
  ),
  activity: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
  transport: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  ),
  food: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
    </svg>
  ),
  other: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  ),
};

export function ItineraryActivityCard({
  type,
  time,
  title,
  subtitle,
  duration,
  icon,
  className,
  ...props
}: ItineraryActivityCardProps) {
  const colors = activityColors[type];
  const IconComponent = icon ? undefined : activityIcons[type];
  const IconEl =
    icon || (IconComponent && <IconComponent className={cn('h-5 w-5', colors.icon)} />);

  return (
    <div
      className={cn(
        'group relative flex items-start gap-4 rounded-lg border p-4 transition-all duration-200 hover:shadow-travel',
        colors.bg,
        colors.border,
        className
      )}
      {...props}
    >
      {time && (
        <div className="shrink-0 text-xs font-mono font-semibold text-muted-foreground pt-0.5 min-w-13">
          {time}
        </div>
      )}
      <div className={cn('shrink-0 mt-0.5', colors.icon)}>{IconEl}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">{title}</h4>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border',
              colors.border,
              colors.icon
            )}
          >
            {colors.label}
          </span>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        {duration && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {duration}
          </span>
        )}
      </div>
    </div>
  );
}
