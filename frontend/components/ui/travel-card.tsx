'use client';

/* ============================================================================
   RE-EXPORTS FROM SPLIT COMPONENTS
   (Each component moved to its own file for better maintainability)
   ============================================================================ */

export type { TravelDestinationCardProps } from './travel-destination-card';

export type { ItineraryActivityCardProps, ActivityType } from './itinerary-activity-card';

export type { LeadSourceBadgeProps } from './lead-source-badge';

export type { TravelStatusBadgeProps } from './travel-status-badge';

export type { MealToggleProps } from './meal-toggle';

export type { TripOverviewCardProps } from './trip-overview-card';

export type { InclusionTagsProps } from './inclusion-tags';

export type { ItineraryDayCardProps, ActivityCategoryType } from './itinerary-day-card';

export { TravelDestinationCard } from './travel-destination-card';
export { ItineraryActivityCard } from './itinerary-activity-card';
export { LeadSourceBadge } from './lead-source-badge';
export { TravelStatusBadge } from './travel-status-badge';
export { MealToggle } from './meal-toggle';
export { TripOverviewCard } from './trip-overview-card';
export { InclusionTags } from './inclusion-tags';
export { ItineraryDayCard } from './itinerary-day-card';

/* ============================================================================
   PIPELINE KANBAN CARD (still in this file - simpler component)
   ============================================================================ */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PipelineKanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  phone?: string;
  source?: string;
  budget?: string;
  status: string;
  assignee?: string;
  daysSinceUpdate?: number;
  score?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

const priorityColors = {
  low: 'border-l-text-muted',
  medium: 'border-l-status-new',
  high: 'border-l-status-qualified',
  urgent: 'border-l-destructive',
};

export function PipelineKanbanCard({
  name,
  phone,
  source,
  budget,
  status: _status,
  assignee,
  daysSinceUpdate,
  score,
  priority = 'medium',
  className,
  ...props
}: PipelineKanbanCardProps) {
  return (
    <div
      className={cn(
        'group border-l-4 border bg-card rounded-lg p-3 shadow-sm transition-all duration-200 hover:shadow-travel hover:-translate-y-0.5 cursor-pointer',
        priorityColors[priority],
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
            {name}
          </p>
          {phone && <p className="text-xs text-muted-foreground font-mono mt-0.5">{phone}</p>}
        </div>
        {score !== undefined && score > 0 && (
          <div className="shrink-0 relative h-8 w-8">
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted"
                opacity="0.2"
              />
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className={
                  score >= 70 ? 'text-stage-won' : score >= 40 ? 'text-warning' : 'text-destructive'
                }
                strokeDasharray={`${(score / 100) * 81.68} 81.68`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">
              {score}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {source && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {source}
          </span>
        )}
        {budget && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {budget}
          </span>
        )}
        {daysSinceUpdate !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
              daysSinceUpdate > 7
                ? 'bg-red-50 text-red-600'
                : daysSinceUpdate > 3
                  ? 'bg-red-50 text-red-600'
                  : 'bg-neutral-50 text-neutral-600'
            )}
          >
            {daysSinceUpdate}d ago
          </span>
        )}
      </div>

      {assignee && (
        <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t text-xs text-muted-foreground">
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[8px] font-bold text-primary">
              {assignee.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="truncate">{assignee}</span>
        </div>
      )}
    </div>
  );
}
