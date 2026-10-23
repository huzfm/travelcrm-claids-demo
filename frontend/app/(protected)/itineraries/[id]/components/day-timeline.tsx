'use client';

import { CalendarPlus } from 'lucide-react';
import { EmptyState } from '@/components/layout/page-wrapper';
import { DayEditor } from './day-editor';
import { DayNavBar } from './day-nav-bar';
import type { ItineraryDay } from '../hooks/use-itinerary-detail';
import type {
  HotelStayGroup,
  ReservationGuest,
  ReservationCompany,
} from '@/app/(protected)/itineraries/new/utils/reservationEmail';

interface DayTimelineProps {
  days: ItineraryDay[];
  expandedDays: Record<number, boolean>;
  readOnly?: boolean;
  currency?: string;
  onToggleExpand: (index: number) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onUpdateDay: (index: number, updates: Partial<ItineraryDay>) => void;
  onAddDay: () => void;
  formatDate: (date: string) => string;
  destination: string;
  travelers: number;
  /** Keyed by dayNumber of the first night of each hotel stay — shows the
   *  reservation-email copy button on that day only. */
  stayByDayNumber?: Map<number, HotelStayGroup>;
  tripId?: string;
  guest?: ReservationGuest;
  company?: ReservationCompany;
}

export function DayTimeline({
  days,
  expandedDays,
  destination,
  travelers,
  currency = 'INR',
  readOnly = false,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  onUpdateDay,
  onAddDay,
  formatDate,
  stayByDayNumber,
  tripId,
  guest,
  company,
}: DayTimelineProps) {
  if (days.length === 0) {
    return (
      <EmptyState
        title="No days planned yet"
        description="This itinerary has no days on it. Open the editor to add the first one."
        icon={CalendarPlus}
      />
    );
  }

  return (
    <div className="space-y-3">
      <DayNavBar
        days={days.map(d => ({ dayNumber: d.dayNumber, date: d.date }))}
        expandedDays={expandedDays}
        onToggleDay={onToggleExpand}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        onAddDay={onAddDay}
        formatDate={formatDate}
        readOnly={readOnly}
      />

      {days.map((day, index) => (
        <DayEditor
          key={`day-tl-${index}`}
          day={day}
          dayIndex={index}
          isExpanded={!!expandedDays[index]}
          destination={destination}
          travelers={travelers}
          currency={currency}
          readOnly={readOnly}
          onToggleExpand={() => onToggleExpand(index)}
          onUpdateDay={updates => onUpdateDay(index, updates)}
          formatDate={formatDate}
          stay={stayByDayNumber?.get(day.dayNumber)}
          tripId={tripId}
          guest={guest}
          company={company}
        />
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={onAddDay}
          className="w-full cursor-pointer rounded-lg border-2 border-dashed border-muted py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          + Add Day
        </button>
      )}
    </div>
  );
}
