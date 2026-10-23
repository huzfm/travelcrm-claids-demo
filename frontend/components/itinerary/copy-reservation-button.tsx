'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { copyHtmlToClipboard } from '@/lib/copy-html-to-clipboard';
import {
  buildHotelReservationEmail,
  buildHotelReservationEmailHtml,
  type HotelStayGroup,
  type ReservationGuest,
  type ReservationCompany,
} from '@/app/(protected)/itineraries/new/utils/reservationEmail';

/** Copies a plain-text hotel booking request — same format the agency sends
 *  manually — so the agent can paste it straight into an email to the hotel. */
export function CopyReservationButton({
  stay,
  tripId,
  currency,
  guest,
  company,
}: {
  stay: HotelStayGroup;
  tripId?: string;
  currency: string;
  guest: ReservationGuest;
  company: ReservationCompany;
}) {
  const handleCopy = async () => {
    const params = { tripId, currency, guest, company, stay };
    const html = buildHotelReservationEmailHtml(params);
    const text = buildHotelReservationEmail(params);
    const method = await copyHtmlToClipboard(html, text);

    if (method === 'plain-text-fallback') {
      toast.warning('Copied as plain text only — formatting was lost. Check the browser console.');
    } else if (method === 'failed') {
      toast.error('Could not copy to clipboard');
    } else {
      toast.success('Reservation email copied — paste it into your mail client');
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1.5 text-xs"
    >
      <Copy className="h-3.5 w-3.5" />
      Copy Reservation Email
    </Button>
  );
}
