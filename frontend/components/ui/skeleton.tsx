import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

function Skeleton({ className, variant = 'default', width, height, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-lg bg-muted/60',
        variant === 'default' && 'rounded-lg',
        variant === 'text' && 'rounded h-4',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-md',
        className
      )}
      style={{
        width: width,
        height: height,
      }}
      {...props}
    />
  );
}

// Table row skeleton
function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/50">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn('h-4', i === 0 ? 'w-32' : i === columns - 1 ? 'w-20' : 'w-24')}
        />
      ))}
    </div>
  );
}

// Card skeleton
function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-32 h-4" />
          <Skeleton variant="text" className="w-24 h-3" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
          />
        ))}
      </div>
    </div>
  );
}

// Avatar skeleton
function SkeletonAvatar({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  return <Skeleton variant="circular" className={sizeClasses[size]} />;
}

// Lead card skeleton for kanban
function SkeletonLeadCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Skeleton variant="circular" className="h-2.5 w-2.5 mt-1.5" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-28 h-4" />
          <Skeleton variant="text" className="w-20 h-3" />
        </div>
        <Skeleton variant="circular" className="h-6 w-6" />
      </div>
      <div className="space-y-1.5">
        <Skeleton variant="text" className="w-full h-3" />
        <Skeleton variant="text" className="w-2/3 h-3" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton variant="rectangular" className="w-12 h-4 rounded-full" />
        <Skeleton variant="rectangular" className="w-16 h-4 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" className="h-6 w-6" />
          <Skeleton variant="text" className="w-16 h-3" />
        </div>
        <Skeleton variant="rectangular" className="w-8 h-4 rounded-full" />
      </div>
    </div>
  );
}

// Dashboard stat skeleton
function SkeletonStatCard() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24 h-4" />
        <Skeleton variant="circular" className="h-8 w-8" />
      </div>
      <Skeleton variant="text" className="w-20 h-8" />
      <Skeleton variant="text" className="w-32 h-3" />
    </div>
  );
}

// Profile skeleton
function SkeletonProfile() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" className="h-12 w-12" />
      <div className="space-y-2">
        <Skeleton variant="text" className="w-32 h-4" />
        <Skeleton variant="text" className="w-24 h-3" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonTableRow,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonLeadCard,
  SkeletonStatCard,
  SkeletonProfile,
};
