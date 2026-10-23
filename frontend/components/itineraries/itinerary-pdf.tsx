// Re-export from modular PDF structure for backward compatibility
// Main implementation is now in /pdf/ItineraryPDF.tsx

export {
  downloadClientPDF,
  downloadClientPDFWithProgress,
  downloadItineraryPDF,
  generatePDFBlob,
  ItineraryPDF,
  hasMultipleOptions,
  hasAnyOptions,
  getPDFQualityForItinerary,
} from './pdf/ItineraryPDF';

// Export types for consumers
export type { ImageQuality, PDFGenerationOptions, PDFGenerationStats } from './pdf/ItineraryPDF';
