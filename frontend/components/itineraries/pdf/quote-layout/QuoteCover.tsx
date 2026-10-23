// Cover page, top to bottom: the admin's cover image from "Edit PDF" filling
// all the space above the trip snapshot (a plain company + destination cover
// when none is uploaded), the trip snapshot box, then the "Edit PDF" cover
// footer banner. A flex column, so the image takes exactly the height left
// over by the box and the banner, however tall the banner wraps.

import { Image, Page, Path, Rect, Svg, Text, View } from '@react-pdf/renderer';
import { A4_HEIGHT, FONT, Q, formatPaxShort, formatShort, isImageSrc } from './theme';
import { COMPANY_NAME } from '../company';
import { CoverFooterBanner } from './Footers';
import type { PDFCoverFooterFields } from '@/hooks/useSettings';
import type { Itinerary, ItineraryDay } from '@/types/index';

const MUTED = '#4b5563';

// Two small chequered flags at the start of the trip line and a finish banner
// at its end, drawn rather than typed — no PDF font carries these glyphs.
const StartFlags = () => (
  <Svg viewBox="0 0 14 9" style={{ width: 12.5, height: 8 }}>
    <Path
      d="M1 9 L4 1 M4 1 L7.5 2.2 L6.2 5.6 L2.7 4.4 Z"
      stroke={Q.text}
      strokeWidth={0.6}
      fill="none"
    />
    <Path
      d="M13 9 L10 1 M10 1 L6.5 2.2 L7.8 5.6 L11.3 4.4 Z"
      stroke={Q.text}
      strokeWidth={0.6}
      fill="none"
    />
    <Rect x={4.6} y={1.8} width={1.4} height={1.4} fill={Q.text} />
    <Rect x={8} y={1.8} width={1.4} height={1.4} fill={Q.text} />
  </Svg>
);

const FinishFlag = () => (
  <Svg viewBox="0 0 12 10" style={{ width: 10.3, height: 8.6 }}>
    <Rect x={0.5} y={0} width={0.8} height={10} fill={Q.text} />
    <Rect x={10.7} y={0} width={0.8} height={10} fill={Q.text} />
    <Rect x={1.3} y={0.6} width={9.4} height={4.6} stroke={Q.text} strokeWidth={0.5} fill="none" />
    {[0, 1, 2, 3, 4].map(col =>
      [0, 1].map(row =>
        (col + row) % 2 === 0 ? (
          <Rect
            key={`${col}-${row}`}
            x={1.3 + col * 1.88}
            y={0.6 + row * 2.3}
            width={1.88}
            height={2.3}
            fill={Q.text}
          />
        ) : null
      )
    )}
  </Svg>
);

interface QuoteCoverProps {
  itinerary: Itinerary;
  days: ItineraryDay[];
  /** Uploaded cover design (data/http URL); null renders the plain text cover. */
  coverSrc: string | null;
  /** The cover's two-bar footer banner from "Edit PDF". */
  coverFooter?: PDFCoverFooterFields | null;
}

export const QuoteCover = ({ itinerary, days, coverSrc, coverFooter }: QuoteCoverProps) => {
  const clientName = itinerary.clientName || itinerary.lead?.name || 'Valued Guest';
  const salutation = itinerary.salutation || 'Mr';
  const pax = formatPaxShort(itinerary.adults, itinerary.children, itinerary.childrenAges);
  const consultantName = itinerary.creator?.name;
  const consultantPhoto = itinerary.creator?.avatarUrl;
  const consultantPhone = itinerary.creator?.phone?.trim();
  const nights = Math.max(0, (days?.length || 0) - 1);

  return (
    <Page
      size="A4"
      style={{ fontFamily: FONT, fontSize: 10.5, color: Q.text, backgroundColor: Q.white }}
    >
      {/* An explicit A4-tall column (a hair under, so rounding never spills a
          second page); wrap={false} on the Page would shrink it to fit instead. */}
      <View style={{ height: A4_HEIGHT - 1, flexDirection: 'column' }}>
        {coverSrc ? (
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, overflow: 'hidden' }}>
            {/* Full page width, height from the image's own proportions, pinned to
                the top: the design's header always shows and there are no white
                side strips. If the image is taller than this box, only its
                bottom edge is trimmed (the box clips the overflow). */}
            <Image src={coverSrc} style={{ width: '100%' }} />
          </View>
        ) : (
          <View
            style={{
              flexGrow: 1,
              flexShrink: 1,
              flexBasis: 0,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 40,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: Q.accent, letterSpacing: 2 }}>
              {COMPANY_NAME.toUpperCase()}
            </Text>
            <View
              style={{ width: 60, height: 3, backgroundColor: Q.accentLine, marginVertical: 18 }}
            />
            <Text style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center' }}>
              {itinerary.destination || itinerary.title || 'Your Trip'}
            </Text>
            <Text style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>Trip Quote</Text>
          </View>
        )}

        <View
          style={{
            marginLeft: 18,
            marginRight: 18,
            marginTop: 10,
            marginBottom: 10,
            height: 95.3,
            flexShrink: 0,
            backgroundColor: Q.white,
            flexDirection: 'row',
          }}
        >
          {/* Trip snapshot */}
          <View style={{ flex: 1, paddingLeft: 12.8, paddingTop: 13.1 }}>
            <Text>
              <Text style={{ color: MUTED }}>Trip ID: </Text>
              <Text style={{ fontWeight: 'bold' }}>
                {itinerary.tripId ? `#${itinerary.tripId}` : 'N/A'}
              </Text>
            </Text>
            <Text style={{ marginTop: 4.1 }}>
              {salutation}. {clientName}{' '}
              {pax ? <Text style={{ fontWeight: 'bold' }}> • {pax}</Text> : null}
            </Text>

            <View style={{ width: 170, marginTop: 10 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}
              >
                <StartFlags />
                <View style={{ marginRight: 1 }}>
                  <FinishFlag />
                </View>
              </View>
              <View
                style={{
                  borderBottomWidth: 0.7,
                  borderBottomColor: Q.text,
                  borderBottomStyle: 'dotted',
                  marginTop: 0.5,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', marginTop: 10.4, alignItems: 'flex-end' }}>
              <Text style={{ width: 134 }}>
                <Text style={{ color: MUTED }}>Starts: </Text>
                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                  {formatShort(itinerary.startDate)}
                </Text>
              </Text>
              <Text>
                <Text style={{ color: MUTED }}>Ends: </Text>
                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                  {formatShort(itinerary.endDate)}
                </Text>
                {days?.length ? (
                  <Text style={{ fontWeight: 'bold' }}>
                    {' '}
                    ({nights}N/{days.length}D)
                  </Text>
                ) : null}
              </Text>
            </View>
          </View>

          {/* Holiday consultant */}
          {consultantName ? (
            <View style={{ width: 186.4, flexDirection: 'row' }}>
              <View style={{ width: 0.75, backgroundColor: '#8a8a8a' }} />
              <View style={{ flex: 1, paddingLeft: 12.4, paddingTop: 14 }}>
                <Text style={{ fontSize: 12, color: '#374151' }}>Your Holiday Consultant</Text>
                <View style={{ flexDirection: 'row', marginTop: 9 }}>
                  <View
                    style={{
                      width: 39,
                      height: 39,
                      borderRadius: 3,
                      overflow: 'hidden',
                      backgroundColor: Q.bannerBg,
                      marginLeft: 1,
                      marginRight: 6.5,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {isImageSrc(consultantPhoto) ? (
                      <Image
                        src={consultantPhoto}
                        style={{ width: 39, height: 39, objectFit: 'cover' }}
                      />
                    ) : (
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: Q.accent }}>
                        {consultantName.charAt(0)}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginTop: 2 }}>
                    <Text style={{ fontWeight: 'bold' }}>{consultantName}</Text>
                    {consultantPhone ? (
                      <Text style={{ fontSize: 9.5, color: '#374151', marginTop: 3 }}>
                        {consultantPhone}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        <CoverFooterBanner fields={coverFooter} />
      </View>
    </Page>
  );
};
