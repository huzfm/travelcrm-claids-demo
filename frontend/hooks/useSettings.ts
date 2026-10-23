'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { PDFTermsSettings } from '@/components/itineraries/pdf/quote-layout/defaults';

export interface PDFFooterFields {
  /** Plain text items joined by "|" in the PDF footer — add or remove freely. */
  items: string[];
  /** Footer bar color (#RRGGBB) — empty means the default brand red. */
  backgroundColor?: string;
  /** Footer text color (#RRGGBB) — empty means the default white. */
  textColor?: string;
}

/** The cover page's footer is a two-bar banner, not the plain contact line. */
export interface PDFCoverFooterFields {
  companyName: string;
  tagline: string;
  cin: string;
  gst: string;
  phone: string;
  /** Colors (#RRGGBB) of the top banner bar and the details bar — empty means the default. */
  bannerColor?: string;
  bannerTextColor?: string;
  detailsColor?: string;
  detailsTextColor?: string;
}

/** A label + value card under "Contact Information", e.g. Email / admin@… */
export interface ThankYouContact {
  label: string;
  value: string;
}

/** A link under "Follow Us", e.g. Instagram / https://instagram.com/… */
export interface ThankYouSocial {
  label: string;
  url: string;
}

/**
 * The structured Thank You page: optional logo, "Thank you, {clientName}",
 * message, promise strip, Prepared By card, contact cards and Follow Us links.
 * Every text may use {placeholders}; an empty section is left out of the PDF.
 */
export interface ThankYouPageContent {
  showLogo: boolean;
  /** Uploaded logo; empty uses the bundled company logo. */
  logoUrl?: string;
  title: string;
  message: string;
  promiseTitle: string;
  promiseItems: string[];
  preparedByName: string;
  preparedBySubtitle: string;
  contacts: ThankYouContact[];
  socials: ThankYouSocial[];
  /** Title / heading color (#RRGGBB) — empty follows the footer bar color. */
  accentColor?: string;
}

/** The custom Thank You page — the last page of every itinerary PDF. */
export interface CustomLastPageSettings {
  /** Off by default — when off, the PDF has no last page. */
  enabled: boolean;
  /**
   * 'thankYou' renders the structured page below; 'image' (and pages saved
   * before this field existed) the uploaded image with the optional text.
   */
  layout?: 'thankYou' | 'image';
  thankYou?: ThankYouPageContent;
  /** Large image covering most of the page. */
  imageUrl?: string;
  /** One text box under the image; may use {clientName} etc. */
  text?: string;
  /** Button links — a button is hidden when its link is empty. */
  facebookUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
}

export interface PDFSettings {
  /** Full-page cover design; null means a plain text cover. */
  coverImage: string | null;
  /** Terms sections and office address; null means the bundled defaults (see quote-layout/defaults.ts). */
  terms: PDFTermsSettings | null;
  /** Footer shown on every page except the cover. */
  footer: PDFFooterFields;
  /** Footer shown on the cover page only — independent of the one above. */
  coverFooter: PDFCoverFooterFields;
  /** Custom Thank You page (image, text, social buttons) — replaces the default final page's content. */
  customLastPage: CustomLastPageSettings;
}

/**
 * The PDF-wide settings shared by every itinerary — cover image and the two
 * footers — set once from the sidebar's "Edit PDF" page rather than per
 * itinerary.
 */
export function usePdfSettings() {
  return useQuery({
    queryKey: ['settings', 'pdf'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PDFSettings }>('/settings/pdf');
      return response.data.data;
    },
  });
}

export function useUpdatePdfSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<PDFSettings>) => {
      const response = await api.patch<{ success: boolean; data: PDFSettings }>(
        '/settings/pdf',
        patch
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'pdf'] });
    },
  });
}
