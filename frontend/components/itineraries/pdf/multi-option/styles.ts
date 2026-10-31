// Multi-Option PDF Styles - Duplicated for full isolation
// Do not import from single-option or any shared location

import { StyleSheet } from '@react-pdf/renderer';

// Re-export utilities from utils for backward compatibility
export {
  formatDate,
  formatShortDate,
  formatDateRange,
  formatINR,
  formatINRText,
  formatRupee,
  formatPrice,
  formatPaxSummary,
  parseArray,
  getDayOrdinal,
  getDayOrdinalSuffix,
  getCurrencySymbol,
} from './utils';

// Claids Travel Brand Identity - Fixed Colors
// Red / white / black only. Every named slot below still exists so every
// existing `colors.x` reference keeps working — they just all resolve into
// this one palette now instead of the old purple/gold/blue/green mix.
export const colors = {
  primary: '#db0201', // Red (brand) — the only accent color
  primaryDark: '#1A1A1A', // Near-black body text
  secondary: '#db0201', // unified to brand red
  white: '#ffffff',
  text: '#1A1A1A', // Near-black body text
  muted: '#595959', // Neutral dark gray (no blue/warm tint)
  border: '#DDDDDD', // Neutral light gray border
  background: '#F7F7F7', // Neutral light gray background
  success: '#db0201',
  error: '#db0201',
  lightPurple: '#fbe3e3', // Light red tint
  lightGold: '#fbe3e3', // Light red tint
  cardBg: '#ffffff', // White cards
  beige: '#F7F7F7', // Neutral light gray
  green: '#db0201',
  blue: '#db0201',
  lightBeige: '#F7F7F7', // Neutral light gray
  headerBg: '#fbe3e3', // Light red tint for header backgrounds
  inclusionGreen: '#1A1A1A', // Deliberately green (not brand red) — "included" reads as positive
  lightGreen: '#F7F7F7', // Light green tint for the inclusion card
  inclusionGreenBorder: '#DDDDDD', // Light green tint for the inclusion card border
};

// PDF Styles
export const styles = StyleSheet.create({
  // Page setup
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
    flex: 1,
    flexDirection: 'column',
  },
  pageContent: {
    padding: 35,
    paddingBottom: 70,
    flex: 1,
  },
  fullPage: {
    padding: 0,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
  },

  // ==================== HEADER ====================
  header: {
    backgroundColor: colors.white,
    padding: 18,
    paddingTop: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerCompact: {
    backgroundColor: colors.white,
    padding: 12,
    paddingTop: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: 'bold',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerExpertLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTripId: {
    fontSize: 8,
    color: colors.muted,
    backgroundColor: colors.lightPurple,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  headerPhone: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmail: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  headerAddress: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
    textAlign: 'right',
  },
  headerDivider: {
    height: 0,
    marginBottom: 0,
  },

  // ==================== MAIN CONTENT HEADER ====================
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 12,
    marginTop: 8,
  },
  mainTitleSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 4,
    marginTop: 8,
  },
  mainSubtitle: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 8,
  },

  // ==================== BADGES ====================
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    fontSize: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgePrimary: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  badgeOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.muted,
  },
  badgeDark: {
    backgroundColor: colors.white,
    color: colors.white,
  },

  // ==================== DESTINATION BANNER ====================
  destinationBanner: {
    backgroundColor: colors.lightPurple,
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  destinationText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  // ==================== INFO BOXES ====================
  infoBoxGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  infoBox: {
    flex: 1,
    backgroundColor: colors.lightBeige,
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoBoxHeader: {
    fontSize: 7,
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoBoxValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: 'bold',
  },

  // ==================== GUEST SECTION ====================
  sectionTitle: {
    fontSize: 9,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  guestSection: {
    backgroundColor: colors.lightBeige,
    borderRadius: 6,
    padding: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guestRow: {
    flexDirection: 'row',
    gap: 12,
  },
  guestItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 10,
    borderRadius: 4,
  },
  guestItemIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  guestItemContent: {
    flex: 1,
  },
  guestItemLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  guestItemValue: {
    fontSize: 10,
    color: colors.text,
    fontWeight: 'bold',
    marginTop: 2,
  },

  // ==================== PRICING BANNER ====================
  pricingBanner: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  pricingValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
  },
  pricingSubtext: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  // ==================== HOTEL CARDS ====================
  hotelCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    pageBreakInside: 'avoid',
  },
  hotelCardHeader: {
    backgroundColor: colors.lightPurple,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotelNightBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  hotelNightText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: 'bold',
  },
  hotelName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primaryDark,
    flex: 1,
  },
  hotelStars: {
    fontSize: 10,
    color: colors.primary,
  },
  hotelCardContent: {
    padding: 12,
  },
  hotelLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hotelLocationText: {
    fontSize: 9,
    color: colors.primary,
  },
  hotelContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  hotelContactText: {
    fontSize: 9,
    color: colors.muted,
  },
  hotelRoomDetails: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hotelRoomTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  hotelDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hotelDetailLabel: {
    fontSize: 8,
    color: colors.muted,
    minWidth: 55,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  hotelDetailValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primaryDark,
    flex: 1,
  },
  hotelDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  hotelDetailBlock: {
    width: '50%',
    marginBottom: 8,
    minHeight: 26,
  },
  hotelMealValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.green,
  },
  hotelMealDetails: {
    backgroundColor: colors.lightPurple,
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  hotelMealTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
  },
  hotelMealPrice: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  hotelRoomsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hotelRoomsLabel: {
    fontSize: 9,
    color: colors.muted,
  },
  hotelRoomsValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
  },
  hotelTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  hotelTag: {
    fontSize: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    textTransform: 'uppercase',
  },
  hotelTagOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    color: colors.primary,
  },
  hotelTagFilled: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  hotelTagGray: {
    backgroundColor: colors.lightPurple,
    color: colors.muted,
  },
  hotelImage: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
  },
  hotelImageLarge: {
    width: '100%',
    height: 160,
    objectFit: 'cover',
  },
  hotelImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotelImagePlaceholderLarge: {
    width: '100%',
    overflow: 'hidden',
  },

  // ==================== FULL HOTEL CARD ====================
  hotelCardFull: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  hotelCardHeaderNew: {
    backgroundColor: colors.lightPurple,
    padding: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotelNightBadgeAlt: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 14,
  },
  hotelNightTextAlt: {
    fontSize: 10,
    color: colors.white,
    fontWeight: 'bold',
  },
  hotelCardNameNew: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primaryDark,
    flex: 1,
  },
  hotelStarsNew: {
    fontSize: 12,
    color: colors.primary,
  },
  similarHotelsBadge: {
    backgroundColor: colors.lightPurple,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  similarHotelsText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: 'bold',
  },
  similarHotelsLabel: {
    fontSize: 8,
    color: '#000000',
    marginBottom: 3,
  },
  similarHotelsTag: {
    fontSize: 8,
    color: '#000000',
    marginRight: 4,
    marginBottom: 4,
  },
  similarHotelsMore: {
    fontSize: 8,
    color: '#000000',
  },
  // Hotel location pill — shown next to the "Night N" badge in the day card
  hotelLocationPill: {
    fontSize: 8,
    color: colors.primary,
    backgroundColor: colors.lightPurple,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 6,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  // Small 📍 marker used inline next to the hotel location text
  hotelLocationIcon: {
    fontSize: 9,
    color: colors.primary,
    marginRight: 2,
  },
  // Inline location row wrapping the pill so it sits cleanly beside the badge
  hotelLocationRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  hotelImageFullWidth: {
    width: '100%',
    height: 140,
    objectFit: 'cover',
  },
  hotelImagePlaceholderNew: {
    width: '100%',
    height: 140,
    backgroundColor: colors.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  hotelImagePlaceholderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 6,
  },
  hotelImageZoomed: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
  },
  hotelImagePlaceholderZoomed: {
    width: '100%',
    height: 100,
    backgroundColor: colors.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotelImageWrapper: {
    width: '100%',
    height: 140,
    overflow: 'hidden',
  },
  hotelImageWide: {
    width: '100%',
    height: 140,
    objectFit: 'cover',
  },
  hotelImagePlaceholderWide: {
    width: '100%',
    height: 140,
    backgroundColor: colors.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  logoBoxLarge: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleImageWrapper: {
    width: '100%',
    height: 80,
    overflow: 'hidden',
  },
  vehicleImageWide: {
    width: '100%',
    height: 80,
    objectFit: 'cover',
  },
  vehicleImagePlaceholderWide: {
    width: '100%',
    height: 80,
    backgroundColor: colors.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  hotelCardContentNew: {
    padding: 16,
  },
  hotelDetailRowAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  hotelDetailIcon: {
    fontSize: 10,
    marginRight: 6,
    width: 16,
  },
  hotelDetailLabelAlt: {
    fontSize: 9,
    color: colors.muted,
    marginRight: 6,
  },
  hotelDetailValueAlt: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: 'bold',
    flex: 1,
  },
  hotelDetailRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hotelDetailLabelNew: {
    fontSize: 9,
    color: colors.muted,
    minWidth: 70,
  },
  hotelDetailValueNew: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: 'bold',
    flex: 1,
  },
  hotelTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  hotelTagNew: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
  },
  hotelTagLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  hotelTagValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // ==================== SIDE BY SIDE HOTEL CARD ====================
  hotelCardSideBySide: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e8e6e4',
    borderRadius: 6,
    backgroundColor: colors.white,
    padding: 14,
  },
  hotelCardLeft: {
    flex: 1,
    paddingRight: 14,
    justifyContent: 'flex-start',
  },
  hotelNightBadgeNew: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  hotelNightTextNew: {
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
  },
  // Row of "1st / 2nd / 3rd" ordinal badges + "Nights at <destination>"
  hotelNightBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 7,
  },
  hotelNightOrdinalBadge: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#db0201',
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    marginRight: 4,
  },
  hotelNightOrdinalText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#db0201',
  },
  hotelNightsAtText: {
    fontSize: 7.5,
    color: '#3F3C39',
  },
  hotelNightsAtDestination: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1A1918',
  },
  hotelCheckInText: {
    fontSize: 7,
    color: '#57534f',
    marginBottom: 10,
  },
  hotelNameLarge: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#b00201',
    marginBottom: 3,
  },
  hotelNameSideBySide: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  hotelStarsSideBySide: {
    fontSize: 14,
    color: '#db0201',
    marginBottom: 4,
  },
  hotelStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hotelStarFilled: {
    fontSize: 13,
    color: '#db0201',
    marginRight: 2,
  },
  hotelStarEmpty: {
    fontSize: 13,
    color: '#e8e6e4',
    marginRight: 2,
  },
  hotelStarsCount: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.muted,
    marginLeft: 4,
  },
  hotelColumnsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  hotelColumn: {
    width: '50%',
    paddingRight: 10,
  },
  hotelColumnLabel: {
    fontSize: 6.5,
    color: '#57534f',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  hotelColumnValue: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#1A1918',
  },
  hotelPaxDetailText: {
    fontSize: 7,
    color: '#1A1918',
    lineHeight: 1.6,
    marginTop: 3,
  },
  hotelAddressSideBySide: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 8,
  },
  hotelDividerSideBySide: {
    borderTopWidth: 1,
    borderTopColor: '#e8e6e4',
    marginVertical: 8,
  },
  hotelDetailItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  hotelDetailKey: {
    fontSize: 9,
    color: colors.muted,
    width: 50,
    textTransform: 'uppercase',
  },
  hotelDetailValueSideBySide: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: 'bold',
    flex: 1,
  },
  hotelPriceSideBySide: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  hotelCardRight: {
    width: '38%',
  },
  hotelImageSideBySide: {
    width: '100%',
    height: 112,
    objectFit: 'cover',
  },
  hotelImagePlaceholderSideBySide: {
    width: '100%',
    height: 112,
    backgroundColor: colors.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotelImagePlaceholderTextSideBySide: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 8,
    textAlign: 'center',
  },
  hotelCardDivider: {
    height: 1,
    backgroundColor: '#e8e6e4',
    marginVertical: 4,
  },
  hotelPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  hotelPriceLabel: {
    fontSize: 8,
    color: colors.muted,
    minWidth: 60,
  },
  hotelPriceValue: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: 'bold',
    flex: 1,
  },
  hotelPriceTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.lightPurple,
    padding: 6,
    borderRadius: 4,
    marginTop: 6,
  },
  hotelPriceTotalLabel: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: 'bold',
  },
  hotelPriceTotalValue: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: 'bold',
  },
  hotelDetailBlockWithPrice: {
    width: '50%',
    marginBottom: 6,
    minHeight: 32,
  },

  // ==================== TRANSPORT CARDS ====================
  transportCardFull: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: colors.white,
    pageBreakInside: 'avoid',
  },
  transportCardHeaderNew: {
    backgroundColor: '#fbe3e3',
    padding: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportDayBadgeNew: {
    backgroundColor: colors.blue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 12,
  },
  transportDayTextNew: {
    fontSize: 9,
    color: colors.white,
    fontWeight: 'bold',
  },
  transportCardNameNew: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.blue,
    flex: 1,
  },
  transportCardBrand: {
    fontSize: 10,
    color: colors.muted,
    marginLeft: 8,
  },
  transportImageFullWidth: {
    width: '100%',
    height: 140,
    objectFit: 'cover',
  },
  transportImagePlaceholderNew: {
    width: '100%',
    height: 140,
    backgroundColor: '#fbe3e3',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.blue,
  },
  transportImageZoomed: {
    width: '100%',
    height: 130,
    objectFit: 'cover',
  },
  transportImagePlaceholderZoomed: {
    width: '100%',
    height: 130,
    backgroundColor: '#fbe3e3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transportCardContentNew: {
    padding: 14,
  },
  transportDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  transportDetailIcon: {
    fontSize: 10,
    marginRight: 6,
    width: 16,
  },
  transportDetailLabel: {
    fontSize: 9,
    color: colors.muted,
    marginRight: 6,
  },
  transportDetailValue: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: 'bold',
    flex: 1,
  },
  transportDetailRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  transportDetailLabelNew: {
    fontSize: 9,
    color: colors.muted,
    minWidth: 70,
  },
  transportDetailValueNew: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: 'bold',
    flex: 1,
  },
  transportTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  transportTagNew: {
    backgroundColor: colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
  },
  transportTagLabel: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  transportTagValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // ==================== TRANSPORT CARD (Orange Theme) ====================
  transportCardFullOrange: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  transportCardHeaderOrange: {
    backgroundColor: colors.lightPurple,
    padding: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportDayBadgeOrange: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 12,
  },
  transportDayTextOrange: {
    fontSize: 9,
    color: colors.white,
    fontWeight: 'bold',
  },
  transportCardNameOrange: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primaryDark,
    flex: 1,
  },
  transportCardBrandOrange: {
    fontSize: 10,
    color: colors.muted,
    marginLeft: 8,
  },
  transportImageOrange: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
  },
  transportImagePlaceholderOrange: {
    width: '100%',
    height: 100,
    backgroundColor: colors.lightPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transportImagePlaceholderTextOrange: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 6,
  },
  transportCardContentOrange: {
    padding: 8,
  },
  transportDetailRowOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transportDetailLabelOrange: {
    fontSize: 9,
    color: colors.muted,
    minWidth: 70,
  },
  transportDetailValueOrange: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: 'bold',
    flex: 1,
  },
  transportTagsRowOrange: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 0,
  },
  transportTagOrange: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
  },
  transportTagLabelOrange: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  transportTagValueOrange: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // ==================== SIMPLE TRANSPORT ROW (single-option style) ====================
  transportHeaderRow: {
    backgroundColor: colors.white,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  transportHeaderDay: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 55,
    maxWidth: 70,
    marginRight: 10,
  },
  transportHeaderName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    flexBasis: 120,
    marginRight: 8,
  },
  transportHeaderCount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 80,
    maxWidth: 140,
    flexShrink: 1,
    textAlign: 'right',
  },
  transportRowSimple: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  transportDaySimple: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    minWidth: 55,
    maxWidth: 70,
    marginRight: 10,
  },
  transportRouteText: {
    fontSize: 10,
    color: colors.primary,
    flex: 1,
    flexShrink: 1,
    flexBasis: 80,
    marginHorizontal: 8,
  },
  transportNameSimple: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primaryDark,
    flex: 1,
    flexShrink: 1,
    flexBasis: 120,
    marginRight: 8,
  },
  transportCountSimple: {
    fontSize: 11,
    color: colors.primary,
    minWidth: 80,
    maxWidth: 160,
    flexShrink: 1,
    textAlign: 'right',
  },

  hotelImagePlaceholderIcon: {
    fontSize: 24,
    color: colors.white,
  },

  // ==================== TRANSPORT CARDS ====================
  transportCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    pageBreakInside: 'avoid',
  },
  transportCardHeader: {
    backgroundColor: colors.lightBeige,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportDayBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  transportDayText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: 'bold',
  },
  transportName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  transportNoVehicle: {
    backgroundColor: colors.lightPurple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  transportNoVehicleText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: 'bold',
  },
  transportCardContent: {
    padding: 12,
  },
  transportTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  transportTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transportTypeLabel: {
    fontSize: 8,
    color: colors.muted,
    marginLeft: 4,
  },
  transportDriverBadge: {
    backgroundColor: colors.lightPurple,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  transportDriverText: {
    fontSize: 8,
    color: colors.primary,
    fontWeight: 'bold',
  },
  transportNoVehicleContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportNoVehicleTextLarge: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
  },
  transportImage: {
    width: '100%',
    height: 80,
    objectFit: 'cover',
  },
  transportDetails: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transportDetailRowAlt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transportDetailLabelAlt: {
    fontSize: 9,
    color: colors.muted,
  },
  transportDetailValueAlt: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  transportRouteSection: {
    backgroundColor: colors.lightPurple,
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  transportRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transportRouteLabel: {
    fontSize: 9,
    color: colors.primary,
    marginRight: 8,
  },
  transportRouteText: {
    fontSize: 10,
    color: colors.primary,
    flex: 1,
    marginHorizontal: 8,
  },

  // ==================== DAY ITINERARY CARDS ====================
  dayCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  dayCardContent: {
    padding: 12,
  },
  dayBanner: {
    backgroundColor: colors.lightPurple,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    marginBottom: 8,
  },
  dayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginRight: 12,
  },
  dayBadgeText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dayDate: {
    fontSize: 9,
    color: colors.muted,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6,
  },
  dayDescription: {
    fontSize: 9,
    color: colors.primaryDark,
    lineHeight: 1.4,
    marginBottom: 8,
  },
  dayActivities: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  dayActivityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderStyle: 'dotted',
  },
  dayActivityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 8,
    marginTop: 3,
  },
  dayActivityText: {
    fontSize: 9,
    color: colors.text,
    fontWeight: 'bold',
    flex: 1,
  },
  dayImage: {
    width: '100%',
    height: 120,
    objectFit: 'cover',
    marginTop: 10,
    borderRadius: 4,
  },
  dayImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  dayImageItem: {
    width: '100%',
    height: 120,
    objectFit: 'cover',
    borderRadius: 4,
  },
  dayLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLocationLabel: {
    fontSize: 10,
    marginRight: 4,
  },
  dayLocationText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: 'bold',
  },
  dayActivitiesTitle: {
    fontSize: 8,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayActivityContent: {
    flex: 1,
  },
  dayActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dayActivityTime: {
    fontSize: 7,
    color: colors.muted,
    marginRight: 6,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  dayActivityLocation: {
    fontSize: 7,
    color: colors.muted,
    marginTop: 1,
    marginLeft: 14,
  },
  dayActivityDesc: {
    fontSize: 7,
    color: colors.muted,
    marginTop: 1,
    marginLeft: 14,
    fontStyle: 'italic',
  },
  dayActivityCost: {
    fontSize: 8,
    color: colors.primary,
    marginTop: 2,
    marginLeft: 18,
    fontWeight: 'bold',
  },
  dayHotelInfo: {
    backgroundColor: colors.lightPurple,
    padding: 10,
    borderRadius: 4,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  dayHotelLabel: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 4,
  },
  dayHotelName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
  },
  dayHotelAddress: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  dayRoomInfo: {
    marginTop: 4,
  },
  dayRoomType: {
    fontSize: 9,
    color: colors.text,
  },
  dayTransportInfo: {
    backgroundColor: '#F7F7F7',
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
  },
  dayTransportLabel: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 4,
  },
  dayTransportName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.blue,
  },
  dayTransportType: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  dayMealsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dayMealsLabel: {
    fontSize: 9,
    color: colors.muted,
  },
  dayMealsTags: {
    flexDirection: 'row',
    gap: 6,
  },
  dayNotesSection: {
    backgroundColor: colors.lightPurple,
    padding: 10,
    borderRadius: 4,
    marginTop: 10,
  },
  dayNotesLabel: {
    fontSize: 8,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNotesText: {
    fontSize: 9,
    color: colors.primaryDark,
    lineHeight: 1.4,
  },
  dayWeatherRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  dayWeatherText: {
    fontSize: 9,
    color: colors.muted,
  },

  // ==================== SECTION HEADER ====================
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  sectionHeaderSubtitle: {
    fontSize: 9,
    color: colors.muted,
  },
  sectionIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  sectionHeaderBar: {
    backgroundColor: colors.lightPurple,
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },

  // ==================== FOOTER ====================
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: 8,
    paddingHorizontal: 35,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerBranchName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  footerBranchInfo: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.white,
  },
  footerContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerIcon: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.white,
  },
  footerSpacer: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
    marginHorizontal: 4,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLogo: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
    marginRight: 8,
  },
  footerTagline: {
    fontSize: 7,
    color: colors.white,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerConfidential: {
    fontSize: 7,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerBookingRef: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 2,
  },
  pageNumber: {
    fontSize: 8,
    color: colors.white,
  },
  footerThankYou: {
    fontSize: 8,
    color: colors.white,
    fontStyle: 'italic',
  },

  // ==================== LISTS ====================
  listItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  listBullet: {
    fontSize: 10,
    color: colors.primary,
    marginRight: 8,
    width: 12,
  },
  listContent: {
    flex: 1,
  },
  listText: {
    fontSize: 9,
    color: colors.text,
    flex: 1,
    lineHeight: 1.4,
  },
  inclusionList: {
    backgroundColor: colors.lightPurple,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  exclusionList: {
    backgroundColor: colors.lightPurple,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },

  // ==================== INCLUSION/EXCLUSION CARDS ====================
  inclusionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  inclusionCardHeader: {
    backgroundColor: colors.background,
    padding: 10,
    paddingHorizontal: 14,
  },
  inclusionBadge: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  inclusionBadgeText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  inclusionItems: {
    padding: 14,
  },
  inclusionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  inclusionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
    marginRight: 10,
    marginTop: 3,
  },
  inclusionText: {
    fontSize: 10,
    color: colors.text,
    flex: 1,
    lineHeight: 1.4,
  },
  exclusionCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  exclusionCardHeader: {
    backgroundColor: colors.lightPurple,
    padding: 10,
    paddingHorizontal: 14,
  },
  exclusionBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  exclusionBadgeText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  exclusionItems: {
    padding: 14,
  },
  exclusionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  exclusionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: 10,
    marginTop: 3,
  },
  exclusionText: {
    fontSize: 10,
    color: colors.text,
    flex: 1,
    lineHeight: 1.4,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },

  // ==================== PRICING ====================
  priceSection: {
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 6,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  priceLabel: {
    color: '#a8a29f',
    fontSize: 9,
  },
  priceValue: {
    color: colors.white,
    fontSize: 9,
  },
  priceTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#3F3C39',
    paddingTop: 8,
    marginTop: 8,
  },
  priceTotalLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  priceTotalValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // ==================== TERMS ====================
  termsSection: {
    backgroundColor: colors.lightBeige,
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  termsItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  termsBullet: {
    fontSize: 8,
    color: colors.primary,
    marginRight: 8,
  },
  termsText: {
    fontSize: 8,
    color: colors.text,
    lineHeight: 1.5,
    flex: 1,
  },

  // ==================== EMPTY STATE ====================
  emptyText: {
    fontSize: 10,
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // ==================== TERMS CARD ====================
  termsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  termsCardHeader: {
    backgroundColor: colors.lightPurple,
    padding: 10,
    paddingHorizontal: 14,
  },
  termsBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  termsBadgeText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  termsCardContent: {
    padding: 14,
  },
  termsSectionLabel: {
    fontSize: 8,
    color: colors.muted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 10,
  },
  termsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
    marginRight: 10,
    marginTop: 4,
  },
  termsDotOrange: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 10,
    marginTop: 4,
  },
  termsItemText: {
    fontSize: 9,
    color: colors.text,
    flex: 1,
    lineHeight: 1.4,
  },
  notesCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: 20,
  },
  notesCardHeader: {
    backgroundColor: '#fbe3e3',
    padding: 10,
    paddingHorizontal: 14,
  },
  notesBadge: {
    backgroundColor: '#db0201',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  notesBadgeText: {
    fontSize: 9,
    color: colors.white,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  notesCardContent: {
    padding: 14,
  },
  notesCardText: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.5,
  },
  thankYouCard: {
    backgroundColor: colors.lightPurple,
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  thankYouContent: {
    alignItems: 'center',
  },
  thankYouTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6,
  },
  thankYouSubtitle: {
    fontSize: 10,
    color: colors.text,
    textAlign: 'center',
  },

  // ==================== SIMPLE TRANSPORT ROW ====================
  sectionHeaderSimple: {
    backgroundColor: colors.lightPurple,
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  sectionHeaderTitleSimple: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  sectionHeaderSubtitleSimple: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  transportCardSimple: {
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.white,
    pageBreakInside: 'avoid',
  },
  transportRowSimple: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transportDaySimple: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    minWidth: 55,
    maxWidth: 70,
    marginRight: 10,
  },
  transportNameSimple: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    flexBasis: 120,
    marginRight: 8,
  },
  transportCountSimple: {
    fontSize: 11,
    color: colors.primary,
    minWidth: 80,
    maxWidth: 160,
    flexShrink: 1,
    textAlign: 'right',
  },
  transportHeaderRow: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  transportHeaderDay: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
    minWidth: 55,
    maxWidth: 70,
    marginRight: 10,
  },
  transportHeaderService: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
    flexShrink: 1,
    flexBasis: 100,
    marginHorizontal: 8,
  },
  transportHeaderName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
    flexShrink: 1,
    flexBasis: 120,
    marginRight: 8,
  },
  transportHeaderCount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.white,
    minWidth: 80,
    maxWidth: 140,
    flexShrink: 1,
    textAlign: 'right',
  },
  transportLocationRow: {
    flexDirection: 'row',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 16,
  },
  transportLocationText: {
    fontSize: 10,
    color: colors.muted,
  },
});
