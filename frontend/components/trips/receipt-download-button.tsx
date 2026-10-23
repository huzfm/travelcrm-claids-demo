'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

export interface ReceiptDownloadButtonProps extends Omit<ButtonProps, 'onClick'> {
  tripId: string;
  paymentId: string;
  /** Icon only — for tight rows like the payment history list. */
  compact?: boolean;
}

/**
 * Downloads the PDF receipt for one payment. The PDF renderer is loaded on
 * first click so it stays out of the pages that show this button.
 */
export function ReceiptDownloadButton({
  tripId,
  paymentId,
  compact,
  children,
  ...props
}: ReceiptDownloadButtonProps) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const { downloadPaymentReceipt } = await import('./payment-receipt-pdf');
      await downloadPaymentReceipt(tripId, paymentId);
    } catch {
      toast.error('Could not generate the receipt');
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : Download;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      title="Download receipt PDF"
      aria-label="Download receipt PDF"
      disabled={busy}
      onClick={download}
      {...props}
    >
      <Icon className={busy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      {!compact && (
        <span className="ml-1.5">{children ?? (busy ? 'Preparing…' : 'Receipt PDF')}</span>
      )}
    </Button>
  );
}
