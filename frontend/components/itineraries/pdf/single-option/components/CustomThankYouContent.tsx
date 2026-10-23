// Single-Option Custom Thank You Page Content
// Admin-configured via the "Edit PDF" settings page: one large image covering
// most of the page, one text box, and Facebook / Instagram / Website buttons.
// The text may use {placeholders}, filled in per itinerary, e.g. "Thank you, {clientName}".

import { Link, Text, View } from '@react-pdf/renderer';
import { colors } from '../styles';
import { PDFImage } from './PDFImage';
import type { CustomLastPageSettings } from '@/hooks/useSettings';

interface CustomThankYouContentProps {
  settings: CustomLastPageSettings;
  /** Values for {placeholder} tokens in the text. */
  values: Record<string, string>;
}

// ~82% of an A4 page (842pt tall) — leaves room for the text, buttons and footer.
const IMAGE_HEIGHT = 690;

// Unknown tokens are left as typed so a typo is visible rather than silently dropped.
export const fillPlaceholders = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match));

// Links typed without a scheme ("www.example.com") would otherwise open as relative paths.
export const toHref = (url: string) => (/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);

export const CustomThankYouContent = ({ settings, values }: CustomThankYouContentProps) => {
  const buttons = [
    { label: 'Facebook', url: settings.facebookUrl?.trim() },
    { label: 'Instagram', url: settings.instagramUrl?.trim() },
    { label: 'Website', url: settings.websiteUrl?.trim() },
  ].filter((b): b is { label: string; url: string } => !!b.url);

  return (
    <View style={{ flex: 1 }}>
      {settings.imageUrl ? (
        <PDFImage
          src={settings.imageUrl}
          style={{ width: '100%', height: IMAGE_HEIGHT, objectFit: 'cover' as const }}
          placeholder="Image"
        />
      ) : null}

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 40,
          paddingBottom: 30,
        }}
      >
        {settings.text?.trim() ? (
          <Text
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: colors.primary,
              textAlign: 'center',
              lineHeight: 1.4,
              marginBottom: 10,
            }}
          >
            {fillPlaceholders(settings.text.trim(), values)}
          </Text>
        ) : null}

        {buttons.length > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            {buttons.map(button => (
              <Link key={button.label} src={toHref(button.url)} style={{ textDecoration: 'none' }}>
                <View
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    paddingVertical: 5,
                    paddingHorizontal: 16,
                    marginHorizontal: 5,
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: 700, color: '#ffffff' }}>
                    {button.label}
                  </Text>
                </View>
              </Link>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};
