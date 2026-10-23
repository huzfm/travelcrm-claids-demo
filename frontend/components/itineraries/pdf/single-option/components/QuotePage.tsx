// Single-Option Quote Page Component
// A plain document-style page (no hero image) that follows the Cover page:
// greeting, a short intro line, the trip details grid, then the quote price —
// over a faint diagonal "Branch • Trip# N" watermark (see PageDecor).

import { Page, Text, View } from '@react-pdf/renderer';
import { styles, formatINR } from '../styles';
import { PDFHeaderCompact } from './Header';
import { PDFFooterSimple } from './Footer';
import { PageWatermark, SectionBanner, decorColors, watermarkText } from './PageDecor';
import type { Itinerary, ItineraryDay, Quote } from '@/types/index';

interface QuotePageProps {
  itinerary: Itinerary;
  days: ItineraryDay[];
  quote?: Quote;
  branchName?: string;
  currency?: string;
  pageNumber?: number;
  totalPages?: number;
}

export const QuotePage = ({
  itinerary,
  days,
  quote,
  branchName,
  currency = 'INR',
  pageNumber,
  totalPages,
}: QuotePageProps) => {
  const clientName = itinerary.clientName || itinerary.lead?.name || 'Valued Guest';
  const salutation = itinerary.salutation || 'Mr';
  const company = branchName || 'our team';
  const startDate = itinerary.startDate || '';
  const paxSummary = formatPaxLong(itinerary.adults, itinerary.children, itinerary.childrenAges);
  const tripId = itinerary.tripId || '';

  const nights = Math.max(0, (days?.length || 0) - 1);
  const durationText = days?.length ? `${nights} Nights  /  ${days.length} Days` : '';

  const totalPrice = quote?.breakdown?.customTotal ?? quote?.totalCost ?? itinerary.totalCost ?? 0;
  const gstPercent = quote?.gstPercent;

  // Two rows of three columns, left column widest (destination / pax).
  const detailRows = [
    [
      { label: 'DESTINATION', value: itinerary.destination || '—' },
      { label: 'START DATE', value: startDate ? formatQuoteDate(startDate) : '—' },
      { label: 'DURATION', value: durationText || '—' },
    ],
    [
      { label: 'PAX', value: paxSummary || '—' },
      { label: 'TRIP ID', value: tripId || '—' },
      null, // Reference ID — no field for it yet
    ],
  ];

  return (
    <Page size="A4" style={[styles.page, { backgroundColor: decorColors.pageBg }]}>
      <PageWatermark text={watermarkText(branchName, tripId)} />

      <PDFHeaderCompact title="Your Trip Quote" />

      <View style={styles.pageContent}>
        {/* Greeting */}
        <Text style={bodyTextStyle}>
          <Text style={boldStyle}>
            Dear {salutation}. {clientName}
          </Text>
          ,
        </Text>
        <Text style={[bodyTextStyle, { marginTop: 12 }]}>
          Greetings from <Text style={boldStyle}>{company}</Text>.
        </Text>
        <Text style={[bodyTextStyle, { marginTop: 12, lineHeight: 1.6 }]}>
          Our sales team has put up this <Text style={boldStyle}>Quote</Text> regarding your
          upcoming trip. Please go through it and let us know if you would like any changes in
          any of the provided services. Contact details are provided at the end.
        </Text>

        <View style={{ height: 1, backgroundColor: decorColors.divider, marginTop: 12 }} />

        {/* Trip details grid */}
        <View style={{ marginTop: 14 }}>
          {detailRows.map((row, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 16 }}>
              {row.map((item, colIdx) => (
                <View key={colIdx} style={{ width: detailColumnWidths[colIdx] }}>
                  {item && (
                    <>
                      <Text style={detailLabelStyle}>{item.label}</Text>
                      <Text style={detailValueStyle}>{item.value}</Text>
                    </>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Quote price */}
        <SectionBanner title="Quote Price" marginTop={26} />

        <View style={priceTableStyle}>
          <View style={priceTableHeaderStyle}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: decorColors.text }}>
              Total ({currency})
            </Text>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: decorColors.text }}>
              {formatINR(totalPrice)} /-
            </Text>
            <Text style={{ fontSize: 8, color: decorColors.text, marginTop: 4 }}>
              {gstPercent ? '(excluding GST)' : '(inclusive of all taxes)'}
            </Text>
          </View>
        </View>
      </View>

      <PDFFooterSimple pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
};

// "18 Adults, 3 Children (12y, 10y, 6y)"
const formatPaxLong = (adults?: number, children?: number, childrenAges?: number[]): string => {
  const parts: string[] = [];
  if (adults) parts.push(`${adults} ${adults === 1 ? 'Adult' : 'Adults'}`);
  if (children) {
    const ages = (childrenAges || []).filter(a => a != null).map(a => `${a}y`);
    parts.push(
      `${children} ${children === 1 ? 'Child' : 'Children'}${ages.length ? ` (${ages.join(', ')})` : ''}`
    );
  }
  return parts.join(', ');
};

// "05 June, 2026"
const formatQuoteDate = (value: string): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${day} ${month}, ${d.getFullYear()}`;
};

const detailColumnWidths = ['52%', '20%', '28%'];

const bodyTextStyle = { fontSize: 10, color: decorColors.text };
const boldStyle = { fontWeight: 'bold' as const };

const detailLabelStyle = {
  fontSize: 8.5,
  letterSpacing: 1,
  fontWeight: 'bold' as const,
  color: decorColors.label,
};

const detailValueStyle = {
  fontSize: 12,
  fontWeight: 'bold' as const,
  color: decorColors.text,
  marginTop: 5,
};

const priceTableStyle = {
  marginTop: 12,
  borderWidth: 1,
  borderColor: decorColors.cardBorder,
  backgroundColor: '#ffffff',
};

const priceTableHeaderStyle = {
  paddingHorizontal: 8,
  paddingVertical: 9,
  borderBottomWidth: 1,
  borderBottomColor: decorColors.cardBorder,
};
