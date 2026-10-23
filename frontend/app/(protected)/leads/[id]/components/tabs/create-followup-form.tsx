'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roleLabel } from '@/lib/permissions';

interface CreateFollowUpFormProps {
  canAssign: boolean;
  currentUserId?: string;
  newType: string;
  newDate: string;
  newNotes: string;
  newAssignee: string;
  users: Array<{ id: string; name: string; role?: string }>;
  onTypeChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onAssigneeChange: (v: string) => void;
  onCreate: () => void;
  onCancel: () => void;
  isCreating: boolean;
}

const FOLLOWUP_TYPES = ['CALL', 'MEETING', 'VISIT', 'EMAIL', 'WHATSAPP', 'VIDEO_CALL', 'OTHER'];

export function CreateFollowUpForm({
  canAssign,
  currentUserId,
  newType,
  newDate,
  newNotes,
  newAssignee,
  users,
  onTypeChange,
  onDateChange,
  onNotesChange,
  onAssigneeChange,
  onCreate,
  onCancel,
  isCreating,
}: CreateFollowUpFormProps) {
  return (
    <div className="mb-3 sm:mb-4 p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2 sm:space-y-3">
      <p className="text-xs sm:text-sm font-medium">Schedule Follow-up</p>
      {canAssign && (
        <Select value={newAssignee || currentUserId || ''} onValueChange={onAssigneeChange}>
          <SelectTrigger className="w-full h-9 text-xs">
            <SelectValue placeholder="Assign to..." />
          </SelectTrigger>
          <SelectContent>
            {users.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
                {currentUserId && ` (${roleLabel(u.role)})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={newType} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FOLLOWUP_TYPES.map(t => (
            <SelectItem key={t} value={t}>
              {t.replace(/_/g, ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="datetime-local"
        value={newDate}
        onChange={e => onDateChange(e.target.value)}
        className="text-xs"
      />
      <Textarea
        placeholder="Notes (optional)"
        value={newNotes}
        onChange={e => onNotesChange(e.target.value)}
        className="text-xs"
        rows={2}
      />
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} className="text-xs">
          Cancel
        </Button>
        <Button size="sm" onClick={onCreate} disabled={!newDate || isCreating} className="text-xs">
          {isCreating ? 'Scheduling...' : 'Schedule'}
        </Button>
      </div>
    </div>
  );
}
