// "Hotels / Accommodations": one white card per hotel stay — night badges,
// check-in, hotel name, star rating, rooms and meal plan, photo on the right.

import { Image, Path, Svg, Text, View } from '@react-pdf/renderer';
import { Q, SectionBanner, formatCheckIn, isImageSrc, ordinal } from './theme';
import type { ItineraryDay } from '@/types/index';

const STAR_PATH =
  'M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.7l7.1-.6z';

const Stars = ({ count }: { count: number }) => (
  <View style={{ flexDirection: 'row', marginTop: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Svg key={i} viewBox="0 0 24 24" style={{ width: 13.4, height: 13.4, marginRight: 1.6 }}>
        <Path
          d={STAR_PATH}
          fill={i <= count ? '#000000' : 'none'}
          stroke="#000000"
          strokeWidth={1.4}
        />
      </Svg>
    ))}
  </View>
);

/** Thickness of the black frame around each hotel photo. */
const PHOTO_BORDER = 2;

const hasHotel =(day: ItineraryDay) => !!(day.hotel || day.hotelId || day.selectedRoomType);

const hotelImageOf = (day: ItineraryDay): string | null => {
  const candidates = [
    day.hotelImage,
    day.selectedHotelData?.image,
    day.selectedHotelData?.images?.[0],
  ];
  return candidates.find(isImageSrc) || null;
};

// Rooms are assumed double-occupancy — the day model tracks extra beds and
// no-bed children, not a raw pax count.
const paxLine = (day: ItineraryDay, rooms: number): string => {
  const extraBeds = (day as any).extraBeds ?? (day as any).extraBed ?? 0;
  const noBed = (day as any).childrenNoBed ?? (day as any).childWithoutBed ?? 0;
  const parts = [`${rooms * 2} Pax`];
  if (extraBeds > 0) parts.push(`${extraBeds} with Extra Bed/Mattress`);
  if (noBed > 0) parts.push(`${noBed} ${noBed > 1 ? 'Children' : 'Child'} without Extra Bed/Mattress`);
  return parts.join(' + ');
};

const NightBadge = ({ label }: { label: string }) => (
  <View
    style={{
      height: 22.3,
      paddingHorizontal: 3.7,
      marginRight: 7.8,
      justifyContent: 'center',
      backgroundColor: Q.bannerBg,
      borderWidth: 0.75,
      borderColor: Q.accentLine,
      borderRadius: 2.5,
    }}
  >
    <Text style={{ fontSize: 12, fontWeight: 'bold', color: Q.accent }}>{label}</Text>
  </View>
);

const HotelStayCard = ({ stay }: { stay: ItineraryDay[] }) => {
  const day = stay[0];
  const nights = stay.map(d => d.dayNumber).filter((n): n is number => typeof n === 'number');
  const hotelName = day.hotel || day.selectedHotelData?.name || 'Hotel';
  const rooms = (day as any).numberOfRooms || (day as any).rooms || 1;
  const roomType = day.selectedRoomType?.name || 'Standard';
  const mealPlan = day.selectedMealPlan?.label || day.selectedMealPlan?.type || '';
  const place = day.hotelAddress || day.destination || '';
  const stars = typeof day.hotelStars === 'number' ? Math.round(day.hotelStars) : 0;
  const image = hotelImageOf(day);

  return (
    <View
      wrap={false}
      style={{
        marginTop: 12,
        flexDirection: 'row',
        backgroundColor: Q.white,
        paddingLeft: 18.8,
        paddingRight: 17.6,
        paddingTop: 12.7,
        paddingBottom: 13,
        minHeight: 192,
      }}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          {nights.map(n => (
            <NightBadge key={n} label={ordinal(n)} />
          ))}
          <Text style={{ marginLeft: -3.8 }}>{nights.length > 1 ? 'Nights' : 'Night'}</Text>
        </View>

        {formatCheckIn(day.date) ? (
          <Text style={{ fontSize: 9, color: Q.label, marginTop: 5.1 }}>
            Check-in on {formatCheckIn(day.date)}
          </Text>
        ) : null}

        {/* Hotel name, its address underneath, then the star rating */}
        <Text style={{ fontSize: 15, fontWeight: 'bold', color: Q.accent, marginTop: 10.9 }}>
          {hotelName}
        </Text>
        {place ? (
          <Text style={{ fontSize: 9, color: Q.label, marginTop: 3 }}>{place}</Text>
        ) : null}
        {stars > 0 ? <Stars count={Math.min(stars, 5)} /> : null}

        <View style={{ flexDirection: 'row', marginTop: 11.6 }}>
          <View style={{ width: 150, marginRight: 6.5 }}>
            <Text style={{ fontSize: 9, color: Q.label }}>ROOMS</Text>
            <Text style={{ fontWeight: 'bold', marginTop: 4.1 }}>
              {rooms} {roomType}
            </Text>
            <Text style={{ fontSize: 9, lineHeight: 1.6, marginTop: 1 }}>{paxLine(day, rooms)}</Text>
          </View>
          {mealPlan ? (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: Q.label }}>MEAL PLAN</Text>
              <Text style={{ fontWeight: 'bold', marginTop: 4.1 }}>{mealPlan}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={{
          width: 203.5,
          height: 135.8,
          // Black frame on all four sides. The photo below is sized to sit
          // inside it — at full frame size it painted over the border.
          borderTopWidth: PHOTO_BORDER,
          borderRightWidth: PHOTO_BORDER,
          borderBottomWidth: PHOTO_BORDER,
          borderLeftWidth: PHOTO_BORDER,
          borderColor: '#000000',
          overflow: 'hidden',
          backgroundColor: Q.pageBg,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {image ? (
          <Image
            src={image}
            style={{
              width: 203.5 - 2 * PHOTO_BORDER,
              height: 135.8 - 2 * PHOTO_BORDER,
              objectFit: 'cover',
            }}
          />
        ) : (
          <Text style={{ fontSize: 9, color: Q.label, textAlign: 'center', paddingHorizontal: 8 }}>
            {hotelName}
          </Text>
        )}
      </View>
    </View>
  );
};

// Every night at the same hotel becomes one card, even when the nights aren't
// consecutive (A, A, B, A → A: nights 1, 2, 4 and B: night 3).
export function groupStaysByHotel(days: ItineraryDay[]): ItineraryDay[][] {
  const groups: ItineraryDay[][] = [];
  const indexByKey = new Map<string, number>();
  for (const day of days) {
    if (!hasHotel(day)) continue;
    const key = day.hotelId || (day.hotel || '').trim().toLowerCase();
    const existing = indexByKey.get(key);
    if (existing !== undefined) {
      groups[existing].push(day);
    } else {
      indexByKey.set(key, groups.length);
      groups.push([day]);
    }
  }
  return groups;
}

export const HotelStays = ({
  stays,
  title = 'Hotels / Accommodations',
  marginTop = 0,
}: {
  stays: ItineraryDay[][];
  title?: string;
  marginTop?: number;
}) => {
  if (stays.length === 0) return null;
  // Fragments, not a wrapping View — see BulletList in theme.tsx for why.
  return (
    <>
      <View wrap={false}>
        <SectionBanner title={title} marginTop={marginTop} />
        <View style={{ height: 12 }} />
        <HotelStayCard stay={stays[0]} />
      </View>
      {stays.slice(1).map((stay, idx) => (
        <HotelStayCard key={idx} stay={stay} />
      ))}
    </>
  );
};
