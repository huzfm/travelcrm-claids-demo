// Single-Option Transport Card Component - Simplified

import { Text, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import type { ItineraryDay } from '@/types/itinerary.types';

interface TransportCardProps {
  /** Every day using this same vehicle (or the same no-vehicle bucket) — shown as one row, not one per day. */
  days: ItineraryDay[];
  showDayLabel?: boolean;
}

export const TransportCard = ({ days, showDayLabel = true }: TransportCardProps) => {
  const day = days[0];
  const dayCount = days.length;
  const durationLabel = `${dayCount} Day${dayCount !== 1 ? 's' : ''}`;
  const vehicle = day.selectedVehicle;
  const rawName = day.vehicleName || vehicle?.name || '';
  const vehicleName = rawName.toUpperCase() === 'TBD' ? '' : rawName;
  const vehicleType = day.vehicleType || vehicle?.vehicleType || '';
  const numVehicles = (day as any).numberOfVehicles ?? (day as any).vehicleCount ?? 1;
  const isLeisure = day.dayType === 'leisure';
  // hasVehicle only checks actual vehicle data, not pickup/drop text
  const hasVehicle = Boolean(vehicleName);

  // No vehicle for this whole bucket of days — show "No car"
  if (!hasVehicle) {
    return (
      <View style={styles.transportCardSimple}>
        <View style={styles.transportRowSimple}>
          {showDayLabel && <Text style={styles.transportDaySimple}>{durationLabel}</Text>}
          <Text style={styles.transportRouteText}>-</Text>
          <Text style={styles.transportNameSimple}>No car</Text>
          <Text style={styles.transportCountSimple}>{isLeisure ? 'Rest day(s)' : 'No transport'}</Text>
        </View>
      </View>
    );
  }

  // All other cases (activity days + leisure with vehicle)
  return (
    <View style={styles.transportCardSimple}>
      <View style={styles.transportRowSimple}>
        {showDayLabel && <Text style={styles.transportDaySimple}>{durationLabel}</Text>}

        <Text style={styles.transportNameSimple}>{vehicleName}</Text>
        <Text style={styles.transportCountSimple}>
          {numVehicles > 0
            ? `${numVehicles}${vehicleType ? ` × ${vehicleType}` : ''}`
            : vehicleType || '-'}
        </Text>
      </View>
    </View>
  );
};
