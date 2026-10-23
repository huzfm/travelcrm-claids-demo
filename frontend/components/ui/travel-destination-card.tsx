'use client';

import { cn } from '@/lib/utils';

export interface TravelDestinationCardProps extends React.HTMLAttributes<HTMLDivElement> {
  destination?: string;
  country?: string;
  imageUrl?: string;
  days?: number;
  price?: string;
  status?: 'planning' | 'confirmed' | 'completed' | 'cancelled';
  gradient?: 'ocean' | 'sunset' | 'forest' | 'desert' | 'mountain';
}

const travelGradients: Record<string, string> = {
  ocean: 'from-neutral-500 to-neutral-600',
  sunset: 'from-red-400 to-red-500',
  forest: 'from-neutral-500 to-neutral-600',
  desert: 'from-red-400 to-red-500',
  mountain: 'from-neutral-500 to-neutral-600',
};

export function TravelDestinationCard({
  destination,
  country,
  imageUrl,
  days,
  price,
  status,
  gradient = 'ocean',
  className,
  ...props
}: TravelDestinationCardProps) {
  const gradientClass = travelGradients[gradient];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:shadow-travel-lg hover:-translate-y-1 cursor-pointer',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative h-32 overflow-hidden',
          imageUrl ? '' : `bg-linear-to-br ${gradientClass}`
        )}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={destination}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        )}
        {!imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <svg className="h-16 w-16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
        )}
        <div
          className={cn(
            'absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent',
            imageUrl ? '' : 'opacity-80'
          )}
        />
        {status && (
          <span
            className={cn(
              'absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              status === 'confirmed' && 'bg-neutral-500/90 text-white',
              status === 'planning' && 'bg-red-500/90 text-white',
              status === 'completed' && 'bg-neutral-500/90 text-white',
              status === 'cancelled' && 'bg-red-500/90 text-white'
            )}
          >
            {status}
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-lg leading-tight">
              {destination || 'Unknown Destination'}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              {country || 'Destination'}
            </p>
          </div>
          {days && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
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
              {days}d
            </span>
          )}
        </div>
        {price && <p className="mt-2 text-sm font-medium text-primary/80">{price}</p>}
      </div>
    </div>
  );
}
