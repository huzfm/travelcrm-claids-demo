'use client';

import * as React from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface CalendarRange {
  from: Date;
  to: Date;
}

export interface CalendarProps {
  className?: string;
  selected?: Date | CalendarRange;
  onSelect?: (date: Date | CalendarRange | undefined) => void;
  disabled?: { before?: Date; after?: Date };
  fromDate?: Date;
  mode?: 'single' | 'range';
  numberOfMonths?: number;
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  (
    {
      className,
      selected,
      onSelect,
      disabled,
      fromDate,
      mode = 'single',
      numberOfMonths = 1,
      ...props
    },
    ref
  ) => {
    const [currentMonth, setCurrentMonth] = React.useState(() => {
      if (selected && typeof selected !== 'string' && 'from' in selected) {
        return selected.from;
      }
      return new Date();
    });
    const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
    const [selectingStart, setSelectingStart] = React.useState(true);
    const [tempRange, setTempRange] = React.useState<CalendarRange | null>(null);

    const isRange = mode === 'range';
    const selectedFrom =
      isRange && tempRange
        ? tempRange.from
        : isRange && selected && 'from' in selected
          ? selected.from
          : null;
    const selectedTo =
      isRange && tempRange
        ? tempRange.to
        : isRange && selected && 'to' in selected
          ? selected.to
          : null;

    const visibleMonths = React.useMemo(() => {
      const months: Date[] = [];
      for (let i = 0; i < numberOfMonths; i++) {
        months.push(addMonths(currentMonth, i));
      }
      return months;
    }, [currentMonth, numberOfMonths]);

    const getDayDisabled = (day: Date) => {
      if (typeof disabled === 'boolean' && disabled === true) return true;
      if (typeof disabled === 'object' && disabled !== null) {
        if (disabled.before && isBefore(day, disabled.before)) return true;
        if (disabled.after && isAfter(day, disabled.after)) return true;
      }
      if (fromDate && isBefore(day, fromDate)) return true;
      return false;
    };

    const isInRange = (day: Date) => {
      const from = selectedFrom;
      const to =
        selectedTo || (hoverDate && selectingStart === false && tempRange ? hoverDate : null);
      if (!from || !to) return false;
      return isAfter(day, from) && isBefore(day, to);
    };

    const isRangeStart = (day: Date) => {
      return selectedFrom ? isSameDay(day, selectedFrom) : false;
    };

    const isRangeEnd = (day: Date) => {
      const end = selectedTo || (hoverDate && !selectingStart && tempRange ? hoverDate : null);
      return end ? isSameDay(day, end) : false;
    };

    const handleDayClick = (day: Date) => {
      if (getDayDisabled(day)) return;
      if (isRange) {
        if (selectingStart || !tempRange) {
          const newRange = { from: day, to: day };
          setTempRange(newRange);
          setSelectingStart(false);
          onSelect?.(newRange);
        } else {
          if (isBefore(day, tempRange.from)) {
            const newRange = { from: day, to: tempRange.from };
            setTempRange(newRange);
            onSelect?.(newRange);
          } else {
            const newRange = { from: tempRange.from, to: day };
            setTempRange(newRange);
            onSelect?.(newRange);
          }
          setSelectingStart(true);
          setTempRange(null);
        }
      } else {
        onSelect?.(day);
      }
    };

    const renderMonth = (monthDate: Date) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

      return (
        <div key={monthDate.toISOString()} className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              disabled={
                (typeof disabled === 'boolean' && disabled === true) ||
                (typeof disabled === 'object' && disabled !== null && disabled.before
                  ? true
                  : false)
              }
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{format(monthDate, 'MMMM yyyy')}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              disabled={
                (typeof disabled === 'boolean' && disabled === true) ||
                (typeof disabled === 'object' && disabled !== null && disabled.after ? true : false)
              }
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div
                key={day}
                className="text-center text-xs text-muted-foreground py-1.5 font-medium"
              >
                {day}
              </div>
            ))}
            {days.map(day => {
              const isCurrentMonth = isSameMonth(day, monthDate);
              const isSelected = !isRange && selected instanceof Date && isSameDay(day, selected);
              const isTodayDate = isToday(day);
              const isDayDisabled = getDayDisabled(day);
              const inRange = isInRange(day);
              const rangeStart = isRangeStart(day);
              const rangeEnd = isRangeEnd(day);

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    'relative flex items-center justify-center',
                    inRange && !rangeStart && !rangeEnd && 'bg-primary/10'
                  )}
                  onMouseEnter={() => isRange && !selectingStart && setHoverDate(day)}
                  onMouseLeave={() => isRange && setHoverDate(null)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 w-8 p-0 text-xs rounded-full',
                      !isCurrentMonth && 'text-muted-foreground/30',
                      isCurrentMonth &&
                        !isSelected &&
                        !inRange &&
                        'text-foreground hover:bg-accent',
                      isTodayDate && !isSelected && 'bg-muted font-semibold',
                      isSelected &&
                        !isRange &&
                        'bg-primary text-primary-foreground hover:bg-primary/90',
                      rangeStart &&
                        'bg-primary text-primary-foreground hover:bg-primary/90 rounded-r-none',
                      inRange && !rangeStart && !rangeEnd && 'bg-primary/10 text-foreground',
                      rangeEnd &&
                        'bg-primary text-primary-foreground hover:bg-primary/90 rounded-l-none',
                      isDayDisabled && 'opacity-30 cursor-not-allowed pointer-events-none'
                    )}
                    onClick={() => handleDayClick(day)}
                    disabled={!isCurrentMonth || isDayDisabled}
                  >
                    {format(day, 'd')}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div ref={ref} className={cn(numberOfMonths === 2 ? 'flex gap-6' : '', className)} {...props}>
        {visibleMonths.map(m => renderMonth(m))}
      </div>
    );
  }
);
Calendar.displayName = 'Calendar';

export { Calendar };
