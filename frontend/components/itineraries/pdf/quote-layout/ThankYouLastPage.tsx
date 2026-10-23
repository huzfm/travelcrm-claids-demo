// The structured Thank You page from "Edit PDF": optional logo, "Thank you,
// {clientName}", a message, the promise strip, the Prepared By card, contact
// cards and Follow Us links — centred on the page. Every text is admin-edited
// and may use {placeholders}; an empty section is simply left out.

import { Image, Link, Page, Text, View } from '@react-pdf/renderer';
import { fillPlaceholders, toHref } from '../single-option/components/CustomThankYouContent';
import { FOOTER_DEFAULTS, PageFooterBar } from './Footers';
import { Q, quotePageStyle } from './theme';
import type { PDFFooterFields, ThankYouPageContent } from '@/hooks/useSettings';

const MUTED = '#64748b';
const CARD_BORDER = '#dbe4ea';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Mixes a #RRGGBB colour with white — `amount` 0 is white, 1 the colour itself. */
const tint = (hex: string, amount: number): string => {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `#${channels
    .map(c => Math.round(255 - (255 - c) * amount).toString(16).padStart(2, '0'))
    .join('')}`;
};

const SectionLabel = ({ children }: { children: string }) => (
  <Text
    style={{
      fontSize: 7.5,
      color: MUTED,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 8,
      textAlign: 'center',
    }}
  >
    {children}
  </Text>
);

export const ThankYouLastPage = ({
  content,
  logoSrc,
  footer,
  values,
}: {
  content: ThankYouPageContent;
  /** Already resolved: null when the logo is switched off or unreadable. */
  logoSrc: string | null;
  footer: PDFFooterFields | null;
  /** Values for {placeholder} tokens in every text. */
  values: Record<string, string>;
}) => {
  const fill = (text?: string) => fillPlaceholders((text || '').trim(), values);
  const accent = [content.accentColor, footer?.backgroundColor].find(
    (c): c is string => !!c && HEX_COLOR.test(c)
  ) ?? FOOTER_DEFAULTS.footerBg;

  const title = fill(content.title);
  const message = fill(content.message);
  const promiseTitle = fill(content.promiseTitle);
  const promiseItems = (content.promiseItems || []).map(fill).filter(Boolean);
  const preparedByName = fill(content.preparedByName);
  const preparedBySubtitle = fill(content.preparedBySubtitle);
  const contacts = (content.contacts || [])
    .map(c => ({ label: fill(c.label), value: fill(c.value) }))
    .filter(c => c.value);
  const socials = (content.socials || [])
    .map(s => ({ label: fill(s.label), url: s.url?.trim() }))
    .filter((s): s is { label: string; url: string } => !!s.label && !!s.url);

  return (
    <Page size="A4" style={{ ...quotePageStyle, backgroundColor: Q.white }}>
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}
      >
        {logoSrc ? (
          <Image
            src={logoSrc}
            style={{ width: 320, height: 200, objectFit: 'contain', marginBottom: 22 }}
          />
        ) : null}

        {title ? (
          <Text
            style={{
              fontSize: 26,
              fontWeight: 'bold',
              color: accent,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {title}
          </Text>
        ) : null}

        {message ? (
          <Text
            style={{
              fontSize: 10.5,
              color: Q.text,
              textAlign: 'center',
              lineHeight: 1.5,
              maxWidth: 440,
              marginBottom: 10,
            }}
          >
            {message}
          </Text>
        ) : null}

        {title || message ? (
          <View style={{ width: 60, height: 3, backgroundColor: accent, marginBottom: 20 }} />
        ) : null}

        {promiseTitle || promiseItems.length > 0 ? (
          <View
            style={{
              width: 410,
              alignItems: 'center',
              paddingVertical: 11,
              paddingHorizontal: 14,
              backgroundColor: tint(accent, 0.1),
              borderWidth: 0.75,
              borderColor: tint(accent, 0.25),
              borderRadius: 6,
              marginBottom: 22,
            }}
          >
            {promiseTitle ? (
              <Text
                style={{
                  fontSize: 8.5,
                  fontWeight: 'bold',
                  color: accent,
                  textTransform: 'uppercase',
                  letterSpacing: 1.4,
                  marginBottom: promiseItems.length ? 7 : 0,
                  textAlign: 'center',
                }}
              >
                {promiseTitle}
              </Text>
            ) : null}
            {promiseItems.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {promiseItems.map((item, idx) => (
                  <Text key={idx} style={{ fontSize: 8, color: Q.text, marginBottom: 3 }}>
                    {item}
                    {idx < promiseItems.length - 1 ? '   |   ' : ''}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {preparedByName || preparedBySubtitle ? (
          <View
            style={{
              width: 310,
              alignItems: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
              backgroundColor: '#f8fafc',
              borderWidth: 0.75,
              borderColor: CARD_BORDER,
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <SectionLabel>Prepared By</SectionLabel>
            {preparedByName ? (
              <Text
                style={{ fontSize: 15, fontWeight: 'bold', color: accent, textAlign: 'center' }}
              >
                {preparedByName}
              </Text>
            ) : null}
            {preparedBySubtitle ? (
              <Text style={{ fontSize: 8, color: MUTED, marginTop: 4, textAlign: 'center' }}>
                {preparedBySubtitle}
              </Text>
            ) : null}
          </View>
        ) : null}

        {contacts.length > 0 ? (
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <SectionLabel>Contact Information</SectionLabel>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: 500,
              }}
            >
              {contacts.map((contact, idx) => (
                <View
                  key={idx}
                  style={{
                    minWidth: 170,
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    margin: 4,
                    backgroundColor: Q.white,
                    borderWidth: 0.75,
                    borderColor: CARD_BORDER,
                    borderRadius: 6,
                  }}
                >
                  {contact.label ? (
                    <Text style={{ fontSize: 7, color: MUTED, marginBottom: 4 }}>
                      {contact.label}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 9, color: Q.text, textAlign: 'center' }}>
                    {contact.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {socials.length > 0 ? (
          <View style={{ alignItems: 'center' }}>
            <SectionLabel>Follow Us</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              {socials.map((social, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {idx > 0 ? (
                    <Text style={{ fontSize: 9, color: accent, marginHorizontal: 6 }}>•</Text>
                  ) : null}
                  <Link
                    src={toHref(social.url)}
                    style={{
                      fontSize: 9,
                      fontWeight: 'bold',
                      color: accent,
                      textDecoration: 'underline',
                    }}
                  >
                    {social.label}
                  </Link>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
      <PageFooterBar fields={footer} />
    </Page>
  );
};
