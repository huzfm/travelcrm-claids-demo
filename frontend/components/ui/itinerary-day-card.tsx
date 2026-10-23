'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { DayActivity, DayMeals, ItineraryDay } from '@/types';
import { MealToggle } from './meal-toggle';

export type ActivityCategoryType =
  | 'FLIGHT'
  | 'HOTEL'
  | 'TRANSPORT'
  | 'ACTIVITY'
  | 'FOOD'
  | 'SHOPPING'
  | 'OTHER';

export interface ItineraryDayCardProps {
  dayNumber: number;
  date?: string;
  title?: string;
  activities: DayActivity[];
  hotel?: string;
  hotelAddress?: string;
  hotelContact?: string;
  transport?: string;
  meals?: DayMeals;
  notes?: string;
  weather?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onUpdateDay?: (updates: Partial<ItineraryDay>) => void;
  onDelete?: () => void;
  onAddActivity?: () => void;
  onEditActivity?: (index: number, activity: DayActivity) => void;
  onDeleteActivity?: (index: number) => void;
  onMoveActivity?: (fromIndex: number, toIndex: number) => void;
  onUpdateMeals?: (meals: DayMeals) => void;
}

const categoryConfig: Record<
  ActivityCategoryType,
  { bg: string; border: string; iconColor: string; label: string; emoji: string }
> = {
  FLIGHT: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    iconColor: 'text-neutral-500',
    label: 'Flight',
    emoji: '🛫',
  },
  HOTEL: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    iconColor: 'text-neutral-500',
    label: 'Hotel',
    emoji: '🏨',
  },
  TRANSPORT: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    label: 'Transport',
    emoji: '🚗',
  },
  ACTIVITY: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    iconColor: 'text-neutral-500',
    label: 'Activity',
    emoji: '🎯',
  },
  FOOD: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    label: 'Dining',
    emoji: '🍽️',
  },
  SHOPPING: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconColor: 'text-red-500',
    label: 'Shopping',
    emoji: '🛍️',
  },
  OTHER: {
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    iconColor: 'text-neutral-500',
    label: 'Other',
    emoji: '📍',
  },
};

const bgMap: Record<string, string> = {
  'bg-neutral-50': 'bg-neutral-500',
  'bg-neutral-50': 'bg-neutral-500',
  'bg-red-50': 'bg-red-500',
  'bg-neutral-50': 'bg-neutral-500',
  'bg-red-50': 'bg-red-500',
  'bg-red-50': 'bg-red-500',
  'bg-neutral-50': 'bg-neutral-500',
};

export const ItineraryDayCard = React.memo(function ItineraryDayCard({
  dayNumber,
  date,
  title,
  activities = [],
  hotel,
  hotelAddress,
  hotelContact,
  transport,
  meals,
  notes,
  weather,
  isExpanded = true,
  onToggleExpand,
  onDelete,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onMoveActivity,
  onUpdateMeals,
}: ItineraryDayCardProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-4 bg-linear-to-r from-primary/5 to-transparent hover:from-primary/10 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-sm">
            {dayNumber}
          </div>
          <div className="text-left">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              Day {dayNumber}
            </p>
            <p className="font-semibold text-sm">{title || `Day ${dayNumber}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {date && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {weather && (
            <span className="text-xs bg-neutral-50 text-neutral-600 px-2 py-1 rounded-md">
              {weather}
            </span>
          )}
          <svg
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t">
          {activities.length > 0 ? (
            <div className="relative p-4">
              <div className="absolute left-[2.35rem] top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3">
                {activities.map((activity, index) => {
                  const cat = (activity.category || 'OTHER') as ActivityCategoryType;
                  const config = categoryConfig[cat];
                  return (
                    <div key={index} className="relative flex items-start gap-3 pl-20">
                      <div
                        className={cn(
                          'absolute left-[1.9rem] top-4 h-3 w-3 rounded-full border-2 border-card shadow-sm z-10',
                          bgMap[config.bg]
                        )}
                      />
                      <div
                        className={cn(
                          'flex-1 rounded-lg border p-3 transition-all group',
                          config.bg,
                          config.border
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="text-lg leading-none mt-0.5">{config.emoji}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {activity.time && (
                                  <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-white/60 px-1.5 py-0.5 rounded">
                                    {activity.time}
                                  </span>
                                )}
                                <h4 className="font-semibold text-sm">{activity.title}</h4>
                              </div>
                              {activity.location && (
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <svg
                                    className="h-3 w-3"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    opacity="0.6"
                                  >
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                  </svg>
                                  {activity.location}
                                </p>
                              )}
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {activity.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {activity.bookingRef && (
                                  <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded font-mono">
                                    Ref: {activity.bookingRef}
                                  </span>
                                )}
                                {activity.duration && (
                                  <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded">
                                    ⏱ {activity.duration}
                                  </span>
                                )}
                                {activity.cost !== undefined && activity.cost > 0 && (
                                  <span className="text-[10px] bg-white/60 px-1.5 py-0.5 rounded font-medium text-neutral-700">
                                    ₹{activity.cost.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {index > 0 && onMoveActivity && (
                              <button
                                type="button"
                                onClick={() => onMoveActivity(index, index - 1)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/80 text-muted-foreground hover:text-primary cursor-pointer"
                              >
                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            )}
                            {index < activities.length - 1 && onMoveActivity && (
                              <button
                                type="button"
                                onClick={() => onMoveActivity(index, index + 1)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/80 text-muted-foreground hover:text-primary cursor-pointer"
                              >
                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586l3.293-3.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            )}
                            {onEditActivity && (
                              <button
                                type="button"
                                onClick={() => onEditActivity(index, activity)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/80 text-muted-foreground hover:text-primary cursor-pointer"
                              >
                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                            )}
                            {onDeleteActivity && (
                              <button
                                type="button"
                                onClick={() => onDeleteActivity(index)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/80 text-muted-foreground hover:text-red-500 cursor-pointer"
                              >
                                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">No activities planned yet</p>
            </div>
          )}

          {(hotel || transport) && (
            <div className="px-4 pb-3 grid grid-cols-2 gap-2">
              {hotel && (
                <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3">
                  <p className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider mb-1">
                    🏨 Hotel
                  </p>
                  <p className="text-sm font-medium">{hotel}</p>
                  {hotelAddress && (
                    <p className="text-xs text-muted-foreground mt-0.5">{hotelAddress}</p>
                  )}
                  {hotelContact && (
                    <p className="text-xs text-neutral-600 mt-0.5 font-mono">{hotelContact}</p>
                  )}
                </div>
              )}
              {transport && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-1">
                    🚗 Transport
                  </p>
                  <p className="text-sm font-medium">{transport}</p>
                </div>
              )}
            </div>
          )}

          {onUpdateMeals && (
            <div className="px-4 pb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Meals Included
              </p>
              <div className="flex gap-2">
                <MealToggle
                  meal="breakfast"
                  checked={meals?.breakfast || false}
                  onChange={checked => onUpdateMeals({ ...meals, breakfast: checked })}
                  note={meals?.breakfastNote}
                  onNoteChange={note => onUpdateMeals({ ...meals, breakfastNote: note })}
                />
                <MealToggle
                  meal="lunch"
                  checked={meals?.lunch || false}
                  onChange={checked => onUpdateMeals({ ...meals, lunch: checked })}
                  note={meals?.lunchNote}
                  onNoteChange={note => onUpdateMeals({ ...meals, lunchNote: note })}
                />
                <MealToggle
                  meal="dinner"
                  checked={meals?.dinner || false}
                  onChange={checked => onUpdateMeals({ ...meals, dinner: checked })}
                  note={meals?.dinnerNote}
                  onNoteChange={note => onUpdateMeals({ ...meals, dinnerNote: note })}
                />
              </div>
            </div>
          )}

          {notes && (
            <div className="px-4 pb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                📝 Notes
              </p>
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{notes}</p>
            </div>
          )}

          <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t">
            {onAddActivity && (
              <button
                type="button"
                onClick={onAddActivity}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Add Activity
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Delete Day
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
