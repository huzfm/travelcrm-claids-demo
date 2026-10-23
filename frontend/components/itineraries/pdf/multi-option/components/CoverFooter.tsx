// Multi-Option Cover Page Footer - Duplicated for full isolation
// A two-bar banner (company tagline + registration details), structurally
// different from the plain contact-line footer (Footer.tsx) used on every
// other page.

import { Text, View } from '@react-pdf/renderer';
import { colors } from '../styles';
import { COMPANY_NAME, COMPANY_PHONE_TEXT } from '../../company';

export interface CoverFooterFields {
  companyName?: string;
  tagline?: string;
  cin?: string;
  gst?: string;
  phone?: string;
  /** Hex colors set in "Edit PDF"; empty/missing falls back to the defaults below. */
  bannerColor?: string;
  bannerTextColor?: string;
  detailsColor?: string;
  detailsTextColor?: string;
}

const FALLBACK: CoverFooterFields = {
  companyName: COMPANY_NAME,
  tagline: 'Trusted & Registered with the Government of India',
  cin: '',
  gst: '',
  phone: COMPANY_PHONE_TEXT,
};

// Set once per PDF generation (see MultiPDF.tsx) before rendering — same
// module-level pattern as Footer.tsx's setPDFFooterSettings.
let activeFields: CoverFooterFields = FALLBACK;

export function setCoverFooterSettings(fields: CoverFooterFields) {
  // Company name and phone are fixed; the rest still comes from "Edit PDF".
  activeFields = { ...fields, companyName: FALLBACK.companyName, phone: FALLBACK.phone };
}

export const CoverFooter = () => {
  const fields = activeFields;
  const bannerText = [fields.companyName, fields.tagline].filter(Boolean).join(' — ');

  const regItems = [
    { label: 'Reg. CIN No', value: fields.cin },
    { label: 'GST No', value: fields.gst },
    { label: 'Customer Care No 24x7', value: fields.phone },
  ].filter(item => item.value);

  return (
    <View style={{ width: '100%' }} fixed>
      {bannerText && (
        <View
          style={{
            backgroundColor: fields.bannerColor || colors.primaryDark,
            borderBottomWidth: 3,
            borderBottomColor: colors.secondary,
            paddingVertical: 8,
            alignItems: 'center',
          }}
        >
          <Text
            style={{ color: fields.bannerTextColor || colors.white, fontSize: 11, fontWeight: 700 }}
          >
            {bannerText}
          </Text>
        </View>
      )}

      {regItems.length > 0 && (
        <View
          style={{
            backgroundColor: fields.detailsColor || colors.lightBeige,
            paddingVertical: 7,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 8, color: fields.detailsTextColor || colors.text }}>
            {regItems.map((item, index) => (
              <Text key={item.label}>
                {index > 0 ? '   ' : ''}
                {item.label} : <Text style={{ fontWeight: 700 }}>{item.value}</Text>
              </Text>
            ))}
          </Text>
        </View>
      )}
    </View>
  );
};
