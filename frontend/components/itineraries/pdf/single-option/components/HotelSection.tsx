// Single-Option Hotel Section Component

import { Page, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import { PDFHeaderSmall } from './Header';
import { PDFFooterSimple } from './Footer';
import { HotelCard } from './HotelCard';
import { PageWatermark, SectionBanner, decorColors, watermarkText } from './PageDecor';
import type { ItineraryDay, ItineraryOption } from '@/types/index';

export interface HotelSectionProps {
  days: ItineraryDay[];
  destination?: string;
  pageNumber?: number;
  totalPages?: number;
  option?: ItineraryOption;
  optionLabel?: string;
  /** Image quality preset: 'draft' | 'normal' | 'high' */
  imageQuality?: 'draft' | 'normal' | 'high';
  branchName?: string;
  branchEmail?: string;
  branchInstagram?: string;
  /** Shown in the page watermark next to branchName */
  tripId?: string | null;
}

// Filter days for a specific option's hotels
function getOptionHotels(days: ItineraryDay[], option?: ItineraryOption): ItineraryDay[] {
  // Show ALL days - days with hotels get hotel cards, leisure days without hotels get "No hotel" card
  const mergedDays = days.map(day => {
    const optionHotel = option?.hotels?.find(
      h => h.dayNumber === day.dayNumber || h.hotelId === day.hotelId
    );
    if (optionHotel) {
      const optExtraBedPrice =
        (optionHotel as any).extraBedPrice ?? day.selectedRoomType?.extraBedPrice ?? 0;
      const optChildPrice =
        (optionHotel as any).childPrice ?? day.selectedRoomType?.childPrice ?? 0;
      return {
        ...day,
        hotel: optionHotel.hotelName || day.hotel,
        hotelAddress: optionHotel.hotelAddress ?? day.hotelAddress,
        hotelContact: optionHotel.hotelContact || day.hotelContact,
        hotelStars: optionHotel.hotelStars ?? day.hotelStars,
        hotelImage: optionHotel.hotelImage || day.hotelImage,
        selectedRoomType: optionHotel.roomType
          ? {
              name: optionHotel.roomType,
              bedType: optionHotel.bedType || '',
              basePrice: optionHotel.pricePerNight || 0,
              extraBedPrice: optExtraBedPrice,
              childPrice: optChildPrice,
            }
          : day.selectedRoomType
            ? {
                ...day.selectedRoomType,
                extraBedPrice: optExtraBedPrice,
                childPrice: optChildPrice,
              }
            : undefined,
        selectedMealPlan: optionHotel.mealPlan
          ? {
              type: optionHotel.mealPlan as 'EP' | 'CP' | 'MAP' | 'APAI',
              label: optionHotel.mealPlan,
              pricePerNight: optionHotel.pricePerNight || 0,
            }
          : day.selectedMealPlan,
        numberOfRooms:
          optionHotel.numberOfRooms != null ? optionHotel.numberOfRooms : (day.numberOfRooms ?? 1),
        extraBeds:
          optionHotel.extraBeds != null && optionHotel.extraBeds !== undefined
            ? optionHotel.extraBeds
            : (day.extraBeds ?? 0),
        childrenNoBed:
          optionHotel.childWithoutBed != null && optionHotel.childWithoutBed !== undefined
            ? optionHotel.childWithoutBed
            : (day.childrenNoBed ?? 0),
        extraBedPrice: optExtraBedPrice,
        childPrice: optChildPrice,
      };
    }
    // No option hotel match — ensure price fields are accessible at day level
    const dayExtraBedPrice =
      day.selectedRoomType?.extraBedPrice ??
      (day as any).extraBedPrice ??
      (day as any).extraBedCost ??
      0;
    const dayChildPrice =
      day.selectedRoomType?.childPrice ??
      (day as any).childPrice ??
      (day as any).childWithoutBedCost ??
      0;
    return {
      ...day,
      numberOfRooms: day.numberOfRooms || 1,
      extraBeds: day.extraBeds ?? 0,
      childrenNoBed: day.childrenNoBed ?? 0,
      // Move extraBedPrice and childPrice from selectedRoomType to day level for HotelCard
      extraBedPrice: dayExtraBedPrice,
      childPrice: dayChildPrice,
      // Ensure selectedRoomType also has the price fields (for HotelCard's roomType?.extraBedPrice path)
      selectedRoomType: day.selectedRoomType
        ? {
            ...day.selectedRoomType,
            extraBedPrice: dayExtraBedPrice,
            childPrice: dayChildPrice,
          }
        : undefined,
    };
  });

  // Return all days - HotelCard will handle showing "No hotel" for days without hotel
  return mergedDays;
}

// All days at the same hotel become one card, even when they're not
// consecutive — e.g. nights 1-2 at Hotel A, night 3 at Hotel B, night 4 back
// at Hotel A is two cards (A: nights 1, 2, 4 and B: night 3), not three.
// Leisure "no hotel" days never merge into a hotel's group.
function groupHotelStaysByHotel(hotelDays: ItineraryDay[]): ItineraryDay[][] {
  const groups: ItineraryDay[][] = [];
  const groupIndexByHotelKey = new Map<string, number>();

  for (const day of hotelDays) {
    const hasHotel = !!(day.hotel || day.hotelId || day.selectedRoomType);
    const hotelKey = hasHotel ? day.hotelId || (day.hotel || '').trim().toLowerCase() : undefined;
    const existingIdx = hotelKey ? groupIndexByHotelKey.get(hotelKey) : undefined;

    if (existingIdx !== undefined) {
      groups[existingIdx].push(day);
    } else {
      groups.push([day]);
      if (hotelKey) groupIndexByHotelKey.set(hotelKey, groups.length - 1);
    }
  }
  return groups;
}

export const HotelSection = ({
  days,
  pageNumber = 2,
  totalPages = 6,
  option,
  optionLabel,
  imageQuality = 'normal',
  branchName,
  tripId,
}: HotelSectionProps) => {
  const mergedDays = getOptionHotels(days, option);

  // Only render days that have a hotel, OR are explicit leisure days (which get the rest-day card).
  // Skip non-leisure days that simply have no hotel — they should not appear at all.
  const hotelDays = mergedDays.filter(day => {
    const hasHotel = !!(day.hotel || day.hotelId || day.selectedRoomType);
    return hasHotel || day.dayType === 'leisure';
  });

  const safeDays = days || [];
  if (safeDays.length === 0 || hotelDays.length === 0) {
    return null;
  }

  const hotelStays = groupHotelStaysByHotel(hotelDays);

  const HOTELS_PER_PAGE = 3;
  const pages: ItineraryDay[][][] = [];
  for (let i = 0; i < hotelStays.length; i += HOTELS_PER_PAGE) {
    pages.push(hotelStays.slice(i, i + HOTELS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageHotels, pageIdx) => {
        const currentPage = pageNumber + pageIdx;
        const pageTotal = totalPages + pages.length - 1;

        return (
          <Page
            key={`hotel-page-${pageIdx}`}
            size="A4"
            style={[styles.page, { backgroundColor: decorColors.pageBg }]}
          >
            <PageWatermark text={watermarkText(branchName, tripId)} />
            <PDFHeaderSmall
              title={
                optionLabel ||
                (option ? `${option.name} - Hotel Accommodation` : 'Hotel Accommodation')
              }
            />
            <View style={styles.pageContent}>
              <SectionBanner title="Hotels / Accommodations" />
              {pageHotels.map((stay, idx) => (
                <View key={`hotel-s-${pageIdx}-${idx}`} style={{ marginTop: 12 }}>
                  <HotelCard
                    day={stay[0]}
                    nights={stay
                      .map(d => d.dayNumber)
                      .filter((n): n is number => typeof n === 'number')}
                    imageQuality={imageQuality}
                  />
                </View>
              ))}
            </View>
            <PDFFooterSimple pageNumber={currentPage} totalPages={pageTotal} />
          </Page>
        );
      })}
    </>
  );
};
