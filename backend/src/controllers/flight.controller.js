import { query, validationResult } from 'express-validator';
import { lookupFlight, getFlightProviderInfo } from '../services/flight.service.js';

/** yyyy-MM-dd, the format every date input in the builder emits. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const flightLookupValidation = [
  query('flightNumber').trim().notEmpty().withMessage('Flight number is required'),
  query('date')
    .trim()
    .notEmpty()
    .withMessage('Travel date is required')
    .matches(ISO_DATE)
    .withMessage('Date must be in YYYY-MM-DD format'),
];

/**
 * GET /flights/lookup?flightNumber=6E2134&date=2026-10-12
 *
 * Returns schedule details to prefill a flight segment. `isMock: true` means the
 * configured provider is the built-in sample generator, not a live airline feed —
 * the builder shows that as a badge so nobody quotes invented times as fact.
 */
export const lookupFlightByNumber = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    const { flightNumber, date } = req.query;
    const result = await lookupFlight({ flightNumber, date });

    if (!result.found) {
      return res.status(404).json({
        success: false,
        error: result.error || 'Flight not found',
        data: { provider: result.provider, isMock: result.isMock },
      });
    }

    res.json({
      success: true,
      data: {
        flight: result.flight,
        provider: result.provider,
        isMock: result.isMock,
      },
    });
  } catch (error) {
    console.error('Flight lookup error:', error);
    res.status(500).json({
      success: false,
      error: 'Could not reach the flight data provider. Enter the details manually.',
    });
  }
};

/** GET /flights/provider — lets the UI label sample data before any lookup. */
export const getFlightProvider = async (_req, res) => {
  res.json({ success: true, data: getFlightProviderInfo() });
};
