'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface DaySectionNotesProps {
  notes?: string;
  onUpdate: (notes: string) => void;
  readOnly?: boolean;
}

export function DaySectionNotes({ notes, onUpdate, readOnly = false }: DaySectionNotesProps) {
  const [isOpen, setIsOpen] = useState(!!notes); // expanded by default if notes exist

  return (
    <div className="py-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Notes</span>
          {notes && <span className="text-xs text-muted-foreground">({notes.length} chars)</span>}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-3 pl-6">
          {readOnly ? (
            <p className={cn('text-sm', !notes && 'text-muted-foreground')}>
              {notes || 'No notes added'}
            </p>
          ) : (
            <Textarea
              value={notes || ''}
              onChange={e => onUpdate(e.target.value)}
              placeholder="Add notes for this day... (client preferences, special instructions, etc.)"
              rows={4}
              className={cn('resize-none transition-colors', !notes && 'text-muted-foreground')}
            />
          )}
        </div>
      )}
    </div>
  );
}
