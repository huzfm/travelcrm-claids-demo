'use client';

import { Copy, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (v: string) => void;
  daysCount: number;
  activitiesCount: number;
  destination: string;
  onSave: () => void;
  isPending: boolean;
}

export function TemplateDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  daysCount,
  activitiesCount,
  destination,
  onSave,
  isPending,
}: TemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Save this itinerary as a template to reuse for future trips. All activities, days, and
            details will be saved.
          </p>
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={e => onNameChange(e.target.value)}
              placeholder="e.g., Dubai 5-Day Adventure"
            />
          </div>
          {daysCount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium mb-2">Template will include:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {daysCount} day(s)</li>
                <li>• {activitiesCount} activities</li>
                <li>• Destination: {destination}</li>
                <li>• Inclusions & exclusions</li>
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" /> Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
