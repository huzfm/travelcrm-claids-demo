'use client';

import { useEffect, Suspense, useState, useRef } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Itinerary } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function generatePdf(id: string, data: Itinerary) {
  const { downloadClientPDF, hasMultipleOptions } =
    await import('@/components/itineraries/itinerary-pdf');

  const days = Array.isArray(data.daysJson)
    ? data.daysJson
    : JSON.parse((data.daysJson as string) || '[]');

  console.log('[pdf/page] Days data:', JSON.stringify(days, null, 2));
  console.log(
    '[pdf/page] Has multiple options:',
    hasMultipleOptions(data),
    'options:',
    data.options?.length
  );

  const selectedQuote = data.quotes?.[0];
  const options = data.options;
  const shouldUseMultiOption = hasMultipleOptions(data) || (options && options.length > 1);

  if (shouldUseMultiOption && options && options.length > 1) {
    await downloadClientPDF(
      data,
      days,
      undefined,
      data.branch?.name,
      undefined,
      undefined,
      `${data.lead?.name || data.title || 'itinerary'}.pdf`,
      options,
      0,
      'normal',
      data.branch?.currency || 'INR'
    );
  } else {
    await downloadClientPDF(
      data,
      days,
      selectedQuote,
      data.branch?.name,
      data.branch?.email,
      data.branch?.instagram,
      `${data.lead?.name || data.title || 'itinerary'}.pdf`,
      undefined,
      0,
      'normal',
      data.branch?.currency || 'INR'
    );
  }
}

function PdfGeneratorPage({ id }: { id: string }) {
  const router = useRouter();
  const [pdfDone, setPdfDone] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const generatingRef = useRef(false);

  const {
    data: itinerary,
    isLoading,
    isError,
  } = useQuery<Itinerary>({
    queryKey: ['itinerary-pdf', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { itinerary: Itinerary } }>(
        `/itineraries/${id}`
      );
      return res.data.data.itinerary;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!itinerary || pdfDone || pdfError || generatingRef.current) return;
    generatingRef.current = true;

    generatePdf(id, itinerary)
      .then(() => {
        setPdfDone(true);
      })
      .catch(err => {
        console.error('[pdf page] PDF generation failed:', err);
        setPdfError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        generatingRef.current = false;
      });
  }, [itinerary, id, pdfDone, pdfError]);

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
          <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading itinerary data...</p>
          <p className="text-xs text-muted-foreground px-2">Fetching fresh data from server</p>
        </div>
      </PageWrapper>
    );
  }

  if (isError || !itinerary) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
          <p className="text-sm sm:text-base text-destructive">Failed to load itinerary</p>
          <button
            onClick={() => router.push(`/itineraries/${id}`)}
            className="text-sm text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </PageWrapper>
    );
  }

  if (pdfError) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
          <p className="text-sm sm:text-base text-destructive">PDF generation failed</p>
          <p className="text-xs text-muted-foreground px-4 break-words max-w-full">{pdfError}</p>
          <button
            onClick={() => router.push(`/itineraries/${id}`)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </PageWrapper>
    );
  }

  if (pdfDone) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
          <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-neutral-500" />
          <p className="text-sm sm:text-base text-muted-foreground">PDF downloaded!</p>
          <button
            onClick={() => router.push(`/itineraries/${id}`)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to itinerary
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary" />
        <p className="text-sm sm:text-base text-muted-foreground">Generating PDF...</p>
        <p className="text-xs text-muted-foreground px-4 max-w-full break-words">
          {itinerary.title} — {itinerary.destination}
        </p>
      </div>
    </PageWrapper>
  );
}

export default function PdfPage(props: PageProps) {
  const { id } = use(props.params);
  return (
    <Suspense
      fallback={
        <PageWrapper>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageWrapper>
      }
    >
      <PdfGeneratorPage id={id} />
    </Suspense>
  );
}
