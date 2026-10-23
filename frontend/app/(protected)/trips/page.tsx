'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  TrendingUp,
  Plane,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Plus,
  Receipt,
  Trash2,
  CreditCard,
  Banknote,
  Building,
  Smartphone,
  FileText,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { useTrips, useRecordPayment, useDeletePayment, useTripPayments } from '@/hooks/useTrips';
import { useAuthContext } from '@/components/providers';
import { format, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Trip, TripStatus, PaymentStatus, PaymentMode, TripPayment } from '@/types/trip.types';
import { ReceiptDownloadButton } from '@/components/trips/receipt-download-button';
import { TripIdBadge } from '@/components/ui/trip-id-badge';

const statusConfig: Record<TripStatus, { label: string; color: string; icon: React.ElementType }> =
  {
    UPCOMING: {
      label: 'Upcoming',
      color: 'text-neutral-600 bg-neutral-50 border-neutral-200',
      icon: Clock,
    },
    ONGOING: {
      label: 'Ongoing',
      color: 'text-neutral-600 bg-neutral-50 border-neutral-200',
      icon: Plane,
    },
    COMPLETED: {
      label: 'Completed',
      color: 'text-neutral-600 bg-neutral-50 border-neutral-200',
      icon: CheckCircle2,
    },
    NO_DATE: {
      label: 'No Date',
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: AlertCircle,
    },
  };

const paymentConfig: Record<PaymentStatus, { label: string; color: string }> = {
  FULLY_PAID: { label: 'Paid', color: 'text-neutral-600 bg-neutral-50' },
  PARTIALLY_PAID: { label: 'Partial', color: 'text-red-600 bg-red-50' },
  PENDING: { label: 'Pending', color: 'text-red-600 bg-red-50' },
  NO_COST: { label: 'N/A', color: 'text-neutral-600 bg-neutral-50' },
};

// On the unfiltered "All" tab, trips still waiting on money float to the top
// and fully-settled ones sink to the bottom. Within each payment-status group,
// the most recently created trip — e.g. one just booked from a new itinerary —
// leads, so new bookings don't get buried under older ones in the same group.
const PAYMENT_URGENCY_RANK: Record<PaymentStatus, number> = {
  PENDING: 0,
  PARTIALLY_PAID: 1,
  NO_COST: 2,
  FULLY_PAID: 3,
};

function sortByPaymentUrgency(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const urgency = PAYMENT_URGENCY_RANK[a.paymentStatus] - PAYMENT_URGENCY_RANK[b.paymentStatus];
    if (urgency !== 0) return urgency;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

const paymentModes: { value: PaymentMode; label: string; icon: React.ElementType }[] = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText },
  { value: 'OTHER', label: 'Other', icon: DollarSign },
];

function formatCurrency(amount: number | undefined, currency: string = 'INR'): string {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Phone-safe dialog sizing: a gutter at the screen edges, and a height cap so
// a tall modal scrolls inside itself instead of running off the screen.
const MODAL_FIT = 'w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return '-';
    return format(date, 'MMM d, yyyy');
  } catch {
    return '-';
  }
}

// Payment Recording Modal - Compact version
function RecordPaymentModal({
  trip,
  open,
  onClose,
}: {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Set once a payment saves, switching the modal to its receipt step.
  const [recorded, setRecorded] = useState<TripPayment | null>(null);

  const recordPayment = useRecordPayment();
  const currency = trip?.branch?.currency || 'INR';
  const remainingBalance = trip ? (trip.totalCost || 0) - trip.totalPaid : 0;
  const hasNoCost = !trip?.totalCost || trip.totalCost === 0;
  const isFullyPaid = remainingBalance <= 0 && !hasNoCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !amount) return;

    setIsSubmitting(true);
    try {
      const result = await recordPayment.mutateAsync({
        tripId: trip.id,
        data: {
          amount: parseFloat(amount),
          paymentMode,
          paymentDate,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
        },
      });
      toast.success('Payment recorded!');
      setRecorded(result.data);
      setAmount('');
      setReferenceNumber('');
      setNotes('');
    } catch {
      toast.error('Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!trip) return null;

  const close = () => {
    setRecorded(null);
    onClose();
  };

  // Just saved — offer the receipt before anything else, even if this payment
  // cleared the balance.
  if (recorded) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className={cn('sm:max-w-sm p-0 gap-0', MODAL_FIT)}>
          <div className="flex items-center gap-3 p-4 border-b bg-neutral-50">
            <div className="p-2 bg-neutral-500 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 pr-8">
              <DialogTitle className="text-base">Payment Recorded</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{trip.title}</p>
            </div>
          </div>
          <div className="p-6 text-center">
            <p className="text-2xl font-bold text-neutral-600">
              {formatCurrency(recorded.amount, currency)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              received via{' '}
              {paymentModes.find(m => m.value === recorded.paymentMode)?.label ??
                recorded.paymentMode}
            </p>
            <ReceiptDownloadButton
              tripId={trip.id}
              paymentId={recorded.id}
              variant="default"
              className="mt-5 w-full h-10"
            >
              Download Receipt PDF
            </ReceiptDownloadButton>
          </div>
          <div className="p-4 border-t">
            <Button variant="outline" onClick={close} className="w-full h-10">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If no cost set
  if (hasNoCost) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className={cn('sm:max-w-sm p-0 gap-0', MODAL_FIT)}>
          <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
            <div className="p-2 bg-muted rounded-lg">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 pr-8">
              <DialogTitle className="text-base">Record Payment</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{trip.title}</p>
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium">No Cost Set</p>
            <p className="text-sm text-muted-foreground mt-1">
              Set a total cost on this trip first before recording payments.
            </p>
          </div>
          <div className="p-4 border-t">
            <Button variant="outline" onClick={close} className="w-full h-10">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If fully paid
  if (isFullyPaid) {
    return (
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className={cn('sm:max-w-sm p-0 gap-0', MODAL_FIT)}>
          <div className="flex items-center gap-3 p-4 border-b bg-neutral-50">
            <div className="p-2 bg-neutral-500 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 pr-8">
              <DialogTitle className="text-base">Payment Complete</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{trip.title}</p>
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-neutral-600" />
            </div>
            <p className="text-lg font-semibold text-neutral-600">All Paid!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Total of {formatCurrency(trip.totalCost, currency)} has been fully paid.
            </p>
            <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Payments received</p>
              <p className="text-lg font-bold text-neutral-600">
                {formatCurrency(trip.totalPaid, currency)}
              </p>
            </div>
          </div>
          <div className="p-4 border-t">
            <Button variant="outline" onClick={close} className="w-full h-10">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={cn('sm:max-w-sm p-0 gap-0', MODAL_FIT)}>
        {/* Compact Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
          <div className="p-2 bg-primary rounded-lg">
            <DollarSign className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0 pr-8">
            <DialogTitle className="text-base">Record Payment</DialogTitle>
            <p className="text-xs text-muted-foreground truncate">{trip.title}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Mini Summary */}
          <div className="grid grid-cols-3 text-sm bg-muted/50 rounded-lg p-3">
            <div className="text-center min-w-0">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold truncate">{formatCurrency(trip.totalCost, currency)}</p>
            </div>
            <div className="text-center min-w-0 px-2 border-x">
              <p className="text-xs text-neutral-600">Paid</p>
              <p className="font-semibold text-neutral-600 truncate">
                {formatCurrency(trip.totalPaid, currency)}
              </p>
            </div>
            <div className="text-center min-w-0">
              <p
                className={`text-xs ${remainingBalance > 0 ? 'text-red-500' : 'text-neutral-600'}`}
              >
                Balance
              </p>
              <p
                className={`font-semibold truncate ${remainingBalance > 0 ? 'text-red-500' : 'text-neutral-600'}`}
              >
                {formatCurrency(remainingBalance, currency)}
              </p>
            </div>
          </div>

          {/* Amount Input - Prominent */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm">
              Amount *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={remainingBalance}
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-8 h-11 text-lg font-bold"
                required
              />
            </div>
            {remainingBalance > 0 && (
              <button
                type="button"
                onClick={() => setAmount(remainingBalance.toString())}
                className="text-xs text-primary hover:underline"
              >
                Pay full {formatCurrency(remainingBalance, currency)}
              </button>
            )}
          </div>

          {/* Payment Mode - Horizontal pills */}
          <div className="space-y-2">
            <Label className="text-sm">Mode</Label>
            <div className="flex flex-wrap gap-2">
              {paymentModes.map(mode => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMode(mode.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      paymentMode === mode.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 border-transparent hover:bg-muted'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date and Ref in one row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="paymentDate" className="text-xs">
                Date
              </Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reference" className="text-xs">
                Ref #
              </Label>
              <Input
                id="reference"
                placeholder="Receipt #"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Notes - Optional */}
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={1}
              className="resize-none text-sm"
            />
          </div>

          {/* Action Buttons - Full width */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close} className="flex-1 h-10">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              className="flex-1 h-10"
            >
              {isSubmitting ? 'Saving...' : 'Save Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Payment History Modal - Compact version
function PaymentHistoryModal({
  trip,
  open,
  onClose,
}: {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
}) {
  const deletePayment = useDeletePayment();
  const currency = trip?.branch?.currency || 'INR';
  // The list endpoint only ships payment amounts (for the sum), so the full
  // history — modes, dates, delete — is fetched on demand while this is open.
  const { data: paymentsData, isLoading: isLoadingPayments } = useTripPayments(
    trip?.id ?? '',
    open
  );
  const payments = paymentsData?.data?.payments ?? [];

  const handleDelete = async (paymentId: string) => {
    if (!trip) return;
    if (!confirm('Delete this payment?')) return;
    try {
      await deletePayment.mutateAsync({ tripId: trip.id, paymentId });
      toast.success('Payment deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (!trip) return null;

  const remainingBalance = (trip.totalCost || 0) - trip.totalPaid;
  const paidPercentage =
    (trip.totalCost ?? 0) > 0 ? (trip.totalPaid / (trip.totalCost ?? 0)) * 100 : 0;
  const isFullyPaid = remainingBalance <= 0 && (trip.totalCost ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-md p-0 gap-0', MODAL_FIT)}>
        {/* Compact Header - Green when fully paid */}
        <div
          className={cn(
            'flex items-center gap-3 p-4 border-b',
            isFullyPaid ? 'bg-neutral-50' : 'bg-neutral-50'
          )}
        >
          <div className="p-2 bg-neutral-500 rounded-lg">
            {isFullyPaid ? (
              <CheckCircle2 className="h-4 w-4 text-white" />
            ) : (
              <Receipt className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="min-w-0 pr-8">
            <DialogTitle className="text-base">
              {isFullyPaid ? 'Payment Complete' : 'Payment History'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground truncate">{trip.title}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-lg p-2 sm:p-3 text-center min-w-0">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-xs sm:text-sm truncate">
                {formatCurrency(trip.totalCost, currency)}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2 sm:p-3 text-center border border-neutral-100 min-w-0">
              <p className="text-xs text-neutral-600 font-medium">Paid</p>
              <p className="font-bold text-xs sm:text-sm text-neutral-600 truncate">
                {formatCurrency(trip.totalPaid, currency)}
              </p>
            </div>
            <div
              className={cn(
                'rounded-lg p-2 sm:p-3 text-center border min-w-0',
                remainingBalance > 0
                  ? 'bg-red-50 border-red-100'
                  : 'bg-neutral-50 border-neutral-100'
              )}
            >
              <p
                className={cn(
                  'text-xs font-medium',
                  remainingBalance > 0 ? 'text-red-500' : 'text-neutral-600'
                )}
              >
                {remainingBalance > 0 ? 'Due' : 'Done'}
              </p>
              <p
                className={cn(
                  'font-bold text-xs sm:text-sm truncate',
                  remainingBalance > 0 ? 'text-red-500' : 'text-neutral-600'
                )}
              >
                {formatCurrency(remainingBalance, currency)}
              </p>
            </div>
          </div>

          {/* Success Banner when fully paid */}
          {isFullyPaid && (
            <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="p-2 bg-neutral-500 rounded-full">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-neutral-700">Payment Complete!</p>
                <p className="text-xs text-neutral-600">All payments received</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {(trip.totalCost ?? 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(paidPercentage)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-500 rounded-full"
                  style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Payments List */}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {isLoadingPayments ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length > 0 ? (
              payments.map(payment => {
                const modeConfig = paymentModes.find(m => m.value === payment.paymentMode);
                const ModeIcon = modeConfig?.icon || DollarSign;

                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-2 p-3 bg-card border rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-muted rounded-lg">
                        <ModeIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {formatCurrency(payment.amount, currency)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {modeConfig?.label} • {format(parseISO(payment.paymentDate), 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ReceiptDownloadButton
                        tripId={trip.id}
                        paymentId={payment.id}
                        className="h-8 px-2 text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payments yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full h-10">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A trip in the grid.
 *
 * The page exists to answer "who still owes money", so the balance and the
 * Record Payment action carry the visual weight. Everything else is secondary
 * and lives behind the overflow menu rather than competing as a sixth button.
 */
function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const StatusIcon = statusConfig[trip.tripStatus]?.icon || Clock;

  const currency = trip.branch?.currency;
  const totalCost = trip.totalCost ?? 0;
  const paidPercent = totalCost > 0 ? Math.min(100, (trip.totalPaid / totalCost) * 100) : 0;
  const hasBalance = totalCost > 0 && trip.balance > 0;

  return (
    <>
      <Card className="flex flex-col border-border bg-card shadow-brand transition-all duration-200 hover:shadow-brand-lg">
        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          {/* Reference + status */}
          <div className="flex items-start justify-between gap-2">
            <TripIdBadge tripId={trip.tripId} />
            <Badge
              variant="outline"
              className={cn('shrink-0 border-0 text-[10px]', statusConfig[trip.tripStatus]?.color)}
            >
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusConfig[trip.tripStatus]?.label}
            </Badge>
          </div>

          {/* Who and where */}
          <Link href={`/trips/${trip.id}`} className="group block min-w-0">
            <h3 className="truncate font-semibold transition-colors group-hover:text-primary">
              {trip.lead?.name || trip.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
              {trip.destination || 'No destination'}
            </p>
          </Link>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {trip.startDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(trip.startDate)}
                {trip.endDate && ` - ${formatDate(trip.endDate)}`}
              </span>
            )}
            {trip.daysCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {trip.daysCount}d
              </span>
            )}
            {trip.totalTravelers && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {trip.totalTravelers}
              </span>
            )}
          </div>

          {/* Money - the reason this page exists */}
          <div className="mt-auto rounded-lg border bg-muted/30 p-3">
            {totalCost > 0 ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {hasBalance ? 'Balance due' : 'Fully paid'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    of {formatCurrency(totalCost, currency)}
                  </span>
                </div>
                <p
                  className={cn(
                    'stat-number text-lg font-semibold tracking-tight',
                    hasBalance ? 'text-destructive' : 'text-success'
                  )}
                >
                  {formatCurrency(hasBalance ? trip.balance : totalCost, currency)}
                </p>
                <Progress
                  value={paidPercent}
                  className="mt-2 h-1.5"
                  indicatorClassName={hasBalance ? 'bg-warning' : 'bg-success'}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatCurrency(trip.totalPaid, currency)} received
                  {trip.payments?.length
                    ? ` - ${trip.payments.length} payment${trip.payments.length === 1 ? '' : 's'}`
                    : ''}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No cost set yet - add one to start tracking payments.
              </p>
            )}
          </div>

          {/* Actions: one primary, the rest tucked away */}
          <div className="flex gap-2">
            {totalCost > 0 ? (
              hasBalance ? (
                <Button
                  size="sm"
                  className="flex-1 shadow-brand"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Record Payment
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-success border-success/40 hover:bg-success/10"
                  onClick={() => setShowHistoryModal(true)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Paid · Receipts
                </Button>
              )
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/trips/${trip.id}`)}
              >
                View trip
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" aria-label="More actions" className="shrink-0">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/trips/${trip.id}`)}>
                  <Plane className="mr-2 h-3.5 w-3.5" />
                  Trip overview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowHistoryModal(true)}>
                  <Receipt className="mr-2 h-3.5 w-3.5" />
                  Payments & receipts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/itineraries/${trip.id}`)}>
                  <FileText className="mr-2 h-3.5 w-3.5" />
                  Open itinerary
                </DropdownMenuItem>
                {trip.leadId && (
                  <DropdownMenuItem onClick={() => router.push(`/leads/${trip.leadId}`)}>
                    <Users className="mr-2 h-3.5 w-3.5" />
                    View lead
                  </DropdownMenuItem>
                )}
                {trip.pdfPath && (
                  <DropdownMenuItem onClick={() => window.open(trip.pdfPath || '', '_blank')}>
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Download PDF
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <RecordPaymentModal
        trip={trip}
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />
      <PaymentHistoryModal
        trip={trip}
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
    </>
  );
}

/**
 * The four numbers that frame the list. Outstanding leads, because collecting
 * it is what the page is for.
 */
function SummaryCards({
  summary,
  currency,
}: {
  summary: {
    total: number;
    upcoming: number;
    ongoing: number;
    completed: number;
    totalRevenue: number;
    totalReceived: number;
    totalBalance: number;
  };
  currency?: string;
}) {
  const collectedPercent =
    summary.totalRevenue > 0
      ? Math.min(100, (summary.totalReceived / summary.totalRevenue) * 100)
      : 0;

  const cards = [
    {
      label: 'Outstanding',
      value: formatCurrency(summary.totalBalance, currency),
      subtext: summary.totalBalance > 0 ? 'Still to collect' : 'Everything collected',
      icon: AlertCircle,
      tone: summary.totalBalance > 0 ? 'warning' : 'success',
      progress: collectedPercent,
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(summary.totalRevenue, currency),
      subtext: `${formatCurrency(summary.totalReceived, currency)} received`,
      icon: TrendingUp,
      tone: 'primary',
    },
    {
      label: 'Ongoing Now',
      value: summary.ongoing,
      subtext: `${summary.upcoming} upcoming`,
      icon: Clock,
      tone: 'success',
    },
    {
      label: 'Total Trips',
      value: summary.total,
      subtext: `${summary.completed} completed`,
      icon: Plane,
      tone: 'muted',
    },
  ] as const;

  const toneClasses: Record<string, { text: string; chip: string }> = {
    primary: { text: 'text-primary', chip: 'bg-primary/10 text-primary' },
    success: { text: 'text-success', chip: 'bg-success/10 text-success' },
    warning: { text: 'text-warning', chip: 'bg-warning/10 text-warning' },
    muted: { text: 'text-foreground', chip: 'bg-muted text-muted-foreground' },
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        const tone = toneClasses[card.tone];
        return (
          <Card key={card.label} className="min-w-0 border-border bg-card p-3 shadow-brand sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p
                  className={cn(
                    'stat-number mt-1 truncate text-lg font-semibold tracking-tight sm:text-2xl',
                    tone.text
                  )}
                >
                  {card.value}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{card.subtext}</p>
              </div>
              <div className={cn('hidden shrink-0 rounded-lg p-2 sm:block', tone.chip)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            {'progress' in card && card.progress !== undefined && summary.totalRevenue > 0 && (
              <Progress
                value={card.progress}
                className="mt-3 h-1"
                indicatorClassName={summary.totalBalance > 0 ? 'bg-warning' : 'bg-success'}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}

function TripTable({
  trips,
  prioritizePendingPayments = false,
}: {
  trips: Trip[];
  /** On the "All" tab: group pending/partial payments above fully-paid trips first. */
  prioritizePendingPayments?: boolean;
}) {
  const router = useRouter();
  const [sortField, setSortField] = useState<'startDate' | 'totalCost' | 'destination'>(
    'startDate'
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      if (prioritizePendingPayments) {
        const urgency =
          PAYMENT_URGENCY_RANK[a.paymentStatus] - PAYMENT_URGENCY_RANK[b.paymentStatus];
        if (urgency !== 0) return urgency;
      }

      let comparison = 0;
      if (sortField === 'startDate') {
        comparison = (a.startDate || '').localeCompare(b.startDate || '');
      } else if (sortField === 'totalCost') {
        comparison = (a.totalCost || 0) - (b.totalCost || 0);
      } else if (sortField === 'destination') {
        comparison = (a.destination || '').localeCompare(b.destination || '');
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [trips, sortField, sortDir, prioritizePendingPayments]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  if (trips.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No trips found</div>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trip ID</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('destination')}
              >
                Destination
                {sortField === 'destination' &&
                  (sortDir === 'asc' ? (
                    <ChevronUp className="inline h-3 w-3 ml-1" />
                  ) : (
                    <ChevronDown className="inline h-3 w-3 ml-1" />
                  ))}
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead
                className="cursor-pointer hover:text-foreground text-right"
                onClick={() => toggleSort('totalCost')}
              >
                Total
                {sortField === 'totalCost' &&
                  (sortDir === 'asc' ? (
                    <ChevronUp className="inline h-3 w-3 ml-1" />
                  ) : (
                    <ChevronDown className="inline h-3 w-3 ml-1" />
                  ))}
              </TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrips.map(trip => {
              const StatusIcon = statusConfig[trip.tripStatus]?.icon || Clock;
              return (
                <TableRow key={trip.id}>
                  <TableCell>
                    <TripIdBadge tripId={trip.tripId} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/trips/${trip.id}`} className="block hover:text-primary">
                      <p className="font-medium">{trip.destination}</p>
                      <p className="text-xs text-muted-foreground">{trip.daysCount} days</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{trip.lead?.name}</p>
                      <p className="text-xs text-muted-foreground">{trip.lead?.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(trip.startDate)}</p>
                      {trip.endDate && (
                        <p className="text-xs text-muted-foreground">
                          to {formatDate(trip.endDate)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(trip.totalCost, trip.branch?.currency)}
                  </TableCell>
                  <TableCell className="text-right text-neutral-600 font-medium">
                    {formatCurrency(trip.totalPaid, trip.branch?.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'font-medium',
                        trip.balance > 0 ? 'text-destructive' : 'text-success'
                      )}
                    >
                      {formatCurrency(trip.balance, trip.branch?.currency)}
                    </span>
                    {(trip.totalCost ?? 0) > 0 && (
                      <Progress
                        value={Math.min(100, (trip.totalPaid / (trip.totalCost || 1)) * 100)}
                        className="mt-1 h-1"
                        indicatorClassName={trip.balance > 0 ? 'bg-warning' : 'bg-success'}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusConfig[trip.tripStatus]?.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[trip.tripStatus]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={paymentConfig[trip.paymentStatus]?.color}>
                      {paymentConfig[trip.paymentStatus]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(trip.totalCost ?? 0) > 0 &&
                        (trip.balance > 0 ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8"
                            onClick={() => {
                              setSelectedTrip(trip);
                              setShowPaymentModal(true);
                            }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Payment
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-success border-success/40 hover:bg-success/10"
                            onClick={() => {
                              setSelectedTrip(trip);
                              setShowHistoryModal(true);
                            }}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Paid · Receipts
                          </Button>
                        ))}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/trips/${trip.id}`)}>
                            <Plane className="mr-2 h-3.5 w-3.5" />
                            Trip overview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTrip(trip);
                              setShowHistoryModal(true);
                            }}
                          >
                            <Receipt className="mr-2 h-3.5 w-3.5" />
                            Payments & receipts
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/itineraries/${trip.id}`)}>
                            <FileText className="mr-2 h-3.5 w-3.5" />
                            Open itinerary
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <RecordPaymentModal
        trip={selectedTrip}
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedTrip(null);
        }}
      />
      <PaymentHistoryModal
        trip={selectedTrip}
        open={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedTrip(null);
        }}
      />
    </>
  );
}

const TRIP_STATUSES: TripStatus[] = ['UPCOMING', 'ONGOING', 'COMPLETED', 'NO_DATE'];
const PAYMENT_STATUSES: PaymentStatus[] = ['FULLY_PAID', 'PARTIALLY_PAID', 'PENDING', 'NO_COST'];

export default function TripsPage() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'ADMIN';

  // The dashboard widgets link here with filters in the URL, e.g.
  // /trips?search=TRIP-XSEX6N or /trips?startDateFrom=…&startDateTo=…
  const searchParams = useSearchParams();
  const param = (key: string) => searchParams.get(key) ?? '';
  const oneOf = <T extends string>(value: string, allowed: readonly T[]): T | 'ALL' =>
    allowed.includes(value as T) ? (value as T) : 'ALL';

  const [search, setSearch] = useState(() => param('search') || param('tripId'));
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'ALL'>(() =>
    oneOf(param('status'), TRIP_STATUSES)
  );
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'ALL'>(() =>
    oneOf(param('paymentStatus'), PAYMENT_STATUSES)
  );
  const [startDateFrom, setStartDateFrom] = useState(() => param('startDateFrom'));
  const [startDateTo, setStartDateTo] = useState(() => param('startDateTo'));
  const [endDateFrom, setEndDateFrom] = useState(() => param('endDateFrom'));
  const [endDateTo, setEndDateTo] = useState(() => param('endDateTo'));
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<TripStatus | 'ALL'>(() =>
    oneOf(param('status'), TRIP_STATUSES)
  );

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: activeTab === 'ALL' ? statusFilter : activeTab,
      paymentStatus: paymentFilter,
      startDateFrom: startDateFrom || undefined,
      startDateTo: startDateTo || undefined,
      endDateFrom: endDateFrom || undefined,
      endDateTo: endDateTo || undefined,
    }),
    [
      search,
      statusFilter,
      paymentFilter,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      activeTab,
    ]
  );

  const { data, isLoading, error } = useTrips(filters);

  const trips = data?.data?.trips ?? [];
  // Only the unfiltered "All" tab re-groups by payment urgency — a specific
  // status tab (Upcoming/Ongoing/Completed) keeps its natural order. A plain
  // sort here (rather than useMemo) is cheap enough for a page of trips and
  // avoids depending on `trips`, which is a fresh array on every render.
  const displayTrips = activeTab === 'ALL' ? sortByPaymentUrgency(trips) : trips;
  const summary = useMemo(
    () =>
      data?.data?.summary || {
        total: 0,
        upcoming: 0,
        ongoing: 0,
        completed: 0,
        totalRevenue: 0,
        totalReceived: 0,
        totalBalance: 0,
      },
    [data?.data?.summary]
  );

  const tabCounts = useMemo(() => {
    return {
      ALL: summary.total,
      UPCOMING: summary.upcoming,
      ONGOING: summary.ongoing,
      COMPLETED: summary.completed,
    };
  }, [summary]);

  const handleExport = () => {
    const escapeCsv = (value: unknown) => {
      const str = value === undefined || value === null ? '' : String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const headers = [
      'Trip ID',
      'Client',
      'Phone',
      'Destination',
      'Start Date',
      'End Date',
      'Trip Status',
      'Payment Status',
      'Currency',
      'Total Cost',
      'Total Paid',
      'Balance',
    ];

    const rows = trips.map(trip => [
      trip.tripId || trip.id,
      trip.lead?.name,
      trip.lead?.phone,
      trip.destination,
      trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '',
      trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '',
      trip.tripStatus,
      trip.paymentStatus,
      trip.branch?.currency || 'INR',
      trip.totalCost ?? 0,
      trip.totalPaid ?? 0,
      trip.balance ?? 0,
    ]);

    const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trips-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Trips"
        description={
          isAdmin
            ? 'Track all booked trips, payments, and itineraries'
            : 'Track your booked trips and payments'
        }
        action={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={trips.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />

      {/* Summary Cards */}
      <SummaryCards summary={summary} currency={user?.branch?.currency} />

      {/* Filters */}
      <Card className="bg-card border-border shadow-brand">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <div className="relative col-span-2 sm:flex-1 sm:min-w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search trip ID, client, phone, destination..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={paymentFilter}
              onValueChange={v => setPaymentFilter(v as PaymentStatus | 'ALL')}
            >
              <SelectTrigger className="col-span-2 w-full sm:w-40">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payments</SelectItem>
                <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="NO_COST">No Cost</SelectItem>
              </SelectContent>
            </Select>

            {/* Phones show a caption over each date, since an empty date input has no placeholder. */}
            <div className="min-w-0 space-y-1 sm:space-y-0">
              <Label
                htmlFor="trips-start-from"
                className="text-[11px] text-muted-foreground sm:sr-only"
              >
                Starts from
              </Label>
              <Input
                id="trips-start-from"
                type="date"
                value={startDateFrom}
                onChange={e => setStartDateFrom(e.target.value)}
                className="w-full min-w-0 sm:w-36"
              />
            </div>
            <div className="min-w-0 space-y-1 sm:space-y-0">
              <Label
                htmlFor="trips-start-to"
                className="text-[11px] text-muted-foreground sm:sr-only"
              >
                Starts until
              </Label>
              <Input
                id="trips-start-to"
                type="date"
                value={startDateTo}
                onChange={e => setStartDateTo(e.target.value)}
                className="w-full min-w-0 sm:w-36"
              />
            </div>

            {/* The table needs a wide screen; phones always get cards. */}
            <div className="hidden md:flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8"
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8"
              >
                Table
              </Button>
            </div>

            {(search ||
              startDateFrom ||
              startDateTo ||
              statusFilter !== 'ALL' ||
              paymentFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                className="col-span-2"
                onClick={() => {
                  setSearch('');
                  setStartDateFrom('');
                  setStartDateTo('');
                  setEndDateFrom('');
                  setEndDateTo('');
                  setStatusFilter('ALL');
                  setPaymentFilter('ALL');
                  setActiveTab('ALL');
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs by Status */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="ALL" className="shrink-0 px-3 sm:px-4">
            All ({tabCounts.ALL})
          </TabsTrigger>
          <TabsTrigger value="UPCOMING" className="shrink-0 px-3 sm:px-4">
            Upcoming ({tabCounts.UPCOMING})
          </TabsTrigger>
          <TabsTrigger value="ONGOING" className="shrink-0 px-3 sm:px-4">
            Ongoing ({tabCounts.ONGOING})
          </TabsTrigger>
          <TabsTrigger value="COMPLETED" className="shrink-0 px-3 sm:px-4">
            Completed ({tabCounts.COMPLETED})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">Failed to load trips. Please try again.</p>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && trips.length === 0 && (
        <Card className="bg-muted/30 border-dashed p-12 text-center">
          <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No trips found</h3>
          <p className="text-muted-foreground">
            {activeTab !== 'ALL' || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || search
              ? 'Try adjusting your filters or search.'
              : 'Every itinerary you build becomes a trip and shows up here.'}
          </p>
        </Card>
      )}

      {/* Grid View */}
      {!isLoading && !error && trips.length > 0 && (
        <div
          className={cn(
            'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3',
            viewMode === 'table' && 'md:hidden'
          )}
        >
          {displayTrips.map(trip => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {/* Table View */}
      {!isLoading && !error && trips.length > 0 && viewMode === 'table' && (
        <Card className="hidden md:block bg-card border-border shadow-brand overflow-hidden">
          <TripTable trips={displayTrips} prioritizePendingPayments={activeTab === 'ALL'} />
        </Card>
      )}
    </PageWrapper>
  );
}
