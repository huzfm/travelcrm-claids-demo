// The sections that flow one after another across pages after the hotels:
// transport, flights, day-wise itinerary, inclusions/exclusions and terms.

import { Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { stripBullets } from '../single-option/utils';
import { styles as oldStyles } from '../single-option/styles';
import { TransportCard } from '../single-option/components/TransportCard';
import { activitiesNotInDescription } from '@/lib/activities-in-description';
import { resolveItineraryTerms, type PDFTermsSettings, type TermsSection } from './defaults';
import {
  DotList,
  Q,
  SectionBanner,
  SquareList,
  formatDayHeader,
  formatShort,
  ordinal,
  toLines,
} from './theme';
import type { FlightSegment, ItineraryDay } from '@/types/index';

// ============================================================
// TRANSPORTATION
// ============================================================

/** "1-Tempo Traveler 25 Seater, 2-Innova" — one entry per distinct vehicle. */
export function transportSummary(days: ItineraryDay[]): string {
  const seen = new Map<string, string>();
  for (const day of days) {
    const raw = day.vehicleName || day.selectedVehicle?.name || '';
    if (!raw || raw.toUpperCase() === 'TBD') continue;
    const key = day.vehicleId || raw.trim().toLowerCase();
    if (seen.has(key)) continue;
    const count = (day as any).numberOfVehicles || 1;
    seen.set(key, `${count}-${raw.trim()}`);
  }
  return Array.from(seen.values()).join(', ');
}

export const TransportBlock = ({
  lines,
  marginTop = 0,
}: {
  /** One row per line, e.g. "Transportation Used: 1-Tempo Traveler 25 Seater". */
  lines: string[];
  marginTop?: number;
}) => {
  if (lines.length === 0) return null;
  return (
    <View wrap={false}>
      <SectionBanner title="Transportation" marginTop={marginTop} />
      <View
        wrap={false}
        style={{
          marginTop: 12,
          backgroundColor: Q.white,
          borderWidth: 0.75,
          borderColor: Q.border,
        }}
      >
        {lines.map((line, idx) => (
          <View
            key={idx}
            style={{
              minHeight: 32,
              justifyContent: 'center',
              paddingHorizontal: 6.8,
              paddingVertical: 6,
              borderTopWidth: idx > 0 ? 0.75 : 0,
              borderTopColor: Q.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{line}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Transport as the client had it before the quote-layout redesign: a
 * Days / Car Name / Car Count table, one row per distinct vehicle. Kept short
 * so it sits on its own page, taking roughly the top half.
 */
export const TransportTable = ({
  groups,
  marginTop = 0,
}: {
  /** One table per package option (label shown above it); a single unlabelled one otherwise. */
  groups: Array<{ label?: string; days: ItineraryDay[] }>;
  marginTop?: number;
}) => {
  const tables = groups
    .map(g => ({ label: g.label, rows: groupDaysByVehicle(g.days) }))
    .filter(t => t.rows.length > 0);
  if (tables.length === 0) return null;
  return (
    <View>
      <SectionBanner title="Transportation Details" marginTop={marginTop} />
      {tables.map((table, tIdx) => (
        <View key={tIdx} wrap={false} style={{ marginTop: 14 }}>
          {table.label ? (
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: Q.accent, marginBottom: 6 }}>
              {table.label}
            </Text>
          ) : null}
          <View style={[oldStyles.transportHeaderRow, { marginBottom: 4 }]}>
            <Text style={oldStyles.transportHeaderDay}>Days</Text>
            <Text style={oldStyles.transportHeaderName}>Car Name</Text>
            <Text style={oldStyles.transportHeaderCount}>Car Count</Text>
          </View>
          {table.rows.map((rowDays, idx) => (
            <TransportCard key={idx} days={rowDays} />
          ))}
        </View>
      ))}
    </View>
  );
};

/** Days that share a vehicle become one row; days with no vehicle are left out. */
function groupDaysByVehicle(days: ItineraryDay[]): ItineraryDay[][] {
  const groups = new Map<string, ItineraryDay[]>();
  for (const day of days) {
    const raw = day.vehicleName || day.selectedVehicle?.name || '';
    if (!raw || raw.toUpperCase() === 'TBD') continue;
    const type = day.vehicleType || day.selectedVehicle?.vehicleType || '';
    const key = day.vehicleId || `${raw.trim().toLowerCase()}|${type}`;
    const list = groups.get(key);
    if (list) list.push(day);
    else groups.set(key, [day]);
  }
  return Array.from(groups.values());
}

// ============================================================
// FLIGHTS
// ============================================================

const DIRECTION_LABELS: Record<string, string> = {
  OUTBOUND: 'Outbound',
  RETURN: 'Return',
  INTERNAL: 'Connecting',
};

export const printableFlights = (flights?: FlightSegment[]): FlightSegment[] =>
  (flights || []).filter(f => f && (f.flightNumber || f.departureCode || f.arrivalCode));

const place = (code?: string, city?: string) => [code, city].filter(Boolean).join(' · ');

export const FlightsBlock = ({
  flights,
  marginTop = 0,
}: {
  flights: FlightSegment[];
  marginTop?: number;
}) => {
  if (flights.length === 0) return null;
  const card = (flight: FlightSegment, idx: number) => {
    const meta = [
      flight.airline,
      flight.pnr ? `PNR ${flight.pnr}` : '',
      flight.baggage ? `Baggage ${flight.baggage}` : '',
      flight.stops === 0 ? 'Non-stop' : flight.stops ? `${flight.stops} stop(s)` : '',
    ]
      .filter(Boolean)
      .join('  ·  ');
    return (
      <View
        key={flight.id || idx}
        wrap={false}
        style={{
          marginTop: 12,
          backgroundColor: Q.white,
          borderWidth: 0.75,
          borderColor: Q.border,
          borderRadius: 4,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontWeight: 'bold' }}>
          <Text style={{ color: Q.accent }}>{DIRECTION_LABELS[flight.direction] || 'Flight'}</Text>
          {'  '}
          {flight.flightNumber || ''}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: Q.label }}>DEPARTURE</Text>
            <Text style={{ fontWeight: 'bold', marginTop: 2 }}>
              {[flight.departureTime, place(flight.departureCode, flight.departureCity)]
                .filter(Boolean)
                .join('  ')}
            </Text>
            <Text style={{ fontSize: 9, marginTop: 1 }}>{formatShort(flight.departureDate)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: Q.label }}>ARRIVAL</Text>
            <Text style={{ fontWeight: 'bold', marginTop: 2 }}>
              {[flight.arrivalTime, place(flight.arrivalCode, flight.arrivalCity)]
                .filter(Boolean)
                .join('  ')}
            </Text>
            <Text style={{ fontSize: 9, marginTop: 1 }}>{formatShort(flight.arrivalDate)}</Text>
          </View>
        </View>
        {meta ? <Text style={{ fontSize: 9, color: Q.label, marginTop: 6 }}>{meta}</Text> : null}
      </View>
    );
  };
  // Fragments, not a wrapping View — see BulletList in theme.tsx for why.
  return (
    <>
      <View wrap={false}>
        <SectionBanner title="Flights" marginTop={marginTop} />
        {card(flights[0], 0)}
      </View>
      {flights.slice(1).map((flight, idx) => card(flight, idx + 1))}
    </>
  );
};

// ============================================================
// DAY WISE ITINERARY
// ============================================================

/** Days worth listing: anything with a title, description, activities or a leisure day. */
export const daysWithContent = (days: ItineraryDay[]): ItineraryDay[] =>
  days.filter(
    d =>
      (d.activities && d.activities.length > 0) ||
      d.description ||
      d.title ||
      d.dayType === 'leisure'
  );

const DayBadge = ({ dayNumber }: { dayNumber: number }) => (
  <View
    style={{
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Q.bannerBg,
      borderWidth: 0.75,
      borderColor: Q.accentLine,
      borderRadius: 26,
    }}
  >
    <Text style={{ fontFamily: 'Courier-Bold', fontSize: 14, color: Q.accent }}>
      {ordinal(dayNumber)}
    </Text>
    <Text style={{ fontSize: 8, color: Q.accent }}>Day</Text>
  </View>
);

/** Badge width (55.9) plus the gap to the day's text. */
const DAY_INDENT = 73.9;

export interface DayExtraLine {
  /** e.g. an option name, "Standard" */
  label: string;
  text: string;
}

const DayEntry = ({
  day,
  extras,
  banner,
}: {
  day: ItineraryDay;
  extras?: DayExtraLine[];
  /** The section banner, kept on the same page as the first day's heading. */
  banner?: ReactNode;
}) => {
  const isLeisure = day.dayType === 'leisure';
  const title = isLeisure
    ? day.title || 'Leisure Day'
    : day.title || day.destination || `Day ${day.dayNumber}`;
  const description = isLeisure
    ? day.description || day.leisureGuidelines || 'Enjoy your free day at leisure.'
    : day.description;
  const bullets = [
    ...toLines(stripBullets(day.destinationDescription)),
    ...toLines(stripBullets(description)),
  ];
  const activities = activitiesNotInDescription(day.activities, day.description)
    .map(a => a.title)
    .filter(Boolean);
  if (activities.length) bullets.push(`Activities: ${activities.join(', ')}`);
  for (const extra of extras || []) bullets.push(`${extra.label}: ${extra.text}`);
  if (day.notes) bullets.push(`Note: ${day.notes}`);

  // The badge is pinned beside the heading (not laid out in a flex row) so it
  // moves with the heading when a day starts on a new page.
  return (
    <DotList
      items={bullets}
      indent={DAY_INDENT}
      gap={20}
      head={
        <>
          {banner}
          <View style={{ marginBottom: 5.2, paddingTop: 1.4 }}>
            <View style={{ position: 'absolute', left: -DAY_INDENT, top: 0 }}>
              <DayBadge dayNumber={day.dayNumber} />
            </View>
            {formatDayHeader(day.date) ? (
              <Text style={{ fontWeight: 'bold' }}>{formatDayHeader(day.date)}</Text>
            ) : null}
            <Text
              style={{
                fontSize: 15,
                fontWeight: 'bold',
                color: Q.accent,
                marginTop: 6,
                lineHeight: 1.53,
              }}
            >
              {title}
            </Text>
          </View>
        </>
      }
    />
  );
};

export const DayWiseBlock = ({
  days,
  extrasByDay,
  marginTop = 0,
}: {
  days: ItineraryDay[];
  extrasByDay?: Map<number, DayExtraLine[]>;
  marginTop?: number;
}) => {
  const listed = daysWithContent(days);
  if (listed.length === 0) return null;
  return (
    <>
      {listed.map((day, idx) => (
        <DayEntry
          key={day.dayNumber}
          day={day}
          extras={extrasByDay?.get(day.dayNumber)}
          banner={
            idx === 0 ? (
              // Banner sits outside the day's indent.
              <View style={{ marginLeft: -DAY_INDENT, marginBottom: 24 }}>
                <SectionBanner title="Day Wise Itinerary" marginTop={marginTop} />
              </View>
            ) : undefined
          }
        />
      ))}
    </>
  );
};

// ============================================================
// INCLUSIONS / EXCLUSIONS
// ============================================================

const ListHeading = ({
  title,
  color,
  marginTop,
}: {
  title: string;
  color: string;
  marginTop: number;
}) => (
  <View style={{ marginTop, marginBottom: 9, flexDirection: 'row' }}>
    <View
      style={{
        paddingHorizontal: 6,
        paddingBottom: 1,
        borderBottomWidth: 3,
        borderBottomColor: color,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{title}</Text>
    </View>
  </View>
);

export const InclusionsBlock = ({
  included,
  excluded,
  marginTop = 0,
}: {
  included: string[];
  excluded: string[];
  marginTop?: number;
}) => {
  if (included.length === 0 && excluded.length === 0) return null;
  return (
    <>
      {included.length > 0 ? (
        <SquareList
          items={included}
          color={Q.green}
          head={
            <>
              <SectionBanner title="Inclusions/Exclusions" marginTop={marginTop} />
              <ListHeading title="Inclusions" color={Q.green} marginTop={14} />
            </>
          }
        />
      ) : null}
      {excluded.length > 0 ? (
        <SquareList
          items={excluded}
          color={Q.accentLine}
          head={
            <>
              {included.length === 0 ? (
                <SectionBanner title="Inclusions/Exclusions" marginTop={marginTop} />
              ) : null}
              <ListHeading
                title="Exclusions"
                color={Q.accentLine}
                marginTop={included.length ? 43 : 14}
              />
            </>
          }
        />
      ) : null}
      <View
        wrap={false}
        style={{
          marginTop: 4.1,
          borderLeftWidth: 3,
          borderLeftColor: Q.accentLine,
          paddingLeft: 18,
          paddingVertical: 2,
        }}
      >
        <Text style={{ fontWeight: 'bold', color: Q.note }}>
          Anything not mentioned in the inclusions is excluded.
        </Text>
      </View>
    </>
  );
};

/**
 * Inclusions/exclusions as the client had them before the redesign: a green
 * "INCLUDED" card and a "NOT INCLUDED" card, each item on a dotted row.
 */
export const InclusionCards = ({
  included,
  excluded,
  marginTop = 0,
}: {
  included: string[];
  excluded: string[];
  marginTop?: number;
}) => {
  if (included.length === 0 && excluded.length === 0) return null;
  return (
    <View>
      <SectionBanner title="Inclusions & Exclusions" marginTop={marginTop} />
      <View style={{ marginTop: 16 }}>
        {included.length > 0 && (
          <View style={oldStyles.inclusionCard}>
            <View style={oldStyles.inclusionCardHeader} wrap={false}>
              <View style={oldStyles.inclusionBadge}>
                <Text style={oldStyles.inclusionBadgeText}>INCLUDED</Text>
              </View>
            </View>
            <View style={oldStyles.inclusionItems}>
              {included.map((item, idx) => (
                <View key={idx} style={oldStyles.inclusionItem} wrap={false}>
                  <Text style={oldStyles.inclusionDot}> </Text>
                  <Text style={oldStyles.inclusionText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {excluded.length > 0 && (
          <View style={oldStyles.exclusionCard}>
            <View style={oldStyles.exclusionCardHeader} wrap={false}>
              <View style={oldStyles.exclusionBadge}>
                <Text style={oldStyles.exclusionBadgeText}>NOT INCLUDED</Text>
              </View>
            </View>
            <View style={oldStyles.exclusionItems}>
              {excluded.map((item, idx) => (
                <View key={idx} style={oldStyles.exclusionItem} wrap={false}>
                  <Text style={oldStyles.exclusionDot}> </Text>
                  <Text style={oldStyles.exclusionText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================
// TERMS + CONTACT CARD
// ============================================================

/**
 * The terms an itinerary prints: the sections picked for it in the wizard
 * (or the "Edit PDF" defaults when none were picked), then its notes.
 */
export const itineraryTermSections = (
  terms: string | null | undefined,
  notes: string | null | undefined,
  library: PDFTermsSettings
): TermsSection[] =>
  [...resolveItineraryTerms(terms, library), { title: 'Notes', items: toLines(notes) }].filter(
    section => section.items.length > 0
  );

// A card with at most this many points is kept whole on one page. react-pdf
// mangles a card that starts in the last few points of a page — it squashes it
// to a sliver, hides its rows under the footer and adds a blank page after.
const UNSPLIT_TERMS_ITEMS = 12;

/**
 * A terms section (terms, cancellation policy, supplement cost, bank details, ...) in
 * the same card as the inclusions/exclusions: a badge header, then dotted rows.
 * Spaced tighter than inclusions so the usual sections fit on one page and the
 * Thank You page follows straight on.
 */
const TermsCard = ({ section }: { section: TermsSection }) => (
  <View wrap={section.items.length > UNSPLIT_TERMS_ITEMS} style={oldStyles.exclusionCard}>
    <View style={oldStyles.exclusionCardHeader} wrap={false} minPresenceAhead={40}>
      <View style={oldStyles.exclusionBadge}>
        <Text style={oldStyles.exclusionBadgeText}>{section.title.toUpperCase()}</Text>
      </View>
    </View>
    <View style={[oldStyles.exclusionItems, { paddingTop: 12, paddingBottom: 6 }]}>
      {section.items.map((item, idx) => (
        <View key={idx} style={[oldStyles.exclusionItem, { marginBottom: 6 }]} wrap={false}>
          <Text style={oldStyles.exclusionDot}> </Text>
          <Text style={oldStyles.exclusionText}>{item}</Text>
        </View>
      ))}
    </View>
  </View>
);

export const TermsBlock = ({
  sections: allSections,
  marginTop = 0,
}: {
  sections: TermsSection[];
  marginTop?: number;
}) => {
  const sections = allSections
    .map(s => ({ title: s.title.trim(), items: s.items.map(i => i.trim()).filter(Boolean) }))
    .filter(s => s.title || s.items.length);
  if (sections.length === 0) return null;
  const banner = (
    <>
      <SectionBanner title="Terms and Conditions" marginTop={marginTop} />
      <View style={{ height: 13.3 }} />
    </>
  );
  return (
    <>
      {sections.map((section, idx) =>
        // Untitled sections have nothing to put in a card's badge.
        !section.title ? (
          <DotList
            key={idx}
            items={section.items}
            head={
              <>
                {idx === 0 ? banner : null}
                {section.title ? (
                  <Text style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 10.8 }}>
                    {section.title}
                  </Text>
                ) : null}
              </>
            }
          />
        ) : (
          <View key={idx} style={idx > 0 ? { marginTop: 12 } : undefined}>
            {idx === 0 ? banner : null}
            <TermsCard section={section} />
          </View>
        )
      )}
    </>
  );
};
