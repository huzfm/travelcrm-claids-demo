// Single-Option PDF Document - Fully isolated implementation

'use client';

import React from 'react';
import { pdf, Document } from '@react-pdf/renderer';
import api from '@/lib/axios';

import { QuoteCover } from '../quote-layout/QuoteCover';
import { QuoteIntro } from '../quote-layout/QuoteIntro';
import { HotelStays, groupStaysByHotel } from '../quote-layout/HotelStays';
import {
  DayWiseBlock,
  FlightsBlock,
  InclusionCards,
  TermsBlock,
  TransportTable,
  daysWithContent,
  itineraryTermSections,
  printableFlights,
  transportSummary,
} from '../quote-layout/FlowSections';
import {
  QuoteLastPage,
  HALF_A4,
  QuotePage,
  defaultQuoteAssets,
  resolveQuoteAssets,
  type QuoteAssets,
} from '../quote-layout/QuotePages';
import { toList } from '../quote-layout/theme';
import { COMPANY_NAME } from '../company';
import type { PDFSettings } from '@/hooks/useSettings';

import type { Itinerary, ItineraryDay, Quote } from '@/types/index';

// ============================================================
// TYPES
// ============================================================

export type ImageQuality = 'draft' | 'normal' | 'high';

export interface SinglePDFProps {
  itinerary: Itinerary;
  days: ItineraryDay[];
  quote?: Quote;
  branchName?: string;
  branchEmail?: string;
  branchAddress?: string;
  branchInstagram?: string;
  currency?: string;
  imageQuality?: ImageQuality;
  /** Cover, footer, last page and terms resolved from "Edit PDF"; bundled defaults when omitted. */
  assets?: QuoteAssets;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// The cover image and both footers are shared by every itinerary's PDF, set
// once from the sidebar's "Edit PDF" page — not per-itinerary fields.
async function fetchPdfSettings(): Promise<PDFSettings | undefined> {
  try {
    const response = await api.get<{ success: boolean; data: PDFSettings }>('/settings/pdf');
    return response.data?.data;
  } catch {
    return undefined;
  }
}

// ============================================================
// SINGLE OPTION PDF DOCUMENT COMPONENT
// ============================================================
// Laid out like the client's reference quote: cover, quote page, hotels page,
// then transport → day-wise → inclusions → terms flowing across as many pages
// as they need, and a full-page closing image.
const SingleOptionPDFDocument = ({ itinerary, days, quote, currency = 'INR', assets }: SinglePDFProps) => {
  const resolved = assets ?? defaultQuoteAssets();
  // Use passed days prop (displayDays) which has the latest data with hotel/vehicle updates applied
  // Fall back to itinerary.daysJson only if no days were passed
  const useDays = days && days.length > 0 ? days : itinerary.daysJson;
  const pdfDays = (useDays || []).filter(Boolean);

  const stays = groupStaysByHotel(pdfDays);
  const flights = printableFlights(itinerary.flights);
  const transport = transportSummary(pdfDays);
  const hasDays = daysWithContent(pdfDays).length > 0;
  const totalPrice = quote?.breakdown?.customTotal ?? quote?.totalCost ?? itinerary.totalCost ?? 0;

  return (
    <Document>
      <QuoteCover itinerary={itinerary} days={pdfDays} coverSrc={resolved.coverSrc}
        coverFooter={resolved.coverFooter}
      />

      <QuotePage footer={resolved.footer} tripId={itinerary.tripId}>
        <QuoteIntro
          itinerary={itinerary}
          days={pdfDays}
          company={COMPANY_NAME}
          prices={[
            {
              label: `Total (${currency})`,
              amount: totalPrice,
              excludesGst: !quote?.gstPercent,
              perPerson: quote?.perPersonSplit,
            },
          ]}
        />
      </QuotePage>

      {(flights.length > 0 || stays.length > 0) && (
        <QuotePage footer={resolved.footer} tripId={itinerary.tripId}>
          <FlightsBlock flights={flights} marginTop={32.7} />
          <HotelStays stays={stays} marginTop={flights.length > 0 ? 32 : 32.7} />
        </QuotePage>
      )}

      {/* Transport on its own half-height page; day-wise starts on the next full page */}
      {transport && (
        <QuotePage footer={resolved.footer} tripId={itinerary.tripId} size={HALF_A4}>
          <TransportTable groups={[{ days: pdfDays }]} marginTop={32.7} />
        </QuotePage>
      )}

      {hasDays && (
        <QuotePage footer={resolved.footer} tripId={itinerary.tripId}>
          <DayWiseBlock days={pdfDays} />
        </QuotePage>
      )}

      {/* Inclusions/exclusions on their own page, in the pre-redesign card style */}
      {(toList(itinerary.included).length > 0 || toList(itinerary.excluded).length > 0) && (
        <QuotePage footer={resolved.footer} tripId={itinerary.tripId}>
          <InclusionCards
            included={toList(itinerary.included)}
            excluded={toList(itinerary.excluded)}
          />
        </QuotePage>
      )}

      <QuotePage footer={resolved.footer} tripId={itinerary.tripId}>
        <TermsBlock
          sections={itineraryTermSections(itinerary.terms, itinerary.notes, resolved.terms)}
        />
      </QuotePage>

      <QuoteLastPage
        assets={resolved}
        clientName={itinerary.clientName || itinerary.lead?.name || 'Valued Guest'}
      />
    </Document>
  );
};

// Export the document component
export { SingleOptionPDFDocument };

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

// Images, the shared "Edit PDF" settings and the consultant photo, all loaded
// up front so the render itself never fetches anything cross-origin.
async function preparePdfInputs(
  itinerary: Itinerary,
  days: ItineraryDay[],
  imageQuality: ImageQuality,
  onImagesProgress?: (done: number, total: number) => void
) {
  const { preloadAllImages, preloadCoverImage } = await import('./image-preload');
  const [preloadedDays, pdfSettings, preloadedConsultantPhoto] = await Promise.all([
    preloadAllImages(days, imageQuality, onImagesProgress),
    fetchPdfSettings(),
    // Tiny photo on the cover — no reason to fetch a full-size image for it.
    preloadCoverImage(itinerary.creator?.avatarUrl, imageQuality, 'avatar'),
  ]);
  const assets = await resolveQuoteAssets(pdfSettings, url => preloadCoverImage(url, imageQuality));
  return {
    days: preloadedDays,
    assets,
    itinerary: {
      ...itinerary,
      creator: itinerary.creator
        ? { ...itinerary.creator, avatarUrl: preloadedConsultantPhoto }
        : itinerary.creator,
    },
  };
}

export async function downloadSinglePDF(
  itinerary: Itinerary,
  days: ItineraryDay[],
  quote?: Quote,
  branchName?: string,
  branchEmail?: string,
  branchInstagram?: string,
  filename?: string,
  imageQuality: ImageQuality = 'normal',
  currency: string = 'INR',
  onProgress?: (progress: {
    stage: 'images' | 'rendering' | 'done';
    imagesDone: number;
    imagesTotal: number;
  }) => void
): Promise<void> {
  try {
    const inputs = await preparePdfInputs(itinerary, days, imageQuality, (done, total) =>
      onProgress?.({ stage: 'images', imagesDone: done, imagesTotal: total })
    );
    onProgress?.({ stage: 'rendering', imagesDone: 1, imagesTotal: 1 });

    const pdfBlob = await pdf(
      SingleOptionPDFDocument({
        itinerary: inputs.itinerary,
        days: inputs.days,
        quote,
        branchName,
        branchEmail,
        branchInstagram,
        imageQuality,
        currency,
        assets: inputs.assets,
      })
    ).toBlob();
    onProgress?.({ stage: 'done', imagesDone: 1, imagesTotal: 1 });

    // Trigger download
    // Must be synchronous within the same tick to satisfy browser download policy
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    const clientName = itinerary.clientName || itinerary.lead?.name || 'Itinerary';
    const safeName = clientName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    a.download = filename || `${safeName}'s Itinerary.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  } catch (error) {
    console.error('[single-option PDF] Generation failed:', error);
    throw error;
  }
}

export async function generateSinglePDFBlob(
  itinerary: Itinerary,
  days: ItineraryDay[],
  options: Partial<SinglePDFProps> = {}
): Promise<Blob> {
  const { imageQuality = 'normal', quote, branchName, currency = 'INR' } = options;
  const inputs = await preparePdfInputs(itinerary, days, imageQuality);

  return pdf(
    SingleOptionPDFDocument({
      itinerary: inputs.itinerary,
      days: inputs.days,
      quote,
      branchName,
      imageQuality,
      currency,
      assets: inputs.assets,
    })
  ).toBlob();
}
