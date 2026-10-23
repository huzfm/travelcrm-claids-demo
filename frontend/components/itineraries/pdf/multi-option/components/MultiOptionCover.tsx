// Multi-Option Cover Page Component - Duplicated for full isolation
// Admin-uploaded hero image fills the top 75% of the page; the bottom 25% is
// split into trip details (left) and the holiday consultant (right).

import { Page, Text, View } from '@react-pdf/renderer';
import { styles, formatPaxSummary } from '../styles';
import { colors } from '../styles';
import { PDFImage } from './PDFImage';
import { CoverFooter } from './CoverFooter';
import type { Itinerary, ItineraryDay, ItineraryOption } from '@/types/index';

interface MultiOptionCoverProps {
  itinerary: Itinerary;
  days: ItineraryDay[];
  options: ItineraryOption[];
  branchName?: string;
  branchEmail?: string;
  branchAddress?: string;
  branchContact?: string;
  currency?: string;
  pageNumber?: number;
  totalPages?: number;
}

// "05 Jun 2026" — short month, with year.
function formatCoverDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const MultiOptionCover = ({ itinerary, days }: MultiOptionCoverProps) => {
  const clientName = itinerary.clientName || itinerary.lead?.name || 'Valued Guest';
  const salutation = itinerary.salutation || 'Mr';
  const startDate = itinerary.startDate || '';
  const endDate = itinerary.endDate || '';
  const paxSummary = formatPaxSummary(itinerary.adults, itinerary.children, itinerary.childrenAges);
  const tripId = itinerary.tripId ? `#${itinerary.tripId}` : 'N/A';
  const consultantName = itinerary.creator?.name;
  const consultantPhoto = itinerary.creator?.avatarUrl;

  const nights = Math.max(0, (days?.length || 0) - 1);
  const durationText = days?.length ? `${nights}N/${days.length}D` : '';

  return (
    <Page size="A4" style={styles.fullPage}>
      <View style={{ height: '75%', width: '100%', backgroundColor: colors.lightPurple }}>
        <PDFImage
          src={itinerary.coverImage || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          placeholder={itinerary.destination || 'Cover image'}
        />
      </View>

      <View style={{ flex: 1, width: '100%', flexDirection: 'column', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row' }}>
          {/* Left — trip details, lifted onto a tinted card with its own accent rail */}
          <View style={{ flex: 1.7, flexDirection: 'row' }}>
            <View style={{ width: 4, backgroundColor: colors.primary }} />
            <View
              style={{
                flex: 1,
                padding: 24,
                paddingTop: 20,
                backgroundColor: colors.lightPurple,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={coverLabelStyle}>TRIP ID</Text>
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: colors.primary,
                    borderRadius: 3,
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 700 as const, color: colors.white }}>
                    {tripId}
                  </Text>
                </View>
              </View>

              <Text style={{ ...coverValueStyle, marginTop: 14 }}>
                {salutation}. {clientName}
              </Text>
              {paxSummary && (
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                  {paxSummary}
                </Text>
              )}

              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginTop: 14,
                  marginBottom: 10,
                }}
              />

              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Text style={coverDateLabelStyle}>STARTS</Text>
                  <Text style={coverDateValueStyle}>{formatCoverDate(startDate)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={coverDateLabelStyle}>ENDS</Text>
                  <Text style={coverDateValueStyle}>{formatCoverDate(endDate)}</Text>
                </View>
                {durationText && (
                  <View
                    style={{
                      backgroundColor: colors.white,
                      borderRadius: 3,
                      borderWidth: 1,
                      borderColor: colors.primary,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: 700 as const, color: colors.primary }}>
                      {durationText}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 24 }} />

          {/* Right — holiday consultant */}
          {consultantName && (
            <View style={{ flex: 1, padding: 24, paddingTop: 26, alignItems: 'flex-start' }}>
              <Text style={{ ...coverLabelStyle, marginBottom: 10 }}>YOUR HOLIDAY CONSULTANT</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    overflow: 'hidden',
                    marginRight: 8,
                    backgroundColor: colors.lightPurple,
                  }}
                >
                  <PDFImage
                    src={consultantPhoto || ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    placeholder={consultantName.charAt(0)}
                  />
                </View>
                <Text style={{ ...coverValueStyle, fontSize: 12 }}>{consultantName}</Text>
              </View>
            </View>
          )}
        </View>

        <CoverFooter />
      </View>
    </Page>
  );
};

/* Reusable styles */
const coverLabelStyle = {
  fontSize: 9,
  letterSpacing: 1.2,
  fontWeight: 600 as const,
  color: '#78736f',
};

const coverValueStyle = {
  fontSize: 15,
  fontWeight: 700 as const,
  color: '#1a1918',
};

const coverDateLabelStyle = {
  fontSize: 8,
  letterSpacing: 1,
  fontWeight: 600 as const,
  color: colors.muted,
};

const coverDateValueStyle = {
  fontSize: 12,
  fontWeight: 700 as const,
  color: colors.primary,
  marginTop: 2,
};
