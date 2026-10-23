// Single-Option PDF Entry Point - Fully isolated

export {
  downloadSinglePDF,
  generateSinglePDFBlob,
  SingleOptionPDFDocument,
  type ImageQuality,
  type SinglePDFProps,
} from './SinglePDF';

// Export all components for external use if needed
export { CoverPage } from './components/CoverPage';
export { FlightSection, hasAnyFlight } from './components/FlightSection';
export { HotelSection } from './components/HotelSection';
export { HotelCard } from './components/HotelCard';
export { TransportSection } from './components/TransportSection';
export { TransportCard } from './components/TransportCard';
export { DayItinerarySection } from './components/DayItinerarySection';
export { DayCard } from './components/DayCard';
export { InclusionSection } from './components/InclusionSection';
export { TermsSection } from './components/TermsSection';
export { ThankYouPage } from './components/ThankYouPage';
export { PDFHeader, PDFHeaderSmall, PDFHeaderCompact } from './components/Header';
export { PDFFooter, PDFFooterSimple } from './components/Footer';
export { PDFImage } from './components/PDFImage';

// Export utilities
export {
  formatDate,
  formatShortDate,
  formatDateRange,
  formatINR,
  formatRupee,
  formatPrice,
  parseArray,
  getDayOrdinal,
  getDayOrdinalSuffix,
  getCurrencySymbol,
} from './utils';
export { colors } from './styles';
