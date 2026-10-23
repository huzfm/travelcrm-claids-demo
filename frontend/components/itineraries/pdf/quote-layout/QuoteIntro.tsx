// Page 2 content: greeting, the trip-details grid and the quote price table.

import { Text, View } from '@react-pdf/renderer';
import { Q, SectionBanner, formatAmount, formatLong, formatPaxLong } from './theme';
import type { Itinerary, ItineraryDay } from '@/types/index';
import type { PerPersonShare } from '@/types/itinerary.types';
import { allocatedTotal } from '@/lib/per-person-split';

export interface QuotePrice {
  /** Column header, e.g. "Total (INR)" or "Standard (INR)". */
  label: string;
  amount: number;
  excludesGst: boolean;
  /** The agent's optional per-traveller split of this price. */
  perPerson?: PerPersonShare[];
}

interface QuoteIntroProps {
  itinerary: Itinerary;
  days: ItineraryDay[];
  company: string;
  prices: QuotePrice[];
  /** Multi-option quotes ask the guest to pick a package. */
  multiOption?: boolean;
}

const COLUMN_WIDTHS = ['51.7%', '20%', '28.3%'];

export const QuoteIntro = ({ itinerary, days, company, prices, multiOption }: QuoteIntroProps) => {
  const clientName = itinerary.clientName || itinerary.lead?.name || 'Valued Guest';
  const salutation = itinerary.salutation || 'Mr';
  const nights = Math.max(0, (days?.length || 0) - 1);

  const rows = [
    [
      { label: 'DESTINATION', value: itinerary.destination || '—' },
      { label: 'START DATE', value: formatLong(itinerary.startDate) || '—' },
      { label: 'DURATION', value: days?.length ? `${nights} Nights  /  ${days.length} Days` : '—' },
    ],
    [
      {
        label: 'PAX',
        value: formatPaxLong(itinerary.adults, itinerary.children, itinerary.childrenAges) || '—',
      },
      { label: 'TRIP ID', value: itinerary.tripId || '—' },
    ],
  ];

  return (
    <View style={{ paddingTop: 20 }}>
      <Text>
        <Text style={{ fontWeight: 'bold' }}>
          Dear {salutation}. {clientName}
        </Text>
        ,
      </Text>
      <Text style={{ marginTop: 16.6, fontSize: 10.5, lineHeight: 1.6 }}>
        Greetings from <Text style={{ fontWeight: 'bold' }}>{company}</Text>.
      </Text>
      <Text style={{ marginTop: 12, fontSize: 10.5, lineHeight: 1.6 }}>
        {multiOption ? (
          <>
            Our sales team has put up this <Text style={{ fontWeight: 'bold' }}>Quote</Text> with
            the following package options for your upcoming trip. Please go through them and let
            us know your preferred option, or if you would like any changes in any of the provided
            services. Contact details are provided at the end.
          </>
        ) : (
          <>
            Our sales team has put up this <Text style={{ fontWeight: 'bold' }}>Quote</Text>{' '}
            regarding your upcoming trip. Please go through it and let us know if you would like
            any changes in any of the provided services. Contact details are provided at the end.
          </>
        )}
      </Text>

      <View style={{ height: 0.75, backgroundColor: Q.border, marginTop: 11 }} />

      <View style={{ marginTop: 9.4 }}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 13.2 }}>
            {row.map((item, colIdx) => (
              <View key={colIdx} style={{ width: COLUMN_WIDTHS[colIdx] }}>
                <Text
                  style={{ fontSize: 9, fontWeight: 'bold', color: Q.label, letterSpacing: 0.5 }}
                >
                  {item.label}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginTop: 8.1 }}>{item.value}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <SectionBanner title="Quote Price" marginTop={34.6} />

      <View
        style={{
          marginTop: 11.3,
          flexDirection: 'row',
          backgroundColor: Q.white,
          borderWidth: 0.75,
          borderColor: Q.border,
        }}
      >
        {prices.map((price, idx) => (
          <View
            key={idx}
            style={{
              flex: 1,
              borderLeftWidth: idx > 0 ? 0.75 : 0,
              borderLeftColor: Q.border,
            }}
          >
            <View
              style={{
                height: 29.5,
                justifyContent: 'center',
                paddingHorizontal: 6.8,
                borderBottomWidth: 0.75,
                borderBottomColor: Q.border,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>{price.label}</Text>
            </View>
            <View style={{ paddingHorizontal: 6.8, paddingTop: 6, paddingBottom: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: 'bold' }}>{formatAmount(price.amount)} /-</Text>
              <Text style={{ fontSize: 9, marginTop: 4.2 }}>
                {price.excludesGst ? '(excluding GST)' : '(including GST)'}
              </Text>
              {/* Never print shares that add up to more than the price — the
                  total can change after the split was made. */}
              {price.perPerson &&
                price.perPerson.length > 0 &&
                allocatedTotal(price.perPerson) <= price.amount && (
                  <View
                    style={{
                      marginTop: 7,
                      paddingTop: 5,
                      borderTopWidth: 0.75,
                      borderTopColor: Q.border,
                    }}
                  >
                    <Text
                      style={{ fontSize: 8, fontWeight: 'bold', color: Q.label, letterSpacing: 0.5 }}
                    >
                      PER PERSON
                    </Text>
                    {price.perPerson.map((share, shareIdx) => (
                      <View
                        key={shareIdx}
                        style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}
                      >
                        <Text style={{ fontSize: 9.5 }}>{share.label}</Text>
                        <Text style={{ fontSize: 9.5, fontWeight: 'bold' }}>
                          {formatAmount(share.amount)} /-
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
