// Single-Option Thank You Page Component

import { Page, Text, View, Image } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import { PDFFooter } from './Footer';
import { CustomThankYouContent } from './CustomThankYouContent';
import { COMPANY_NAME, COMPANY_EMAIL, COMPANY_PHONE_TEXT } from '../../company';
import type { CustomLastPageSettings } from '@/hooks/useSettings';
import type { Itinerary } from '@/types/itinerary.types';

interface ThankYouPageProps {
  pageNumber?: number;
  totalPages?: number;
  itinerary?: Itinerary;
  branchName?: string;
  branchContact?: string;
  branchNumber?: string;
  officeAddress?: string;
  logoUrl?: string;
  /** Admin-configured page from "Edit PDF" — when set it replaces the default content. */
  custom?: CustomLastPageSettings;
}

export const ThankYouPage = ({
  pageNumber,
  totalPages,
  itinerary,
  logoUrl: logoProp,
  custom,
}: ThankYouPageProps) => {
  const clientName = itinerary?.lead?.name || 'Valued Guest';

  if (custom) {
    return (
      <Page size="A4" style={styles.page}>
        <CustomThankYouContent
          settings={custom}
          values={{
            clientName,
            branchName: COMPANY_NAME,
            whatsapp: COMPANY_PHONE_TEXT,
            email: COMPANY_EMAIL,
            address: '',
            country: '',
          }}
        />
        <PDFFooter pageNumber={pageNumber} totalPages={totalPages} showThankYou />
      </Page>
    );
  }

  return (
    <Page size="A4" style={styles.page}>
      {/* Full height container for vertical centering */}
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}
      >
        {(() => {
          // Prefer preloaded data URL if provided via props
          const resolvedLogo = logoProp || '';

          // If the resolved logo is already a data/blob/http URL, use as-is.
          // Otherwise prefix with origin for absolute-served assets (starting with '/').
          let displayLogo = resolvedLogo;
          if (resolvedLogo) {
            const isData = /^data:/i.test(resolvedLogo);
            const isBlob = /^blob:/i.test(resolvedLogo);
            const isHttp = /^https?:\/\//i.test(resolvedLogo);
            if (!isData && !isBlob && !isHttp) {
              // prefix leading-slash paths with origin, otherwise add slash
              if (resolvedLogo.startsWith('/')) {
                displayLogo =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${resolvedLogo}`
                    : resolvedLogo;
              } else {
                displayLogo =
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/${resolvedLogo}`
                    : resolvedLogo;
              }
            }
          }

          return (
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                borderWidth: 0,
                borderColor: 'transparent',
                backgroundColor: 'transparent',
              }}
            >
              {displayLogo ? (
                <Image src={displayLogo} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: 'bold' }}>C</Text>
              )}
            </View>
          );
        })()}

        {/* Thank You Text */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.primary,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Thankyou, {clientName}
        </Text>

        <Text
          style={{
            fontSize: 11,
            color: colors.text,
            marginBottom: 6,
            textAlign: 'center',
            maxWidth: 420,
            lineHeight: 1.5,
          }}
        >
          Thank you for choosing {COMPANY_NAME}. We look forward to creating unforgettable travel
          experiences for you.
        </Text>

        {/* Divider */}
        <View
          style={{
            width: 60,
            height: 3,
            backgroundColor: colors.primary,
            marginBottom: 16,
          }}
        />

        {/* Company promise (trust strip) */}
        <View
          style={{
            marginBottom: 18,
            alignItems: 'center',
            width: 380,
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: colors.lightPurple,
            borderRadius: 8,
            borderWidth: 0.75,
            borderColor: '#E8CFCE',
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: 'bold',
              color: colors.primary,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {COMPANY_NAME} Promise
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {[
              'No Hidden Charges',
              'Dedicated Trip Coordinator',
              'Real Time Support',
              'Trusted Local Partners',
              'Safe & Comfortable Travel',
            ].map((label, idx, arr) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginHorizontal: 4,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    color: colors.primary,
                    fontWeight: 'bold',
                    marginRight: 4,
                  }}
                >
                  ✓
                </Text>
                <Text style={{ fontSize: 9, color: colors.primaryDark }}>{label}</Text>
                {idx < arr.length - 1 && (
                  <Text
                    style={{
                      fontSize: 9,
                      color: '#000000',
                      marginLeft: 8,
                    }}
                  >
                    |
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Prepared By Card */}
        <View
          style={{
            backgroundColor: '#fafaf9',
            padding: 16,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            marginBottom: 16,
            minWidth: 280,
          }}
        >
          <Text
            style={{
              fontSize: 8,
              color: '#78736f',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            Prepared By
          </Text>
          <Text
            style={{ fontSize: 16, color: colors.primary, fontWeight: 'bold', marginBottom: 4 }}
          >
            {COMPANY_NAME}
          </Text>
        </View>

        {/* Contact Info */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 8,
              color: '#78736f',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 10,
            }}
          >
            Contact Information
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: 8,
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: 4,
            }}
          >
            <View
              style={{
                backgroundColor: '#ffffff',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: colors.border,
                minWidth: 140,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 8, color: '#78736f', marginBottom: 4 }}>Phone</Text>
              <Text style={{ fontSize: 10, color: colors.primaryDark }}>{COMPANY_PHONE_TEXT}</Text>
            </View>

            <View
              style={{
                backgroundColor: '#ffffff',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: colors.border,
                minWidth: 140,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 8, color: '#78736f', marginBottom: 4 }}>Email</Text>
              <Text style={{ fontSize: 10, color: colors.primaryDark }}>{COMPANY_EMAIL}</Text>
            </View>
          </View>
        </View>
      </View>

      <PDFFooter pageNumber={pageNumber} totalPages={totalPages} showThankYou />
    </Page>
  );
};
