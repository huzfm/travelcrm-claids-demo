// Multi-Option PDF Document - Restructured page-by-page layout

'use client';

import React from 'react';
import { pdf, Document } from '@react-pdf/renderer';
import api from '@/lib/axios';

import { applyOptionHotels, applyOptionVehicles, optionPrice } from './optionMerge';
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
  type DayExtraLine,
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

import type { Itinerary, ItineraryDay, ItineraryOption } from '@/types/index';
import type { PDFSettings } from '@/hooks/useSettings';

export type ImageQuality = 'draft' | 'normal' | 'high';

export interface MultiPDFProps {
  itinerary: Itinerary;
  days: ItineraryDay[];
  options: ItineraryOption[];
  branchName?: string;
  branchEmail?: string;
  branchAddress?: string;
  branchInstagram?: string;
  currency?: string;
  imageQuality?: ImageQuality;
  /** Cover, footer, last page and terms resolved from "Edit PDF"; bundled defaults when omitted. */
  assets?: QuoteAssets;
}

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

const optionNames = ['Basic', 'Standard', 'Premium', 'Luxury'];

// Laid out like the client's reference quote (see SinglePDF.tsx), with the
// package options side by side in the price table, one hotels page per
// option, and each option's vehicles and extra activities called out by name.
const MultiOptionPDFDocument = ({
  itinerary,
  days,
  options,
  currency = 'INR',
  assets,
}: MultiPDFProps) => {
  const resolved = assets ?? defaultQuoteAssets();
  // Use passed days prop (displayDays) which has the latest data with hotel/vehicle updates applied
  const pdfDays = (days && days.length > 0 ? days : itinerary.daysJson || []).filter(Boolean);
  const named = options.map((option, idx) => ({
    option,
    name: option.name || optionNames[idx % optionNames.length],
  }));

  const flights = printableFlights(itinerary.flights);
  const optionPages = named
    .map(({ option, name }) => {
      const vehicleDays = applyOptionVehicles(pdfDays, option);
      return {
        name,
        stays: groupStaysByHotel(applyOptionHotels(pdfDays, option)),
        vehicleDays,
        hasTransport: !!transportSummary(vehicleDays),
      };
    })
    .filter(page => page.stays.length > 0 || page.hasTransport);
  const hasTransport = optionPages.some(page => page.hasTransport);

  // A day with no activities of its own lists each option's, named.
  const extrasByDay = new Map<number, DayExtraLine[]>();
  for (const day of pdfDays) {
    if (day.activities && day.activities.length > 0) continue;
    const extras = named
      .map(({ option, name }) => ({
        label: name,
        text: (option.activities || [])
          .filter(a => a.dayNumber === day.dayNumber)
          .map(a => a.title)
          .filter(Boolean)
          .join(', '),
      }))
      .filter(extra => extra.text);
    if (extras.length) extrasByDay.set(day.dayNumber, extras);
  }

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
          multiOption
          prices={named.map(({ option, name }) => ({
            label: `${name} (${currency})`,
            amount: optionPrice(option),
            excludesGst: !option.gstPercent,
            perPerson: option.perPersonSplit,
          }))}
        />
      </QuotePage>

      {flights.length > 0 && (
        <QuotePage footer={resolved.footer} tripId={itinerary.tripId}>
          <FlightsBlock flights={flights} marginTop={32.7} />
        </QuotePage>
      )}

      {optionPages
        .filter(page => page.stays.length > 0)
        .map(page => (
          <QuotePage key={page.name} footer={resolved.footer} tripId={itinerary.tripId}>
            <HotelStays
              stays={page.stays}
              title={`${page.name} — Hotels / Accommodations`}
              marginTop={32.7}
            />
          </QuotePage>
        ))}

      {/* Transport on its own half-height page (one table per option); day-wise
          starts on the next full page */}
      {hasTransport && (
        <QuotePage footer={resolved.footer} tripId={itinerary.tripId} size={HALF_A4}>
          <TransportTable
            groups={optionPages.map(page => ({ label: page.name, days: page.vehicleDays }))}
            marginTop={32.7}
          />
        </QuotePage>
      )}

      {daysWithContent(pdfDays).length > 0 && (
        <QuotePage footer={resolved.footer} tripId={itinerary.tripId}>
          <DayWiseBlock days={pdfDays} extrasByDay={extrasByDay} />
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

export { MultiOptionPDFDocument };

// ============================================================
// EXPORT FUNCTIONS
// ============================================================

// Images, the shared "Edit PDF" settings and the consultant photo, all loaded
// up front so the render itself never fetches anything cross-origin.
async function preparePdfInputs(
  itinerary: Itinerary,
  days: ItineraryDay[],
  options: ItineraryOption[],
  imageQuality: ImageQuality,
  onImagesProgress?: (done: number, total: number) => void
) {
  const { preloadAllImages, preloadOptionImages, preloadCoverImage } = await import(
    './image-preload'
  );
  const [preloadedDays, preloadedOptions, pdfSettings, preloadedConsultantPhoto] =
    await Promise.all([
      preloadAllImages(days, imageQuality, onImagesProgress),
      options?.length > 0 ? preloadOptionImages(options, imageQuality) : Promise.resolve([]),
      fetchPdfSettings(),
      // Tiny photo on the cover — no reason to fetch a full-size image for it.
      preloadCoverImage(itinerary.creator?.avatarUrl, imageQuality, 'avatar'),
    ]);
  const assets = await resolveQuoteAssets(pdfSettings, url => preloadCoverImage(url, imageQuality));
  return {
    days: preloadedDays,
    options: preloadedOptions,
    assets,
    itinerary: {
      ...itinerary,
      creator: itinerary.creator
        ? { ...itinerary.creator, avatarUrl: preloadedConsultantPhoto }
        : itinerary.creator,
    },
  };
}

export async function downloadMultiPDF(
  itinerary: Itinerary,
  days: ItineraryDay[],
  options: ItineraryOption[],
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
    const inputs = await preparePdfInputs(itinerary, days, options, imageQuality, (done, total) =>
      onProgress?.({ stage: 'images', imagesDone: done, imagesTotal: total })
    );
    onProgress?.({ stage: 'rendering', imagesDone: 1, imagesTotal: 1 });

    const pdfBlob = await pdf(
      <MultiOptionPDFDocument
        itinerary={inputs.itinerary}
        days={inputs.days}
        options={inputs.options}
        branchName={branchName}
        branchEmail={branchEmail}
        branchInstagram={branchInstagram}
        imageQuality={imageQuality}
        currency={currency}
        assets={inputs.assets}
      />
    ).toBlob();
    onProgress?.({ stage: 'done', imagesDone: 1, imagesTotal: 1 });

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
    console.error('[multi-option PDF] Generation failed:', error);
    throw error;
  }
}

export async function generateMultiPDFBlob(
  itinerary: Itinerary,
  days: ItineraryDay[],
  options: ItineraryOption[],
  options2: Partial<MultiPDFProps> = {}
): Promise<Blob> {
  const { imageQuality = 'normal', branchName, currency = 'INR' } = options2;
  const inputs = await preparePdfInputs(itinerary, days, options, imageQuality);

  return pdf(
    <MultiOptionPDFDocument
      itinerary={inputs.itinerary}
      days={inputs.days}
      options={inputs.options}
      branchName={branchName}
      imageQuality={imageQuality}
      currency={currency}
      assets={inputs.assets}
    />
  ).toBlob();
}
