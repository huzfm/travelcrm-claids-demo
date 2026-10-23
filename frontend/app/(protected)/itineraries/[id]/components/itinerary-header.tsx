'use client';

import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Download,
  Loader2,
  MoreVertical,
  Pencil,
  Plane,
  Save,
  Send,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TripIdBadge } from '@/components/ui/trip-id-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ItineraryHeaderProps {
  title: string;
  tripId?: string | null;
  itineraryTitle: string;
  itineraryId?: string;
  /** Staff the trip's lead is assigned to; null = unassigned, undefined = no lead. */
  assignedTo?: string | null;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  isSaving: boolean;
  isGeneratingPdf?: boolean;
  isDeleting: boolean;
  onBack: () => void;
  onSave: () => void;
  onGeneratePdf: () => void;
  onShare: () => void;
  onSaveTemplate: () => void;
  onDelete: () => void;
}

const STATUS = {
  saved: { icon: CheckCircle2, text: 'All changes saved', className: 'text-success' },
  saving: { icon: Loader2, text: 'Saving…', className: 'text-muted-foreground' },
  unsaved: { icon: AlertCircle, text: 'Unsaved changes', className: 'text-warning' },
} as const;

/**
 * The page's title bar, and every action the page offers.
 *
 * Deliberately thin on trip facts: the destination, dates, duration and party
 * size are all in the trip summary directly below, and the client's name is
 * already part of the trip's title. Only the trip ID and the lead's assignee live here,
 * because nothing else on the page shows them.
 */
export function ItineraryHeader({
  title,
  tripId,
  itineraryTitle,
  itineraryId,
  assignedTo,
  saveStatus,
  isSaving,
  isGeneratingPdf = false,
  isDeleting,
  onBack,
  onSave,
  onGeneratePdf,
  onShare,
  onSaveTemplate,
  onDelete,
}: ItineraryHeaderProps) {
  const router = useRouter();

  const handleEditItinerary = () => {
    if (itineraryId) {
      router.push(`/itineraries/edit?itineraryId=${itineraryId}`);
    }
  };

  const heading = title || itineraryTitle || 'Untitled Trip';
  const status = STATUS[saveStatus];
  const StatusIcon = status.icon;

  return (
    <div className="-mx-4 mb-6 border-b bg-gradient-to-br from-primary/8 via-primary/3 to-transparent px-4 py-5 sm:-mt-6 lg:-mx-10 lg:-mt-5 lg:px-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {/* Identity */}
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Go back"
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="hidden shrink-0 rounded-2xl bg-primary/10 p-2.5 ring-1 ring-primary/15 sm:block">
            <Plane className="h-6 w-6 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{heading}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {tripId && <TripIdBadge tripId={tripId} />}
              {assignedTo !== undefined && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                  {assignedTo ? (
                    <>
                      Assigned to <span className="font-medium text-foreground">{assignedTo}</span>
                    </>
                  ) : (
                    'Unassigned lead'
                  )}
                </span>
              )}
              <span
                className={cn('inline-flex items-center gap-1.5 text-xs', status.className)}
                aria-live="polite"
              >
                <StatusIcon className={cn('h-3.5 w-3.5', saveStatus === 'saving' && 'animate-spin')} />
                {status.text}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving || saveStatus === 'saving'}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>

          <Button variant="outline" onClick={onShare} className="gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>

          <Button
            variant="outline"
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf}
            className="gap-2"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>

          {itineraryId && (
            <Button onClick={handleEditItinerary} className="gap-2">
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Itinerary</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onSaveTemplate} className="gap-2">
                <Bookmark className="h-4 w-4" />
                Save as Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                disabled={isDeleting}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting…' : 'Delete itinerary'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
