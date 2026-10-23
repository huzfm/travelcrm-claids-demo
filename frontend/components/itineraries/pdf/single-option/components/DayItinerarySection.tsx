// Single-Option Day Itinerary Section Component

import { Page, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import { PDFHeaderSmall } from './Header';
import { PDFFooterSimple } from './Footer';
import { DayCard } from './DayCard';
import { paginateDayEntries } from '../utils';
import { PageWatermark, SectionBanner, decorColors, watermarkText } from './PageDecor';
import type { ItineraryDay, ItineraryOption } from '@/types/index';

export interface DayItinerarySectionProps {
  days: ItineraryDay[];
  guestName?: string;
  pageNumber?: number;
  totalPages?: number;
  option?: ItineraryOption;
  optionLabel?: string;
  currency?: string;
  /** Image quality preset: 'draft' | 'normal' | 'high' */
  imageQuality?: 'draft' | 'normal' | 'high';
  branchName?: string;
  /** Shown in the page watermark next to branchName */
  tripId?: string | null;
}

// Filter days for a specific option's activities
function getOptionDays(days: ItineraryDay[], option?: ItineraryOption): ItineraryDay[] {
  if (!option?.activities) return days;

  // Build a map of day number -> option activities
  const activityMap = new Map<number, ItineraryOption['activities']>();
  option.activities.forEach(a => {
    const existing = activityMap.get(a.dayNumber) || [];
    existing.push(a);
    activityMap.set(a.dayNumber, existing);
  });

  return days.map(day => {
    const optActivities = activityMap.get(day.dayNumber);
    if (optActivities && optActivities.length > 0) {
      return {
        ...day,
        activities: optActivities.map((a, actIdx) => ({
          id: a.id || `opt-act-${day.dayNumber}-${actIdx}`,
          title: a.title,
          description: a.description,
          location: a.location,
          time: a.time,
          cost: a.cost,
        })),
      };
    }
    return day;
  });
}

export const DayItinerarySection = ({
  days,
  pageNumber = 4,
  totalPages = 6,
  option,
  optionLabel,
  branchName,
  tripId,
}: DayItinerarySectionProps) => {
  const optionDays = getOptionDays(days, option);

  // Skip rendering if no days with content
  const safeDays = optionDays || [];
  const activeDays = safeDays.filter(
    (d: any) =>
      d?.activities?.length > 0 ||
      d?.description ||
      d?.title ||
      (d.images && d.images.length > 0) ||
      d?.dayType === 'leisure'
  );
  if (activeDays.length === 0) {
    return null;
  }

  // One entry per day, stacked one per row, several per page (like the
  // reference itinerary) rather than one full A4 page per day — grouped by
  // estimated content height.
  const dayPages = paginateDayEntries(activeDays);

  return (
    <>
      {dayPages.map((pageCards, pageIdx) => (
        <Page
          key={`day-page-${pageIdx}`}
          size="A4"
          style={[styles.page, { backgroundColor: decorColors.pageBg }]}
          // No wrap={false}: it shrinks the page to its content height instead of
          // A4. Each page's days are pre-packed under the height budget anyway.
        >
          <PageWatermark text={watermarkText(branchName, tripId)} />
          <PDFHeaderSmall
            title={
              optionLabel || (option ? `${option.name} - Detailed Itinerary` : 'Detailed Itinerary')
            }
          />

          <View style={styles.pageContent}>
            <SectionBanner title="Day Wise Itinerary" />
            <View style={{ marginTop: 16 }}>
              {pageCards.map((cardDays, idx) => (
                <DayCard key={`day-card-${pageIdx}-${idx}`} days={cardDays} />
              ))}
            </View>
          </View>

          <PDFFooterSimple
            pageNumber={pageNumber + pageIdx}
            totalPages={totalPages + dayPages.length - 1}
          />
        </Page>
      ))}
    </>
  );
};
