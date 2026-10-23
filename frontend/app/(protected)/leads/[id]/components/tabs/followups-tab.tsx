'use client';

import { Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateFollowUpForm } from './create-followup-form';
import { FollowUpItem } from './followup-item';

interface FollowUp {
  id: string;
  type: string;
  status: string;
  outcome?: string;
  feedback?: string | null;
  notes?: string | null;
  scheduledAt?: string;
  assignedTo?: string;
  assignedToUser?: { name: string };
}

interface FollowupsTabProps {
  followUps: FollowUp[];
  users: Array<{ id: string; name: string; role?: string }>;
  canAssign: boolean;
  canManage: boolean;
  isStaff: boolean;
  currentUserId?: string;
  showForm: boolean;
  newType: string;
  newDate: string;
  newNotes: string;
  newAssignee: string;
  editingId: string | null;
  editOutcome: string;
  editFeedback: string;
  onToggleForm: () => void;
  onTypeChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onAssigneeChange: (v: string) => void;
  onCreate: () => void;
  onMarkDone: (id: string) => void;
  onSaveDone: (id: string) => void;
  onCancelEdit: () => void;
  onOutcomeChange: (v: string) => void;
  onFeedbackChange: (v: string) => void;
  isCreating: boolean;
}

export function FollowupsTab({
  followUps,
  users,
  canAssign,
  canManage,
  isStaff,
  currentUserId,
  showForm,
  newType,
  newDate,
  newNotes,
  newAssignee,
  editingId,
  editOutcome,
  editFeedback,
  onToggleForm,
  onTypeChange,
  onDateChange,
  onNotesChange,
  onAssigneeChange,
  onCreate,
  onMarkDone,
  onSaveDone,
  onCancelEdit,
  onOutcomeChange,
  onFeedbackChange,
  isCreating,
}: FollowupsTabProps) {
  return (
    <Card className="border-l-4 border-l-red-500 overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="hidden sm:inline">Follow-ups</span>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {followUps.length}
            </Badge>
          </CardTitle>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={onToggleForm}
              className="text-[10px] sm:text-xs px-2 sm:px-3 shrink-0"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-4">
        {showForm && (
          <CreateFollowUpForm
            canAssign={canAssign}
            currentUserId={currentUserId}
            newType={newType}
            newDate={newDate}
            newNotes={newNotes}
            newAssignee={newAssignee}
            users={users}
            onTypeChange={onTypeChange}
            onDateChange={onDateChange}
            onNotesChange={onNotesChange}
            onAssigneeChange={onAssigneeChange}
            onCreate={onCreate}
            onCancel={onToggleForm}
            isCreating={isCreating}
          />
        )}

        <div className="space-y-2 sm:space-y-3">
          {followUps.length === 0 && (
            <p className="text-muted-foreground text-center py-6 sm:py-8 text-xs sm:text-sm">
              No follow-ups scheduled
            </p>
          )}
          {followUps.map(fu => {
            const canEdit = canManage || (isStaff && fu.assignedTo === currentUserId);
            const isEditing = editingId === fu.id;

            return (
              <FollowUpItem
                key={fu.id}
                followUp={fu}
                canEdit={canEdit}
                isEditing={isEditing}
                editOutcome={editOutcome}
                editFeedback={editFeedback}
                onMarkDone={onMarkDone}
                onSaveDone={onSaveDone}
                onCancelEdit={onCancelEdit}
                onOutcomeChange={onOutcomeChange}
                onFeedbackChange={onFeedbackChange}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
