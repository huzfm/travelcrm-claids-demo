// Types for the operations dashboard: sales stats, follow-ups, payments due
// in/out, trip starts and ends, and trips running with money outstanding.

export type SalesPeriod = 'today' | 'week' | 'month';

export interface SalesStats {
  period: SalesPeriod;
  timezone: string;
  currency: string;
  from: string;
  to: string;
  /** Cash actually received in the period */
  revenue: number;
  leads: number;
  quotes: number;
  conversions: number;
  bookings: number;
  conversionRate: number;
}

export interface FollowUpBucket {
  count: number;
  cleared: boolean;
  /** Only on the today bucket: how many are still ahead of the clock. */
  remaining?: number;
}

export interface FollowUpSummary {
  timezone: string;
  /** Open follow-ups whose scheduled moment has already passed. */
  due: FollowUpBucket;
  today: FollowUpBucket;
  yesterday: FollowUpBucket;
  next7Days: FollowUpBucket;
  /** Carried over from before today; a subset of due. */
  overdue: number;
}

export interface TripTimings {
  timezone: string;
  starting: { today: number; yesterday: number; next7Days: number };
  ending: { today: number; tomorrow: number; prev7Days: number };
}

export type DueTripScope = 'live' | 'ended_yesterday' | 'starts_in_7_days' | 'overdue';

export type TripPhase = 'upcoming' | 'ongoing' | 'ended';

export interface DueTrip {
  id: string;
  tripId: string | null;
  title: string;
  destination: string;
  status: TripLifecycleStatus;
  startDate: string | null;
  endDate: string | null;
  nights: number;
  days: number;
  /** Where the trip sits relative to today in the branch timezone; null when undated */
  phase: TripPhase | null;
  /** 1-based day of the trip running right now, when it is ongoing */
  currentDay: number | null;
  /** Length of the trip in days, from its dates (or itinerary days) */
  totalDays: number | null;
  /** Days until the trip starts, when it is upcoming (1 = tomorrow) */
  startsInDays: number | null;
  /** Days since the trip's last day, when it has ended (1 = yesterday) */
  endedDaysAgo: number | null;
  adults: number | null;
  children: number | null;
  totalTravelers: number | null;
  currency: string;
  timezone: string;
  totalCost: number;
  totalPaid: number;
  balance: number;
  lead: { id: string; name: string; phone?: string; source?: string } | null;
  nextDue: {
    id: string;
    label: string;
    dueDate: string;
    amount: number;
    outstanding: number;
  } | null;
}

export interface DueTripsResponse {
  scope: DueTripScope;
  timezone: string;
  trips: DueTrip[];
  totalDue: number;
  count: number;
}

export interface DashboardOverview {
  salesStats: SalesStats | null;
  followUps: FollowUpSummary | null;
  tripTimings: TripTimings | null;
  dueTrips: DueTripsResponse | null;
}

// ─── Trip lifecycle ──────────────────────────────────────────────────────────

export type TripLifecycleStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

// ─── Global search ───────────────────────────────────────────────────────────

export interface SearchTripResult {
  id: string;
  tripId: string | null;
  title: string;
  destination: string;
  status: TripLifecycleStatus;
  startDate: string | null;
  endDate: string | null;
  totalCost: number | null;
  currency: string;
  lead: { id: string; name: string; phone?: string } | null;
  /** The query was this trip's exact trip ID. */
  exact: boolean;
  href: string;
}

export interface SearchLeadResult {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  status: string;
  source: string;
  destination?: string;
  href: string;
}

export interface SearchResults {
  query: string;
  trips: SearchTripResult[];
  leads: SearchLeadResult[];
  total: number;
  /** Set when the query is a whole trip ID, so the client can jump straight there. */
  exactMatch: { type: 'trip'; id: string; href: string } | null;
}

// ─── Full trip detail (GET /trips/:id) ───────────────────────────────────────

export interface TripFinanceSummary {
  totalCost: number;
  totalPaid: number;
  balance: number;
}

export interface TripFollowUp {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  completedAt?: string | null;
  notes?: string | null;
  outcome?: string | null;
  assignee?: { id: string; name: string } | null;
}

export interface TripDetail {
  id: string;
  tripId: string | null;
  title: string;
  destination: string;
  status: TripLifecycleStatus;
  tripStatus: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'NO_DATE';
  paymentStatus: 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'NO_COST';
  startDate: string | null;
  endDate: string | null;
  tripType?: string | null;
  totalTravelers?: number | null;
  adults?: number | null;
  children?: number | null;
  totalCost?: number | null;
  totalPaid: number;
  balance: number;
  daysCount: number;
  daysJson: any[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    status?: string;
    assignee?: { id: string; name: string; email?: string } | null;
  } | null;
  branch?: {
    id: string;
    name: string;
    currency?: string;
    companyName?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsappNumber?: string | null;
  } | null;
  creator?: { id: string; name: string; email?: string } | null;
  payments: import('./trip.types').TripPayment[];
  followUps: TripFollowUp[];
  finance: TripFinanceSummary;
}
