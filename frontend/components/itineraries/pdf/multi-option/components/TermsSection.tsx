// Terms Section Component - Duplicated for full isolation

import { Page, Text, View } from '@react-pdf/renderer';
import { styles, parseArray } from '../styles';
import { PDFHeaderSmall } from './Header';
import { PDFFooter } from './Footer';

interface TermsSectionProps {
  terms?: string;
  notes?: string;
  pageNumber?: number;
  totalPages?: number;
}

const defaultTerms = [
  'Check-in time: 12:00 PM | Check-out time: 11:00 AM',
  'Early check-in/late check-out subject to availability',
  'Prices subject to change based on availability and season',
  'Cancellation charges as per hotel/tour policy',
  'Company not responsible for personal injury, theft, or loss',
  'Itinerary subject to change based on weather/transit conditions',
];

export const TermsSection = ({
  terms,
  notes,
  pageNumber = 6,
  totalPages = 6,
}: TermsSectionProps) => {
  const customTerms = parseArray(terms);

  return (
    <Page size="A4" style={styles.page}>
      <PDFHeaderSmall title="Important Information" />

      <View style={styles.pageContent}>
        {/* Terms & Conditions Card */}
        <View style={styles.termsCard}>
          <View style={styles.termsCardHeader}>
            <View style={styles.termsBadge}>
              <Text style={styles.termsBadgeText}>TERMS & CONDITIONS</Text>
            </View>
          </View>

          <View style={styles.termsCardContent}>
            {/* Pre-defined Terms */}
            <Text style={styles.termsSectionLabel}>Standard Terms</Text>
            {defaultTerms.map((term, idx) => (
              <View key={`default-${idx}`} style={styles.termsItem}>
                <Text style={styles.termsDot}> </Text>
                <Text style={styles.termsItemText}>{term}</Text>
              </View>
            ))}

            {/* Custom Terms */}
            {customTerms.length > 0 && (
              <>
                <Text style={styles.termsSectionLabel}>Custom Terms</Text>
                {customTerms.map((term, idx) => (
                  <View key={`custom-${idx}`} style={styles.termsItem}>
                    <Text style={styles.termsDotOrange}> </Text>
                    <Text style={styles.termsItemText}>{term}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Additional Notes Card */}
        {notes && (
          <View style={styles.notesCard}>
            <View style={styles.notesCardHeader}>
              <View style={styles.notesBadge}>
                <Text style={styles.notesBadgeText}>NOTES</Text>
              </View>
            </View>
            <View style={styles.notesCardContent}>
              <Text style={styles.notesCardText}>{notes}</Text>
            </View>
          </View>
        )}
      </View>

      <PDFFooter pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
};
