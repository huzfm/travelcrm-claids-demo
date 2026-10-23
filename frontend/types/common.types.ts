import type { UserRole } from './user.types';
import type { LeadSource } from './lead.types';

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Audit types
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'MERGE';
export type AuditEntity =
  | 'LEAD'
  | 'FOLLOWUP'
  | 'USER'
  | 'BRANCH'
  | 'ITINERARY'
  | 'WHATSAPP'
  | 'HOTEL';

export interface AuditLog {
  id: string;
  branchId: string | null;
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: UserRole };
  branch?: { id: string; name: string };
}

// Assignment Rule
export interface AssignmentRule {
  id: string;
  branchId: string;
  userId: string;
  source: LeadSource;
  priority: number;
  isActive: boolean;
  lastAssignedAt?: string | null;
  createdAt: string;
}
