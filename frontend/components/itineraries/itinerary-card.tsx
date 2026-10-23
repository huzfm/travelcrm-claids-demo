'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, MapPin, Plane, Calendar, Users, Eye, Send, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripIdBadge } from '@/components/ui/trip-id-badge';
import { useDeleteItinerary } from '@/hooks/useItineraries';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ItineraryCardProps {
  itinerary: any;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  SENT: {
    label: 'Sent',
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-success/20 text-success border-success/30',
  },
  DRAFT: {
    label: 'Draft',
    className: 'bg-muted/60 text-muted-foreground border-border',
  },
};

const destinationImages: Record<string, string> = {
  Paris: 'from-neutral-600 to-neutral-600',
  Dubai: 'from-red-600 to-red-600',
  Bali: 'from-neutral-500 to-neutral-500',
  Tokyo: 'from-red-500 to-red-600',
  Maldives: 'from-neutral-400 to-neutral-500',
  London: 'from-neutral-600 to-neutral-700',
  'New York': 'from-neutral-500 to-neutral-600',
  Singapore: 'from-red-500 to-red-500',
  Bangkok: 'from-red-500 to-red-500',
  Switzerland: 'from-neutral-500 to-neutral-600',
  Rome: 'from-red-600 to-red-600',
  Barcelona: 'from-neutral-500 to-red-500',
  Sydney: 'from-neutral-500 to-neutral-600',
  Maui: 'from-neutral-500 to-neutral-600',
  Istanbul: 'from-red-600 to-red-600',
  Phuket: 'from-neutral-500 to-neutral-500',
  Santorini: 'from-neutral-400 to-neutral-500',
  Dubrovnik: 'from-neutral-600 to-neutral-600',
  default: 'from-neutral-600 to-neutral-600',
};

const destinationPhotos: Record<string, string> = {
  Paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop',
  Dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=400&fit=crop',
  Bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=400&fit=crop',
  Tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=400&fit=crop',
  Maldives: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&h=400&fit=crop',
  London: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=400&fit=crop',
  Singapore: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=400&fit=crop',
  Switzerland: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800&h=400&fit=crop',
};

function getDestinationGradient(dest: string): string {
  const key = Object.keys(destinationImages).find(k =>
    dest?.toLowerCase().includes(k.toLowerCase())
  );
  return destinationImages[key || 'default'];
}

function getDestinationPhoto(dest: string): string {
  return (
    destinationPhotos[
      Object.keys(destinationPhotos).find(k => dest?.toLowerCase().includes(k.toLowerCase())) || ''
    ] || ''
  );
}

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const deleteItinerary = useDeleteItinerary();

  const photo = getDestinationPhoto(itinerary.destination);
  const gradient = getDestinationGradient(itinerary.destination);
  const days = itinerary.daysJson?.length || itinerary.days?.length || 0;
  const statusKey =
    itinerary.sharedVia === 'link' ? 'CONFIRMED' : itinerary.sharedVia ? 'SENT' : 'DRAFT';
  const status = statusConfig[statusKey] || statusConfig.DRAFT;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItinerary.mutateAsync(itinerary.id);
      // Update cache directly to remove deleted itinerary immediately
      queryClient.setQueryData(['itineraries'], (old: any) => {
        if (!old?.data?.itineraries) return old;
        return {
          ...old,
          data: {
            ...old.data,
            itineraries: old.data.itineraries.filter((i: any) => i.id !== itinerary.id),
            total: old.data.total - 1,
          },
        };
      });
      toast.success('Itinerary deleted successfully');
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete itinerary');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group border border-border rounded-xl overflow-hidden shadow-brand hover:shadow-brand-lg transition-all duration-300 hover:-translate-y-1 bg-card">
      <Link href={`/itineraries/${itinerary.id}`}>
        <div className="relative h-36 overflow-hidden cursor-pointer">
          {photo ? (
            <img
              src={photo}
              alt={itinerary.destination || 'Destination'}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className={cn('h-full bg-gradient-to-br', gradient)} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <span
            className={cn(
              'absolute top-3 right-3 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm',
              status.className
            )}
          >
            {status.label}
          </span>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-semibold text-white leading-tight line-clamp-1">
              {itinerary.title}
            </h3>
            <div className="flex items-center gap-2 text-white/70 text-xs mt-1">
              <MapPin className="h-3 w-3" />
              <span>{itinerary.destination || 'No destination'}</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-4">
        {itinerary.tripId && (
          <div className="mb-2">
            <TripIdBadge tripId={itinerary.tripId} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
          {days > 0 && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {days} {days === 1 ? 'day' : 'days'}
            </span>
          )}
          {itinerary.tripType && (
            <span className="flex items-center gap-1 bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium border border-accent/20">
              <Plane className="h-3 w-3" />
              {itinerary.tripType}
            </span>
          )}
          {itinerary.totalTravelers && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {itinerary.totalTravelers} {itinerary.totalTravelers === 1 ? 'traveler' : 'travelers'}
            </span>
          )}
          {itinerary.budget && (
            <span className="flex items-center gap-1 text-success font-medium">
              ₹{itinerary.budget}
            </span>
          )}
          {itinerary.lead?.name && (
            <span className="flex items-center gap-1 ml-auto">
              <Users className="h-3 w-3" />
              {itinerary.lead.name}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <FileText className="h-3 w-3" />v{itinerary.version || 1}
          </span>
        </div>

        {itinerary.daysJson && itinerary.daysJson.length > 0 && (
          <div className="space-y-1.5">
            {itinerary.daysJson.slice(0, 2).map((day: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-semibold text-primary">
                    {day.dayNumber || i + 1}
                  </span>
                </span>
                <span className="text-muted-foreground truncate flex-1">
                  {day.title || `Day ${i + 1}`}
                </span>
              </div>
            ))}
            {itinerary.daysJson.length > 2 && (
              <p className="text-[10px] text-muted-foreground text-center pl-8">
                +{itinerary.daysJson.length - 2} more days
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            {itinerary.createdAt ? format(new Date(itinerary.createdAt), 'MMM d, yyyy') : ''}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={`/itineraries/${itinerary.id}`}>
                <Eye className="h-3 w-3" />
              </Link>
            </Button>
            {itinerary.sharedVia && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <Send className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Itinerary
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{' '}
              <strong className="text-foreground">&quot;{itinerary.title}&quot;</strong>? This
              action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
