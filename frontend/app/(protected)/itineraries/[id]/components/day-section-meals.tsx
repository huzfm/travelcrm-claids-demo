'use client';

import { useState } from 'react';
import { UtensilsCrossed, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayMeals } from '@/types/itinerary.types';

interface DaySectionMealsProps {
  meals?: DayMeals;
  onUpdate: (meals: DayMeals) => void;
  readOnly?: boolean;
}

export function DaySectionMeals({ meals }: DaySectionMealsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasAnyMeal = meals?.breakfast || meals?.lunch || meals?.dinner;

  return (
    <div className="border-b py-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Meals</span>
          {hasAnyMeal && (
            <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">
              ✓
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="mt-3 pl-6">
          <div className="flex gap-3">
            {/* Breakfast */}
            <div
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all',
                meals?.breakfast
                  ? 'border-neutral-500 bg-neutral-50'
                  : 'border-dashed border-border'
              )}
            >
              <span className="text-lg">🌅</span>
              <span
                className={cn(
                  'text-xs font-medium',
                  meals?.breakfast ? 'text-neutral-700' : 'text-muted-foreground'
                )}
              >
                Breakfast
              </span>
              <span className="text-[10px] text-muted-foreground">B</span>
            </div>

            {/* Lunch */}
            <div
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all',
                meals?.lunch ? 'border-neutral-500 bg-neutral-50' : 'border-dashed border-border'
              )}
            >
              <span className="text-lg">☀️</span>
              <span
                className={cn(
                  'text-xs font-medium',
                  meals?.lunch ? 'text-neutral-700' : 'text-muted-foreground'
                )}
              >
                Lunch
              </span>
              <span className="text-[10px] text-muted-foreground">L</span>
            </div>

            {/* Dinner */}
            <div
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 transition-all',
                meals?.dinner ? 'border-neutral-500 bg-neutral-50' : 'border-dashed border-border'
              )}
            >
              <span className="text-lg">🌙</span>
              <span
                className={cn(
                  'text-xs font-medium',
                  meals?.dinner ? 'text-neutral-700' : 'text-muted-foreground'
                )}
              >
                Dinner
              </span>
              <span className="text-[10px] text-muted-foreground">D</span>
            </div>
          </div>

          {!hasAnyMeal && (
            <p className="text-xs text-muted-foreground mt-2">
              No meals included. Click to toggle.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
