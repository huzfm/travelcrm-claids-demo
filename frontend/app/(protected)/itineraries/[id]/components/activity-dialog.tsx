'use client';

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
import { Textarea } from '@/components/ui/textarea';
import type { DayActivity } from '../hooks/use-itinerary-detail';

const CATEGORIES = [
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'FOOD', label: 'Dining' },
  { value: 'SHOPPING', label: 'Shopping' },
  { value: 'OTHER', label: 'Other' },
];

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: Partial<DayActivity>;
  onFormChange: (form: Partial<DayActivity>) => void;
  onSave: () => void;
  isEditing: boolean;
}

export function ActivityDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  isEditing,
}: ActivityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() =>
                  onFormChange({ ...form, category: cat.value as typeof form.category })
                }
                className={`py-2 px-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                  form.category === cat.value
                    ? 'bg-primary text-white border-primary'
                    : 'hover:bg-muted border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              placeholder="e.g., Desert Safari"
              value={form.title || ''}
              onChange={e => onFormChange({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input
                type="time"
                value={form.time || ''}
                onChange={e => onFormChange({ ...form, time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                placeholder="Venue"
                value={form.location || ''}
                onChange={e => onFormChange({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Input
                placeholder="e.g., 3 hours"
                value={form.duration || ''}
                onChange={e => onFormChange({ ...form, duration: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cost (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.cost || ''}
                onChange={e => onFormChange({ ...form, cost: Number(e.target.value) || undefined })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Details..."
              value={form.description || ''}
              onChange={e => onFormChange({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Booking Ref</Label>
              <Input
                placeholder="Confirmation #"
                value={form.bookingRef || ''}
                onChange={e => onFormChange({ ...form, bookingRef: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input
                placeholder="Phone/Email"
                value={form.contactNumber || ''}
                onChange={e => onFormChange({ ...form, contactNumber: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>{isEditing ? 'Update' : 'Add'} Activity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
