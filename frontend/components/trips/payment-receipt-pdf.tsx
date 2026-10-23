'use client';

import { Document, Image, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import api from '@/lib/axios';
import { formatCurrencyText } from '@/lib/currency';
import type { TripDetail } from '@/types/dashboard.types';
import type { PaymentMode, TripPayment } from '@/types/trip.types';

/**
 * A printable receipt for one payment received against a trip.
 *
 * Built in the browser with the same renderer as the itinerary PDFs. The trip
 * is fetched fresh because the trips list only carries payment amounts, and a
 * payment recorded a moment ago must be on its own receipt. The running totals are "as of
 * this payment", so a receipt re-downloaded later still shows what the customer
 * owed at the time they paid, not today's balance.
 */

const MODE_LABELS: Record<PaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank transfer',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

const LOGO_URL = '/pdf-assets/logo.jpg';
const STAMP_URL = '/stamp.jpg';
const CONTACT_NUMBER = '+91-8222899961';

const INK = '#1A1918';
const MUTED = '#78736f';
const LINE = '#e8e6e4';
const ACCENT = '#1a1918';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: INK },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  logo: { width: 130, height: 44, objectFit: 'contain', marginBottom: 6 },
  companyLine: { fontSize: 9, color: MUTED, marginTop: 2 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: ACCENT, textAlign: 'right' },
  meta: { fontSize: 9, color: MUTED, textAlign: 'right', marginTop: 3 },
  metaValue: { color: INK, fontFamily: 'Helvetica-Bold' },
  columns: { flexDirection: 'row', gap: 24, marginTop: 20 },
  column: { flex: 1 },
  label: {
    fontSize: 8,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  strong: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  line: { marginTop: 2 },
  amountBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fafaf9',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: ACCENT },
  table: { marginTop: 20, borderTopWidth: 1, borderTopColor: LINE },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  rowLabel: { color: MUTED },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  totalLabel: { fontFamily: 'Helvetica-Bold' },
  notes: { marginTop: 16, padding: 10, backgroundColor: '#fafaf9', fontSize: 9, color: MUTED },
  signature: { marginTop: 32, alignItems: 'flex-end' },
  // Straddles the signature rule: (180px rule - 88px stamp) / 2.
  stamp: { width: 88, height: 88, objectFit: 'contain', marginBottom: 6, marginRight: 46 },
  signatureBox: { width: 180, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
  },
});

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

/** Stable per payment, so downloading the same receipt twice gives the same number. */
export const receiptNumber = (trip: TripDetail, payment: TripPayment) =>
  `RCPT-${trip.tripId || trip.id.slice(-6).toUpperCase()}-${payment.id.slice(-6).toUpperCase()}`;

/**
 * Totals up to and including this payment. The trip's payment list arrives
 * newest first; a payment just recorded may not be in it yet, so it is added.
 */
function totalsAsOf(trip: TripDetail, payment: TripPayment) {
  const all = trip.payments.some(p => p.id === payment.id)
    ? trip.payments
    : [payment, ...trip.payments];
  const ordered = [...all].sort(
    (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );
  const upTo = ordered.slice(0, ordered.findIndex(p => p.id === payment.id) + 1);
  const paidToDate = upTo.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCost = trip.finance?.totalCost ?? trip.totalCost ?? 0;
  return { totalCost, paidToDate, balance: Math.max(totalCost - paidToDate, 0) };
}

function ReceiptDocument({ trip, payment }: { trip: TripDetail; payment: TripPayment }) {
  const currency = trip.branch?.currency ?? 'INR';
  const money = (value: number) => formatCurrencyText(value, currency);
  const branch = trip.branch;
  const companyName = branch?.companyName || branch?.name || 'Payment Receipt';
  const logoSrc =
    typeof window !== 'undefined' ? `${window.location.origin}${LOGO_URL}` : LOGO_URL;
  const stampSrc =
    typeof window !== 'undefined' ? `${window.location.origin}${STAMP_URL}` : STAMP_URL;
  const { totalCost, paidToDate, balance } = totalsAsOf(trip, payment);
  const travellers =
    [trip.adults && `${trip.adults} adult`, trip.children && `${trip.children} child`]
      .filter(Boolean)
      .join(', ') || (trip.totalTravelers ? String(trip.totalTravelers) : '');

  return (
    <Document title={`Receipt ${receiptNumber(trip, payment)}`} author={companyName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ maxWidth: '60%' }}>
            <Image src={logoSrc} style={styles.logo} />
            <Text style={styles.companyLine}>Contact: {CONTACT_NUMBER}</Text>
            {branch?.address && <Text style={styles.companyLine}>{branch.address}</Text>}
            {branch?.email && <Text style={styles.companyLine}>{branch.email}</Text>}
          </View>
          <View>
            <Text style={styles.title}>PAYMENT RECEIPT</Text>
            <Text style={styles.meta}>
              Receipt no. <Text style={styles.metaValue}>{receiptNumber(trip, payment)}</Text>
            </Text>
            <Text style={styles.meta}>
              Date <Text style={styles.metaValue}>{formatDate(payment.paymentDate)}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.label}>Received from</Text>
            <Text style={styles.strong}>{trip.lead?.name || '—'}</Text>
            {trip.lead?.phone && <Text style={styles.line}>{trip.lead.phone}</Text>}
            {trip.lead?.email && <Text style={styles.line}>{trip.lead.email}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>For trip</Text>
            <Text style={styles.strong}>{trip.title}</Text>
            {trip.tripId && <Text style={styles.line}>Trip ID: {trip.tripId}</Text>}
            {trip.destination && <Text style={styles.line}>{trip.destination}</Text>}
            {(trip.startDate || trip.endDate) && (
              <Text style={styles.line}>
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </Text>
            )}
            {travellers && <Text style={styles.line}>Travellers: {travellers}</Text>}
          </View>
        </View>

        <View style={styles.amountBox}>
          <View>
            <Text style={styles.label}>Amount received</Text>
            <Text style={{ color: MUTED }}>
              via {MODE_LABELS[payment.paymentMode] ?? payment.paymentMode}
              {payment.referenceNumber ? `  •  Ref: ${payment.referenceNumber}` : ''}
            </Text>
          </View>
          <Text style={styles.amount}>{money(payment.amount)}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total trip cost</Text>
            <Text>{money(totalCost)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Total received to date (incl. this payment)</Text>
            <Text>{money(paidToDate)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Balance due</Text>
            <Text style={[styles.totalLabel, { color: balance > 0 ? '#db0201' : ACCENT }]}>
              {balance > 0 ? money(balance) : 'Fully paid'}
            </Text>
          </View>
        </View>

        {payment.notes && <Text style={styles.notes}>Note: {payment.notes}</Text>}

        <View style={styles.signature}>
          <Image src={stampSrc} style={styles.stamp} />
          <View style={styles.signatureBox}>
            <Text>{payment.recorder?.name || ''}</Text>
            <Text style={{ fontSize: 8, color: MUTED }}>Received by, for {companyName}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          This is a computer-generated receipt. Thank you for your payment. For queries, call{' '}
          {CONTACT_NUMBER}.
        </Text>
      </Page>
    </Document>
  );
}

export async function downloadPaymentReceipt(tripId: string, paymentId: string) {
  const res = await api.get<{ success: boolean; data: TripDetail }>(`trips/${tripId}`);
  const trip = res.data.data;
  const payment = trip.payments.find(p => p.id === paymentId);
  if (!payment) throw new Error('Payment not found on this trip');

  const blob = await pdf(<ReceiptDocument trip={trip} payment={payment} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${receiptNumber(trip, payment)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
