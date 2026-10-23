'use client';

import { ChevronsDownUp, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayNavBarProps {
  days: { dayNumber: number; date?: string }[];
  expandedDays: Record<number, boolean>;
  onToggleDay: (index: number) => void;
  onAddDay?: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  formatDate: (date: string) => string;
  readOnly?: boolean;
}

/**
 * The day rail above the timeline.
 *
 * A pill both scrolls its day into view and opens it, so it works as
 * navigation on a long trip rather than only as a toggle.
 */
export function DayNavBar({
  days,
  expandedDays,
  onToggleDay,
  onAddDay,
  onExpandAll,
  onCollapseAll,
  formatDate,
  readOnly = false,
}: DayNavBarProps) {
  const expandedCount = days.filter((_, idx) => expandedDays[idx]).length;
  const allExpanded = days.length > 0 && expandedCount === days.length;

  const handleClick = (idx: number) => {
    onToggleDay(idx);
    // Opening a day far down the page is useless if it stays off-screen.
    if (!expandedDays[idx]) {
      requestAnimationFrame(() => {
        document
          .getElementById(`itinerary-day-${idx}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  if (days.length === 0) return null;

  return (
    <div className="sticky top-0 z-20 -mx-1 mb-4 border-b bg-background/95 px-1 py-2 backdrop-blur supports-backdrop-filter:bg-background/75">
      <div className="flex items-center gap-3">
        <span className="hidden shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline">
          Days
        </span>

        <div className="scrollbar-hide flex flex-1 items-center gap-1.5 overflow-x-auto pb-1">
          {days.map((day, idx) => {
            const isExpanded = !!expandedDays[idx];
            return (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() => handleClick(idx)}
                aria-expanded={isExpanded}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isExpanded
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
                title={day.date ? formatDate(day.date) : `Day ${day.dayNumber}`}
              >
                Day {day.dayNumber}
              </button>
            );
          })}

          {!readOnly && onAddDay && (
            <button
              type="button"
              onClick={onAddDay}
              className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Day
            </button>
          )}
        </div>

        {(onExpandAll || onCollapseAll) && (
          <button
            type="button"
            onClick={() => (allExpanded ? onCollapseAll?.() : onExpandAll?.())}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {allExpanded ? (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{allExpanded ? 'Collapse all' : 'Expand all'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
