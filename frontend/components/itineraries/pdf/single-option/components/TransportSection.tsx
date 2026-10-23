import { Page, Text, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import { PDFHeaderSmall } from './Header';
import { PDFFooterSimple } from './Footer';
import { TransportCard } from './TransportCard';
import type { ItineraryDay, ItineraryOption } from '@/types/index';

export interface TransportSectionProps {
  days: ItineraryDay[];
  pageNumber?: number;
  totalPages?: number;
  option?: ItineraryOption;
  optionLabel?: string;
}

function getOptionTransport(days: ItineraryDay[], option?: ItineraryOption): ItineraryDay[] {
  return days.map(day => {
    const optVehicle = option?.vehicles?.find(
      v => v.dayNumber === day.dayNumber || v.vehicleId === day.vehicleId
    );

    if (!optVehicle) return day;

    return {
      ...day,
      vehicleName: optVehicle.vehicleName || day.vehicleName,
      vehicleType: optVehicle.vehicleType || day.vehicleType,
      vehicleRegistration: optVehicle.vehicleRegistration || day.vehicleRegistration,
      vehicleDriver: optVehicle.driverName || day.vehicleDriver,
      vehicleDriverPhone: optVehicle.driverPhone || day.vehicleDriverPhone,
      vehicleRatePerDay: optVehicle.ratePerDay ?? day.vehicleRatePerDay,
      numberOfVehicles: optVehicle.numberOfVehicles ?? day.numberOfVehicles ?? 1,
      selectedVehicle: {
        name: optVehicle.vehicleName || day.vehicleName,
        vehicleType: optVehicle.vehicleType || day.vehicleType || '',
        seatingCapacity: 0,
        driverName: optVehicle.driverName || day.vehicleDriver,
        driverPhone: optVehicle.driverPhone || day.vehicleDriverPhone,
        ratePerDay: optVehicle.ratePerDay ?? day.vehicleRatePerDay,
      },
    };
  });
}

// Every day using the same car becomes one row (e.g. "ABC Car — 5 Days")
// instead of one row per day — the day-by-day breakdown still drives cost
// calculation elsewhere, it's just not shown here.
function groupByVehicle(days: ItineraryDay[]): ItineraryDay[][] {
  const groups = new Map<string, ItineraryDay[]>();
  const order: string[] = [];

  for (const day of days) {
    const vehicle = day.selectedVehicle;
    const rawName = day.vehicleName || vehicle?.name || '';
    const vehicleName = rawName.toUpperCase() === 'TBD' ? '' : rawName;
    const vehicleType = day.vehicleType || vehicle?.vehicleType || '';
    const hasVehicle = Boolean(vehicleName);
    const key = hasVehicle
      ? `vehicle:${day.vehicleId || `${vehicleName}|${vehicleType}`}`
      : day.dayType === 'leisure'
        ? 'rest'
        : 'none';

    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(day);
  }

  return order.map(key => groups.get(key)!);
}

export const TransportSection = ({
  days,
  option,
  pageNumber,
  totalPages,
}: TransportSectionProps) => {
  const transportDays = getOptionTransport(days, option);

  const hasTransportData = transportDays.some(
    (d: any) => d.dayType === 'leisure' || d.vehicleId || d.vehicleName || d.selectedVehicle
  );

  if (!hasTransportData) return null;

  const vehicleGroups = groupByVehicle(transportDays);

  // Calculate how many pages we need (~10 groups per page)
  const cardsPerPage = 14;
  const totalPagesForTransport = Math.ceil(vehicleGroups.length / cardsPerPage);

  // Update total pages calculation for the footer
  const adjustedTotalPages = totalPages + totalPagesForTransport - 1;

  // Split groups into chunks for each page
  const pageChunks: ItineraryDay[][][] = [];
  for (let i = 0; i < vehicleGroups.length; i += cardsPerPage) {
    pageChunks.push(vehicleGroups.slice(i, i + cardsPerPage));
  }

  return (
    <>
      {pageChunks.map((chunk, pageIndex) => (
        <Page
          key={`transport-page-${pageIndex}`}
          size="A4"
          style={styles.page}
          // wrap=true here made react-pdf mis-layout every page except the last
          // one (see DayItinerarySection.tsx). Chunks are already pre-split to
          // fit one page each, so no page needs to auto-wrap.
          wrap={false}
        >
          <PDFHeaderSmall title="Transportation Details" />

          <View style={{ flex: 1, padding: 35 }}>
            <View style={[styles.transportHeaderRow, { marginBottom: 10 }]}>
              <Text style={styles.transportHeaderDay}>Days</Text>
              <Text style={styles.transportHeaderName}>Car Name</Text>
              <Text style={styles.transportHeaderCount}>Car Count</Text>
            </View>

            <View style={{ flex: 1 }}>
              {chunk.map((group, index) => (
                <TransportCard key={`transport-${pageIndex}-${index}`} days={group} />
              ))}
            </View>
          </View>

          <PDFFooterSimple pageNumber={pageNumber + pageIndex} totalPages={adjustedTotalPages} />
        </Page>
      ))}
    </>
  );
};
