'use client';

import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ItineraryDay } from '@/types/itinerary.types';

interface DaySectionDetailsProps {
  day: ItineraryDay;
  onUpdate: (updates: Partial<ItineraryDay>) => void;
  readOnly?: boolean;
}

export function DaySectionDetails({ day, onUpdate, readOnly = false }: DaySectionDetailsProps) {
  const [isOpen, setIsOpen] = useState(true); // expanded by default

  return (
    <div className="border-b py-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Day Details</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3 pl-6">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
            {readOnly ? (
              <p className="text-sm font-medium">{day.title || '—'}</p>
            ) : (
              <Input
                value={day.title || ''}
                onChange={e => onUpdate({ title: e.target.value })}
                placeholder="e.g., Arrival Day"
                className="h-9"
              />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date</label>
            {readOnly ? (
              <p className="text-sm">{day.date || '—'}</p>
            ) : (
              <Input
                type="date"
                value={day.date || ''}
                onChange={e => onUpdate({ date: e.target.value })}
                className="h-9"
              />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">{day.description || '—'}</p>
            ) : (
              <Textarea
                value={day.description || ''}
                onChange={e => onUpdate({ description: e.target.value })}
                placeholder="Brief description of this day..."
                rows={2}
                className="resize-none"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
