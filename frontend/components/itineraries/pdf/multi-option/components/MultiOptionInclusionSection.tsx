// Multi-Option Inclusions & Exclusions Page - One page for all options
// Shows inclusions, exclusions, and pricing summary for all options

import { Page, Text, View } from '@react-pdf/renderer';
import { styles, parseArray } from '../styles';
import { colors } from '../styles';
import { PDFFooterSimple } from './Footer';
import { PDFHeaderSmall } from './Header';
import type { Itinerary, ItineraryOption } from '@/types/index';

interface MultiOptionInclusionSectionProps {
  itinerary: Itinerary;
  options: ItineraryOption[];
  pageNumber?: number;
  totalPages?: number;
  branchName?: string;
  branchEmail?: string;
  branchAddress?: string;
  branchContact?: string;
}

const optionColors = [
  { bg: '#fbe3e3', border: '#db0201', text: '#db0201' },
  { bg: '#fbe3e3', border: '#db0201', text: '#db0201' },
  { bg: '#fbe3e3', border: '#db0201', text: '#db0201' },
  { bg: '#fbe3e3', border: '#db0201', text: '#db0201' },
];

export const MultiOptionInclusionSection = ({
  itinerary,
  options,
  pageNumber,
  totalPages,
}: MultiOptionInclusionSectionProps) => {
  const parsedIncluded = parseArray(itinerary.included);
  const parsedExcluded = parseArray(itinerary.excluded);

  return (
    <Page size="A4" style={styles.page}>
      {/* Brand Header */}
      <PDFHeaderSmall title="Inclusions & Exclusions" />

      <View style={[styles.pageContent, { flex: 1 }]}>
        {/* Two-column layout: Inclusions | Exclusions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {/* Inclusions Column */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                backgroundColor: colors.lightGreen,
                borderRadius: 10,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.inclusionGreenBorder,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.inclusionGreen,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.white, fontSize: 11, fontWeight: 'bold' }}>
                  ✓ INCLUDED
                </Text>
              </View>
              <View style={{ padding: 12 }}>
                {parsedIncluded.length > 0 ? (
                  parsedIncluded.map((item, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.inclusionGreen,
                          marginRight: 8,
                          marginTop: 4,
                        }}
                      />
                      <Text style={{ fontSize: 9, color: colors.text, flex: 1, lineHeight: 1.4 }}>
                        {item}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ fontSize: 9, color: colors.muted, textAlign: 'center' }}>
                    No inclusions specified
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Exclusions Column */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                backgroundColor: colors.lightPurple,
                borderRadius: 10,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.primary,
                  padding: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>
                  ✗ NOT INCLUDED
                </Text>
              </View>
              <View style={{ padding: 12 }}>
                {parsedExcluded.length > 0 ? (
                  parsedExcluded.map((item, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.primary,
                          marginRight: 8,
                          marginTop: 4,
                        }}
                      />
                      <Text style={{ fontSize: 9, color: colors.text, flex: 1, lineHeight: 1.4 }}>
                        {item}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ fontSize: 9, color: colors.muted, textAlign: 'center' }}>
                    No exclusions specified
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Option Features Summary */}
        {options.some(opt => opt.features && opt.features.length > 0) && (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: colors.primaryDark,
                marginBottom: 10,
              }}
            >
              Package-Specific Inclusions
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {options.map((option, optIdx) => {
                const optColor = optionColors[optIdx % optionColors.length];
                const features = option.features || [];

                if (features.length === 0) return null;

                return (
                  <View
                    key={optIdx}
                    style={{
                      flex: 1,
                      minWidth: 150,
                      backgroundColor: optColor.bg,
                      borderWidth: 1,
                      borderColor: optColor.border,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: optColor.border,
                        padding: 6,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
                        {option.name}
                      </Text>
                    </View>
                    <View style={{ padding: 8 }}>
                      {features.slice(0, 5).map((feature, fIdx) => (
                        <View
                          key={fIdx}
                          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                        >
                          <Text style={{ fontSize: 8, color: optColor.text, marginRight: 4 }}>
                            ✓
                          </Text>
                          <Text style={{ fontSize: 8, color: colors.text }}>{feature}</Text>
                        </View>
                      ))}
                      {features.length > 5 && (
                        <Text style={{ fontSize: 8, color: colors.muted }}>
                          +{features.length - 5} more
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <PDFFooterSimple pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
};
