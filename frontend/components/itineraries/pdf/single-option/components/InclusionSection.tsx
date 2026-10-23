// Single-Option Inclusion Section Component

import { Page, Text, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import { parseArray } from '../utils';
import { PDFHeaderSmall } from './Header';
import { PDFFooterSimple } from './Footer';
import type { Quote, ItineraryOption } from '@/types/itinerary.types';

interface InclusionSectionProps {
  included?: string[] | string;
  excluded?: string[] | string;
  quote?: Quote;
  totalCost?: number;
  pageNumber?: number;
  totalPages?: number;
  option?: ItineraryOption;
  optionLabel?: string;
}

export const InclusionSection = ({
  included = [],
  excluded = [],
  quote: _quote,
  totalCost: _totalCost,
  pageNumber = 5,
  totalPages = 6,
  option: _option,
  optionLabel,
}: InclusionSectionProps) => {
  // parseArray handles both array and string (JSON) inputs
  const parsedIncluded = parseArray(included);
  const parsedExcluded = parseArray(excluded);

  return (
    <Page size="A4" style={styles.page}>
      <PDFHeaderSmall
        title={optionLabel || 'Inclusions & Exclusions'}
      />

      <View style={styles.pageContent}>
        {/* Inclusions Card */}
        {parsedIncluded.length > 0 && (
          <View style={styles.inclusionCard}>
            <View style={styles.inclusionCardHeader}>
              <View style={styles.inclusionBadge}>
                <Text style={styles.inclusionBadgeText}>INCLUDED</Text>
              </View>
            </View>
            <View style={styles.inclusionItems}>
              {parsedIncluded.map((item: string, idx: number) => (
                <View key={idx} style={styles.inclusionItem}>
                  <Text style={styles.inclusionDot}> </Text>
                  <Text style={styles.inclusionText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Exclusions Card */}
        {parsedExcluded.length > 0 && (
          <View style={styles.exclusionCard}>
            <View style={styles.exclusionCardHeader}>
              <View style={styles.exclusionBadge}>
                <Text style={styles.exclusionBadgeText}>NOT INCLUDED</Text>
              </View>
            </View>
            <View style={styles.exclusionItems}>
              {parsedExcluded.map((item: string, idx: number) => (
                <View key={idx} style={styles.exclusionItem}>
                  <Text style={styles.exclusionDot}> </Text>
                  <Text style={styles.exclusionText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {parsedIncluded.length === 0 && parsedExcluded.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No inclusions or exclusions specified</Text>
          </View>
        )}
      </View>

      <PDFFooterSimple pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
};
