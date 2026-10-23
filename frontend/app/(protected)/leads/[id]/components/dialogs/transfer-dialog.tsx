'use client';

import { ArrowRightLeft, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  reason: string;
  onUserIdChange: (v: string) => void;
  onReasonChange: (v: string) => void;
  onTransfer: () => void;
  isPending: boolean;
  branchStaff?: unknown[];
  currentAssigneeId?: string | null;
  currentUserId?: string;
}

export function TransferDialog({
  open,
  onOpenChange,
  userId,
  reason,
  onUserIdChange,
  onReasonChange,
  onTransfer,
  isPending,
  branchStaff,
  currentAssigneeId,
  currentUserId,
}: TransferDialogProps) {
  const staffArray = Array.isArray(branchStaff)
    ? (branchStaff as Array<{ id: string; name: string; isActive?: boolean; role?: string }>)
    : [];

  // Deactivated users are hidden from the CRM until reactivated.
  const transferrableUsers = staffArray.filter(
    u =>
      u.id !== currentUserId &&
      u.id !== currentAssigneeId &&
      u.isActive !== false &&
      u.role !== 'ADMIN'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transfer Lead
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="transferTo">Transfer to</Label>
            {branchStaff === undefined ? (
              <p className="text-sm text-muted-foreground py-2">Loading staff list...</p>
            ) : staffArray.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No staff available in this branch
              </p>
            ) : transferrableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No other staff available (only you in this branch)
              </p>
            ) : (
              <Select value={userId} onValueChange={onUserIdChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {transferrableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="transferReason">Reason (optional)</Label>
            <Textarea
              id="transferReason"
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
              placeholder="e.g., On leave, too busy, etc."
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onUserIdChange('');
              onReasonChange('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={onTransfer} disabled={!userId || isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRightLeft className="h-4 w-4 mr-2" />
            )}
            Transfer Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
