'use client';

import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, X, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ActivityCategory, DayActivity, ItineraryDay } from '@/types/itinerary.types';

const CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'FOOD', label: 'Dining' },
  { value: 'SHOPPING', label: 'Shopping' },
  { value: 'OTHER', label: 'Other' },
];

const QUICK_ADD_OPTIONS = [
  { title: 'Airport Pickup', category: 'TRANSPORT' as ActivityCategory },
  { title: 'City Tour', category: 'ACTIVITY' as ActivityCategory },
  { title: 'Hotel Check-in', category: 'HOTEL' as ActivityCategory },
  { title: 'Breakfast', category: 'FOOD' as ActivityCategory },
  { title: 'Lunch', category: 'FOOD' as ActivityCategory },
  { title: 'Dinner', category: 'FOOD' as ActivityCategory },
  { title: 'Flight Arrival', category: 'FLIGHT' as ActivityCategory },
];

interface DaySectionActivitiesProps {
  day: ItineraryDay;
  onQuickAdd: (title: string, category: ActivityCategory) => void;
  onOpenEdit: (actIndex: number) => void;
  onDeleteAct: (actIndex: number) => void;
  onUpdateDay: (updates: Partial<ItineraryDay>) => void;
  readOnly?: boolean;
}

export function DaySectionActivities({
  day,
  onQuickAdd,
  onUpdateDay,
  readOnly = false,
}: DaySectionActivitiesProps) {
  const [isOpen, setIsOpen] = useState(false); // collapsed by default
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ActivityCategory>('ACTIVITY');
  const [newTime, setNewTime] = useState('');
  const [newCost, setNewCost] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<DayActivity>>({});

  // Leisure days have no activities
  if (day.dayType === 'leisure') {
    return null;
  }

  const handleAddActivity = () => {
    if (!newTitle.trim()) return;

    const newActivity: DayActivity = {
      id: `temp-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      time: newTime || undefined,
      cost: newCost ? Number(newCost) : undefined,
    };

    onUpdateDay({
      activities: [...day.activities, newActivity],
    });

    setNewTitle('');
    setNewTime('');
    setNewCost('');
  };

  const handleDeleteActivity = (idx: number) => {
    onUpdateDay({
      activities: day.activities.filter((_, i) => i !== idx),
    });
  };

  const handleSaveInlineEdit = (idx: number) => {
    const updated = [...day.activities];
    updated[idx] = { ...updated[idx], ...editForm };
    onUpdateDay({ activities: updated });
    setEditingIdx(null);
    setEditForm({});
  };

  const startInlineEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditForm({ ...day.activities[idx] });
  };

  return (
    <div className="border-b py-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Activities</span>
          {day.activities.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {day.activities.length}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {!readOnly && (
            <>
              {/* Quick add buttons */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ADD_OPTIONS.map(opt => (
                  <button
                    key={opt.title}
                    onClick={() => onQuickAdd(opt.title, opt.category)}
                    className="text-xs px-2.5 py-1 border border-dashed border-border rounded-full hover:bg-muted transition-colors"
                  >
                    + {opt.title}
                  </button>
                ))}
              </div>

              {/* Inline add form */}
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:gap-2 items-end gap-2">
                <div className="flex-1">
                  <Input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddActivity();
                      }
                    }}
                    placeholder="Add custom activity..."
                    className="h-9"
                  />
                </div>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as ActivityCategory)}
                  className="h-9 px-2 border rounded-md text-sm bg-background"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="h-9 w-28"
                />
                <Input
                  type="number"
                  placeholder="₹"
                  value={newCost}
                  onChange={e => setNewCost(e.target.value)}
                  className="h-9 w-20"
                />
                <button
                  onClick={handleAddActivity}
                  disabled={!newTitle.trim()}
                  className="h-9 px-3 sm:px-4 bg-primary text-white rounded-md text-xs sm:text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed w-full xs:w-auto"
                >
                  Add
                </button>
              </div>
            </>
          )}

          {/* Activity list */}
          {day.activities.length > 0 && (
            <div className="space-y-2">
              {day.activities.map((act, idx) => (
                <div key={act.id || idx}>
                  {!readOnly && editingIdx === idx ? (
                    <div className="p-2 border rounded-lg bg-muted/30 space-y-2">
                      <Input
                        value={editForm.title || ''}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Activity title"
                        className="h-8 text-xs sm:text-sm"
                      />
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Input
                          type="time"
                          value={editForm.time || ''}
                          onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))}
                          className="h-8 text-xs sm:text-sm w-20 sm:w-24"
                        />
                        <Input
                          type="number"
                          placeholder="Cost"
                          value={editForm.cost || ''}
                          onChange={e =>
                            setEditForm(f => ({
                              ...f,
                              cost: e.target.value ? Number(e.target.value) : undefined,
                            }))
                          }
                          className="h-8 text-xs sm:text-sm w-20 sm:w-24"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveInlineEdit(idx)}
                            className="px-2 sm:px-3 h-8 text-[10px] sm:text-xs bg-primary text-white rounded hover:bg-primary/90"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingIdx(null)}
                            className="px-2 sm:px-3 h-8 text-[10px] sm:text-xs border rounded hover:bg-muted"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 border rounded-lg hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-mono w-10 sm:w-12 shrink-0">
                          {act.time || '—'}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded shrink-0',
                            act.category === 'FLIGHT' && 'bg-neutral-100 text-neutral-700',
                            act.category === 'HOTEL' && 'bg-neutral-100 text-neutral-700',
                            act.category === 'TRANSPORT' && 'bg-red-100 text-red-700',
                            act.category === 'ACTIVITY' && 'bg-neutral-100 text-neutral-700',
                            act.category === 'FOOD' && 'bg-red-100 text-red-700',
                            act.category === 'SHOPPING' && 'bg-red-100 text-red-700',
                            act.category === 'OTHER' && 'bg-neutral-100 text-neutral-700',
                            !act.category && 'bg-neutral-100 text-neutral-700'
                          )}
                        >
                          {act.category || 'ACT'}
                        </span>
                        <span className="text-xs sm:text-sm flex-1 truncate">{act.title}</span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        {act.location && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">
                            {act.location}
                          </span>
                        )}
                        {act.cost && (
                          <span className="text-[10px] sm:text-xs bg-neutral-100 text-neutral-700 px-1 sm:px-1.5 py-0.5 rounded shrink-0">
                            ₹{act.cost.toLocaleString('en-IN')}
                          </span>
                        )}
                        {!readOnly && (
                          <>
                            <button
                              onClick={() => startInlineEdit(idx)}
                              className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit"
                            >
                              <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(idx)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete"
                            >
                              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
