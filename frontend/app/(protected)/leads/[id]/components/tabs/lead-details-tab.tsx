'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Phone, Mail } from 'lucide-react';
import {
  InfoField,
  BadgeField,
  SelectField,
  ScoreField,
  StatusField,
  AssignmentField,
  BranchField,
} from '../lead-info-components';
import type { Lead, LeadStatus, LeadSource, LeadQualification } from '@/types';

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Website',
  WHATSAPP: 'WhatsApp',
  WALKIN: 'Walk-in',
  SOCIAL: 'Social Media',
  BULK_IMPORT: 'Bulk Import',
  META_ADS: 'Meta Ads',
  GOOGLE_ADS: 'Google Ads',
  AD_CAMPAIGN: 'Ads (platform unknown)',
};

const LEAD_STATUSES = [
  'FRESH',
  'QUOTE_SENT',
  'FOLLOWUP',
  'HOT',
  'WARM',
  'NOT_ANSWERING',
  'WON',
  'NOT_INTERESTED',
  'JUNK',
  'SENT_VOICEMAIL',
  'CALL_DECLINED',
  'CALL_BACK_SCHEDULED',
  'CONNECTED',
  'CLOSED',
];

const LEAD_SOURCES = [
  'WEBSITE',
  'WHATSAPP',
  'WALKIN',
  'SOCIAL',
  'META_ADS',
  'GOOGLE_ADS',
  'BULK_IMPORT',
];

interface LeadDetailsTabProps {
  lead: Lead;
  isEditing: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isLeadOwner: boolean;
  users: Array<{ id: string; name: string; role?: string }>;
  branches: Array<{ id: string; name: string }>;
  onStatusChange: (status: LeadStatus) => void;
  onAssign: (userId: string) => void;
  onBranchChange: (branchId: string) => void;
  onSourceChange: (source: LeadSource) => void;
  onQualificationChange?: (qualification: LeadQualification) => void;
}

export function LeadDetailsTab({
  lead,
  isAdmin,
  isManager,
  isStaff,
  isLeadOwner,
  users,
  branches,
  onStatusChange,
  onAssign,
  onBranchChange,
  onSourceChange,
  onQualificationChange,
}: LeadDetailsTabProps) {
  const canEditStatus = isAdmin || isManager || (isStaff && isLeadOwner);
  const canEditAssignment = isAdmin || isManager;
  const canEditBranch = isAdmin;
  const canEditQualification = isAdmin || isManager || (isStaff && isLeadOwner);

  return (
    <Card className="border-l-4 border-l-primary overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg">Lead Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {canEditBranch ? (
            <BranchField
              icon={Building2}
              label="Branch"
              value={lead.branchId}
              branches={branches}
              onChange={onBranchChange}
            />
          ) : (
            lead.branch && <InfoField icon={Building2} label="Branch" value={lead.branch.name} />
          )}
          <InfoField icon={Phone} label="Phone" value={lead.phone} className="font-mono" />
          <InfoField icon={Mail} label="Email" value={lead.email || '-'} />
          {isAdmin && (
            <SelectField
              icon={Phone}
              label="Source"
              value={lead.source}
              onChange={onSourceChange}
              options={LEAD_SOURCES}
              labelMap={SOURCE_LABELS}
            />
          )}
          {(isAdmin || isManager) && lead.destination && (
            <InfoField icon={MapPin} label="Destination" value={lead.destination} />
          )}
          {(lead.travelDateFrom || lead.travelDateTo) && (
            <InfoField
              icon={Phone}
              label="Travel Dates"
              value={
                lead.travelDateFrom
                  ? `${format(new Date(lead.travelDateFrom), 'MMM d')}${lead.travelDateTo ? ` - ${format(new Date(lead.travelDateTo), 'MMM d, yyyy')}` : ''}`
                  : '-'
              }
            />
          )}
          {lead.numberOfPax && <InfoField icon={Phone} label="Persons" value={lead.numberOfPax} />}
          {(isAdmin || isManager) && lead.budget != null && lead.budget > 0 && (
            <InfoField icon={Phone} label="Budget" value={`₹${lead.budget.toLocaleString()}`} />
          )}
          {(isAdmin || isManager) && lead.tripType && (
            <BadgeField icon={Phone} label="Trip Type" value={lead.tripType} variant="outline" />
          )}
          {(isAdmin || isManager) && lead.hotelCategory && (
            <BadgeField icon={Phone} label="Hotel" value={lead.hotelCategory} variant="outline" />
          )}
          {(isAdmin || isManager) && lead.priority && (
            <BadgeField
              icon={Phone}
              label="Priority"
              value={lead.priority}
              variant={
                lead.priority === 'URGENT'
                  ? 'destructive'
                  : lead.priority === 'HIGH'
                    ? 'default'
                    : 'secondary'
              }
            />
          )}
          <ScoreField
            lead={lead}
            canEdit={canEditQualification}
            onQualificationChange={onQualificationChange}
          />
          <StatusField
            lead={lead}
            canEdit={canEditStatus}
            onChange={onStatusChange}
            statuses={LEAD_STATUSES}
          />
          <AssignmentField
            lead={lead}
            canEdit={canEditAssignment}
            users={users}
            onChange={onAssign}
          />
        </div>

        {lead.notes && (
          <div className="p-2 sm:p-3 bg-muted/50 rounded-lg">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-xs sm:text-sm">{lead.notes}</p>
          </div>
        )}

        {isAdmin && (lead.creator || lead.createdBy) && (
          <div className="text-[10px] sm:text-xs text-muted-foreground border-t pt-3">
            <span>Created by {lead.creator?.name || 'Unknown'}</span>
            {lead.createdAt && (
              <span className="hidden sm:inline"> • {format(new Date(lead.createdAt), 'PPp')}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
