// Page-level pieces shared by the single- and multi-option quote documents:
// the plain content page (watermark + footer bar), the last page, and the
// resolution of "Edit PDF" settings into what the pages render.
//
// The cover design and last page only ever come from "Edit PDF" — with nothing
// uploaded the cover is a plain text cover, and with the last page switched
// off it is left out. Both footers are text + colours from "Edit PDF" (see Footers.tsx).

import { Image, Page, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { CustomThankYouContent } from '../single-option/components/CustomThankYouContent';
import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE_TEXT } from '../company';
import { DEFAULT_PDF_TERMS, normalizeTermsLibrary, type PDFTermsSettings } from './defaults';
import {
  A4_HEIGHT,
  A4_WIDTH,
  DEFAULT_ASSETS,
  PageWatermark,
  ensureQuoteFonts,
  isImageSrc,
  pdfAsset,
  quotePageStyle,
  watermarkText,
} from './theme';
import { PageFooterBar } from './Footers';
import { ThankYouLastPage } from './ThankYouLastPage';
import type {
  CustomLastPageSettings,
  PDFCoverFooterFields,
  PDFFooterFields,
  PDFSettings,
  ThankYouPageContent,
} from '@/hooks/useSettings';

export interface QuoteAssets {
  /** Uploaded cover design; null renders the plain text cover. */
  coverSrc: string | null;
  /** Contact bar on every content page. */
  footer: PDFFooterFields | null;
  /** Two-bar banner at the bottom of the cover. */
  coverFooter: PDFCoverFooterFields | null;
  logoSrc: string;
  /** Structured Thank You page, full-page image, image + text page, or no last page at all. */
  lastPage:
    | { kind: 'thankYou'; content: ThankYouPageContent; logoSrc: string | null }
    | { kind: 'image'; src: string }
    | { kind: 'custom'; settings: CustomLastPageSettings }
    | null;
  terms: PDFTermsSettings;
}

type Preload = (url: string | null | undefined) => Promise<string | undefined>;

/**
 * Turns the shared "Edit PDF" settings into ready-to-render sources. Uploaded images go through `preload` (to data URLs) so the render never
 * makes a cross-origin fetch.
 */
export async function resolveQuoteAssets(
  settings: PDFSettings | undefined,
  preload: Preload
): Promise<QuoteAssets> {
  ensureQuoteFonts();
  const custom = settings?.customLastPage;
  const thankYou =
    custom?.enabled && custom.layout === 'thankYou' && custom.thankYou ? custom.thankYou : null;
  const imageLayout = custom?.enabled && !thankYou ? custom : undefined;
  const customHasText = !!imageLayout?.text?.trim();
  const customImage = imageLayout?.imageUrl;
  const thankYouLogo = thankYou?.showLogo ? thankYou.logoUrl?.trim() : undefined;
  const logoSrc = pdfAsset(DEFAULT_ASSETS.logo);

  const [cover, lastImage, uploadedLogo] = await Promise.all([
    settings?.coverImage ? preload(settings.coverImage) : undefined,
    !customHasText && customImage ? preload(customImage) : undefined,
    thankYouLogo ? preload(thankYouLogo) : undefined,
  ]);

  return {
    coverSrc: isImageSrc(cover) ? cover : null,
    footer: settings?.footer ?? null,
    coverFooter: settings?.coverFooter ?? null,
    logoSrc,
    lastPage: thankYou
      ? {
          kind: 'thankYou',
          content: thankYou,
          // No upload (or an unreadable one) falls back to the bundled logo.
          logoSrc: thankYou.showLogo ? (isImageSrc(uploadedLogo) ? uploadedLogo : logoSrc) : null,
        }
      : customHasText && imageLayout
        ? { kind: 'custom', settings: imageLayout }
        : isImageSrc(lastImage)
          ? { kind: 'image', src: lastImage }
          : null,
    terms: settings?.terms ? normalizeTermsLibrary(settings.terms) : DEFAULT_PDF_TERMS,
  };
}

/** No uploads at all — for renders that never loaded the settings (previews). */
export function defaultQuoteAssets(): QuoteAssets {
  ensureQuoteFonts();
  return {
    coverSrc: null,
    footer: null,
    coverFooter: null,
    logoSrc: pdfAsset(DEFAULT_ASSETS.logo),
    lastPage: null,
    terms: DEFAULT_PDF_TERMS,
  };
}

/** A4 width, half its height — for short sections that shouldn't take a whole page. */
export const HALF_A4: [number, number] = [595.28, 420.95];

/** A document-style page: watermark behind, footer bar fixed at the bottom, content wraps. */
export const QuotePage = ({
  footer,
  tripId,
  size = 'A4',
  children,
}: {
  footer: PDFFooterFields | null;
  tripId?: string | null;
  /** Defaults to A4; pass HALF_A4 for a half-height page. */
  size?: 'A4' | [number, number];
  children: ReactNode;
}) => (
  <Page size={size} style={quotePageStyle} wrap>
    <PageWatermark text={watermarkText(COMPANY_NAME, tripId)} />
    {children}
    <PageFooterBar fields={footer} />
  </Page>
);

export const QuoteLastPage = ({
  assets,
  clientName,
}: {
  assets: QuoteAssets;
  clientName: string;
}) => {
  if (!assets.lastPage) return null;
  if (assets.lastPage.kind === 'thankYou') {
    return (
      <ThankYouLastPage
        content={assets.lastPage.content}
        logoSrc={assets.lastPage.logoSrc}
        footer={assets.footer}
        values={{
          clientName,
          companyName: COMPANY_NAME,
          branchName: COMPANY_NAME,
          whatsapp: COMPANY_PHONE_TEXT,
          phone: COMPANY_PHONE_TEXT,
          email: COMPANY_EMAIL,
          address: assets.terms.address,
        }}
      />
    );
  }
  if (assets.lastPage.kind === 'custom') {
    return (
      <Page
        size="A4"
        style={{ ...quotePageStyle, paddingTop: 0, paddingHorizontal: 0 }}
      >
        <CustomThankYouContent
          settings={assets.lastPage.settings}
          values={{
            clientName,
            branchName: COMPANY_NAME,
            whatsapp: COMPANY_PHONE_TEXT,
            email: COMPANY_EMAIL,
            address: assets.terms.address,
            country: '',
          }}
        />
        <PageFooterBar fields={assets.footer} />
      </Page>
    );
  }
  return (
    <Page size="A4" style={{ backgroundColor: '#ffffff' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, width: A4_WIDTH, height: A4_HEIGHT }}>
        {/* Stretched to the page like the reference, not cropped — it's a designed page. */}
        <Image src={assets.lastPage.src} style={{ width: A4_WIDTH, height: A4_HEIGHT, objectFit: 'fill' }} />
      </View>
    </Page>
  );
};
