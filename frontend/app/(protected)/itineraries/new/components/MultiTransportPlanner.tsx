'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransportPlanner } from './TransportPlanner';
import type { OptionBuilder, DayBuilderData } from '../types';

interface MultiTransportPlannerProps {
  options: OptionBuilder[];
  onChange: (options: OptionBuilder[]) => void;
  onSave: () => void;
  isSaving: boolean;
  nextLabel?: string;
  /** Currency picked in step 1; the running total is shown in it. */
  currency?: string;
}

/** Same one-vehicle-plus-count planner as the single-option flow, applied to
 *  whichever package tab is active — each package can have its own vehicle. */
export function MultiTransportPlanner({
  options,
  onChange,
  onSave,
  isSaving,
  nextLabel,
  currency,
}: MultiTransportPlannerProps) {
  const [activeTab, setActiveTab] = useState(options[0]?.id || '');
  const activeIdx = options.findIndex(o => o.id === activeTab);
  const activeOption = options[activeIdx];

  // Pickup/drop are trip-wide, not per package, so they're mirrored into every
  // option — the saved itinerary (and its booking PDF) uses the first option's days.
  const handleDaysChange = (days: DayBuilderData[]) => {
    const pickupPoint = days[0]?.pickupPoint || '';
    const dropPoint = days[days.length - 1]?.dropPoint || '';
    onChange(
      options.map((o, i) => {
        const optDays = i === activeIdx ? days : o.days;
        const last = optDays.length - 1;
        return {
          ...o,
          days: optDays.map((d, di) => ({
            ...d,
            ...(di === 0 && { pickupPoint }),
            ...(di === last && { dropPoint }),
          })),
        };
      })
    );
  };

  if (!activeOption) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
        {options.map((opt, i) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setActiveTab(opt.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer shrink-0 text-xs font-medium min-w-[70px] justify-center',
              i === activeIdx
                ? 'bg-primary/5 text-primary border-primary shadow-sm'
                : 'bg-white border-border hover:border-primary/40'
            )}
          >
            <span>{opt.label || `P${i + 1}`}</span>
            {i === activeIdx && <Check className="h-3 w-3 shrink-0" />}
          </button>
        ))}
      </div>

      <TransportPlanner
        days={activeOption.days}
        onChange={handleDaysChange}
        onSave={onSave}
        isSaving={isSaving}
        heading={`Choose Transport — ${activeOption.label || `Package ${activeIdx + 1}`}`}
        nextLabel={nextLabel}
        currency={currency}
      />
    </div>
  );
}
