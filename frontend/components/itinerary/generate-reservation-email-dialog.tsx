'use client';

import { useMemo, useState } from 'react';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { copyHtmlToClipboard } from '@/lib/copy-html-to-clipboard';
import {
  buildHotelReservationEmail,
  buildHotelReservationEmailHtml,
  type HotelStayGroup,
  type ReservationGuest,
  type ReservationCompany,
} from '@/app/(protected)/itineraries/new/utils/reservationEmail';

interface GenerateReservationEmailButtonProps {
  stay: HotelStayGroup;
  tripId?: string;
  currency: string;
  guest: ReservationGuest;
  company: ReservationCompany;
}

/** Previews the hotel booking-request email (the "Dear Sir/Madam... BOOK &
 *  CONFIRM" format sent to the hotel) before copying it, so the agent can
 *  see exactly what's about to land on the clipboard. Same content/design
 *  as `buildHotelReservationEmailHtml` — this only adds a preview step and
 *  a safer copy mechanism on top of the plain one-click version. */
export function GenerateReservationEmailButton({
  stay,
  tripId,
  currency,
  guest,
  company,
}: GenerateReservationEmailButtonProps) {
  const [open, setOpen] = useState(false);

  const { html, text } = useMemo(() => {
    const params = { tripId, currency, guest, company, stay };
    return {
      html: buildHotelReservationEmailHtml(params),
      text: buildHotelReservationEmail(params),
    };
  }, [tripId, currency, guest, company, stay]);

  const previewDocument = useMemo(
    () => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:16px;">
${html}
</body>
</html>`,
    [html]
  );

  const handleCopy = async () => {
    const method = await copyHtmlToClipboard(html, text);
    if (method === 'plain-text-fallback') {
      toast.warning('Copied as plain text only — formatting was lost. Check the browser console.');
    } else if (method === 'failed') {
      toast.error('Could not copy to clipboard');
    } else {
      toast.success('Reservation email copied — paste it into Gmail');
      setOpen(false);
    }
  };

  const handleCopyPlainText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Plain text copied');
    } catch {
      toast.error('Could not copy plain text');
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs"
      >
        <Mail className="h-3.5 w-3.5" />
        Generate Reservation Email
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hotel Reservation Email — {stay.hotelName}</DialogTitle>
          </DialogHeader>

          <div className="min-h-[400px] overflow-hidden rounded-lg border bg-muted/20">
            <iframe
              title="Reservation email preview"
              srcDoc={previewDocument}
              sandbox=""
              className="h-full min-h-[400px] w-full"
            />
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyPlainText}
              className="text-xs text-muted-foreground"
            >
              Copy as plain text
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCopy}>
                Copy to Gmail
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
