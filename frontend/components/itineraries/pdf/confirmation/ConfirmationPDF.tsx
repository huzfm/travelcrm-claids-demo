// One-page "Holiday Package Confirmation" — the short summary a client gets
// before the full itinerary PDF, so changes can be asked for first.

import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  Polygon,
  G,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ComponentProps } from 'react';
import { Icon, type IconName } from './icons';
import { COMPANY_EMAIL, COMPANY_PHONES } from '../company';
import type { ConfirmationData } from './data';

// Day titles and list items are short phrases; react-pdf's default hyphenation
// splits words like "Gar-dens" across lines, so every text here wraps on whole words.
const wholeWords = (word: string) => [word];
const T = (props: ComponentProps<typeof Text>) => (
  <Text hyphenationCallback={wholeWords} {...props} />
);

export const CONFIRMATION_FONT = 'Montserrat';

const COMPANY_LEGAL_NAME = 'CLAIDS TRAVEL';
const COMPANY_GREETING_NAME = 'Claids Travel';
const COMPANY_CITIES = ['Srinagar', 'Delhi', 'India'];
const COMPANY_WEBSITE = 'www.tripoday.com';
const COMPANY_ADDRESS = 'Srinagar, Jammu & Kashmir';

const IMPORTANT_INFO = [
  'Please carry a valid government-issued ID during the trip.',
  'The package is subject to the terms and conditions shared at the time of booking.',
  'Changes or cancellations will be governed by the applicable cancellation policy.',
  'Final vouchers and hotel details will be shared 1–2 days before travel.',
];

const C = {
  red: '#db0201',
  redDark: '#b00201',
  navy: '#1c2434',
  text: '#2b2f36',
  muted: '#5f6672',
  line: '#e3e5e9',
  card: '#f5f6f8',
  white: '#ffffff',
  green: '#1f7a3a',
  greenBg: '#edf6ee',
  greenLine: '#d3e8d7',
  decor: '#e6e9ed',
  decorDark: '#d8dce2',
};

const s = StyleSheet.create({
  page: {
    fontFamily: CONFIRMATION_FONT,
    fontSize: 8.5,
    color: C.text,
    backgroundColor: C.white,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 46,
  },

  // Header
  decor: { position: 'absolute', top: 0, right: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  company: { alignItems: 'flex-end' },
  companyName: { fontSize: 9.5, fontWeight: 700, color: C.navy, letterSpacing: 0.3 },
  companyCities: { fontSize: 8, color: C.muted, marginTop: 3 },
  companyRule: { width: 70, height: 1.2, backgroundColor: C.red, marginTop: 5 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  titleTop: { fontSize: 23, fontWeight: 800, color: C.navy, lineHeight: 1.05 },
  titleBottom: { fontSize: 30, fontWeight: 800, color: C.red, lineHeight: 1.05 },
  dear: { fontSize: 13, fontWeight: 700, color: C.navy, marginTop: 9 },
  greeting: { fontSize: 9.5, marginTop: 7 },
  intro: { fontSize: 9.5, lineHeight: 1.45, marginTop: 4 },
  bold: { fontWeight: 700, color: C.navy },

  bookingBox: {
    width: 172,
    marginTop: 4,
    backgroundColor: C.greenBg,
    borderWidth: 1,
    borderColor: C.greenLine,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
  },
  bookingLabel: { fontSize: 8, color: C.text },
  bookingId: { fontSize: 12.5, fontWeight: 700, color: C.navy, marginTop: 2, marginBottom: 6 },
  statusPill: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.green,
    borderRadius: 12,
    paddingLeft: 10,
    paddingRight: 3,
    paddingVertical: 3,
  },
  statusText: { fontSize: 9.5, fontWeight: 800, color: C.white, marginRight: 8 },

  // Cards
  card: { backgroundColor: C.card, borderRadius: 8, padding: 9, marginTop: 7 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 11.5, fontWeight: 700, color: C.red, marginLeft: 7 },
  twoCol: { flexDirection: 'row', marginTop: 7 },

  // Trip details
  detailsRow: { flexDirection: 'row' },
  detail: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  detailDivider: { borderLeftWidth: 1, borderLeftColor: C.line },
  detailLabel: { fontSize: 7.5, color: C.muted },
  detailValue: { fontSize: 7.6, fontWeight: 700, color: C.navy, marginTop: 2.5 },

  // Hotel table
  table: { borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  thRow: { flexDirection: 'row', backgroundColor: C.red },
  th: {
    fontSize: 8.5,
    fontWeight: 700,
    color: C.white,
    textAlign: 'center',
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tr: { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line },
  td: { fontSize: 8, textAlign: 'center', paddingVertical: 4.5, paddingHorizontal: 5 },
  tdCity: { fontWeight: 700, color: C.navy },
  cellDivider: { borderLeftWidth: 1, borderLeftColor: C.line },

  // Day plan
  dayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3.5 },
  dayBadge: {
    width: 40,
    backgroundColor: C.red,
    borderRadius: 3,
    paddingVertical: 3,
    marginRight: 9,
  },
  dayBadgeText: { fontSize: 8, fontWeight: 700, color: C.white, textAlign: 'center' },
  dayText: { flex: 1, fontSize: 8.2, lineHeight: 1.3 },

  // Transport
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 5,
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginBottom: 3.5,
  },
  transportLabel: { width: 58, fontSize: 8, marginLeft: 7 },
  transportValue: {
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    color: C.navy,
    borderLeftWidth: 1,
    borderLeftColor: C.line,
    paddingLeft: 7,
  },

  // Inclusions / exclusions
  listRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3.5 },
  listText: { flex: 1, fontSize: 8.4, marginLeft: 8, lineHeight: 1.3 },

  // Important info
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3.5 },
  bulletDot: {
    width: 3.2,
    height: 3.2,
    borderRadius: 1.6,
    backgroundColor: C.red,
    marginTop: 3.4,
    marginRight: 8,
    marginLeft: 4,
  },
  bulletText: { flex: 1, fontSize: 7.8, lineHeight: 1.35 },

  // Assistance
  assistTitle: { fontSize: 9.5, fontWeight: 700, color: C.navy, lineHeight: 1.3 },
  assistRule: { width: 26, height: 1.5, backgroundColor: C.red, marginTop: 4 },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.red,
    borderRadius: 18,
    padding: 4,
    marginTop: 8,
  },
  phoneCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.redDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  phoneText: { fontSize: 10.5, fontWeight: 700, color: C.white, lineHeight: 1.25 },

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 38,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9 },
  footerText: { fontSize: 7.5, color: C.white, marginLeft: 6 },
  footerDivider: { width: 0.8, height: 18, backgroundColor: '#f19a99' },
});

// ─── Pieces ────────────────────────────────────────────────────────────────

/** Snowy ranges, pines and a plane on a dotted path — the top-right artwork. */
function HeaderDecor() {
  return (
    <Svg style={s.decor} width={310} height={170} viewBox="0 0 310 170">
      <Path
        d="M18 92 C 40 60, 70 108, 92 78 C 104 62, 88 52, 80 64 C 74 74, 100 78, 128 58"
        stroke={C.decorDark}
        strokeWidth={1.1}
        strokeDasharray="2.5,3"
        fill="none"
      />
      <G transform="translate(126, 22) scale(2.1)">
        <Path
          d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
          fill={C.decorDark}
        />
      </G>
      <Polygon
        points="70,170 140,104 166,122 214,72 252,110 280,90 310,112 310,170"
        fill={C.decor}
      />
      <Polygon points="214,72 204,86 211,83 217,90 224,80" fill={C.white} />
      <Polygon points="140,104 132,113 139,111 145,116" fill={C.white} />
      <Polygon
        points="110,170 170,128 200,146 240,116 274,140 310,128 310,170"
        fill={C.decorDark}
      />
      <Polygon points="292,92 283,112 288,112 280,128 304,128 296,112 301,112" fill={C.decorDark} />
      <Polygon
        points="274,108 268,122 272,122 266,134 284,134 278,122 282,122"
        fill={C.decorDark}
      />
    </Svg>
  );
}

function CardTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={s.cardTitleRow}>
      <Icon name={icon} size={15} color={C.red} strokeWidth={2.2} />
      <T style={s.cardTitle}>{title}</T>
    </View>
  );
}

function Detail({
  icon,
  label,
  value,
  flex,
  divider,
  solid,
}: {
  icon: IconName;
  label: string;
  value: string;
  flex: number;
  divider?: boolean;
  solid?: boolean;
}) {
  return (
    <View style={[s.detail, { flex }, divider ? s.detailDivider : {}]}>
      <Icon name={icon} size={14} color={C.red} strokeWidth={2.1} solid={solid} />
      <View style={{ marginLeft: 5, flex: 1 }}>
        <T style={s.detailLabel}>{label}</T>
        <T style={s.detailValue}>{value}</T>
      </View>
    </View>
  );
}

const HOTEL_COLUMNS = [
  { key: 'city', label: 'City', flex: 1.05 },
  { key: 'hotel', label: 'Hotel Name', flex: 1.9 },
  { key: 'nights', label: 'Nights', flex: 0.85 },
  { key: 'roomType', label: 'Room Type', flex: 1.2 },
  { key: 'mealPlan', label: 'Meal Plan', flex: 1.55 },
] as const;

function HotelTable({ rows }: { rows: ConfirmationData['hotels'] }) {
  return (
    <View style={s.table}>
      <View style={s.thRow}>
        {HOTEL_COLUMNS.map((col, i) => (
          <T
            key={col.key}
            style={[
              s.th,
              { flex: col.flex },
              i > 0 ? { borderLeftWidth: 1, borderLeftColor: '#ea5a59' } : {},
            ]}
          >
            {col.label}
          </T>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={s.tr} wrap={false}>
          {HOTEL_COLUMNS.map((col, i) => {
            const value =
              col.key === 'nights'
                ? `${row.nights} ${row.nights === 1 ? 'Night' : 'Nights'}`
                : row[col.key];
            return (
              <T
                key={col.key}
                style={[
                  s.td,
                  { flex: col.flex },
                  i > 0 ? s.cellDivider : {},
                  col.key === 'city' ? s.tdCity : {},
                  col.key === 'hotel' ? { textAlign: 'left', paddingLeft: 9 } : {},
                ]}
              >
                {value}
              </T>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function TransportRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const solid = icon === 'map-pin';
  return (
    <View style={s.transportRow}>
      <Icon name={icon} size={12} color={C.red} strokeWidth={2.2} solid={solid} />
      <T style={s.transportLabel}>{label}</T>
      <T style={s.transportValue}>{value}</T>
    </View>
  );
}

// ─── Document ──────────────────────────────────────────────────────────────

export interface ConfirmationLogo {
  src: string;
  width: number;
  height: number;
}

export function ConfirmationPDFDocument({
  data,
  logo,
}: {
  data: ConfirmationData;
  logo?: ConfirmationLogo | null;
}) {
  const [phoneA, phoneB] = COMPANY_PHONES;

  return (
    <Document title={`Booking Confirmation - ${data.bookingId}`} author={COMPANY_GREETING_NAME}>
      <Page size="A4" style={s.page}>
        <HeaderDecor />

        {/* Logo + company */}
        <View style={s.headerRow}>
          {logo ? (
            <Image
              src={logo.src}
              style={{ width: 150, height: (150 * logo.height) / logo.width }}
            />
          ) : (
            <T style={{ fontSize: 26, fontWeight: 800, color: C.red }}>Claids Travel</T>
          )}
          <View style={s.company}>
            <T style={s.companyName}>{COMPANY_LEGAL_NAME}</T>
            <T style={s.companyCities}>{COMPANY_CITIES.join('  |  ')}</T>
            <View style={s.companyRule} />
          </View>
        </View>

        {/* Title, greeting and booking box */}
        <View style={s.titleRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <T style={s.titleTop}>HOLIDAY PACKAGE</T>
            <T style={s.titleBottom}>CONFIRMATION</T>
            <T style={s.dear}>Dear {data.greetingName},</T>
            <T style={s.greeting}>
              Greetings from <T style={s.bold}>{COMPANY_GREETING_NAME}</T>
            </T>
          </View>

          <View style={s.bookingBox}>
            <Icon name="calendar-days" size={24} color={C.red} strokeWidth={2.1} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <T style={s.bookingLabel}>Booking ID</T>
              <T style={s.bookingId}>{data.bookingId}</T>
              <T style={s.bookingLabel}>Booking Status</T>
              <View style={s.statusPill}>
                <T style={s.statusText}>CONFIRMED</T>
                <Icon
                  name="circle-check"
                  size={17}
                  color={C.white}
                  inner={C.green}
                  solid
                  strokeWidth={2.6}
                />
              </View>
            </View>
          </View>
        </View>

        <T style={s.intro}>
          We are pleased to confirm your holiday package to{' '}
          <T style={s.bold}>{data.destination}.</T> Your booking has been successfully processed and
          all services are confirmed as per the details below.
        </T>

        {/* Trip details */}
        <View style={s.card} wrap={false}>
          <CardTitle icon="briefcase" title="TRIP DETAILS" />
          <View style={s.detailsRow}>
            <Detail icon="map-pin" solid label="Destination" value={data.destination} flex={0.74} />
            <Detail
              icon="calendar-days"
              label="Travel Dates"
              value={data.travelDates}
              flex={1.45}
              divider
            />
            <Detail icon="moon" solid label="Duration" value={data.duration} flex={1.08} divider />
            <Detail
              icon="users"
              label="No. of Travellers"
              value={data.travellers}
              flex={0.98}
              divider
            />
            <Detail
              icon="phone"
              solid
              label="Contact Number"
              value={data.contact}
              flex={0.99}
              divider
            />
          </View>
        </View>

        {/* Hotels */}
        {data.hotels.length > 0 && (
          <View style={s.card} wrap={false}>
            <CardTitle icon="bed-double" title="HOTEL ACCOMMODATION" />
            <HotelTable rows={data.hotels} />
          </View>
        )}

        {/* Day plan + transport */}
        <View style={s.twoCol} wrap={false}>
          <View style={[s.card, { flex: 1.75, marginTop: 0, marginRight: 9 }]}>
            <CardTitle icon="camera" title="DAY WISE SIGHTSEEING PLAN" />
            {data.days.map(day => (
              <View key={day.dayNumber} style={s.dayRow}>
                <View style={s.dayBadge}>
                  <T style={s.dayBadgeText}>Day {day.dayNumber}</T>
                </View>
                <T style={s.dayText}>{day.text}</T>
              </View>
            ))}
          </View>
          <View style={[s.card, { flex: 1, marginTop: 0 }]}>
            <CardTitle icon="car" title="TRANSPORTATION" />
            <TransportRow icon="car" label="Vehicle Type" value={data.transport.vehicle} />
            <TransportRow icon="map-pin" label="Pickup" value={data.transport.pickup} />
            <TransportRow icon="map-pin" label="Drop" value={data.transport.drop} />
            <TransportRow icon="camera" label="Sightseeing" value={data.transport.sightseeing} />
          </View>
        </View>

        {/* Inclusions + exclusions */}
        {(data.inclusions.length > 0 || data.exclusions.length > 0) && (
          <View style={s.twoCol} wrap={false}>
            <View
              style={[
                s.card,
                {
                  flex: 1,
                  marginTop: 0,
                  marginRight: 9,
                  backgroundColor: C.greenBg,
                  borderWidth: 1,
                  borderColor: C.greenLine,
                },
              ]}
            >
              <View style={s.cardTitleRow}>
                <Icon name="circle-check" size={17} color={C.green} solid strokeWidth={2.6} />
                <T style={[s.cardTitle, { color: C.green }]}>PACKAGE INCLUSIONS</T>
              </View>
              {data.inclusions.map((item, i) => (
                <View key={i} style={s.listRow}>
                  <Icon name="circle-check" size={12} color={C.green} solid strokeWidth={2.8} />
                  <T style={s.listText}>{item}</T>
                </View>
              ))}
            </View>
            <View style={[s.card, { flex: 1, marginTop: 0 }]}>
              <View style={s.cardTitleRow}>
                <Icon name="circle-x" size={17} color={C.red} solid strokeWidth={2.6} />
                <T style={s.cardTitle}>PACKAGE EXCLUSIONS</T>
              </View>
              {data.exclusions.map((item, i) => (
                <View key={i} style={s.listRow}>
                  <Icon name="x" size={11} color={C.red} strokeWidth={2.4} />
                  <T style={s.listText}>{item}</T>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Important info + assistance */}
        <View style={s.twoCol} wrap={false}>
          <View style={[s.card, { flex: 1.65, marginTop: 0, marginRight: 9 }]}>
            <CardTitle icon="file-text" title="IMPORTANT INFORMATION" />
            {IMPORTANT_INFO.map((line, i) => (
              <View key={i} style={s.bulletRow}>
                <View style={s.bulletDot} />
                <T style={s.bulletText}>{line}</T>
              </View>
            ))}
          </View>
          <View style={[s.card, { flex: 1, marginTop: 0, justifyContent: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="headset" size={30} color={C.red} strokeWidth={2} />
              <View style={{ marginLeft: 10 }}>
                <T style={s.assistTitle}>For any assistance,</T>
                <T style={s.assistTitle}>please contact us</T>
                <View style={s.assistRule} />
              </View>
            </View>
            <View style={s.phonePill}>
              <View style={s.phoneCircle}>
                <Icon name="phone" size={14} color={C.white} solid />
              </View>
              <View>
                <T style={s.phoneText}>{phoneA}</T>
                {phoneB && <T style={s.phoneText}>{phoneB}</T>}
              </View>
            </View>
          </View>
        </View>

        {/* Footer bar */}
        <View style={s.footer} fixed>
          <View style={s.footerItem}>
            <Icon name="phone" size={12} color={C.white} solid />
            <T style={s.footerText}>{COMPANY_PHONES.join('  |  ')}</T>
          </View>
          <View style={s.footerDivider} />
          <View style={s.footerItem}>
            <Icon name="mail" size={12} color={C.white} strokeWidth={2} />
            <T style={s.footerText}>{COMPANY_EMAIL}</T>
          </View>
          <View style={s.footerDivider} />
          <View style={s.footerItem}>
            <Icon name="globe" size={12} color={C.white} strokeWidth={2} />
            <T style={s.footerText}>{COMPANY_WEBSITE}</T>
          </View>
          <View style={s.footerDivider} />
          <View style={s.footerItem}>
            <Icon name="map-pin" size={12} color={C.white} inner={C.red} solid />
            <T style={s.footerText}>{COMPANY_ADDRESS}</T>
          </View>
        </View>
      </Page>
    </Document>
  );
}
