// The two footers set in "Edit PDF": a two-bar banner on the cover (company +
// tagline, then registration details) and a coloured contact bar on every
// other page. Text and colours are the admin's; empty values fall back to the
// company identity and brand colours.

import { Text, View } from '@react-pdf/renderer';
import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONES, COMPANY_PHONE_TEXT } from '../company';
import { FOOTER_HEIGHT } from './theme';
import type { PDFCoverFooterFields, PDFFooterFields } from '@/hooks/useSettings';

/** Defaults — keep in sync with DEFAULT_COLORS on the Edit PDF page. */
export const FOOTER_DEFAULTS = {
  footerBg: '#db0201',
  footerText: '#FFFFFF',
  coverBanner: '#1A1A1A',
  coverBannerText: '#FFFFFF',
  coverDetails: '#F7F7F7',
  coverDetailsText: '#1A1A1A',
};

/** Contact bar fixed to the bottom of every content page. */
export const PageFooterBar = ({ fields }: { fields?: PDFFooterFields | null }) => {
  const items = (fields?.items || []).map(item => item.trim()).filter(Boolean);
  const parts = items.length ? items : [...COMPANY_PHONES, COMPANY_EMAIL];
  const color = fields?.textColor || FOOTER_DEFAULTS.footerText;
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: FOOTER_HEIGHT,
        paddingHorizontal: 24,
        backgroundColor: fields?.backgroundColor || FOOTER_DEFAULTS.footerBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 9, fontWeight: 'bold', color, textAlign: 'center' }}>
        {parts.join('   |   ')}
      </Text>
    </View>
  );
};

/** Two-bar banner across the bottom of the cover page — the last item in its flex column. */
export const CoverFooterBanner = ({ fields }: { fields?: PDFCoverFooterFields | null }) => {
  const companyName = fields?.companyName?.trim() || COMPANY_NAME;
  const bannerText = [companyName, fields?.tagline?.trim()].filter(Boolean).join(' — ');
  const regItems = [
    { label: 'Reg. CIN No', value: fields?.cin?.trim() },
    { label: 'GST No', value: fields?.gst?.trim() },
    { label: 'Customer Care No 24x7', value: fields?.phone?.trim() || COMPANY_PHONE_TEXT },
  ].filter(item => item.value);

  return (
    <View style={{ flexShrink: 0 }}>
      <View
        style={{
          backgroundColor: fields?.bannerColor || FOOTER_DEFAULTS.coverBanner,
          borderBottomWidth: 3,
          borderBottomColor: FOOTER_DEFAULTS.footerBg,
          paddingVertical: 8,
          paddingHorizontal: 18,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: 'bold',
            textAlign: 'center',
            color: fields?.bannerTextColor || FOOTER_DEFAULTS.coverBannerText,
          }}
        >
          {bannerText}
        </Text>
      </View>
      {regItems.length > 0 && (
        <View
          style={{
            backgroundColor: fields?.detailsColor || FOOTER_DEFAULTS.coverDetails,
            paddingVertical: 7,
            paddingHorizontal: 18,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 8,
              textAlign: 'center',
              color: fields?.detailsTextColor || FOOTER_DEFAULTS.coverDetailsText,
            }}
          >
            {regItems.map((item, index) => (
              <Text key={item.label}>
                {index > 0 ? '     ' : ''}
                {item.label} : <Text style={{ fontWeight: 'bold' }}>{item.value}</Text>
              </Text>
            ))}
          </Text>
        </View>
      )}
    </View>
  );
};
