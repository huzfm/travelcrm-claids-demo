import type { LeadStatus, LeadSource } from './lead.types';
import type { User } from './user.types';

// Analytics types
export interface PipelineData {
  status: LeadStatus;
  count: number;
}

export interface SourceData {
  source: LeadSource;
  count: number;
}

export interface ConversionData {
  total: number;
  converted: number;
  rate: number;
}

export interface TeamPerformance {
  user: User;
  leads: number;
  followUps: number;
  bookings: number;
}

export interface AnalyticsData {
  pipeline: PipelineData[];
  sources: SourceData[];
  conversion: ConversionData;
  teamPerformance: TeamPerformance[];
  dateRange: { from: string; to: string };
}
