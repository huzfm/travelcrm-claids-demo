'use client';

export interface TripOverviewCardProps {
  totalDays: number;
  travelers?: number;
  budget?: string;
  totalCost?: number;
  startDate?: string;
  endDate?: string;
  tripType?: string;
  destination?: string;
  onEdit?: () => void;
}

export function TripOverviewCard({
  totalDays,
  travelers,
  budget,
  totalCost,
  startDate,
  endDate,
  tripType,
  destination,
  onEdit,
}: TripOverviewCardProps) {
  return (
    <div className="rounded-xl border bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Trip Overview
        </h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs text-primary hover:text-primary-dark font-medium flex items-center gap-1 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit Trip
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 mx-auto mb-1">
            <svg
              className="h-5 w-5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-xl font-bold">{totalDays}</p>
          <p className="text-[11px] text-muted-foreground">{totalDays === 1 ? 'Day' : 'Days'}</p>
        </div>
        {travelers !== undefined && (
          <div className="text-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-neutral-50 mx-auto mb-1">
              <svg
                className="h-5 w-5 text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <p className="text-xl font-bold">{travelers}</p>
            <p className="text-[11px] text-muted-foreground">
              {travelers === 1 ? 'Traveler' : 'Travelers'}
            </p>
          </div>
        )}
        {budget && (
          <div className="text-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-neutral-50 mx-auto mb-1">
              <svg
                className="h-5 w-5 text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <p className="text-xl font-bold truncate max-w-25">{budget}</p>
            <p className="text-[11px] text-muted-foreground">Budget</p>
          </div>
        )}
        {totalCost !== undefined && (
          <div className="text-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-50 mx-auto mb-1">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
              </svg>
            </div>
            <p className="text-xl font-bold">₹{(totalCost / 1000).toFixed(0)}k</p>
            <p className="text-[11px] text-muted-foreground">Est. Cost</p>
          </div>
        )}
        {tripType && (
          <div className="text-center">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-neutral-50 mx-auto mb-1">
              <svg
                className="h-5 w-5 text-neutral-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </div>
            <p className="text-lg font-bold truncate max-w-25">{tripType}</p>
            <p className="text-[11px] text-muted-foreground">Trip Type</p>
          </div>
        )}
      </div>
      {startDate && endDate && (
        <div className="mt-3 pt-3 border-t border-primary/10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            {new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
          <span>—</span>
          <span>
            {new Date(endDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {destination && <span className="ml-1">• {destination}</span>}
        </div>
      )}
    </div>
  );
}
