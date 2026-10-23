'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plane, MapPin, Calendar, Users, Eye, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Itinerary } from '@/types';

interface LeadItinerariesTabProps {
  itineraries: Itinerary[];
  leadId: string;
  isLoading?: boolean;
}

const destinationGradients: Record<string, string> = {
  Paris: 'from-neutral-500 via-neutral-500 to-neutral-600',
  Dubai: 'from-red-500 via-red-500 to-red-600',
  Bali: 'from-neutral-400 via-neutral-500 to-neutral-500',
  Tokyo: 'from-red-400 via-red-500 to-red-500',
  Maldives: 'from-neutral-400 via-neutral-500 to-neutral-600',
  Bangkok: 'from-red-500 via-red-500 to-red-500',
  Singapore: 'from-red-400 via-red-500 to-neutral-500',
  default: 'from-neutral-500 via-neutral-500 to-neutral-600',
};

const destinationIcons: Record<string, string> = {
  Paris: '🗼',
  Dubai: '🏙️',
  Bali: '🏝️',
  Tokyo: '🗾',
  Maldives: '🏝️',
  Bangkok: '🛕',
  Singapore: '🌴',
  default: '✈️',
};

function getDestinationGradient(dest: string): string {
  const key = Object.keys(destinationGradients).find(k =>
    dest?.toLowerCase().includes(k.toLowerCase())
  );
  return destinationGradients[key || 'default'];
}

function getDestinationIcon(dest: string): string {
  const key = Object.keys(destinationIcons).find(k =>
    dest?.toLowerCase().includes(k.toLowerCase())
  );
  return destinationIcons[key || 'default'];
}

export function LeadItinerariesTab({
  itineraries,
  leadId,
  isLoading = false,
}: LeadItinerariesTabProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Itineraries</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {itineraries.length} {itineraries.length === 1 ? 'itinerary' : 'itineraries'} created
          </p>
        </div>
        <Button onClick={() => router.push(`/itineraries/new?leadId=${leadId}`)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-border overflow-hidden">
              <Skeleton className="h-32 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && itineraries.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Plane className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No itineraries yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
              Create your first itinerary to start planning this trip. You can add destinations,
              activities, hotels, and more.
            </p>
            <Button onClick={() => router.push(`/itineraries/new?leadId=${leadId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Itinerary
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Itineraries Grid */}
      {!isLoading && itineraries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itineraries.map(itinerary => {
            // The list endpoint that feeds this tab never returns `daysJson`
            // (it's stripped for payload size), so day count is derived from
            // the trip's date range instead — the same fields it already has.
            const days =
              itinerary.startDate && itinerary.endDate
                ? Math.max(
                    1,
                    Math.ceil(
                      (new Date(itinerary.endDate).getTime() -
                        new Date(itinerary.startDate).getTime()) /
                        86400000
                    ) + 1
                  )
                : 0;
            const gradient = getDestinationGradient(itinerary.destination);
            const icon = getDestinationIcon(itinerary.destination);

            return (
              <div
                key={itinerary.id}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-accent/50 hover:shadow-lg transition-all duration-300"
              >
                {/* Gradient Header */}
                <div className={cn('h-28 relative bg-gradient-to-br', gradient)}>
                  {/* Overlay pattern */}
                  <div className="absolute inset-0 opacity-20">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.3) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.3) 2px, transparent 2px)`,
                        backgroundSize: '20px 20px',
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="text-4xl">{icon}</div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg leading-tight line-clamp-1 drop-shadow-md">
                        {itinerary.title || 'Untitled Trip'}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-4">
                  {/* Destination & Duration */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="font-medium text-foreground">
                        {itinerary.destination || 'No destination'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {days} {days === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{itinerary.totalTravelers || 0} travelers</span>
                    </div>
                    {itinerary.startDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(itinerary.startDate), 'MMM d')}
                          {itinerary.endDate &&
                            ` - ${format(new Date(itinerary.endDate), 'MMM d')}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Pricing (if quote exists) */}
                  {itinerary.quotes?.[0]?.totalCost && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-muted-foreground">Total:</span>
                        <span className="text-lg font-bold text-foreground">
                          {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: itinerary.currency || 'INR',
                            minimumFractionDigits: 0,
                          }).format(itinerary.quotes[0].totalCost)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9"
                      onClick={() => router.push(`/itineraries/${itinerary.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-9"
                      onClick={() => router.push(`/itineraries/${itinerary.id}`)}
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
