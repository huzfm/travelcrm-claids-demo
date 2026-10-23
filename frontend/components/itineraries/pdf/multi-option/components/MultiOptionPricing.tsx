// Multi-Option Pricing Page Component - Duplicated for full isolation
// Same greeting + trip-details layout as the single-option QuotePage, followed
// by the quote price table — one column per package (since there's more than
// one price to show here, unlike the single-option quote).

import { Page, Text, View } from '@react-pdf/renderer';
import { styles, formatINR } from '../styles';
import { PDFHeaderCompact } from './Header';
import { PDFFooterSimple } from './Footer';
import { PageWatermark, SectionBanner, decorColors, watermarkText } from './PageDecor';
import type { Itinerary, ItineraryDay, ItineraryOption } from '@/types/index';

interface MultiOptionPricingProps {
  itinerary?: Itinerary;
  days?: ItineraryDay[];
  options: ItineraryOption[];
  branchName?: string;
  currency?: string;
  pageNumber?: number;
  totalPages?: number;
}

export const MultiOptionPricing = ({
  itinerary,
  days = [],
  options,
  branchName,
  currency = 'INR',
  pageNumber = 2,
  totalPages,
}: MultiOptionPricingProps) => {
  const clientName = itinerary?.clientName || itinerary?.lead?.name || 'Valued Guest';
  const salutation = itinerary?.salutation || 'Mr';
  const company = branchName || 'our team';
  const startDate = itinerary?.startDate || '';
  const paxSummary = itinerary
    ? formatPaxLong(itinerary.adults, itinerary.children, itinerary.childrenAges)
    : '';
  const tripId = itinerary?.tripId || '';

  const nights = Math.max(0, (days?.length || 0) - 1);
  const durationText = days?.length ? `${nights} Nights  /  ${days.length} Days` : '';

  // Two rows of three columns, left column widest (destination / pax).
  const detailRows = [
    [
      { label: 'DESTINATION', value: itinerary?.destination || '—' },
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
        {/* Greeting — same wording pattern as the single-option quote page,
            adjusted for there being several packages to choose from. */}
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
          Our sales team has put up this <Text style={boldStyle}>Quote</Text> with the following
          package options for your upcoming trip. Please go through them and let us know your
          preferred option, or if you would like any changes in any of the provided services.
          Contact details are provided at the end.
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

        <View style={[priceTableStyle, { flexDirection: 'row' }]}>
          {options.map((option, idx) => {
            // Priority: option.finalPrice (user-edited) > breakdown.finalPrice > totalCost
            const grandTotal =
              option.finalPrice ?? option.breakdown?.finalPrice ?? option.totalCost ?? 0;

            return (
              <View
                key={idx}
                style={{
                  flex: 1,
                  borderLeftWidth: idx > 0 ? 1 : 0,
                  borderLeftColor: decorColors.cardBorder,
                }}
              >
                <View style={priceTableHeaderStyle}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: decorColors.text }}>
                    {option.name} ({currency})
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: decorColors.text }}>
                    {formatINR(grandTotal)} /-
                  </Text>
                  <Text style={{ fontSize: 8, color: decorColors.text, marginTop: 4 }}>
                    {option.gstPercent ? '(excluding GST)' : '(inclusive of all taxes)'}
                  </Text>
                </View>
              </View>
            );
          })}
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
