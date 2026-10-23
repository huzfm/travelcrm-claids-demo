'use client';

import { cn } from '@/lib/utils';

export interface MealToggleProps {
  meal: 'breakfast' | 'lunch' | 'dinner';
  checked: boolean;
  onChange: (checked: boolean) => void;
  note?: string;
  onNoteChange?: (note: string) => void;
}

const mealConfig = {
  breakfast: {
    emoji: '🍳',
    label: 'Breakfast',
    activeColor: 'bg-red-50 border-red-200 text-red-700',
    inactiveColor: 'bg-neutral-50 border-neutral-200 text-neutral-400',
  },
  lunch: {
    emoji: '🍽️',
    label: 'Lunch',
    activeColor: 'bg-red-50 border-red-200 text-red-700',
    inactiveColor: 'bg-neutral-50 border-neutral-200 text-neutral-400',
  },
  dinner: {
    emoji: '🌙',
    label: 'Dinner',
    activeColor: 'bg-neutral-50 border-neutral-200 text-neutral-700',
    inactiveColor: 'bg-neutral-50 border-neutral-200 text-neutral-400',
  },
};

export function MealToggle({ meal, checked, onChange, note, onNoteChange }: MealToggleProps) {
  const config = mealConfig[meal];

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200',
          checked ? config.activeColor : config.inactiveColor,
          'hover:shadow-sm cursor-pointer'
        )}
      >
        <span className="text-base">{config.emoji}</span>
        <span>{config.label}</span>
        {checked && (
          <svg className="h-3.5 w-3.5 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
      {checked && onNoteChange && (
        <input
          type="text"
          value={note || ''}
          onChange={e => onNoteChange(e.target.value)}
          placeholder={`${config.label} details...`}
          className="text-[11px] px-2 py-1 border border-dashed rounded-md bg-white focus:outline-none focus:border-primary"
        />
      )}
    </div>
  );
}
