'use client';

import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, X } from 'lucide-react';
import { DestinationAutocomplete } from '@/components/destinations/destination-autocomplete';
import { DestinationForm } from '@/components/destinations/destination-form';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthContext } from '@/components/providers';
import api from '@/lib/axios';
import { toast } from 'sonner';
import type { Destination, ItineraryDay } from '@/types';
import { cn } from '@/lib/utils';

interface DaySectionDestinationProps {
  day: ItineraryDay;
  destination: string;
  onUpdate: (updates: Partial<ItineraryDay>) => void;
  readOnly?: boolean;
}

export function DaySectionDestination({
  day,
  destination,
  onUpdate,
  readOnly = false,
}: DaySectionDestinationProps) {
  const [isOpen, setIsOpen] = useState(false); // collapsed by default
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuthContext();
  const canCreateDestination = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const hasDestination = !!day.destinationId || !!day.destination;

  const handleCreateDestination = async (formData: Record<string, unknown>) => {
    setIsCreating(true);
    try {
      const res = await api.post('/destinations', formData);
      const data = res.data;
      if (data.success) {
        toast.success('Destination created!');
        setIsCreateOpen(false);
        handleDestinationSelect(data.data.name, data.data as Destination);
      } else {
        toast.error(data.error || 'Failed to create destination');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to create destination');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDestinationSelect = (name: string, dest?: Destination) => {
    if (!dest) {
      onUpdate({
        destination: name,
        destinationId: undefined,
        destinationAddress: undefined,
        destinationHighlights: undefined,
      });
      return;
    }

    onUpdate({
      destination: dest.name,
      destinationId: dest.id,
      destinationAddress: dest.address,
      destinationHighlights: dest.highlights,
      destinationShortDescription: dest.shortDescription || undefined,
      destinationDescription: dest.description || undefined,
      destinationAmenities: dest.amenities || undefined,
      destinationBestTimeToVisit: dest.bestTimeToVisit || undefined,
      destinationAverageTemperature: dest.averageTemperature || undefined,
      destinationLanguage: dest.language || undefined,
      destinationCurrency: dest.currency || undefined,
      destinationTimezone: dest.timezone || undefined,
      destinationThingsToKnow: dest.thingsToKnow || undefined,
    });
  };

  const handleClear = () => {
    onUpdate({
      destination: undefined,
      destinationId: undefined,
      destinationAddress: undefined,
      destinationHighlights: undefined,
      destinationShortDescription: undefined,
      destinationDescription: undefined,
      destinationAmenities: undefined,
      destinationBestTimeToVisit: undefined,
      destinationAverageTemperature: undefined,
      destinationLanguage: undefined,
      destinationCurrency: undefined,
      destinationTimezone: undefined,
      destinationThingsToKnow: undefined,
    });
  };

  return (
    <div className="border-b py-3">
      {/* Header - always visible, click to expand */}
      <button
        onClick={() => !readOnly && setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full text-left -mx-2 px-2 py-1 rounded transition-colors',
          !readOnly ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'
        )}
      >
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Destination</span>
          {day.dayType === 'leisure' && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-neutral-200 text-neutral-700 bg-neutral-50"
            >
              Leisure Day
            </Badge>
          )}
          {hasDestination && (
            <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">
              ✓ {day.destination}
            </span>
          )}
          {!hasDestination && day.dayType !== 'leisure' && (
            <span className="text-xs text-muted-foreground">Not set</span>
          )}
          {day.dayType === 'leisure' && !hasDestination && (
            <span className="text-xs text-neutral-600 italic">Rest &amp; Relaxation</span>
          )}
        </div>
        {!readOnly &&
          (isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </button>

      {isOpen && (
        <div className="mt-3 pl-6 space-y-4">
          {/* Leisure Day — Client Guidelines textarea */}
          {day.dayType === 'leisure' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Client Guidelines for Rest Day
                <span className="ml-1 text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                  shown in PDF
                </span>
              </label>
              <textarea
                className="w-full border rounded-md p-3 text-sm resize-y min-h-[120px]"
                placeholder="Add guidelines for the client for this rest day (e.g., suggested activities, spa recommendations, restaurant tips, etc.)"
                value={day.leisureGuidelines || ''}
                onChange={e => !readOnly && onUpdate({ leisureGuidelines: e.target.value })}
                readOnly={readOnly}
                rows={5}
              />
              {day.leisureGuidelines && (
                <p className="text-xs text-neutral-600 mt-1 flex items-center gap-1">
                  <span>✓</span> Guidelines saved
                </p>
              )}
            </div>
          )}

          {/* Destination search — hidden in read-only */}
          {!readOnly && day.dayType !== 'leisure' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Search Destination</label>
              <DestinationAutocomplete
                value={day.destination || ''}
                onChange={handleDestinationSelect}
                destination={destination}
                showCreateButton={canCreateDestination}
                onCreateDestination={canCreateDestination ? () => setIsCreateOpen(true) : undefined}
              />
            </div>
          )}

          {hasDestination && (
            <>
              {/* Clear button — hidden in read-only */}
              {!readOnly && (
                <button
                  onClick={handleClear}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear destination
                </button>
              )}

              {/* Destination details display */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                {/* Short description */}
                {day.destinationShortDescription && (
                  <p className="text-sm text-muted-foreground italic">
                    {day.destinationShortDescription}
                  </p>
                )}

                {/* Address */}
                {day.destinationAddress && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{day.destinationAddress}</span>
                  </div>
                )}

                {/* Description */}
                {day.destinationDescription && (
                  <p className="text-sm text-muted-foreground">{day.destinationDescription}</p>
                )}

                {/* Quick info pills */}
                {(day.destinationBestTimeToVisit ||
                  day.destinationAverageTemperature ||
                  day.destinationLanguage ||
                  day.destinationCurrency ||
                  day.destinationTimezone) && (
                  <div className="flex flex-wrap gap-2">
                    {day.destinationBestTimeToVisit && (
                      <span className="text-xs bg-neutral-50 text-neutral-700 px-2 py-1 rounded-full">
                        Best time: {day.destinationBestTimeToVisit}
                      </span>
                    )}
                    {day.destinationAverageTemperature && (
                      <span className="text-xs bg-neutral-50 text-neutral-700 px-2 py-1 rounded-full">
                        {day.destinationAverageTemperature}
                      </span>
                    )}
                    {day.destinationLanguage && (
                      <span className="text-xs bg-neutral-50 text-neutral-700 px-2 py-1 rounded-full">
                        {day.destinationLanguage}
                      </span>
                    )}
                    {day.destinationCurrency && (
                      <span className="text-xs bg-neutral-50 text-neutral-700 px-2 py-1 rounded-full">
                        {day.destinationCurrency}
                      </span>
                    )}
                    {day.destinationTimezone && (
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">
                        {day.destinationTimezone}
                      </span>
                    )}
                  </div>
                )}

                {/* Highlights */}
                {day.destinationHighlights && day.destinationHighlights.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Highlights:</span>
                    <ul className="mt-1.5 space-y-1">
                      {day.destinationHighlights.slice(0, 5).map((highlight, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-sm">
                          <span className="text-primary shrink-0 mt-0.5">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                      {day.destinationHighlights.length > 5 && (
                        <li className="text-xs text-muted-foreground">
                          +{day.destinationHighlights.length - 5} more highlights
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Amenities */}
                {day.destinationAmenities && day.destinationAmenities.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Amenities:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {day.destinationAmenities.map((amenity, idx) => (
                        <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Things to know */}
                {day.destinationThingsToKnow && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      Things to know:
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {day.destinationThingsToKnow}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Create Destination Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Destination</DialogTitle>
          </DialogHeader>
          <DestinationForm
            onSubmit={handleCreateDestination}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={isCreating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
