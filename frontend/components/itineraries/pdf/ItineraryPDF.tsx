// Main Itinerary PDF Document
// NOW DELEGATES to isolated single-option and multi-option implementations
//
// STRICT PAGE STRUCTURE:
// - SINGLE OPTION: Cover → Hotels → Transport → Days → Inclusions → Terms+ThankYou
// - MULTI OPTION: Cover (no price) → Pricing → [Hotel+Transport+Days+Inc for each option] → Terms+ThankYou

'use client';

import { downloadSinglePDF, generateSinglePDFBlob } from './single-option';
import { downloadMultiPDF, generateMultiPDFBlob } from './multi-option';

import type { Itinerary, ItineraryDay, Quote, ItineraryOption } from '@/types/index';

// ============================================================
// TYPES & QUALITY PRESETS
// ============================================================

export type ImageQuality = 'draft' | 'normal' | 'high';

export interface ItineraryPDFProps {
  itinerary: Itinerary;
  days: ItineraryDay[];
  quote?: Quote;
  branchName?: string;
  currency?: string;
  options?: ItineraryOption[];
  selectedOptionIndex?: number;
  imageQuality?: ImageQuality;
}

export interface PDFGenerationOptions {
  imageQuality?: ImageQuality;
  preloadImages?: boolean;
  showProgress?: boolean;
  onProgress?: (progress: number) => void;
  onComplete?: (stats: PDFGenerationStats) => void;
  options?: ItineraryOption[];
}

export interface PDFGenerationStats {
  generationTimeMs: number;
  imageOptimizationTimeMs: number;
  imagesProcessed: number;
  cacheStats: { cached: number; processing: number };
  estimatedSizeReduction: number;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function hasMultipleOptions(itinerary: Itinerary | null): boolean {
  if (!itinerary) return false;
  const opts = itinerary.options;
  return Array.isArray(opts) && opts.length > 1;
}

export function hasAnyOptions(itinerary: Itinerary | null): boolean {
  if (!itinerary) return false;
  const opts = itinerary.options;
  return Array.isArray(opts) && opts.length > 0;
}

export function hasMultipleQuotes(itinerary: Itinerary | null): boolean {
  if (!itinerary) return false;
  if (itinerary.options && itinerary.options.length > 1) return true;
  const q = itinerary.quotes;
  return Array.isArray(q) && q.length > 1;
}

export function getPDFQualityForItinerary(
  _days: ItineraryDay[],
  _options?: ItineraryOption[]
): ImageQuality {
  return 'normal';
}

// ============================================================
// DOCUMENT COMPONENTS - DELEGATE TO ISOLATED IMPLEMENTATIONS
// ============================================================

// Single Option Document - imports from single-option folder
import { SingleOptionPDFDocument } from './single-option';
import { MultiOptionPDFDocument } from './multi-option';

const ItineraryPDFDocument = ({
  itinerary,
  days,
  quote,
  branchName = 'Tripoday Holidays',
  currency = 'INR',
  options,
  imageQuality = 'normal',
}: ItineraryPDFProps) => {
  const hasMultipleOpts = options && options.length > 1;

  // DEBUG
  console.log('[ItineraryPDF] hasMultipleOpts:', hasMultipleOpts, 'options:', options?.length);
  console.log('[ItineraryPDF] options data:', JSON.stringify(options, null, 2));

  if (hasMultipleOpts) {
    return (
      <MultiOptionPDFDocument
        itinerary={itinerary}
        days={days}
        options={options}
        branchName={branchName}
        currency={currency}
        imageQuality={imageQuality}
      />
    );
  }

  return (
    <SingleOptionPDFDocument
      itinerary={itinerary}
      days={days}
      quote={quote}
      branchName={branchName}
      currency={currency}
      imageQuality={imageQuality}
    />
  );
};

// ============================================================
// EXPORT FUNCTIONS - DELEGATE TO ISOLATED IMPLEMENTATIONS
// ============================================================

/** Stages a PDF download moves through, for progress reporting. */
export type PdfStage = 'images' | 'rendering' | 'done';

export interface PdfProgress {
  stage: PdfStage;
  /** Images fetched so far / total to fetch. Both 0 when there are none. */
  imagesDone: number;
  imagesTotal: number;
}

export type PdfProgressHandler = (progress: PdfProgress) => void;

export async function downloadClientPDF(
  itinerary: Itinerary,
  days: ItineraryDay[],
  quote?: Quote,
  branchName?: string,
  branchEmail?: string,
  branchInstagram?: string,
  filename?: string,
  options?: ItineraryOption[],
  _selectedOptionIndex?: number,
  imageQuality: ImageQuality = 'normal',
  currency: string = 'INR',
  onProgress?: PdfProgressHandler
): Promise<void> {
  const hasMultipleOpts = options && options.length > 1;

  if (hasMultipleOpts) {
    return downloadMultiPDF(
      itinerary,
      days,
      options,
      branchName,
      branchEmail,
      branchInstagram,
      filename,
      imageQuality,
      currency,
      onProgress
    );
  }

  return downloadSinglePDF(
    itinerary,
    days,
    quote,
    branchName,
    branchEmail,
    branchInstagram,
    filename,
    imageQuality,
    currency,
    onProgress
  );
}

export async function downloadClientPDFWithProgress(
  itinerary: Itinerary,
  days: ItineraryDay[],
  optionsArg: PDFGenerationOptions = {}
): Promise<void> {
  const { imageQuality = 'normal', options } = optionsArg;
  const hasMultipleOpts = options && options.length > 1;

  if (hasMultipleOpts) {
    return downloadMultiPDF(itinerary, days, options, undefined, undefined, imageQuality);
  }

  return downloadSinglePDF(itinerary, days, undefined, undefined, undefined, imageQuality);
}

export async function generatePDFBlob(
  itinerary: Itinerary,
  days: ItineraryDay[],
  optionsArg: Partial<ItineraryPDFProps> = {}
): Promise<Blob> {
  const { imageQuality = 'normal', quote, branchName, options } = optionsArg;
  const hasMultipleOpts = options && options.length > 1;

  if (hasMultipleOpts) {
    return generateMultiPDFBlob(itinerary, days, options, { imageQuality, branchName });
  }

  return generateSinglePDFBlob(itinerary, days, { imageQuality, quote, branchName });
}

export async function downloadItineraryPDF(
  itinerary: Itinerary,
  days: ItineraryDay[],
  quote?: Quote
): Promise<void> {
  return downloadClientPDF(itinerary, days, quote);
}

export { ItineraryPDFDocument as ItineraryPDF };
