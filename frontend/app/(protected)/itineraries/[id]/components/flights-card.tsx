'use client';

import { useState } from 'react';
import { Pencil, Plane, PlaneLanding, PlaneTakeoff, Plus, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FlightsEditor } from '@/components/itinerary/flights-editor';
import { formatCurrency } from '@/lib/currency';
import {
  cleanFlightsForSave,
  flightsTotalFare,
  formatFlightDuration,
  formatFlightRoute,
} from '@/lib/flights';
import { FLIGHT_DIRECTION_LABELS, type FlightSegment } from '@/types/itinerary.types';

interface FlightsCardProps {
  flights: FlightSegment[];
  onChange: (flights: FlightSegment[]) => void;
  startDate?: string;
  endDate?: string;
  travelers?: number;
  currency?: string;
  formatDate: (date: string) => string;
}

const icons = {
  OUTBOUND: PlaneTakeoff,
  RETURN: PlaneLanding,
  INTERNAL: Plane,
} as const;

/**
 * The trip's flights on the itinerary page, with an edit dialog that reuses the
 * builder's editor so a flight is corrected the same way it was entered. Edits
 * land in the page's state; the page's own Save writes them.
 */
export function FlightsCard({
  flights,
  onChange,
  startDate,
  endDate,
  travelers,
  currency = 'INR',
  formatDate,
}: FlightsCardProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FlightSegment[]>(flights);

  const fareTotal = flightsTotalFare(flights);
  const hasSample = flights.some(flight => flight.isSample);

  /**
   * Seeding the draft on open — rather than in an effect — is what makes Cancel
   * mean cancel: a dismissed session's edits never come back the next time the
   * dialog is opened.
   */
  const openDialog = () => {
    setDraft(flights);
    setOpen(true);
  };

  const commit = () => {
    onChange(cleanFlightsForSave(draft));
    setOpen(false);
  };

  return (
    <>
      <Card className="mb-4">
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Plane className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold">Flights</h3>
              {flights.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {flights.length}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={openDialog} className="gap-1.5">
              {flights.length > 0 ? (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit flights
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Add flights
                </>
              )}
            </Button>
          </div>

          {hasSample && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p className="text-xs">
                Some details came from the sample flight lookup — confirm times and terminals with
                the airline before the client travels.
              </p>
            </div>
          )}

          {flights.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              No flights on this itinerary. Add them if the agency is booking the air tickets.
            </p>
          ) : (
            <div className="space-y-2">
              {flights.map(flight => {
                const Icon = icons[flight.direction] ?? Plane;
                const duration = formatFlightDuration(flight.durationMinutes);
                return (
                  <div
                    key={flight.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px]">
                      {FLIGHT_DIRECTION_LABELS[flight.direction]}
                    </Badge>
                    <span className="text-sm font-semibold">{flight.flightNumber || '—'}</span>
                    {flight.airline && (
                      <span className="text-xs text-muted-foreground">{flight.airline}</span>
                    )}
                    <span className="text-sm">{formatFlightRoute(flight)}</span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        flight.departureDate ? formatDate(flight.departureDate) : '',
                        flight.departureTime && flight.arrivalTime
                          ? `${flight.departureTime} → ${flight.arrivalTime}`
                          : flight.departureTime || '',
                        duration,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {flight.pnr && (
                      <span className="text-xs text-muted-foreground">PNR {flight.pnr}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {fareTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              Airfare {formatCurrency(fareTotal, currency)} — shown for reference, not included in
              the package total.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Flight Details</DialogTitle>
            <DialogDescription>
              Type the details in, or fetch them from a flight number. Changes apply when you save
              the itinerary.
            </DialogDescription>
          </DialogHeader>

          <FlightsEditor
            flights={draft}
            onChange={setDraft}
            startDate={startDate}
            endDate={endDate}
            travelers={travelers}
            currency={currency}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={commit}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
