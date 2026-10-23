// Multi-Option PDF Entry Point - Fully isolated

export {
  downloadMultiPDF,
  generateMultiPDFBlob,
  MultiOptionPDFDocument,
  type ImageQuality,
  type MultiPDFProps,
} from './MultiPDF';

// Export all components for external use if needed
export { MultiOptionCover } from './components/MultiOptionCover';
export { MultiOptionPricing } from './components/MultiOptionPricing';
export { MultiOptionFlightSection, hasAnyFlight } from './components/MultiOptionFlightSection';
export { MultiOptionHotelSection } from './components/MultiOptionHotelSection';
export { MultiOptionTransportSection } from './components/MultiOptionTransportSection';
export { MultiOptionDaySection } from './components/MultiOptionDaySection';
export { MultiOptionInclusionSection } from './components/MultiOptionInclusionSection';
export { OptionSection } from './components/OptionSection';
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
