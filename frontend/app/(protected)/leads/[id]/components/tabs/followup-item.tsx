'use client';

import { format } from 'date-fns';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FollowUpItemProps {
  followUp: {
    id: string;
    type: string;
    status: string;
    outcome?: string;
    feedback?: string | null;
    notes?: string | null;
    scheduledAt?: string;
    assignedToUser?: { name: string };
    assignee?: { name: string };
  };
  canEdit: boolean;
  isEditing: boolean;
  editOutcome: string;
  editFeedback: string;
  onMarkDone: (id: string) => void;
  onSaveDone: (id: string) => void;
  onCancelEdit: () => void;
  onOutcomeChange: (v: string) => void;
  onFeedbackChange: (v: string) => void;
}

const OUTCOMES = [
  'CONNECTED',
  'VOICEMAIL',
  'CALL_DECLINED',
  'NO_ANSWER',
  'SCHEDULED_CALLBACK',
  'NOT_INTERESTED',
  'WON',
  'LOST',
];

export function FollowUpItem({
  followUp: fu,
  canEdit,
  isEditing,
  editOutcome,
  editFeedback,
  onMarkDone,
  onSaveDone,
  onCancelEdit,
  onOutcomeChange,
  onFeedbackChange,
}: FollowUpItemProps) {
  const getStatusBadgeVariant = (status: string) => {
    if (status === 'DONE') return 'default';
    if (status === 'OVERDUE') return 'destructive';
    if (status === 'CANCELLED') return 'outline';
    return 'secondary';
  };

  return (
    <div className="p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex justify-between items-start mb-1.5 sm:mb-2 gap-1">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            {fu.type.replace(/_/g, ' ')}
          </Badge>
          {fu.outcome && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {fu.outcome.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
        <Badge
          variant={getStatusBadgeVariant(fu.status)}
          className="text-[10px] sm:text-xs shrink-0"
        >
          {fu.status}
        </Badge>
      </div>
      <p className="text-xs sm:text-sm font-medium">
        {fu.scheduledAt ? format(new Date(fu.scheduledAt), 'MMM d') : 'No date'}
      </p>
      <p className="text-[10px] sm:text-xs text-muted-foreground">
        {fu.scheduledAt ? format(new Date(fu.scheduledAt), 'h:mm a') : ''}
      </p>
      {fu.notes && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{fu.notes}</p>}
      {fu.feedback && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Feedback: {fu.feedback}</p>
      )}
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
        <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 inline mr-0.5 sm:mr-1" />
        {fu.assignedToUser?.name || fu.assignee?.name || 'Unassigned'}
      </p>

      {isEditing ? (
        <div className="mt-2 sm:mt-3 space-y-2 border-t pt-2 sm:pt-3">
          <div>
            <label className="text-[10px] sm:text-xs text-muted-foreground">Outcome</label>
            <Select value={editOutcome} onValueChange={onOutcomeChange}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map(o => (
                  <SelectItem key={o} value={o}>
                    {o.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] sm:text-xs text-muted-foreground">Feedback</label>
            <Textarea
              value={editFeedback}
              onChange={e => onFeedbackChange(e.target.value)}
              placeholder="..."
              className="text-xs"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => onSaveDone(fu.id)}
              className="flex-1 text-xs"
            >
              Done
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelEdit} className="flex-1 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        canEdit &&
        fu.status !== 'DONE' && (
          <div className="mt-2 sm:mt-3 flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => onMarkDone(fu.id)}
              className="flex-1 text-[10px] sm:text-xs"
            >
              Done
            </Button>
          </div>
        )
      )}
    </div>
  );
}
