// Single-Option Hotel Card Component - Side by Side Layout

import { Text, View, Svg, Path } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import type { ItineraryDay } from '@/types/itinerary.types';
import { PDFImage } from './PDFImage';
import { getDayOrdinalLower, formatCheckInDate } from '../utils';

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

interface HotelCardProps {
  day: ItineraryDay;
  /** Day numbers making up this consecutive stay, e.g. [1, 2, 3] for a 3-night stay */
  nights?: number[];
  showFullDetails?: boolean;
  imageQuality?: 'draft' | 'normal' | 'high';
}

export const HotelCard = ({ day, nights }: HotelCardProps) => {
  const nightNumbers = nights && nights.length > 0 ? nights : [day.dayNumber];
  const roomType = day.selectedRoomType;
  const mealPlan = day.selectedMealPlan;
  const hotelData = day.selectedHotelData;
  const hotelName = day.hotel || hotelData?.name || 'Hotel';
  const numRooms = (day as any).numberOfRooms || (day as any).rooms || 1;
  const extraBeds = (day as any).extraBeds ?? (day as any).extraBed ?? 0;
  const childNoBed = (day as any).childrenNoBed ?? (day as any).childWithoutBed ?? 0;
  const roomTypeName = roomType?.name || 'Standard';
  const hasMealPlans = mealPlan && (mealPlan.label || mealPlan.type);
  const mealPlanLabel = mealPlan?.label || mealPlan?.type || null;
  const hasHotel = !!(day.hotel || day.hotelId || day.selectedRoomType);
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

  // No hotel: only show a card if it's an explicit leisure day. Otherwise render nothing.
  if (!hasHotel) {
    if (day.dayType !== 'leisure') return null;
    return (
      <View style={styles.hotelCardSideBySide}>
        {/* LEFT SIDE - 55% width - Text Details */}
        <View style={styles.hotelCardLeft}>
          {/* Night Badge + Hotel location tag on the same line */}
          <View style={styles.hotelLocationRowInline}>
            <Text style={styles.hotelNightBadgeNew}>
              {nightNumbers.length > 1
                ? `Nights ${nightNumbers.join(', ')}`
                : `Night ${nightNumbers[0]}`}
            </Text>
            {day.hotelAddress ? (
              <Text style={styles.hotelLocationPill}>{day.hotelAddress}</Text>
            ) : day.destination ? (
              <Text style={styles.hotelLocationPill}>{day.destination}</Text>
            ) : null}
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
  }

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
        <Text style={styles.hotelNameLarge}>{hotelName}</Text>

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
          const alts = (day as any).alternatives?.hotelOptions as
            | Array<{ hotelId?: string; hotelName: string }>
            | undefined;
          if (!alts || alts.length === 0) return null;
          const filtered = alts.filter(a => a.hotelName && a.hotelName !== hotelName);
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
          <PDFImage src={imageUrl} style={styles.hotelImageSideBySide} placeholder="H" />
        ) : (
          <View style={styles.hotelImagePlaceholderSideBySide}>
            <View style={styles.logoBoxLarge}>
              <Text style={styles.logoText}>H</Text>
            </View>
            <Text style={styles.hotelImagePlaceholderTextSideBySide}>{hotelName}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
