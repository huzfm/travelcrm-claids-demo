'use client';

import { Button } from '@/components/ui/button';
import { Edit2, MapPin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { placeTypeColors, type Destination } from '@/types';

interface DestinationCardProps {
  destination: Destination;
  canManage?: boolean;
  onEdit?: (destination: Destination) => void;
  onDelete?: (destination: Destination) => void;
  isDeleting?: boolean;
}

/**
 * A destination inside a master — the rich card with highlights and the rest
 * of the place-level detail. Master destinations are grouping rows with none
 * of this, so they get their own tile on the index page.
 */
export function DestinationCard({
  destination,
  canManage,
  onEdit,
  onDelete,
  isDeleting,
}: DestinationCardProps) {
  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card',
        !destination.isActive && 'opacity-60'
      )}
    >
      <div className="p-4 space-y-3">
        {/* Name & Type */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* Wraps rather than clamping, so a name is never cut to "Kash…". */}
            <h3
              className="font-semibold text-sm leading-tight break-words"
              title={destination.name}
            >
              {destination.name}
            </h3>
            {destination.address && (
              <div className="flex items-start gap-1.5 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2" title={destination.address}>
                  {destination.address}
                </span>
              </div>
            )}
            {!destination.isActive && (
              <span className="text-xs text-destructive">Inactive</span>
            )}
          </div>
          <span
            className={cn(
              'text-[11px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap capitalize',
              placeTypeColors[destination.placeType] || placeTypeColors.OTHER
            )}
          >
            {destination.placeType.toLowerCase()}
          </span>
        </div>

        {destination.shortDescription && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {destination.shortDescription}
          </p>
        )}

        {destination.highlights && destination.highlights.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-0.5 rounded-full">
              {destination.highlights.length} highlights
            </span>
          </div>
        )}

        {destination.bestTimeToVisit && (
          <div className="text-xs text-muted-foreground">
            Best time: {destination.bestTimeToVisit}
          </div>
        )}

        {/* Actions */}
        {canManage && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onEdit?.(destination)}
            >
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onDelete?.(destination)}
              disabled={isDeleting}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
