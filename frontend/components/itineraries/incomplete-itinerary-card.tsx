'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ArrowRight, Clock, Loader2, MapPin, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WIZARD_STEP_LABELS } from '@/app/(protected)/itineraries/new/components/WizardProgress';
import { useDeleteItineraryDraft, type ItineraryDraftSummary } from '@/hooks/use-itinerary-drafts';

/**
 * An itinerary someone started and left before saving. Continue reopens the
 * builder on the step they were on, with everything they had filled in.
 */
export function IncompleteItineraryCard({ draft }: { draft: ItineraryDraftSummary }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteDraft = useDeleteItineraryDraft();

  const step = Math.min(Math.max(draft.step || 1, 1), WIZARD_STEP_LABELS.length);
  const stepLabel = WIZARD_STEP_LABELS[step - 1];
  const progress = Math.round(((step - 1) / WIZARD_STEP_LABELS.length) * 100);
  const client = draft.clientName || draft.lead?.name;

  const handleDelete = async () => {
    try {
      await deleteDraft.mutateAsync(draft.id);
      toast.success('Incomplete itinerary deleted');
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete incomplete itinerary');
    }
  };

  return (
    <div className="group flex flex-col rounded-xl border border-dashed border-amber-300 bg-card p-4 shadow-brand transition-all duration-300 hover:-translate-y-1 hover:shadow-brand-lg dark:border-amber-700/60">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 font-semibold leading-tight text-foreground">
            {draft.title}
          </h3>
          {draft.destination && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{draft.destination}</span>
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-400">
          Incomplete
        </span>
      </div>

      {/* Where they stopped */}
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground">
            Stopped at <span className="font-medium text-foreground">{stepLabel}</span>
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">Step {step} of 10</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {client && (
          <span className="flex min-w-0 items-center gap-1">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{client}</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {formatDistanceToNow(new Date(draft.updatedAt), { addSuffix: true })}
        </span>
        {draft.creator?.name && <span className="truncate">by {draft.creator.name}</span>}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => setShowDeleteDialog(true)}
          aria-label="Delete incomplete itinerary"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" className="h-8" asChild>
          <Link href={`/itineraries/new?draft=${draft.id}`}>
            Continue
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Incomplete Itinerary
            </DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-muted-foreground">
            Delete <strong className="text-foreground">&quot;{draft.title}&quot;</strong>?
            Everything filled in so far will be lost. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDraft.isPending}>
              {deleteDraft.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
