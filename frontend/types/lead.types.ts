import type { UserRole } from './user.types';

// Lead Status types
export type LeadStatus =
  | 'NEW'
  | 'FRESH'
  | 'FOLLOWUP'
  | 'HOT'
  | 'WARM'
  | 'NOT_ANSWERING'
  | 'WON'
  | 'NOT_INTERESTED'
  | 'JUNK'
  | 'SENT_VOICEMAIL'
  | 'CALL_DECLINED'
  | 'CALL_BACK_SCHEDULED'
  | 'CONNECTED'
  | 'CLOSED'
  | 'QUOTE_SENT';

export const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: 'New',
  FRESH: 'Fresh',
  FOLLOWUP: 'Follow Up',
  HOT: 'Hot',
  WARM: 'Warm',
  NOT_ANSWERING: 'Not Answering',
  WON: 'Won',
  NOT_INTERESTED: 'Not Interested',
  JUNK: 'Junk',
  SENT_VOICEMAIL: 'Sent Voicemail',
  CALL_DECLINED: 'Call Declined',
  CALL_BACK_SCHEDULED: 'Callback Scheduled',
  CONNECTED: 'Connected',
  CLOSED: 'Closed',
  QUOTE_SENT: 'Quote Sent',
};

export const leadStatusColors: Record<LeadStatus, string> = {
  NEW: 'new',
  FRESH: 'new',
  FOLLOWUP: 'contacted',
  HOT: 'proposal',
  WARM: 'qualified',
  NOT_ANSWERING: 'secondary',
  WON: 'default',
  NOT_INTERESTED: 'secondary',
  JUNK: 'outline',
  SENT_VOICEMAIL: 'secondary',
  CALL_DECLINED: 'destructive',
  CALL_BACK_SCHEDULED: 'contacted',
  CONNECTED: 'qualified',
  CLOSED: 'outline',
  QUOTE_SENT: 'proposal',
};

// Lead Source types
export type LeadSource =
  | 'WEBSITE'
  | 'WHATSAPP'
  | 'WALKIN'
  | 'SOCIAL'
  | 'BULK_IMPORT'
  | 'META_ADS'
  | 'GOOGLE_ADS'
  // Legacy ad leads from before Meta / Google were split
  | 'AD_CAMPAIGN';

// Lead Qualification types
export type LeadQualification = 'HOT' | 'WARM' | 'COLD';

export const leadQualificationLabels: Record<LeadQualification, string> = {
  HOT: 'Hot Lead',
  WARM: 'Warm Lead',
  COLD: 'Cold Lead',
};

export const leadQualificationColors: Record<LeadQualification, string> = {
  HOT: 'destructive',
  WARM: 'default',
  COLD: 'secondary',
};

// Lead Assignee
export interface LeadAssignee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Lead Interface
export interface Lead {
  id: string;
  branchId: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  score?: number;
  qualification?: string | null;
  assignedTo: string | null;
  assignedToUser?: LeadAssignee | null;
  assignee?: LeadAssignee | null;
  creator?: LeadAssignee | null;
  createdBy?: string | null;
  createdByUser?: LeadAssignee | null;
  branch?: { id: string; name: string; country?: string };
  notes?: string | null;
  destination?: string | null;
  travelDateFrom?: string | null;
  travelDateTo?: string | null;
  travelMonth?: string | null;
  numberOfPax?: string;
  budget?: number | null;
  tripType?: string | null;
  hotelCategory?: string | null;
  pickupPoint?: string | null;
  childrenCount?: number;
  priority?: string | null;
  createdAt: string;
  updatedAt: string;
  // Related data included in some queries
  itineraries?: Array<{
    id: string;
    destination?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    status?: string | null;
  }>;
  _count?: {
    followUps?: number;
    itineraries?: number;
  };
}

// Lead Filters
export interface LeadFilters {
  status?: LeadStatus | 'ALL';
  source?: LeadSource | 'ALL';
  assignedToId?: string;
  branchId?: string;
  search?: string;
  /** Created-date range, YYYY-MM-DD (inclusive). */
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// Activity types
export type ActivityType =
  | 'NOTE'
  | 'CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'STATUS_CHANGE'
  | 'ASSIGNMENT'
  | 'TRANSFER'
  | 'SENT_VOICEMAIL'
  | 'CALL_DECLINED'
  | 'CALL_BACK_SCHEDULED'
  | 'CALL_CONNECTED'
  | 'VISIT'
  | 'MEETING';

export const activityTypeLabels: Record<ActivityType, string> = {
  NOTE: 'Note',
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  STATUS_CHANGE: 'Status Change',
  ASSIGNMENT: 'Assignment',
  TRANSFER: 'Transfer',
  SENT_VOICEMAIL: 'Sent Voicemail',
  CALL_DECLINED: 'Call Declined',
  CALL_BACK_SCHEDULED: 'Callback Scheduled',
  CALL_CONNECTED: 'Call Connected',
  VISIT: 'Visit',
  MEETING: 'Meeting',
};

// Alias for backward compatibility
export type Activity = LeadActivity;

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  type: ActivityType;
  description: string;
  createdAt: string;
  user?: { id: string; name: string };
}

// Lead Tags
export interface LeadTag {
  id: string;
  branchId: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: {
    leadToTags: number;
  };
}

// Duplicate Lead
export interface DuplicateLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: LeadStatus;
  branch?: { name: string };
  assignee?: { name: string };
  duplicates?: DuplicateLead[];
  duplicateLead?: { id: string; name: string; phone: string };
}
