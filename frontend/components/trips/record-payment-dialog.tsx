'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatCurrencyText } from '@/lib/currency';
import { useRecordPayment } from '@/hooks/useTrips';
import { ReceiptDownloadButton } from '@/components/trips/receipt-download-button';
import type { PaymentMode, TripPayment } from '@/types/trip.types';
import { Banknote, Building, CreditCard, FileText, Smartphone, Wallet } from 'lucide-react';

const MODES: { value: PaymentMode; label: string; icon: React.ElementType }[] = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'BANK_TRANSFER', label: 'Bank', icon: Building },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'CHEQUE', label: 'Cheque', icon: FileText },
  { value: 'OTHER', label: 'Other', icon: Wallet },
];

const today = () => new Date().toISOString().slice(0, 10);

export interface RecordPaymentDialogProps {
  tripId: string;
  balance: number;
  currency: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Records money received against a trip, updating its balance directly.
 */
export function RecordPaymentDialog({
  tripId,
  balance,
  currency,
  open,
  onClose,
}: RecordPaymentDialogProps) {
  const recordPayment = useRecordPayment();

  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [paymentDate, setPaymentDate] = useState(today());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  // Set once a payment saves, switching the dialog to its receipt step.
  const [recorded, setRecorded] = useState<TripPayment | null>(null);

  const parsed = parseFloat(amount);
  const exceedsBalance = balance > 0 && parsed > balance;

  const close = () => {
    reset();
    setRecorded(null);
    onClose();
  };

  const reset = () => {
    setAmount('');
    setReferenceNumber('');
    setNotes('');
    setPaymentMode('CASH');
    setPaymentDate(today());
  };

  const submit = async () => {
    if (!parsed || parsed <= 0) {
      toast.error('Enter an amount greater than 0');
      return;
    }
    try {
      const result = await recordPayment.mutateAsync({
        tripId,
        data: { amount: parsed, paymentMode, paymentDate, referenceNumber, notes },
      });
      toast.success(`Recorded ${formatCurrencyText(parsed, currency)}`);
      reset();
      setRecorded(result.data);
    } catch {
      toast.error('Could not record the payment');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) close();
      }}
    >
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] sm:w-full">
        {recorded ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">Payment recorded</DialogTitle>
              <DialogDescription>
                {formatCurrencyText(recorded.amount, currency)} received via{' '}
                {MODES.find(mode => mode.value === recorded.paymentMode)?.label ??
                  recorded.paymentMode}
                .
              </DialogDescription>
            </DialogHeader>
            <ReceiptDownloadButton
              tripId={tripId}
              paymentId={recorded.id}
              variant="default"
              className="w-full"
            >
              Download receipt PDF
            </ReceiptDownloadButton>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={close} className="w-full sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">Record Payment</DialogTitle>
              <DialogDescription>
                {balance > 0
                  ? `${formatCurrencyText(balance, currency)} outstanding on this trip`
                  : 'This trip has nothing outstanding'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="payment-amount" className="text-xs">
                  Amount
                </Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  autoFocus
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                />
                {balance > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(String(balance))}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Pay full balance
                    </button>
                    {exceedsBalance && (
                      <span className="text-[11px] text-warning">
                        More than the outstanding balance
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Mode</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {MODES.map(mode => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setPaymentMode(mode.value)}
                        aria-pressed={paymentMode === mode.value}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors',
                          paymentMode === mode.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="payment-date" className="text-xs">
                    Date
                  </Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="payment-ref" className="text-xs">
                    Reference
                  </Label>
                  <Input
                    id="payment-ref"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="Txn / receipt no."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="payment-notes" className="text-xs">
                  Notes
                </Label>
                <Textarea
                  id="payment-notes"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={close} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={recordPayment.isPending}
                className="w-full sm:w-auto"
              >
                Record payment
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
