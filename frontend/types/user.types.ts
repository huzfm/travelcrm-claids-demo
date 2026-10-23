// User types
/**
 * RESERVATION_MANAGER is the central reservations desk: scoped like STAFF on
 * the server, but by default sees every branch's itineraries, trips and payments.
 */
export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'RESERVATION_MANAGER';

export interface User {
  id: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
    country?: string;
    currency?: string;
    companyName?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  name: string;
  email: string;
  phone?: string | null;
  /** Profile photo URL. Null/absent means the UI falls back to initials. */
  avatarUrl?: string | null;
  password?: string; // only returned for admin viewing
  role: UserRole;
  /** Feature keys this user may reach. null/undefined for ADMIN, who holds all. */
  permissions?: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Branch types
export interface Branch {
  id: string;
  name: string;
  country: string;
  timezone: string;
  isMain?: boolean; // Marks the main branch for pricing logic
  whatsappNumber: string | null;
  isActive: boolean;
  currency?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  companyName?: string | null;
  contactPerson?: string | null;
  instagram?: string | null;
  workingHours?: WorkingHours[] | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    leads: number;
  };
}

export interface WorkingHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}
