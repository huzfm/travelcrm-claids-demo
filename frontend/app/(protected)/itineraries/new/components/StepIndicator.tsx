'use client';

import { cn } from '@/lib/utils';
import { FileText, GitBranch, Package, DollarSign, Check } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;
type Mode = 'single' | 'multi' | null;

const STEPS = [
  { num: 1 as Step, label: 'Trip Details', icon: FileText, description: 'Basic info' },
  { num: 2 as Step, label: 'Choose Mode', icon: GitBranch, description: 'Package style' },
  { num: 3 as Step, label: 'Build Itinerary', icon: Package, description: 'Day by day' },
  { num: 4 as Step, label: 'Pricing', icon: DollarSign, description: 'Final details' },
];

interface StepIndicatorProps {
  currentStep: Step;
  mode: Mode;
}

export function StepIndicator({ currentStep, mode }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = step.num === currentStep;
        const isDone = step.num < currentStep;
        const stepLabel =
          step.num === 3 && mode
            ? mode === 'single'
              ? 'Single Package'
              : 'Multiple Options'
            : step.label;

        return (
          <div key={step.num} className="flex items-center">
            {/* Step Circle + Label */}
            <div className="flex items-center gap-2">
              {/* Circle */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                  isActive &&
                    'bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-primary/20',
                  isDone && 'bg-neutral-500 text-white',
                  !isActive && !isDone && 'bg-muted text-muted-foreground'
                )}
              >
                {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>

              {/* Label */}
              <div className="hidden sm:block">
                <p
                  className={cn(
                    'text-sm font-semibold transition-colors',
                    isActive && 'text-foreground',
                    isDone && 'text-neutral-600',
                    !isActive && !isDone && 'text-muted-foreground'
                  )}
                >
                  {stepLabel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isDone ? 'Completed' : isActive ? 'Current' : step.description}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 sm:w-12 mx-1 sm:mx-3 transition-colors duration-300',
                  isDone ? 'bg-neutral-400' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
