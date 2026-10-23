'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PdfProgress } from './pdf/ItineraryPDF';

/**
 * How the 0–100 bar is divided.
 *
 * Only the image stage can be measured — the renderer gives no callbacks — so
 * that stage drives the bar for real, and the render stage creeps toward but
 * never reaches its ceiling. The label always names what is actually happening,
 * so a slow render reads as "still working" rather than "stuck at 94%".
 */
const SAVE_END = 8;
const IMAGES_END = 70;
const RENDER_CEILING = 96;

export interface PdfProgressState {
  active: boolean;
  percent: number;
  label: string;
}

const IDLE: PdfProgressState = { active: false, percent: 0, label: '' };

/**
 * Drives the download overlay. `report` is handed straight to the PDF
 * generator; `start`, `saved`, `finish` and `fail` mark the steps around it.
 */
export function usePdfProgress() {
  const [state, setState] = useState<PdfProgressState>(IDLE);
  const creepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCreep = useCallback(() => {
    if (creepRef.current) {
      clearInterval(creepRef.current);
      creepRef.current = null;
    }
  }, []);

  useEffect(() => stopCreep, [stopCreep]);

  const start = useCallback(() => {
    stopCreep();
    setState({ active: true, percent: 2, label: 'Saving your changes…' });
  }, [stopCreep]);

  const saved = useCallback(() => {
    setState({ active: true, percent: SAVE_END, label: 'Preparing images…' });
  }, []);

  const report = useCallback(
    (progress: PdfProgress) => {
      if (progress.stage === 'images') {
        const fraction = progress.imagesTotal > 0 ? progress.imagesDone / progress.imagesTotal : 1;
        const percent = SAVE_END + (IMAGES_END - SAVE_END) * fraction;
        setState({
          active: true,
          percent,
          label:
            progress.imagesTotal > 0
              ? `Preparing images… ${progress.imagesDone} of ${progress.imagesTotal}`
              : 'Preparing images…',
        });
        return;
      }

      if (progress.stage === 'rendering') {
        setState({ active: true, percent: IMAGES_END, label: 'Building the PDF…' });
        // The renderer reports nothing, so ease toward the ceiling instead of
        // freezing — and never claim to be finished.
        stopCreep();
        creepRef.current = setInterval(() => {
          setState(prev =>
            prev.active
              ? { ...prev, percent: prev.percent + (RENDER_CEILING - prev.percent) * 0.08 }
              : prev
          );
        }, 200);
        return;
      }

      stopCreep();
      setState({ active: true, percent: 99, label: 'Starting the download…' });
    },
    [stopCreep]
  );

  const finish = useCallback(() => {
    stopCreep();
    setState({ active: true, percent: 100, label: 'Done' });
    // Let the bar land on 100 before it disappears.
    setTimeout(() => setState(IDLE), 550);
  }, [stopCreep]);

  const fail = useCallback(() => {
    stopCreep();
    setState(IDLE);
  }, [stopCreep]);

  return { state, start, saved, report, finish, fail };
}

export function PdfProgressOverlay({ state }: { state: PdfProgressState }) {
  if (!state.active) return null;

  const percent = Math.min(100, Math.max(0, Math.round(state.percent)));
  const complete = percent >= 100;

  return (
    <div
      role="alertdialog"
      aria-busy={!complete}
      aria-live="polite"
      aria-label="Generating PDF"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              'mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-colors',
              complete ? 'bg-neutral-100 text-neutral-600' : 'bg-primary/10 text-primary'
            )}
          >
            {complete ? <Check className="h-7 w-7" /> : <FileDown className="h-7 w-7" />}
          </div>

          <p className="text-base font-semibold">
            {complete ? 'PDF ready' : 'Generating your PDF'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            {!complete && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {state.label}
          </p>

          <div className="mt-5 w-full">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-200 ease-out',
                  complete ? 'bg-neutral-500' : 'bg-primary'
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{percent}%</p>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Keep this tab open until the download starts.
          </p>
        </div>
      </div>
    </div>
  );
}
