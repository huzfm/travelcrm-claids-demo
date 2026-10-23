// Trip types for the Trips management page

export type TripStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'NO_DATE';
export type PaymentStatus = 'FULLY_PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'NO_COST';
export type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'UPI' | 'CHEQUE' | 'OTHER';

export interface TripPayment {
  id: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  referenceNumber?: string;
  receiptUrl?: string;
  notes?: string;
  recordedBy: string;
  recorder?: {
    id: string;
    name: string;
  };
}

export interface TripSummary {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  totalRevenue: number;
  totalReceived: number;
  totalBalance: number;
}

export interface TripStats {
  totalTrips: number;
  upcomingCount: number;
  ongoingCount: number;
  completedCount: number;
  noDateCount: number;
  totalRevenue: number;
  totalReceived: number;
  totalBalance: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  pendingPaymentCount: number;
  revenueByMonth: Record<string, { count: number; revenue: number; received: number }>;
  topDestinations: Array<{
    destination: string;
    count: number;
    revenue: number;
  }>;
}

export interface Trip {
  id: string;
  leadId: string;
  lead: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    assignedTo?: string;
  };
  branchId: string;
  branch?: {
    id: string;
    name: string;
    country?: string;
    currency?: string;
  };
  title: string;
  destination: string;
  templateId: string | null;
  daysJson: any[];
  version: number;
  pdfPath: string | null;
  sharedVia: string | null;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  tripType?: string;
  totalTravelers?: number;
  budget?: string;
  totalCost?: number;
  notes?: string;
  included?: string[];
  excluded?: string[];
  quotes?: any[];
  selectedQuote?: number;
  tripId?: string;
  advanceAmount?: number;
  advancePaid?: boolean;
  bankDetails?: string;
  // Itinerary reference
  itineraryId?: string;
  itinerary?: {
    id: string;
    title: string;
    destination: string;
    startDate?: string;
    endDate?: string;
    daysCount: number;
    sharedVia?: string | null;
    pdfPath?: string | null;
    version?: number;
  };
  // Enriched fields
  tripStatus: TripStatus;
  paymentStatus: PaymentStatus;
  totalPaid: number;
  balance: number;
  daysCount: number;
  payments: TripPayment[];
}

export interface TripsResponse {
  success: boolean;
  data: {
    trips: Trip[];
    summary: TripSummary;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface TripFilters {
  status?: TripStatus | 'ALL';
  paymentStatus?: PaymentStatus | 'ALL';
  destination?: string;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
}

export interface RecordPaymentInput {
  amount: number;
  paymentMode?: PaymentMode;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface PaymentsResponse {
  success: boolean;
  data: {
    payments: TripPayment[];
    totalPaid: number;
    totalCost: number;
    balance: number;
  };
}
