'use client';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Clock, User } from 'lucide-react';
import type { Lead, LeadStatus, LeadQualification } from '@/types';

const QUALIFICATION_OPTIONS: LeadQualification[] = ['HOT', 'WARM', 'COLD'];
const QUALIFICATION_LABELS: Record<LeadQualification, string> = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
};

// Simple info field
export function InfoField({ icon: Icon, label, value, className = '' }: any) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        <p className={`font-medium text-xs sm:text-sm truncate ${className}`}>{value}</p>
      </div>
    </div>
  );
}

// Field with badge display
export function BadgeField({ icon: Icon, label, value, variant }: any) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        <Badge variant={variant as any} className="text-[10px] sm:text-xs">
          {value}
        </Badge>
      </div>
    </div>
  );
}

// Dropdown select field
export function SelectField({ icon: Icon, label, value, onChange, options, labelMap }: any) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt: string) => (
              <SelectItem key={opt} value={opt}>
                {labelMap[opt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Score display field
export function ScoreField({
  lead,
  canEdit,
  onQualificationChange,
}: {
  lead: Lead;
  canEdit?: boolean;
  onQualificationChange?: (qualification: LeadQualification) => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
      <Star className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-[10px] sm:text-xs text-muted-foreground">Score</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="w-12 sm:w-16 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${lead.score || 0}%` }} />
          </div>
          <span className="text-xs sm:text-sm font-medium">{lead.score || 0}</span>
          {canEdit && onQualificationChange ? (
            <Select
              value={lead.qualification || ''}
              onValueChange={v => onQualificationChange(v as LeadQualification)}
            >
              <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent text-xs sm:text-sm">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {QUALIFICATION_OPTIONS.map(q => (
                  <SelectItem key={q} value={q}>
                    {QUALIFICATION_LABELS[q]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            lead.qualification && (
              <Badge
                variant={
                  lead.qualification === 'HOT'
                    ? 'destructive'
                    : lead.qualification === 'WARM'
                      ? 'default'
                      : 'secondary'
                }
                className="text-[10px] sm:text-xs"
              >
                {lead.qualification}
              </Badge>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Status field with edit capability
export function StatusField({
  lead,
  canEdit,
  onChange,
  statuses,
}: {
  lead: Lead;
  canEdit: boolean;
  onChange: (status: LeadStatus) => void;
  statuses: string[];
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] sm:text-xs text-muted-foreground">Status</p>
        {canEdit ? (
          <Select value={lead.status} onValueChange={v => onChange(v as LeadStatus)}>
            <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(s => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="font-medium text-xs sm:text-sm truncate block">
            {lead.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>
    </div>
  );
}

// Assignment field
export function AssignmentField({
  lead,
  canEdit,
  users,
  onChange,
}: {
  lead: Lead;
  canEdit: boolean;
  users: Array<{ id: string; name: string }>;
  onChange: (userId: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
      <User className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] sm:text-xs text-muted-foreground">Assigned To</p>
        {canEdit ? (
          <Select value={lead.assignedTo || ''} onValueChange={onChange}>
            <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent text-xs sm:text-sm">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="font-medium text-xs sm:text-sm truncate">
            {lead.assignee?.name || 'Unassigned'}
          </p>
        )}
      </div>
    </div>
  );
}

// Branch field with edit capability
export function BranchField({
  icon: Icon,
  label,
  value,
  branches,
  onChange,
}: {
  icon: any;
  label: string;
  value: string;
  branches: Array<{ id: string; name: string }>;
  onChange: (branchId: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent text-xs sm:text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {branches.map(b => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
