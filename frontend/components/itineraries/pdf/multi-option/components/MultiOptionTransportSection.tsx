// Multi-Option Transport Section - Full Page Card Format

import { Page, Text, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import { PDFFooter } from './Footer';
import { PDFHeaderSmall } from './Header';
import type { ItineraryDay, ItineraryOption } from '@/types/index';

interface MultiOptionTransportSectionProps {
  days: ItineraryDay[];
  option: ItineraryOption;
  optionIndex: number;
  optionName?: string;
  optionColor?: { bg: string; border: string; text: string; headerBg: string };
  pageNumber?: number;
  totalPages?: number;
  pageBreakBefore?: 'always' | 'auto';
  branchName?: string;
  branchEmail?: string;
  branchAddress?: string;
  branchContact?: string;
}

// Every day using the same car becomes one row (e.g. "ABC Car — 5 Days")
// instead of one row per day — the day-by-day breakdown still drives cost
// calculation elsewhere, it's just not shown here.
// Takes `any[]` because the caller's inline day-merging map has no declared
// return type, so its element type is a wider inferred union than ItineraryDay.
function groupByVehicle(days: any[]): any[][] {
  const groups = new Map<string, any[]>();
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

export const MultiOptionTransportSection = ({
  days,
  option,
  pageNumber = 4,
  totalPages,
}: MultiOptionTransportSectionProps) => {
  const displayDays = days.map(day => {
    const optVehicle = option.vehicles?.find(v => v.dayNumber === day.dayNumber);
    if (optVehicle) {
      return {
        ...day,
        vehicleName: optVehicle.vehicleName || day.vehicleName,
        vehicleType: optVehicle.vehicleType || day.vehicleType,
        vehicleDriver: optVehicle.driverName || day.vehicleDriver,
        vehicleDriverPhone: optVehicle.driverPhone || day.vehicleDriverPhone,
        numberOfVehicles: optVehicle.numberOfVehicles ?? day.numberOfVehicles ?? 1,
        selectedVehicle: {
          name: optVehicle.vehicleName,
          vehicleType: optVehicle.vehicleType || '',
          driverName: optVehicle.driverName,
          driverPhone: optVehicle.driverPhone,
        },
      };
    }
    return day;
  });

  // Show all days including leisure days
  const vehicleDays = displayDays.filter(d => d.dayNumber);
  const vehicleGroups = groupByVehicle(vehicleDays);

  // Calculate how many pages we need (~10 groups per page)
  const cardsPerPage = 10;
  const totalPagesForTransport = Math.ceil(vehicleGroups.length / cardsPerPage);

  // Update total pages calculation for the footer
  const adjustedTotalPages = totalPages + totalPagesForTransport - 1;

  // Split groups into chunks for each page
  const pageChunks: any[][][] = [];
  for (let i = 0; i < vehicleGroups.length; i += cardsPerPage) {
    pageChunks.push(vehicleGroups.slice(i, i + cardsPerPage));
  }

  return (
    <>
      {pageChunks.map((chunk, pageIndex) => (
        <Page
          key={`transport-page-${pageIndex}`}
          size="A4"
          style={styles.fullPage}
          // wrap=true here made react-pdf mis-layout every page except the last
          // one (see MultiOptionDaySection.tsx). Chunks are already pre-split to
          // fit one page each, so no page needs to auto-wrap.
          wrap={false}
        >
          <PDFHeaderSmall title="Transportation Details" />

          <View style={{ flex: 1, padding: 35 }}>
            {/* Header Row */}
            <View style={styles.transportHeaderRow}>
              <Text style={styles.transportHeaderDay}>Days</Text>
              <Text style={styles.transportHeaderName}>Car Name</Text>
              <Text style={styles.transportHeaderCount}>Car Count</Text>
            </View>

            {/* Transport Cards — one row per car, not one per day */}
            <View style={{ flex: 1 }}>
              {chunk.map((group, index) => {
                const day = group[0];
                const dayCount = group.length;
                const durationLabel = `${dayCount} Day${dayCount !== 1 ? 's' : ''}`;
                const vehicle = day.selectedVehicle;
                const rawName = day.vehicleName || vehicle?.name || '';
                const vehicleName = rawName.toUpperCase() === 'TBD' ? '' : rawName;
                const vehicleType = day.vehicleType || vehicle?.vehicleType || '';
                const numVehicles = day.numberOfVehicles ?? 1;
                const isLeisure = day.dayType === 'leisure';
                const hasVehicle = Boolean(vehicleName);

                if (!hasVehicle) {
                  return (
                    <View
                      key={`transport-card-${pageIndex}-${index}`}
                      style={styles.transportCardSimple}
                    >
                      <View style={styles.transportRowSimple}>
                        <Text style={styles.transportDaySimple}>{durationLabel}</Text>
                        <Text style={styles.transportRouteText}>-</Text>
                        <Text style={styles.transportNameSimple}>No car</Text>
                        <Text style={styles.transportCountSimple}>
                          {isLeisure ? 'Rest day(s)' : 'No transport'}
                        </Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={`transport-card-${pageIndex}-${index}`}
                    style={styles.transportCardSimple}
                  >
                    <View style={styles.transportRowSimple}>
                      <Text style={styles.transportDaySimple}>{durationLabel}</Text>

                      <Text style={styles.transportNameSimple}>{vehicleName}</Text>
                      <Text style={styles.transportCountSimple}>
                        {numVehicles > 0
                          ? `${numVehicles}${vehicleType ? ` × ${vehicleType}` : ''}`
                          : vehicleType || '-'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Footer */}
          <PDFFooter pageNumber={pageNumber + pageIndex} totalPages={adjustedTotalPages} />
        </Page>
      ))}
    </>
  );
};
