// Multi-Option Day Section Component
// Paginates one option's days — several day entries stack onto each page
// (see MultiOptionDayCard) instead of giving every day its own page.

import { Page, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import { PDFHeaderSmall } from './Header';
import { PDFFooterSimple } from './Footer';
import { MultiOptionDayCard } from './MultiOptionDayCard';
import { paginateDayEntries } from '../utils';
import { PageWatermark, SectionBanner, decorColors, watermarkText } from './PageDecor';
import type { ItineraryDay, ItineraryOption } from '@/types/index';

interface MultiOptionDaySectionProps {
  days: ItineraryDay[];
  option: ItineraryOption;
  optionName?: string;
  optColor: { bg: string; border: string; text: string };
  pageNumber?: number;
  totalPages?: number;
  branchName?: string;
  /** Shown in the page watermark next to branchName */
  tripId?: string | null;
}

export const MultiOptionDaySection = ({
  days,
  option,
  optionName,
  optColor,
  pageNumber = 5,
  totalPages,
  branchName,
  tripId,
}: MultiOptionDaySectionProps) => {
  const safeDays = days || [];
  if (safeDays.length === 0) return null;

  // One entry per day, stacked one per row, several per page.
  const dayPages = paginateDayEntries(safeDays);
  const displayName = optionName || option.name || 'Detailed Itinerary';

  return (
    <>
      {dayPages.map((pageDays, pageIdx) => (
        <Page
          key={`day-page-${pageIdx}`}
          size="A4"
          style={[styles.page, { backgroundColor: decorColors.pageBg }]}
          // No wrap={false}: it shrinks the page to its content height instead of
          // A4. Each page's days are pre-packed under the height budget anyway.
        >
          <PageWatermark text={watermarkText(branchName, tripId)} />
          <PDFHeaderSmall title={`${displayName} - Detailed Itinerary`} />

          <View style={styles.pageContent}>
            <SectionBanner title="Day Wise Itinerary" />
            <View style={{ marginTop: 16 }}>
              {pageDays.map((cardDays, idx) => (
                <MultiOptionDayCard
                  key={`day-card-${pageIdx}-${idx}`}
                  days={cardDays}
                  option={option}
                  optColor={optColor}
                />
              ))}
            </View>
          </View>

          <PDFFooterSimple
            pageNumber={pageNumber + pageIdx}
            totalPages={(totalPages ?? pageNumber) + dayPages.length - 1}
          />
        </Page>
      ))}
    </>
  );
};
