'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Phone, MoreHorizontal, Clock, Sparkles } from 'lucide-react';

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  dotColor: string;
  leads: KanbanLead[];
}

export interface KanbanLead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source?: string;
  budget?: string;
  status: string;
  assignee?: string;
  assigneeInitials?: string;
  daysSinceUpdate?: number;
  score?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  lastContact?: string;
  destination?: string;
  onClick?: () => void;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onAddLead?: (columnId: string) => void;
  className?: string;
  showSource?: boolean;
}

const columnConfig: Record<
  string,
  { bg: string; border: string; badge: string; icon: string; headerBg: string }
> = {
  NEW: {
    bg: 'bg-stage-fresh/10',
    border: 'border-stage-fresh/20',
    badge: 'bg-stage-fresh/20 text-stage-fresh',
    icon: 'text-stage-fresh',
    headerBg: 'bg-stage-fresh/10',
  },
  FRESH: {
    bg: 'bg-stage-fresh/10',
    border: 'border-stage-fresh/20',
    badge: 'bg-stage-fresh/20 text-stage-fresh',
    icon: 'text-stage-fresh',
    headerBg: 'bg-stage-fresh/10',
  },
  FOLLOWUP: {
    bg: 'bg-stage-followup/10',
    border: 'border-stage-followup/20',
    badge: 'bg-stage-followup/20 text-stage-followup',
    icon: 'text-stage-followup',
    headerBg: 'bg-stage-followup/10',
  },
  HOT: {
    bg: 'bg-stage-hot/10',
    border: 'border-stage-hot/20',
    badge: 'bg-stage-hot/20 text-stage-hot',
    icon: 'text-stage-hot',
    headerBg: 'bg-stage-hot/10',
  },
  WARM: {
    bg: 'bg-stage-warm/10',
    border: 'border-stage-warm/20',
    badge: 'bg-stage-warm/20 text-stage-warm',
    icon: 'text-stage-warm',
    headerBg: 'bg-stage-warm/10',
  },
  WON: {
    bg: 'bg-stage-won/10',
    border: 'border-stage-won/20',
    badge: 'bg-stage-won/20 text-stage-won',
    icon: 'text-stage-won',
    headerBg: 'bg-stage-won/10',
  },
  NOT_INTERESTED: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    badge: 'bg-destructive/20 text-destructive',
    icon: 'text-destructive',
    headerBg: 'bg-destructive/10',
  },
  JUNK: {
    bg: 'bg-muted/10',
    border: 'border-muted/20',
    badge: 'bg-muted/20 text-muted-foreground',
    icon: 'text-muted-foreground',
    headerBg: 'bg-muted/10',
  },
};

const priorityDot = {
  low: 'bg-text-muted',
  medium: 'bg-status-new',
  high: 'bg-status-qualified',
  urgent: 'bg-destructive animate-pulse',
};

const KanbanLeadCard = React.memo(function KanbanLeadCard({
  lead,
  onClick,
  showSource,
}: {
  lead: KanbanLead;
  onClick?: () => void;
  showSource?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className="group rounded-xl border border-border bg-card p-4 shadow-brand hover:shadow-brand-lg hover:border-accent/50 transition-all duration-200 cursor-pointer"
    >
      {/* Header: Priority + Name */}
      <div className="flex items-start gap-2 mb-3">
        <div
          className={cn(
            'mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-transparent group-hover:ring-accent/30 transition-all',
            priorityDot[lead.priority || 'medium']
          )}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors truncate">
            {lead.name}
          </h4>
          {lead.destination && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              {lead.destination}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        >
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Contact Info */}
      <div className="space-y-1.5 mb-3">
        {lead.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 text-accent" />
            <span className="font-mono">{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
            <span className="text-accent">@</span>
            <span className="truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {showSource && lead.source && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-medium">
            {lead.source.replace(/_/g, ' ')}
          </Badge>
        )}
        {lead.budget && (
          <Badge className="text-[10px] px-1.5 py-0 h-4 font-semibold bg-gold/10 text-gold border-gold/20">
            ₹{lead.budget}
          </Badge>
        )}
        {lead.score !== undefined && lead.score > 0 && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 h-4 font-semibold border',
              lead.score >= 70
                ? 'bg-stage-won/20 text-stage-won border-stage-won/30'
                : lead.score >= 40
                  ? 'bg-warning/20 text-warning border-warning/30'
                  : 'bg-destructive/20 text-destructive border-destructive/30'
            )}
          >
            Score: {lead.score}
          </Badge>
        )}
      </div>

      {/* Footer: Assignee + Days */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
        {lead.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 ring-1 ring-accent/20">
              <AvatarFallback className="text-[9px] bg-accent/10 text-accent font-semibold">
                {lead.assigneeInitials || lead.assignee.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-20">{lead.assignee}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                --
              </AvatarFallback>
            </Avatar>
            <span>Unassigned</span>
          </div>
        )}
        {lead.daysSinceUpdate !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
              lead.daysSinceUpdate > 7
                ? 'bg-destructive/10 text-destructive'
                : lead.daysSinceUpdate > 3
                  ? 'bg-warning/10 text-warning'
                  : 'bg-stage-won/10 text-stage-won'
            )}
          >
            <Clock className="h-2.5 w-2.5" />
            {lead.daysSinceUpdate}d
          </div>
        )}
      </div>
    </div>
  );
});

export const KanbanBoard = React.memo(function KanbanBoard({
  columns,
  onAddLead,
  className,
  showSource,
}: KanbanBoardProps) {
  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4 -mx-2 px-2', className)}>
      {columns.map(column => {
        const config = columnConfig[column.id] || columnConfig.NEW;

        return (
          <div key={column.id} className="flex flex-col w-72 sm:w-80 shrink-0">
            {/* Column Header */}
            <div
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-t-lg border border-b-0',
                config.headerBg,
                config.border
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn('h-3 w-3 rounded-full', column.dotColor)} />
                <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
                <span
                  className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', config.badge)}
                >
                  {column.leads.length}
                </span>
              </div>
              {onAddLead && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-muted"
                  onClick={() => onAddLead(column.id)}
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>

            {/* Column Body */}
            <div
              className={cn(
                'flex-1 rounded-b-lg border border-t-0 p-2 min-h-48',
                config.bg,
                config.border
              )}
            >
              <div className="space-y-2.5">
                {column.leads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center bg-muted/30">
                    <div className={cn('mb-2 rounded-full p-2.5', config.bg)}>
                      <Plus className={cn('h-4 w-4', config.icon)} />
                    </div>
                    <p className="text-xs text-muted-foreground">No leads</p>
                    {onAddLead && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 h-7 text-xs border-dashed hover:bg-muted"
                        onClick={() => onAddLead(column.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Lead
                      </Button>
                    )}
                  </div>
                ) : (
                  column.leads.map(lead => (
                    <KanbanLeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={lead.onClick}
                      showSource={showSource}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
