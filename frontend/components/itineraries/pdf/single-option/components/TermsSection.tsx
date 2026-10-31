// Single-Option Terms Section Component

import { Page, Text, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import { parseArray } from '../utils';
import { PDFHeaderSmall } from './Header';
import { PDFFooter } from './Footer';

interface TermsSectionProps {
  terms?: string;
  notes?: string;
  pageNumber?: number;
  totalPages?: number;
}

const defaultTerms = [
"All bookings are considered confirmed only after receipt of the required advance payment.",
  "Claids Travel reserves the right to refuse or cancel any booking due to operational, legal, or security reasons.",
  "All communication and booking confirmations issued through official company channels shall be considered valid.",
  "Package prices are confidential and intended solely for the recipient.",
  "Any modification requested after confirmation may attract additional charges.",
  "The company reserves the right to substitute hotels, vehicles, or services with equivalent alternatives when necessary.",
  "Guests are expected to comply with local laws, hotel regulations, and destination guidelines throughout the journey.",
  "Claids Travel acts only as a facilitator between guests and service providers including hotels, airlines, transport operators, and attractions.",
  "The company shall not be held responsible for service interruptions caused by weather conditions, natural disasters, strikes, government restrictions, or other force majeure events.",
  "By confirming the booking, the guest acknowledges and agrees to all company policies and booking conditions."
];

export const TermsSection = ({
  terms,
  notes,
  pageNumber = 6,
  totalPages = 6,
}: TermsSectionProps) => {
  // parseArray handles both string and array inputs
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
                {customTerms.map((term: string, idx: number) => (
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
