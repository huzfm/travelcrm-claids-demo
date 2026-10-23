import type { UserRole } from './user.types';

// Follow-up types
export type FollowUpStatus = 'PENDING' | 'DONE' | 'OVERDUE' | 'RESCHEDULED' | 'CANCELLED';
export type FollowUpType =
  | 'CALL'
  | 'MEETING'
  | 'VISIT'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'VIDEO_CALL'
  | 'OTHER';
export type FollowUpOutcome =
  | 'CONNECTED'
  | 'VOICEMAIL'
  | 'CALL_DECLINED'
  | 'NO_ANSWER'
  | 'SCHEDULED_CALLBACK'
  | 'NOT_INTERESTED'
  | 'WON'
  | 'LOST';

export const followUpTypeLabels: Record<FollowUpType, string> = {
  CALL: 'Phone Call',
  MEETING: 'Meeting',
  VISIT: 'Visit',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  VIDEO_CALL: 'Video Call',
  OTHER: 'Other',
};

export const followUpOutcomeLabels: Record<FollowUpOutcome, string> = {
  CONNECTED: 'Connected',
  VOICEMAIL: 'Left Voicemail',
  CALL_DECLINED: 'Call Declined',
  NO_ANSWER: 'No Answer',
  SCHEDULED_CALLBACK: 'Callback Scheduled',
  NOT_INTERESTED: 'Not Interested',
  WON: 'Won',
  LOST: 'Lost',
};

export interface FollowUpAssignee {
  id: string;
  name: string;
  role?: UserRole;
}

export interface FollowUp {
  id: string;
  leadId: string;
  lead?: { id: string; name: string; phone?: string; email?: string };
  assignedTo: string;
  assignedToUser?: FollowUpAssignee;
  assignee?: FollowUpAssignee;
  createdBy: string;
  creator?: { id: string; name: string };
  type: FollowUpType;
  scheduledAt: string;
  completedAt: string | null;
  status: FollowUpStatus;
  outcome?: FollowUpOutcome;
  notes: string | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpDashboard {
  today: FollowUp[];
  overdue: FollowUp[];
  upcoming: FollowUp[];
  total: { pending: number; done: number; overdue: number };
}

// Calendar Event
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: FollowUpType;
  status: FollowUpStatus;
  lead: { id: string; name: string; phone: string };
  assignee: { id: string; name: string };
  notes: string | null;
}
