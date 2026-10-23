'use client';

import { Clock, ImageIcon, Sparkles, StickyNote } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { Panel } from './day-detail-view';
import type { ItineraryDay } from '@/types/itinerary.types';

interface DayExtrasProps {
  day: ItineraryDay;
  currency?: string;
}

/**
 * The parts of a day the detail page never used to show — activities,
 * notes and photos. They live on the record and go into the PDF, so an agent
 * checking a trip should not have to open the editor to read them.
 */
export function DayExtras({ day, currency = 'INR' }: DayExtrasProps) {
  const activities = day.activities ?? [];
  const images = day.images ?? [];

  const hasAnything = activities.length > 0 || !!day.notes || images.length > 0;

  if (!hasAnything) return null;

  const activitiesCost = activities.reduce((sum, activity) => sum + (activity.cost || 0), 0);

  return (
    <div className="space-y-3 pb-4">
      {activities.length > 0 && (
        <Panel
          icon={Sparkles}
          title={`Activities (${activities.length})`}
          trailing={
            activitiesCost > 0 ? (
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(activitiesCost, currency)}
              </span>
            ) : undefined
          }
        >
          <ol className="relative space-y-3 border-l pl-5">
            {activities.map((activity, idx) => (
              <li key={activity.id || idx} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {activity.time && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{activity.title}</span>
                      {activity.duration && (
                        <span className="text-xs text-muted-foreground">{activity.duration}</span>
                      )}
                    </div>
                    {activity.description && (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {activity.description}
                      </p>
                    )}
                    {(activity.location || activity.bookingRef) && (
                      <p className="mt-0.5 text-xs text-muted-foreground/80">
                        {[activity.location, activity.bookingRef && `Ref ${activity.bookingRef}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  {!!activity.cost && (
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(activity.cost, currency)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {day.notes && (
        <Panel icon={StickyNote} title="Notes" tone="gold">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
            {day.notes}
          </p>
        </Panel>
      )}

      {images.length > 0 && (
        <Panel icon={ImageIcon} title={`Photos (${images.length})`}>
          <div className="flex flex-wrap gap-2">
            {images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`Day ${day.dayNumber} photo ${idx + 1}`}
                loading="lazy"
                className="h-24 w-32 rounded-lg border object-cover"
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
