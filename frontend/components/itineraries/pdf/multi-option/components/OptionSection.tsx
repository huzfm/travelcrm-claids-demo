// Option Section - Header page for each option in multi-option PDFs - Duplicated for full isolation

import { View, Text } from '@react-pdf/renderer';
import { formatINR, styles, colors } from '../styles';
import { SectionHeader } from './SectionHeader';
import type { ItineraryOption, ItineraryDay } from '@/types/index';

interface OptionSectionProps {
  option: ItineraryOption;
  optionIndex: number;
  totalOptions: number;
  days: ItineraryDay[];
  guestName: string;
  currency?: string;
  pageNumber?: number;
}

export const OptionSection = ({
  option,
  optionIndex,
  totalOptions,
  days,
  guestName,
  currency = 'INR',
  pageNumber = 2,
}: OptionSectionProps) => {
  const optionColors = [
    { bg: '#fbe3e3', text: '#db0201' },
    { bg: '#fbe3e3', text: '#db0201' },
    { bg: '#fbe3e3', text: '#db0201' },
    { bg: '#fbe3e3', text: '#db0201' },
  ];
  const color = optionColors[optionIndex % optionColors.length];
  const totalDays = days.length;
  const totalNights = Math.max(0, totalDays - 1);

  return (
    <View style={{ flex: 1 }}>
      {/* Option Header Banner */}
      <View
        style={{
          backgroundColor: color.bg,
          padding: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: color.text,
              fontSize: 24,
              fontWeight: 'bold',
              marginBottom: 4,
            }}
          >
            {option.name}
          </Text>
          <Text
            style={{
              color: color.text,
              fontSize: 10,
              opacity: 0.9,
            }}
          >
            Option {optionIndex + 1} of {totalOptions}
            {option.description && ` — ${option.description}`}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {(option.totalCost > 0 || option.finalPrice !== undefined || option.breakdown?.finalPrice !== undefined || option.breakdown?.customTotal !== undefined) && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  color: color.text,
                  fontSize: 10,
                  opacity: 0.8,
                }}
              >
                Package Price
              </Text>
              <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>
                {formatINR(option.finalPrice ?? option.breakdown?.finalPrice ?? option.breakdown?.customTotal ?? option.totalCost)}
              </Text>
              {option.gstPercent !== undefined && option.gstPercent > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8 }}>
                  incl. {option.gstPercent}% GST extra
                </Text>
              )}
              {option.margin !== undefined && option.margin > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8 }}>
                  + {currency} {formatINR(option.margin)} margin
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Quick Info Row */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.lightPurple,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: colors.border }}>
          <Text style={styles.infoBoxHeader}>Duration</Text>
          <Text style={styles.infoBoxValue}>
            {totalDays} Days / {totalNights} Nights
          </Text>
        </View>
        <View style={{ flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: colors.border }}>
          <Text style={styles.infoBoxHeader}>Package Type</Text>
          <Text style={styles.infoBoxValue}>{option.name}</Text>
        </View>
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={styles.infoBoxHeader}>Guest</Text>
          <Text style={styles.infoBoxValue}>{guestName}</Text>
        </View>
      </View>

      {/* Pricing Breakdown */}
      <View style={{ padding: 16, backgroundColor: '#ffffff' }}>
        <SectionHeader title="Price Breakdown" />
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            {option.breakdown?.hotelCost && option.breakdown.hotelCost > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Hotel & Accommodation</Text>
                <Text style={styles.priceValue}>{option.breakdown.hotelCost}</Text>
              </View>
            )}
            {option.breakdown?.vehicleCost && option.breakdown.vehicleCost > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Transportation</Text>
                <Text style={styles.priceValue}>{option.breakdown.vehicleCost}</Text>
              </View>
            )}
            {option.breakdown?.activityCost && option.breakdown.activityCost > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Activities</Text>
                <Text style={styles.priceValue}>{option.breakdown.activityCost}</Text>
              </View>
            )}
            {option.breakdown?.miscCost && option.breakdown.miscCost > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Miscellaneous</Text>
                <Text style={styles.priceValue}>{option.breakdown.miscCost}</Text>
              </View>
            )}
            {option.additionalCharges && option.additionalCharges.length > 0 && (
              <>
                {option.additionalCharges.map((charge, ci) => (
                  <View key={ci} style={styles.priceRow}>
                    <Text style={styles.priceLabel}>{charge.label}</Text>
                    <Text style={styles.priceValue}>{charge.amount}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', minWidth: 140 }}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>
                {formatINR(
                  (option.breakdown?.hotelCost || 0) +
                    (option.breakdown?.vehicleCost || 0) +
                    (option.breakdown?.activityCost || 0) +
                    (option.breakdown?.miscCost || 0) +
                    (option.additionalCharges?.reduce((s, c) => s + c.amount, 0) || 0)
                )}
              </Text>
            </View>
            {option.margin !== undefined && option.margin > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>+ Margin</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}> 
                  {formatINR(option.margin)}
                </Text>
              </View>
            )}
            {option.gstPercent !== undefined && option.gstPercent > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>+ GST ({option.gstPercent}%)</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}> 
                  {formatINR(
                    ((option.breakdown?.hotelCost || 0) +
                      (option.breakdown?.vehicleCost || 0) +
                      (option.breakdown?.activityCost || 0) +
                      (option.breakdown?.miscCost || 0) +
                      (option.additionalCharges?.reduce((s, c) => s + c.amount, 0) || 0) +
                      (option.margin || 0)) *
                      (option.gstPercent / 100)
                  )}
                </Text>
              </View>
            )}
            {option.roundOff !== undefined && option.roundOff !== 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{option.roundOff > 0 ? '+' : ''} Round Off</Text>
                <Text style={styles.priceValue}>{formatINR(option.roundOff)}</Text>
              </View>
            )}
            {option.discountPercent !== undefined && option.discountPercent > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>- Discount ({option.discountPercent}%)</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}>
                  {formatINR(
                    (((option.breakdown?.hotelCost || 0) +
                      (option.breakdown?.vehicleCost || 0) +
                      (option.breakdown?.activityCost || 0) +
                      (option.breakdown?.miscCost || 0) +
                      (option.additionalCharges?.reduce((s, c) => s + c.amount, 0) || 0) +
                      (option.margin || 0)) *
                      (1 + (option.gstPercent ?? 0) / 100) +
                      (option.roundOff || 0)) *
                      (option.discountPercent / 100)
                  )}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.priceTotal,
                { borderTopWidth: 2, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 },
              ]}
            >
              <Text style={styles.priceTotalLabel}>Total</Text>
              <Text style={[styles.priceTotalValue, { fontSize: 18 }]}>
                {formatINR(option.finalPrice ?? option.breakdown?.finalPrice ?? option.breakdown?.customTotal ?? option.totalCost)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Features included in this option */}
      {option.features && option.features.length > 0 && (
        <View style={{ padding: 16 }}>
          <SectionHeader title="Package Includes" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 }}>
            {option.features.map((feature, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.lightPurple,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 8, marginRight: 4 }}>✓</Text>
                <Text style={{ color: colors.text, fontSize: 9 }}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Page number footer */}
      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 35,
          right: 35,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
        }}
      >
        <Text style={{ fontSize: 8, color: colors.text }}>{option.name} Package</Text>
        <Text style={{ fontSize: 8, color: colors.text }}>Page {pageNumber}</Text>
      </View>
    </View>
  );
};
