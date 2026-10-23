// Multi-Option Hotel Section Component - Side by Side Layout

import { Page, Text, View, Svg, Path } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import { PDFFooterSimple } from './Footer';
import { PDFImage } from './PDFImage';
import { PDFHeaderSmall } from './Header';
import { PageWatermark, SectionBanner, decorColors, watermarkText } from './PageDecor';
import { getDayOrdinalLower, formatCheckInDate } from '../utils';
import type { ItineraryDay, ItineraryOption } from '@/types/index';

// A real star shape — the "★" text glyph renders inconsistently across PDF
// viewers/fonts, so the rating uses this SVG icon instead.
const STAR_PATH =
  'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

const STAR_COLOR = '#db0201';

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: 9, height: 9, marginRight: 2 }}>
      <Path
        d={STAR_PATH}
        fill={filled ? STAR_COLOR : 'none'}
        stroke={STAR_COLOR}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

interface MultiOptionHotelSectionProps {
  days: ItineraryDay[];
  destination?: string;
  option: ItineraryOption;
  optionIndex: number;
  optionName?: string;
  optionColor?: { bg: string; border: string; text: string };
  pageNumber?: number;
  totalPages?: number;
  pageBreakBefore?: 'always' | 'auto';
  branchName?: string;
  branchEmail?: string;
  branchAddress?: string;
  branchContact?: string;
  /** Shown in the page watermark next to branchName */
  tripId?: string | null;
}

// All days at the same hotel become one card, even when they're not
// consecutive — e.g. nights 1-2 at Hotel A, night 3 at Hotel B, night 4 back
// at Hotel A is two cards (A: nights 1, 2, 4 and B: night 3), not three.
// Leisure "no hotel" days never merge into a hotel's group.
function groupHotelStaysByHotel(days: ItineraryDay[]): ItineraryDay[][] {
  const groups: ItineraryDay[][] = [];
  const groupIndexByHotelKey = new Map<string, number>();

  for (const day of days) {
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

function formatNightLabel(nights: ItineraryDay[]): string {
  const nums = nights.map(n => n.dayNumber).filter((n): n is number => typeof n === 'number');
  if (nums.length === 0) return 'Night';
  if (nums.length === 1) return `Night ${nums[0]}`;
  const isConsecutive = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
  return isConsecutive ? `Night ${nums[0]}-${nums[nums.length - 1]}` : `Nights ${nums.join(', ')}`;
}

const optionColors = [
  { bg: '#fbe3e3', border: '#db0201', text: '#db0201' },
  { bg: '#fbe3e3', border: '#db0201', text: '#db0201' },
  { bg: '#fbe3e3', border: '#db0201', text: '#db0201' },
  { bg: '#fbe3e3', border: '#db0201', text: '#db0201' },
];

export const MultiOptionHotelSection = ({
  days,
  option,
  optionIndex,
  optionName,
  optionColor,
  pageNumber = 3,
  totalPages,
  branchName,
  tripId,
}: MultiOptionHotelSectionProps) => {
  const optColor = optionColor || optionColors[optionIndex % optionColors.length];
  const displayName = optionName || option.name || `Option ${optionIndex + 1}`;

  // Build displayDays first so we can reference displayHotelDays
  const displayDays = days.map(day => {
    // First try to find by dayNumber (most specific match)
    const optHotel = option.hotels?.find(h => h.dayNumber === day.dayNumber);
    if (optHotel) {
      return {
        ...day,
        hotel: optHotel.hotelName || day.hotel,
        hotelAddress: optHotel.hotelAddress || day.hotelAddress,
        hotelContact: optHotel.hotelContact || day.hotelContact,
        hotelStars: optHotel.hotelStars ?? day.hotelStars,
        hotelImage: optHotel.hotelImage || day.hotelImage,
        selectedRoomType: optHotel.roomType
          ? {
              name: optHotel.roomType,
              bedType: optHotel.bedType || day.selectedRoomType?.bedType || 'Double',
              basePrice: optHotel.pricePerNight || day.selectedRoomType?.basePrice || 0,
              extraBedPrice:
                (optHotel as any).extraBedPrice ??
                day.selectedRoomType?.extraBedPrice ??
                (day as any).extraBedPrice ??
                0,
              childPrice:
                (optHotel as any).childPrice ??
                day.selectedRoomType?.childPrice ??
                (day as any).childPrice ??
                (day as any).childWithoutBedCost ??
                0,
            }
          : day.selectedRoomType,
        selectedMealPlan: optHotel.mealPlan
          ? {
              type: optHotel.mealPlan as 'EP' | 'CP' | 'MAP' | 'APAI',
              label: optHotel.mealPlan,
              pricePerNight: optHotel.pricePerNight || 0,
            }
          : day.selectedMealPlan,
        numberOfRooms:
          optHotel.numberOfRooms != null ? optHotel.numberOfRooms : (day.numberOfRooms ?? 1),
        extraBeds:
          optHotel.extraBeds != null && optHotel.extraBeds !== undefined
            ? optHotel.extraBeds
            : (day.extraBeds ?? 0),
        childrenNoBed:
          optHotel.childWithoutBed != null && optHotel.childWithoutBed !== undefined
            ? optHotel.childWithoutBed
            : (day.childrenNoBed ?? 0),
        // Also expose these at day level for HotelCardMulti cost calculations
        extraBedPrice:
          (optHotel as any).extraBedPrice ??
          day.selectedRoomType?.extraBedPrice ??
          (day as any).extraBedPrice ??
          (day as any).extraBedCost ??
          0,
        childPrice:
          (optHotel as any).childPrice ??
          day.selectedRoomType?.childPrice ??
          (day as any).childPrice ??
          (day as any).childWithoutBedCost ??
          0,
      };
    }
    // No hotel found for this day - use original day data (leisure day without hotel)
    return {
      ...day,
      numberOfRooms: day.numberOfRooms || 1,
      extraBeds: day.extraBeds ?? 0,
      childrenNoBed: day.childrenNoBed ?? 0,
      selectedMealPlan: day.selectedMealPlan,
      // Ensure price fields are accessible at day level
      extraBedPrice:
        day.selectedRoomType?.extraBedPrice ??
        (day as any).extraBedPrice ??
        (day as any).extraBedCost ??
        0,
      childPrice:
        day.selectedRoomType?.childPrice ??
        (day as any).childPrice ??
        (day as any).childWithoutBedCost ??
        0,
      // Ensure selectedRoomType also has the price fields
      selectedRoomType: day.selectedRoomType
        ? {
            ...day.selectedRoomType,
            extraBedPrice:
              day.selectedRoomType.extraBedPrice ??
              (day as any).extraBedPrice ??
              (day as any).extraBedCost ??
              0,
            childPrice:
              day.selectedRoomType.childPrice ??
              (day as any).childPrice ??
              (day as any).childWithoutBedCost ??
              0,
          }
        : undefined,
    };
  });

  const displayHotelDays = displayDays.filter(d => d.hotel || d.selectedRoomType);

  const hasAnyHotelData = displayHotelDays.length > 0;
  const hasAnyLeisureDaysWithoutHotels = displayDays.some(
    d => d.dayType === 'leisure' && !d.hotel && !d.selectedRoomType
  );

  if (!hasAnyHotelData && !hasAnyLeisureDaysWithoutHotels) {
    return null;
  }

  // Split into pages - all days shown as cards (3 per page)
  const HOTELS_PER_PAGE = 3;

  // Only days with a hotel, OR explicit leisure days (which get the rest-day card).
  // Filter: Only days with actual hotel data, OR leisure days (no hotel card for leisure, but keep them)
  // Non-leisure days without a hotel are skipped entirely.
  // Must have actual hotel name from option.hotels, not just default room type
  const allDays = displayDays.filter(d => {
    const optHotelForDay = option.hotels?.find(h => h.dayNumber === d.dayNumber);
    const hasActualHotel = !!(optHotelForDay?.hotelName && optHotelForDay.hotelName.trim());
    return hasActualHotel || d.dayType === 'leisure';
  });

  // Group consecutive same-hotel days into one stay before paginating, so
  // "3 per page" means 3 stays, not 3 duplicated nights of the same hotel.
  const hotelStays = groupHotelStaysByHotel(allDays);

  // Pages with hotel cards (3 per page)
  const pages: ItineraryDay[][][] = [];
  for (let i = 0; i < hotelStays.length; i += HOTELS_PER_PAGE) {
    pages.push(hotelStays.slice(i, i + HOTELS_PER_PAGE));
  }

  // Filter out pages that have no actual cards (leisure days without hotels are not shown in the content)
  const filteredPages = pages.filter(page =>
    page.some(stay =>
      stay.some(d => !!((d.hotel && d.hotel.trim()) || d.hotelId || d.selectedRoomType))
    )
  );

  if (filteredPages.length === 0) {
    return null;
  }

  let currentPageNum = pageNumber;

  return (
    <>
      {filteredPages.map((pageDays, pageIdx) => {
        const pageTotal = (totalPages ?? 0) + filteredPages.length - 1;

        return (
          <Page
            key={`hotel-${optionIndex}-${pageIdx}`}
            size="A4"
            style={[styles.page, { backgroundColor: decorColors.pageBg }]}
          >
            <PageWatermark text={watermarkText(branchName, tripId)} />
            <PDFHeaderSmall title={`${displayName} - Hotel Accommodation`} />

            <View style={styles.pageContent}>
              <SectionBanner title="Hotels / Accommodations" />

              {pageDays.map((stay: ItineraryDay[], dayIdx: number) => {
                const day = stay[0];
                const hasHotel = !!(day.hotel || day.hotelId || day.selectedRoomType);
                const isLeisureWithoutHotel = day.dayType === 'leisure' && !hasHotel;
                const nightLabel = formatNightLabel(stay);
                const nights = stay
                  .map(d => d.dayNumber)
                  .filter((n): n is number => typeof n === 'number');

                if (isLeisureWithoutHotel) {
                  // Leisure day without hotel - show rest day message
                  return (
                    <View
                      key={`hotel-${optionIndex}-${pageIdx}-${dayIdx}`}
                      style={{ marginTop: 12 }}
                    >
                      <NoHotelCard nightLabel={nightLabel} destinationName={day.destination} />
                    </View>
                  );
                }

                if (!hasHotel) {
                  // Skip non-leisure days without hotel entirely
                  return null;
                }

                const dayAlts =
                  option.alternatives?.find(a => a.dayNumber === day.dayNumber)?.hotelOptions ??
                  (day as any).alternatives?.hotelOptions ??
                  [];
                return (
                  <View key={`hotel-${optionIndex}-${pageIdx}-${dayIdx}`} style={{ marginTop: 12 }}>
                    <HotelCardMulti
                      day={day}
                      nights={nights}
                      optColor={optColor}
                      similarHotels={dayAlts}
                    />
                  </View>
                );
              })}
            </View>

            <PDFFooterSimple pageNumber={currentPageNum++} totalPages={pageTotal} />
          </Page>
        );
      })}
    </>
  );
};

const HotelCardMulti = ({
  day,
  nights,
  similarHotels = [],
}: {
  day: ItineraryDay;
  nights: number[];
  optColor: { bg: string; border: string; text: string };
  similarHotels?: Array<{ hotelId?: string; hotelName: string }>;
}) => {
  const nightNumbers = nights.length > 0 ? nights : [day.dayNumber];
  const hotelName = day.hotel || '';
  const numRooms = (day as any).numberOfRooms || (day as any).rooms || 1;
  const extraBeds = (day as any).extraBeds ?? (day as any).extraBed ?? 0;
  const childNoBed = (day as any).childrenNoBed ?? (day as any).childWithoutBed ?? 0;
  const mealPlan = day.selectedMealPlan;
  const hasMealPlans = mealPlan && (mealPlan.label || mealPlan.type);
  const mealPlanLabel = mealPlan?.label || mealPlan?.type || null;
  const roomTypeName = day.selectedRoomType?.name || day.roomCategory || 'Standard';
  const destinationLabel = day.hotelAddress || day.destination || '';
  const checkInLabel = formatCheckInDate(day.date);
  const hotelStars = typeof day.hotelStars === 'number' ? Math.round(day.hotelStars) : 0;

  // "7 Classic Deluxe" plus a pax breakdown assuming double occupancy per room —
  // the day model tracks extra beds and no-bed children but not a raw pax count,
  // so the base figure is numRooms * 2 with the extras called out separately.
  const paxLine = (() => {
    const parts = [`${numRooms * 2} Pax`];
    if (extraBeds > 0) parts.push(`${extraBeds} with Extra Bed/Mattress`);
    if (childNoBed > 0)
      parts.push(`${childNoBed} Child${childNoBed > 1 ? 'ren' : ''} without Extra Bed`);
    return parts.join(' + ');
  })();

  // Check if image URL is valid (supports cloudinary and other CDN URLs)
  // Priority: day.hotelImage (from DB) > selectedHotelData.image > selectedHotelData.images[0]
  const imageUrl = (() => {
    // Try day.hotelImage first (primary source from hotel DB)
    if (day.hotelImage && typeof day.hotelImage === 'string' && day.hotelImage.trim()) {
      return day.hotelImage;
    }
    // Fallback to selectedHotelData.image
    if (day.selectedHotelData?.image && typeof day.selectedHotelData.image === 'string') {
      return day.selectedHotelData.image;
    }
    // Fallback to first image in selectedHotelData.images array
    if (
      day.selectedHotelData?.images &&
      Array.isArray(day.selectedHotelData.images) &&
      day.selectedHotelData.images.length > 0
    ) {
      return day.selectedHotelData.images[0];
    }
    return null;
  })();

  const hasValidImage =
    imageUrl &&
    (imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://') ||
      imageUrl.startsWith('data:') ||
      imageUrl.startsWith('blob:') ||
      imageUrl.startsWith('//'));

  return (
    <View style={styles.hotelCardSideBySide}>
      {/* LEFT SIDE - 55% width - Text Details */}
      <View style={styles.hotelCardLeft}>
        {/* Night ordinal badges + "Nights at <destination>" */}
        <View style={styles.hotelNightBadgesRow}>
          {nightNumbers.map(n => (
            <View key={n} style={styles.hotelNightOrdinalBadge}>
              <Text style={styles.hotelNightOrdinalText}>{getDayOrdinalLower(n)}</Text>
            </View>
          ))}
          <Text style={styles.hotelNightsAtText}>
            {nightNumbers.length > 1 ? 'Nights' : 'Night'}
            {destinationLabel ? ' at ' : ''}
            {destinationLabel ? (
              <Text style={styles.hotelNightsAtDestination}>{destinationLabel}</Text>
            ) : null}
          </Text>
        </View>

        {/* Check-in date */}
        {checkInLabel && <Text style={styles.hotelCheckInText}>Check-in on {checkInLabel}</Text>}

        {/* Hotel Name */}
        {hotelName && <Text style={styles.hotelNameLarge}>{hotelName}</Text>}

        {/* Star Rating */}
        {hotelStars > 0 && (
          <View style={styles.hotelStarsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <StarIcon key={i} filled={i <= hotelStars} />
            ))}
          </View>
        )}

        {/* Similar / alternative hotels as tags */}
        {(() => {
          const filtered = (similarHotels || []).filter(
            a => a.hotelName && a.hotelName !== hotelName
          );
          if (filtered.length === 0) return null;
          const MAX = 3;
          const shown = filtered.slice(0, MAX);
          const remaining = filtered.length - shown.length;
          return (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <Text style={styles.similarHotelsLabel}>Similar</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {shown.map((a, i) => (
                  <Text key={`${a.hotelId || 'alt'}-${i}`} style={styles.similarHotelsTag}>
                    {a.hotelName}
                  </Text>
                ))}
                {remaining > 0 && <Text style={styles.similarHotelsMore}>+{remaining} more</Text>}
              </View>
            </View>
          );
        })()}

        {/* Rooms / Meal Plan */}
        <View style={styles.hotelColumnsRow}>
          <View style={styles.hotelColumn}>
            <Text style={styles.hotelColumnLabel}>ROOMS</Text>
            <Text style={styles.hotelColumnValue}>
              {numRooms} {roomTypeName}
            </Text>
            <Text style={styles.hotelPaxDetailText}>{paxLine}</Text>
          </View>
          {hasMealPlans && (
            <View style={styles.hotelColumn}>
              <Text style={styles.hotelColumnLabel}>MEAL PLAN</Text>
              <Text style={styles.hotelColumnValue}>{mealPlanLabel}</Text>
            </View>
          )}
        </View>
      </View>

      {/* RIGHT SIDE - 45% width - Photo */}
      <View style={styles.hotelCardRight}>
        {hasValidImage ? (
          <PDFImage src={imageUrl || ''} style={styles.hotelImageSideBySide} placeholder="H" />
        ) : (
          <View style={styles.hotelImagePlaceholderSideBySide}>
            <View style={styles.logoBoxLarge}>
              <Text style={styles.logoText}>H</Text>
            </View>
            <Text style={styles.hotelImagePlaceholderTextSideBySide}>
              {hotelName || 'No hotel'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const NoHotelCard = ({
  nightLabel,
  destinationName,
}: {
  nightLabel: string;
  destinationName?: string;
}) => {
  return (
    <View style={styles.hotelCardSideBySide}>
      {/* LEFT SIDE - 55% width - Text Details */}
      <View style={styles.hotelCardLeft}>
        {/* Night Badge + Hotel location tag on the same line */}
        <View style={styles.hotelLocationRowInline}>
          <Text style={styles.hotelNightBadgeNew}>{nightLabel}</Text>
          {destinationName ? <Text style={styles.hotelLocationPill}>{destinationName}</Text> : null}
        </View>

        {/* Message */}
        <Text style={{ ...styles.hotelNameSideBySide, color: colors.muted }}>
          No hotel for today
        </Text>
        <Text style={{ fontSize: 10, color: colors.muted, marginTop: 8, fontStyle: 'italic' }}>
          Rest day
        </Text>
      </View>

      {/* RIGHT SIDE - 45% width - Placeholder */}
      <View style={styles.hotelCardRight}>
        <View style={styles.hotelImagePlaceholderSideBySide}>
          <View style={styles.logoBoxLarge}>
            <Text style={styles.logoText}>H</Text>
          </View>
          <Text style={styles.hotelImagePlaceholderTextSideBySide}>Rest Day</Text>
        </View>
      </View>
    </View>
  );
};
