import { Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import { PDFHeaderSmall } from './Header';
import { PDFFooterSimple } from './Footer';
import { formatShortDate, getCurrencySymbol } from '../utils';
import type { FlightSegment } from '@/types/index';

export interface MultiOptionFlightSectionProps {
  flights?: FlightSegment[];
  currency?: string;
  pageNumber?: number;
  totalPages?: number;
}

const DIRECTION_LABELS: Record<string, string> = {
  OUTBOUND: 'Outbound',
  RETURN: 'Return',
  INTERNAL: 'Connecting',
};

const CABIN_LABELS: Record<string, string> = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First',
};

/** Only flights that identify a route or a number are worth printing. */
export const hasAnyFlight = (flights?: FlightSegment[]): boolean =>
  Array.isArray(flights) &&
  flights.some(
    flight =>
      Boolean(flight?.flightNumber) ||
      Boolean(flight?.departureCode) ||
      Boolean(flight?.arrivalCode)
  );

const duration = (minutes?: number): string => {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const airportLine = (code?: string, city?: string, terminal?: string): string => {
  const place = [code, city].filter(Boolean).join(' · ');
  return terminal ? `${place}${place ? ' · ' : ''}Terminal ${terminal}` : place;
};

const FlightRow = ({ flight, currency }: { flight: FlightSegment; currency: string }) => {
  const fare = flight.totalFare ?? (flight.farePerPerson || 0) * (flight.passengers || 0);
  const overnight =
    Boolean(flight.arrivalDate) &&
    Boolean(flight.departureDate) &&
    flight.arrivalDate !== flight.departureDate;

  const meta = [
    flight.cabinClass ? CABIN_LABELS[flight.cabinClass] || flight.cabinClass : '',
    flight.aircraft,
    duration(flight.durationMinutes),
    flight.stops === 0 ? 'Non-stop' : flight.stops ? `${flight.stops} stop(s)` : '',
    flight.baggage ? `Baggage ${flight.baggage}` : '',
    flight.pnr ? `PNR ${flight.pnr}` : '',
    flight.seats ? `Seats ${flight.seats}` : '',
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 12,
        marginBottom: 10,
        backgroundColor: colors.cardBg,
      }}
      wrap={false}
    >
      {/* Leg, flight number, airline */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 7,
              color: colors.white,
              backgroundColor: colors.primary,
              paddingVertical: 2,
              paddingHorizontal: 6,
              borderRadius: 3,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {DIRECTION_LABELS[flight.direction] || 'Flight'}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold', marginLeft: 8 }}>
            {flight.flightNumber || 'Flight'}
          </Text>
          {Boolean(flight.airline) && (
            <Text style={{ fontSize: 9, color: colors.muted, marginLeft: 6 }}>
              {flight.airline}
            </Text>
          )}
        </View>
        {fare > 0 && (
          <Text style={{ fontSize: 9, color: colors.primary, fontWeight: 'bold' }}>
            {getCurrencySymbol(currency)}
            {fare.toLocaleString('en-IN')}
          </Text>
        )}
      </View>

      {/* Departure → arrival */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold' }}>
            {flight.departureTime || '--:--'}
          </Text>
          <Text style={{ fontSize: 8, color: colors.muted, marginTop: 2 }}>
            {airportLine(flight.departureCode, flight.departureCity, flight.departureTerminal) ||
              '—'}
          </Text>
          {Boolean(flight.departureDate) && (
            <Text style={{ fontSize: 8, color: colors.muted, marginTop: 1 }}>
              {formatShortDate(flight.departureDate || '')}
            </Text>
          )}
        </View>

        <View style={{ width: 70, alignItems: 'center', paddingTop: 5 }}>
          <Text style={{ fontSize: 8, color: colors.secondary }}>
            {duration(flight.durationMinutes) || '→'}
          </Text>
          <View
            style={{
              height: 1,
              width: 50,
              backgroundColor: colors.border,
              marginVertical: 3,
            }}
          />
          <Text style={{ fontSize: 7, color: colors.muted }}>
            {flight.stops ? `${flight.stops} stop` : 'Direct'}
          </Text>
        </View>

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold' }}>{flight.arrivalTime || '--:--'}</Text>
          <Text style={{ fontSize: 8, color: colors.muted, marginTop: 2, textAlign: 'right' }}>
            {airportLine(flight.arrivalCode, flight.arrivalCity, flight.arrivalTerminal) || '—'}
          </Text>
          {Boolean(flight.arrivalDate) && (
            <Text style={{ fontSize: 8, color: colors.muted, marginTop: 1 }}>
              {formatShortDate(flight.arrivalDate || '')}
              {overnight ? ' (next day)' : ''}
            </Text>
          )}
        </View>
      </View>

      {Boolean(meta) && (
        <Text
          style={{
            fontSize: 7.5,
            color: colors.muted,
            marginTop: 8,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          {meta}
        </Text>
      )}

      {Boolean(flight.notes) && (
        <Text style={{ fontSize: 7.5, color: colors.text, marginTop: 4 }}>{flight.notes}</Text>
      )}
    </View>
  );
};

/**
 * The trip's flights, on their own page. Skipped entirely when the itinerary has
 * none, the same way the hotel and transport pages are.
 */
export const MultiOptionFlightSection = ({
  flights,
  currency = 'INR',
  pageNumber,
  totalPages,
}: MultiOptionFlightSectionProps) => {
  if (!hasAnyFlight(flights)) return null;

  const printable = (flights || []).filter(
    flight => flight.flightNumber || flight.departureCode || flight.arrivalCode
  );

  return (
    <Page size="A4" style={styles.page}>
      <PDFHeaderSmall title="Flight Details" />

      <View style={{ flex: 1, padding: 35 }}>
        {printable.map((flight, index) => (
          <FlightRow key={flight.id || `flight-${index}`} flight={flight} currency={currency} />
        ))}

        <Text style={{ fontSize: 7.5, color: colors.muted, marginTop: 6 }}>
          Flight timings are as scheduled by the airline and may change. Please re-confirm 24 hours
          before departure and complete web check-in in advance.
        </Text>
      </View>

      <PDFFooterSimple pageNumber={pageNumber} totalPages={totalPages} />
    </Page>
  );
};
