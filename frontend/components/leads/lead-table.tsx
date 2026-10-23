'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmptyState } from '@/components/layout/page-wrapper';
import { Phone, Calendar, ArrowRightLeft, Users } from 'lucide-react';
import { leadStatusLabels } from '@/types';
import type { Lead } from '@/types';

interface LeadTableProps {
  leads: Lead[];
  isLoading?: boolean;
  showBranch?: boolean;
  showAssigneeRole?: boolean;
  showSource?: boolean;
  /** Admin-only bulk-delete: renders a checkbox per row plus a select-all header checkbox. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

const sourceLabels: Record<string, string> = {
  WEBSITE: 'Website',
  WHATSAPP: 'WhatsApp',
  WALKIN: 'Walk-in',
  SOCIAL: 'Social',
  BULK_IMPORT: 'Bulk',
  META_ADS: 'Meta Ads',
  GOOGLE_ADS: 'Google Ads',
  AD_CAMPAIGN: 'Ads',
};

const statusBadgeColors: Record<string, string> = {
  FRESH: 'new',
  FOLLOWUP: 'contacted',
  HOT: 'qualified',
  WARM: 'proposal',
  WON: 'confirmed',
  QUOTE_SENT: 'proposal',
  LOST: 'lost',
  NOT_INTERESTED: 'lost',
  CLOSED: 'outline',
};

function getInitials(name: string | null | undefined) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function LeadCard({
  lead,
  showBranch,
  showSource,
  selectable,
  selected,
  onToggleSelect,
}: {
  lead: Lead;
  showBranch?: boolean;
  showSource?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const router = useRouter();
  const isTransferred = lead.creator && lead.assignee && lead.creator.id !== lead.assignee.id;
  const extras = [
    showSource ? sourceLabels[lead.source] || lead.source : null,
    showBranch ? lead.branch?.name : null,
  ].filter(Boolean);

  // A dense two-line row rather than a card, so a phone shows a scannable list:
  // name and transfer flag on top; owner and date underneath.
  return (
    <div
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted"
    >
      {selectable && (
        <input
          type="checkbox"
          checked={!!selected}
          onClick={e => e.stopPropagation()}
          onChange={() => onToggleSelect?.(lead.id)}
          className="h-4 w-4 shrink-0 accent-primary cursor-pointer rounded border-border"
          aria-label={`Select ${lead.name}`}
        />
      )}
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-brand-gradient text-xs text-primary-foreground">
          {getInitials(lead.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        {/* The full name always shows — a long one wraps rather than being cut. */}
        <div className="flex items-start gap-2">
          <span className="min-w-0 break-words text-sm font-semibold leading-snug text-foreground">
            {lead.name}
          </span>
          {isTransferred && (
            <span
              title={`Transferred from ${lead.creator?.name ?? 'another user'}`}
              className="mt-px inline-flex shrink-0 items-center gap-0.5 rounded-full border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-medium text-red-700"
            >
              <ArrowRightLeft className="h-2.5 w-2.5" />
              Transferred
            </span>
          )}
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">
            {lead.assignee?.name ?? 'Unassigned'}
            {extras.length > 0 && ` · ${extras.join(' · ')}`}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(lead.createdAt), 'MMM d')}
          </span>
        </div>
      </div>
    </div>
  );
}

export function LeadTable({
  leads,
  isLoading,
  showBranch,
  showSource,
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: LeadTableProps) {
  const router = useRouter();
  const allSelected = selectable && leads.length > 0 && leads.every(l => selectedIds?.has(l.id));
  if (isLoading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse-skeleton" />
        ))}
      </div>
    );

  if (!leads.length)
    return (
      <EmptyState
        title="No leads found"
        description="Get started by adding your first lead"
        icon={Users}
      />
    );

  return (
    <>
      <div className="lg:hidden divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {/* The desktop table has select-all in its header; phones need their own. */}
        {selectable && (
          <label className="flex cursor-pointer items-center gap-3 bg-primary-light/50 px-3 py-2 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={!!allSelected}
              onChange={() => onToggleSelectAll?.()}
              className="h-4 w-4 shrink-0 accent-primary cursor-pointer rounded border-border"
            />
            {allSelected ? 'Deselect all' : 'Select all'}
            {selectedIds && selectedIds.size > 0 && (
              <span className="ml-auto text-foreground">{selectedIds.size} selected</span>
            )}
          </label>
        )}
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            showBranch={showBranch}
            showSource={showSource}
            selectable={selectable}
            selected={selectedIds?.has(lead.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>

      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary-light/50">
              {selectable && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    onChange={() => onToggleSelectAll?.()}
                    className="h-4 w-4 accent-primary cursor-pointer rounded border-border"
                    aria-label="Select all leads"
                  />
                </TableHead>
              )}
              {showBranch && <TableHead className="whitespace-nowrap">Branch</TableHead>}
              <TableHead className="whitespace-nowrap">Name</TableHead>
              <TableHead className="whitespace-nowrap">Phone</TableHead>
              {showSource && <TableHead className="whitespace-nowrap">Source</TableHead>}
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Assigned To</TableHead>
              <TableHead className="whitespace-nowrap">Created</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {leads.map(lead => {
              const isTransferred =
                lead.creator && lead.assignee && lead.creator.id !== lead.assignee.id;
              return (
                <TableRow
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className="hover:bg-primary-light/20 cursor-pointer group"
                >
                  {selectable && (
                    <TableCell onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!selectedIds?.has(lead.id)}
                        onChange={() => onToggleSelect?.(lead.id)}
                        className="h-4 w-4 accent-primary cursor-pointer rounded border-border"
                        aria-label={`Select ${lead.name}`}
                      />
                    </TableCell>
                  )}
                  {showBranch && (
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {lead.branch?.name || '-'}
                    </TableCell>
                  )}

                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 shrink-0 ring-1 ring-transparent group-hover:ring-accent/30 transition-all">
                        <AvatarFallback className="text-xs bg-brand-gradient text-primary-foreground">
                          {getInitials(lead.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          {lead.name}
                          {isTransferred && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                              <ArrowRightLeft className="h-2.5 w-2.5" />
                              Transferred
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1 text-muted-foreground font-mono text-sm">
                      <Phone className="h-3 w-3 shrink-0" />
                      {lead.phone}
                    </div>
                  </TableCell>

                  {showSource && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">
                        {sourceLabels[lead.source] || lead.source}
                      </Badge>
                    </TableCell>
                  )}

                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant={
                        (statusBadgeColors[lead.status] as
                          | 'new'
                          | 'contacted'
                          | 'qualified'
                          | 'proposal'
                          | 'confirmed'
                          | 'lost'
                          | 'outline'
                          | 'destructive'
                          | 'secondary') || 'secondary'
                      }
                    >
                      {leadStatusLabels[lead.status]}
                    </Badge>
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    {lead.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                            {getInitials(lead.assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{lead.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 text-sm">Unassigned</span>
                    )}
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {format(new Date(lead.createdAt), 'MMM d')}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
