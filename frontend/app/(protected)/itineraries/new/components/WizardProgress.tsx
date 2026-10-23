'use client';

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const WIZARD_STEP_LABELS = [
  'Basic Details',
  'Choose Mode',
  'Choose Hotels',
  'Choose Transport',
  'Destinations & Activities',
  'Review Hotels',
  'Review Transport',
  'Flight Details',
  'Terms & Conditions',
  'Pricing & Summary',
];

interface WizardProgressProps {
  currentStep: number;
  /** Whether the step has what it needs to render (e.g. trip details, a mode). */
  canJumpTo: (step: number) => boolean;
  onStepClick: (step: number) => void;
}

/**
 * Clickable 1–10 progress bar for the itinerary wizard. Any step whose
 * prerequisites exist can be opened directly, so a fix on step 1 doesn't mean
 * clicking Back through every step in between. Circles on desktop, a
 * scrollable track that keeps the current step in view on mobile.
 */
export function WizardProgress({ currentStep, canJumpTo, onStepClick }: WizardProgressProps) {
  const activeMobileRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeMobileRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [currentStep]);

  const steps = WIZARD_STEP_LABELS.map((label, i) => {
    const num = i + 1;
    const isActive = num === currentStep;
    const isDone = num < currentStep;
    const clickable = !isActive && canJumpTo(num);
    return { num, label, isActive, isDone, clickable };
  });

  return (
    <>
      {/* Desktop: numbered circles */}
      <nav aria-label="Itinerary steps" className="hidden md:flex items-center gap-2">
        {steps.map(({ num, label, isActive, isDone, clickable }) => (
          <div key={num} className="flex items-center">
            <button
              type="button"
              onClick={() => clickable && onStepClick(num)}
              disabled={!clickable && !isActive}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Step ${num}: ${label}`}
              title={`Step ${num}: ${label}`}
              className={cn(
                'relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isDone
                  ? 'bg-neutral-500 text-white'
                  : isActive
                    ? 'bg-primary text-primary-foreground cursor-default'
                    : 'bg-muted text-muted-foreground',
                clickable && 'cursor-pointer hover:scale-110 hover:ring-2 hover:ring-primary/40',
                clickable && !isDone && 'hover:bg-primary/10 hover:text-primary',
                !clickable && !isActive && 'cursor-not-allowed opacity-60'
              )}
            >
              {num}
              {isDone && <DoneBadge />}
            </button>
            {num < steps.length && (
              <div className={cn('w-8 h-0.5 mx-1', isDone ? 'bg-neutral-500' : 'bg-muted')} />
            )}
          </div>
        ))}
      </nav>

      {/* Mobile: scrollable track, current step expands to show its name */}
      <nav
        aria-label="Itinerary steps"
        className="md:hidden min-w-0 -mx-3 px-3 sm:mx-0 sm:px-0 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max items-center px-1 py-2">
          {steps.map(({ num, label, isActive, isDone, clickable }) => (
            <div key={num} className="flex items-center snap-center">
              <button
                ref={isActive ? activeMobileRef : undefined}
                type="button"
                onClick={() => clickable && onStepClick(num)}
                disabled={!clickable && !isActive}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${num}: ${label}`}
                className={cn(
                  'relative flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-all duration-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'bg-primary px-3 text-primary-foreground shadow-md shadow-primary/25'
                    : 'w-8',
                  isDone && 'bg-neutral-500 text-white active:scale-95',
                  !isActive && !isDone && 'bg-muted text-muted-foreground',
                  clickable && !isDone && 'active:scale-95 active:bg-primary/10',
                  !clickable && !isActive && 'opacity-50'
                )}
              >
                <span>{num}</span>
                {isDone && <DoneBadge />}
                {isActive && <span className="whitespace-nowrap">{label}</span>}
              </button>
              {num < steps.length && (
                <div
                  className={cn(
                    'h-0.5 w-4 shrink-0 rounded-full',
                    isDone ? 'bg-neutral-400' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}

/** Small tick pinned to a completed step, so its number stays readable. */
function DoneBadge() {
  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-background">
      <Check className="h-2.5 w-2.5" strokeWidth={3} />
    </span>
  );
}
