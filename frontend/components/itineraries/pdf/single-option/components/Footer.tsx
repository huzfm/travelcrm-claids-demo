// Single-Option PDF Footer Component — used on every page except the cover
// (see CoverFooter.tsx for that one).

import { Text, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import { COMPANY_EMAIL, COMPANY_PHONES } from '../../company';

export interface PDFFooterFields {
  /** Plain text items joined by "|" — an arbitrary, admin-edited list. */
  items?: string[];
  /** Hex colors set in "Edit PDF"; empty/missing falls back to the brand defaults in styles.ts. */
  backgroundColor?: string;
  textColor?: string;
}

const FALLBACK_FOOTER: PDFFooterFields = {
  items: [...COMPANY_PHONES, COMPANY_EMAIL],
};

// Set once per PDF generation (see SinglePDF.tsx) before rendering — every
// PDFFooter call site reads from here rather than fetching or being threaded
// the settings itself, since the same admin-set values apply document-wide.
// Module-level like image-preload.ts's cache: safe because one tab generates
// one PDF at a time.
let activeFooter: PDFFooterFields = FALLBACK_FOOTER;

export function setPDFFooterSettings(fields: PDFFooterFields) {
  // Only the colors come from "Edit PDF" — the contact line is always the company's.
  activeFooter = { ...fields, items: FALLBACK_FOOTER.items };
}

const FooterContent = ({ fields }: { fields: PDFFooterFields }) => {
  const parts = (fields.items || []).filter(Boolean);
  const textColor = fields.textColor ? { color: fields.textColor } : {};
  return (
    <View
      style={[styles.footer, fields.backgroundColor ? { backgroundColor: fields.backgroundColor } : {}]}
      fixed
    >
      <View style={styles.footerLeft}>
        <View style={styles.footerContactRow}>
          {parts.map((part, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {index > 0 && <Text style={[styles.footerSpacer, textColor]}>|</Text>}
              <Text style={[styles.footerBranchInfo, textColor]}>{part}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

interface PDFFooterProps {
  pageNumber?: number;
  totalPages?: number;
  bookingRef?: string;
  showThankYou?: boolean;
}

export const PDFFooter = (_props?: PDFFooterProps) => <FooterContent fields={activeFooter} />;

export const PDFFooterSimple = (_props?: {
  pageNumber?: number;
  totalPages?: number;
  bookingRef?: string;
}) => <FooterContent fields={activeFooter} />;
