'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, Plus, Search, CheckCircle, LucideIcon } from 'lucide-react';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return <div className={cn('space-y-4 sm:space-y-6', className)}>{children}</div>;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function PageHeader({
  title,
  description,
  action,
  className,
  titleClassName,
  descriptionClassName,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4',
        className
      )}
    >
      <div>
        <h1
          className={cn(
            'text-xl sm:text-2xl font-medium tracking-normal text-foreground flex items-center gap-2',
            titleClassName
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn('text-xs sm:text-sm text-muted-foreground mt-0.5', descriptionClassName)}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, description, icon, className }: StatCardProps) {
  return (
    <Card
      className={cn('shadow-brand hover:shadow-brand-lg transition-shadow duration-200', className)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-8 sm:p-12 text-center animate-in fade-in-0 zoom-in-95 duration-300">
      {Icon && (
        <div className="mb-4 rounded-2xl bg-primary/5 p-4 ring-1 ring-primary/10">
          <Icon className="h-10 w-10 text-primary/60" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// Specialized empty states
export function EmptyLeads() {
  return (
    <EmptyState
      title="No leads yet"
      description="Start building your pipeline by adding your first lead. You can import existing contacts or add them manually."
      icon={Users}
      action={
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add First Lead
        </Button>
      }
    />
  );
}

export function EmptySearch({ query }: { query?: string }) {
  return (
    <EmptyState
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}". Try adjusting your search terms.`
          : 'Try a different search term.'
      }
      icon={Search}
    />
  );
}

export function EmptyFollowups() {
  return (
    <EmptyState
      title="All caught up!"
      description="You have no pending follow-ups at the moment. Great job staying on top of your leads!"
      icon={CheckCircle}
    />
  );
}
