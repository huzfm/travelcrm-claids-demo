import { body, validationResult } from 'express-validator';
import { userHasPermission, seesAllItineraries } from '../middleware/rbac.js';
import prisma from '../config/prisma.js';
import generateTripId from '../utils/tripIdGenerator.js';
import { parseCalendarDate } from '../utils/dateWindows.js';

// Non-main branches must not see DB catalogue prices. The catalogue price is
// gated at the SELECTION layer (hotel-select-dialog, vehicle-select-dialog,
// hotel-autocomplete, vehicle-autocomplete) — non-main users see the
// hotel/vehicle but the catalogue `pricePerNight` / `ratePerDay` is never
// copied into the wizard's per-day fields, and the day-level `basePrice` /
// `ratePerDay` / `extraBedPrice` / `childPrice` / `mealPlanPrice` are always
// the user's own entered quote (or 0 if not yet entered).
//
// A previous version of this function zeroed the per-day price fields on
// read for non-main branches. That was wrong: it destroyed the user's own
// entered prices when they reopened an itinerary to edit it, so a small
// change wiped their manualHotelCost / manualVehicleCost / finalPrice to 0.
// The catalogue price is already hidden at the selection layer, so no
// read-time sanitization is needed here. We keep the function as a
// no-op stub for backwards compatibility with the call site and as a
// hook in case a future, narrower sanitization is required.
const sanitizeItineraryPricesForNonMain = (itinerary, _branchId) => itinerary;

/**
 * Flight segments arrive from the builder, so every field is already free-form
 * text the agent could have typed. Keep only entries that identify a flight at
 * all, coerce the numeric fields, and store an empty list as null so "no flights"
 * reads the same whether the itinerary predates the section or skipped it.
 */
const normalizeFlights = input => {
  const list = typeof input === 'string' ? safeJsonParse(input) : input;
  if (!Array.isArray(list)) return null;

  const num = value => {
    if (value === null || value === undefined || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const flights = list
    .filter(flight => flight && typeof flight === 'object')
    .filter(flight =>
      // A segment with no flight number and no route is a blank row the agent
      // added and never filled — dropping it keeps the PDF clean.
      Boolean(
        String(flight.flightNumber || '').trim() ||
        String(flight.departureCode || '').trim() ||
        String(flight.arrivalCode || '').trim()
      )
    )
    .map(flight => ({
      ...flight,
      passengers: num(flight.passengers),
      farePerPerson: num(flight.farePerPerson),
      totalFare: num(flight.totalFare),
      durationMinutes: num(flight.durationMinutes),
      stops: num(flight.stops),
    }));

  return flights.length > 0 ? flights : null;
};

const safeJsonParse = value => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeChildrenAges = input => {
  if (!Array.isArray(input)) return null;
  const ages = input
    .map(age => Number(age))
    .filter(age => Number.isFinite(age) && age >= 0 && age <= 17)
    .map(age => Math.floor(age));
  return ages.length > 0 ? ages : null;
};

export const itineraryValidation = [
  body('leadId').optional(),
  body('title').optional(),
  body('destination').optional(),
  body('daysJson').optional().isArray({ min: 1 }).withMessage('Days array is required'),
];

export const bulkCreateFromTemplateValidation = [
  body('templateId').notEmpty().withMessage('Template ID is required'),
  body('leadIds').isArray({ min: 1 }).withMessage('At least one lead ID is required'),
];

export const bulkCreateFromTemplate = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { templateId, leadIds, titlePrefix = '' } = req.body;

    // Get template
    const template = await prisma.itinerary.findUnique({
      where: { id: templateId, isTemplate: true },
    });

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Get all leads
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
    });

    if (leads.length === 0) {
      return res.status(404).json({ success: false, error: 'No leads found' });
    }

    // Create itineraries for each lead
    const results = [];
    const errors_list = [];

    for (const lead of leads) {
      try {
        const title =
          `${titlePrefix}${lead.name}'s ${template.title || template.templateName || 'Trip'}`.trim();
        const tripId = await generateTripId();
        const daysJson =
          typeof template.daysJson === 'string'
            ? JSON.parse(template.daysJson)
            : template.daysJson || [];

        const itinerary = await prisma.itinerary.create({
          data: {
            leadId: lead.id,
            branchId: lead.branchId,
            title,
            tripId,
            destination: template.destination || '',
            tripType: template.tripType || 'DOMESTIC',
            startDate: parseCalendarDate(lead.travelDateFrom),
            endDate: parseCalendarDate(lead.travelDateTo),
            totalTravelers: lead.travelers || 2,
            daysJson,
            sourceTemplateId: template.id,
            isTemplate: false,
            status: 'DRAFT',
            included: template.included || [],
            excluded: template.excluded || [],
            terms: template.terms || '',
            notes: template.notes || '',
          },
        });
        results.push({ leadId: lead.id, leadName: lead.name, itineraryId: itinerary.id });
      } catch (err) {
        errors_list.push({ leadId: lead.id, leadName: lead.name, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        created: results,
        failed: errors_list,
        totalRequested: leadIds.length,
        totalCreated: results.length,
        totalFailed: errors_list.length,
      },
    });
  } catch (error) {
    console.error('Bulk create from template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create itineraries' });
  }
};

/**
 * Cost figures live on the itinerary record itself, so withholding the
 * `itineraries.pricing` sub-permission means stripping them from the response
 * rather than hiding a route. Someone who cannot see pricing can still build and
 * send an itinerary; they just never see cost, margin or quoted totals.
 */
const PRICING_FIELDS = ['totalCost', 'quotes', 'options'];

const stripPricing = payload => {
  if (Array.isArray(payload)) return payload.map(stripPricing);
  if (!payload || typeof payload !== 'object') return payload;
  const clean = { ...payload };
  for (const field of PRICING_FIELDS) delete clean[field];
  return clean;
};

/** Removes pricing from a response unless the caller is allowed to see it. */
const applyPricingVisibility = async (req, payload) => {
  if (await userHasPermission(req.user, 'itineraries.pricing')) return payload;
  return stripPricing(payload);
};

// Reading every itinerary (seesAllItineraries) is view only: editing, sharing
// and deleting still follow the role scope.

export const getAllItineraries = async (req, res) => {
  try {
    const { branchId, leadId, tripId, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (await seesAllItineraries(req.user)) {
      if (branchId) where.branchId = branchId;
    } else if (req.user.role === 'STAFF') {
      where.createdBy = req.user.id;
    } else if (req.user.role === 'MANAGER') {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (leadId) {
      where.leadId = leadId;
    }

    if (tripId) {
      where.tripId = { contains: tripId, mode: 'insensitive' };
    }

    const [itineraries, total] = await Promise.all([
      prisma.itinerary.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          destination: true,
          version: true,
          pdfPath: true,
          sharedVia: true,
          createdAt: true,
          updatedAt: true,
          startDate: true,
          endDate: true,
          totalTravelers: true,
          totalCost: true,
          advancePaid: true,
          tripId: true,
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              country: true,
              whatsappNumber: true,
              email: true,
              address: true,
              currency: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.itinerary.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        itineraries: await applyPricingVisibility(req, itineraries),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get all itineraries error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getBookedClients = async (req, res) => {
  try {
    const { page = '1', limit = '50', search, dateFrom, dateTo } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for leads
    const leadWhere = {
      status: 'WON',
      deletedAt: null,
    };

    // Booked clients are the trips seen from the customer's side, so either
    // agency-wide grant opens all of them.
    const seesAll =
      (await seesAllItineraries(req.user)) ||
      (await userHasPermission(req.user, 'trips.view_all'));

    if (seesAll) {
      if (req.query.branchId) leadWhere.branchId = req.query.branchId;
    } else if (req.user.role === 'STAFF') {
      leadWhere.assignedTo = req.user.id;
    } else if (req.user.role === 'MANAGER') {
      leadWhere.branchId = req.user.branchId;
    }

    if (search) {
      leadWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by itinerary date range if provided
    if (dateFrom || dateTo) {
      leadWhere.itineraries = {
        some: {
          ...(dateFrom && { startDate: { gte: parseCalendarDate(dateFrom) } }),
          ...(dateTo && { startDate: { lte: parseCalendarDate(dateTo) } }),
        },
      };
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: leadWhere,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          branchId: true,
          numberOfPax: true,
          createdAt: true,
          updatedAt: true,
          itineraries: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              destination: true,
              tripId: true,
              startDate: true,
              endDate: true,
              totalTravelers: true,
              totalCost: true,
              currency: true,
              sharedVia: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.lead.count({ where: leadWhere }),
    ]);

    res.json({
      success: true,
      data: {
        clients: leads,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get booked clients error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getItineraryById = async (req, res) => {
  try {
    const { id } = req.params;

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            branchId: true,
            assignee: { select: { id: true, name: true } },
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
            timezone: true,
            whatsappNumber: true,
            email: true,
            phone: true,
            address: true,
            currency: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatarUrl: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found. It may have been deleted or does not exist.',
      });
    }

    // Parse JSON fields that were stored as strings
    const parsedItinerary = {
      ...itinerary,
      quotes: itinerary.quotes
        ? typeof itinerary.quotes === 'string'
          ? JSON.parse(itinerary.quotes)
          : itinerary.quotes
        : null,
      options: itinerary.options
        ? typeof itinerary.options === 'string'
          ? JSON.parse(itinerary.options)
          : itinerary.options
        : null,
      // `flights` is what the builder, the detail page and the PDF read; the
      // column keeps the `flightsJson` name to match daysJson beside it.
      flights: Array.isArray(itinerary.flightsJson) ? itinerary.flightsJson : [],
    };

    // Non-main branches must not see DB-derived hotel/vehicle prices — strip
    // them from daysJson / options / quotes before returning. Manual prices
    // (entries with id starting "manual-") and the user's own
    // manualHotelCost/manualVehicleCost/customTotal/finalPrice are preserved.
    sanitizeItineraryPricesForNonMain(parsedItinerary, req.user.branchId);

    const outOfScope =
      (req.user.role === 'STAFF' && itinerary.createdBy !== req.user.id) ||
      (req.user.role === 'MANAGER' && itinerary.branchId !== req.user.branchId);
    if (outOfScope && !(await seesAllItineraries(req.user))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: { itinerary: await applyPricingVisibility(req, parsedItinerary) },
    });
  } catch (error) {
    console.error('Get itinerary by id error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createItinerary = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
      });
    }

    let {
      leadId,
      title,
      clientName,
      salutation,
      destination,
      daysJson,
      templateId,
      sourceTemplateId,
      coverImage,
      startDate,
      endDate,
      tripType,
      totalTravelers,
      adults,
      children,
      childrenAges,
      budget,
      currency,
      totalCost,
      notes,
      terms,
      advanceAmount,
      advancePaid,
      bankDetails,
      included,
      excluded,
      quotes,
      selectedQuote,
      options,
      selectedOption,
      flights,
      tripId,
      draftId,
    } = req.body;

    // Lead is optional - allow manual itineraries without a lead
    let lead = null;
    let leadBranchId = null;

    // Generate title early so it's available for activity log
    const finalTitle =
      title ||
      (clientName ? `${clientName}'s Trip` : null) ||
      (lead?.name ? `${lead?.name}'s Trip` : `Trip to ${destination || 'Unknown'}`);

    if (leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              currency: true,
              email: true,
              phone: true,
              address: true,
              instagram: true,
            },
          },
        },
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
      }

      if (req.user.role === 'MANAGER' && lead.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot create itineraries for leads in other branches',
        });
      }

      leadBranchId = lead.branchId;
    }

    // `templateId` is a foreign key to ItineraryTemplate, so an itinerary-backed
    // template's id must not be written to it — that would fail on the
    // constraint. Only a legacy template may be linked through the relation.
    let isLegacyTemplate = false;

    if (templateId) {
      // Check both legacy ItineraryTemplate and itinerary-based templates
      const [legacyTemplate, itineraryTemplate] = await Promise.all([
        prisma.itineraryTemplate.findUnique({ where: { id: templateId } }),
        prisma.itinerary.findUnique({ where: { id: templateId, isTemplate: true } }),
      ]);

      const template = legacyTemplate || itineraryTemplate;
      isLegacyTemplate = Boolean(legacyTemplate);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
        });
      }

      // For legacy templates, check branch access
      if (legacyTemplate && !legacyTemplate.isGlobal && legacyTemplate.branchId !== leadBranchId) {
        return res.status(400).json({
          success: false,
          error: 'Template is not available for this branch',
        });
      }

      // For itinerary templates, check branch access
      if (
        itineraryTemplate &&
        req.user.role !== 'ADMIN' &&
        itineraryTemplate.branchId !== leadBranchId
      ) {
        return res.status(400).json({
          success: false,
          error: 'Template is not available for this branch',
        });
      }

      // If no daysJson provided, use template's daysJson
      if ((!daysJson || daysJson.length === 0) && template.daysJson) {
        daysJson = template.daysJson;
        // Pre-fill destination if not provided
        if (!destination && template.destination) {
          destination = template.destination;
        }
      }
    }

    // Enrich days with hotel room types & meal plans and vehicle details from DB
    let enrichedDaysJson = daysJson;
    if (Array.isArray(daysJson) && daysJson.length > 0) {
      const hotelIds = [
        ...new Set(
          daysJson.flatMap(d =>
            [
              d.hotelId,
              ...(d.similarHotels?.map(sh => sh.hotelId) || []),
              ...(d.alternatives?.hotelOptions?.map(alt => alt.hotelId) || []),
            ].filter(Boolean)
          )
        ),
      ];
      const vehicleIds = [...new Set(daysJson.filter(d => d.vehicleId).map(d => d.vehicleId))];
      const destinationIds = [
        ...new Set(daysJson.filter(d => d.destinationId).map(d => d.destinationId)),
      ];

      const [hotels, vehicles, destinations] = await Promise.all([
        hotelIds.length > 0 ? prisma.hotel.findMany({ where: { id: { in: hotelIds } } }) : [],
        vehicleIds.length > 0 ? prisma.vehicle.findMany({ where: { id: { in: vehicleIds } } }) : [],
        destinationIds.length > 0
          ? prisma.destination.findMany({ where: { id: { in: destinationIds } } })
          : [],
      ]);

      const hotelMap = Object.fromEntries(hotels.map(h => [h.id, h]));
      const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
      const destinationMap = Object.fromEntries(destinations.map(d => [d.id, d]));

      enrichedDaysJson = daysJson.map(day => {
        const enriched = { ...day };

        // Enrich destination from DB if destinationId exists — ALWAYS fill in all fields
        if (day.destinationId && destinationMap[day.destinationId]) {
          const dest = destinationMap[day.destinationId];
          enriched.destination = dest.name;
          enriched.destinationAddress = dest.address;
          enriched.destinationHighlights = dest.highlights || [];
          enriched.destinationShortDescription = dest.shortDescription || null;
          enriched.destinationDescription = dest.description || null;
          enriched.destinationAmenities = dest.amenities || [];
          enriched.destinationBestTimeToVisit = dest.bestTimeToVisit || null;
          enriched.destinationAverageTemperature = dest.averageTemperature || null;
          enriched.destinationLanguage = dest.language || null;
          enriched.destinationCurrency = dest.currency || null;
          enriched.destinationTimezone = dest.timezone || null;
          enriched.destinationThingsToKnow = dest.thingsToKnow || null;
        }

        if (day.hotelId && hotelMap[day.hotelId]) {
          const hotel = hotelMap[day.hotelId];

          // Always enrich hotel images / metadata when hotelId exists
          let hotelImages = [];
          if (hotel.images) {
            hotelImages =
              typeof hotel.images === 'string' ? JSON.parse(hotel.images) : hotel.images;
          }
          if (!enriched.hotelImage) enriched.hotelImage = hotelImages[0] || null;
          if (!enriched.hotelStars) enriched.hotelStars = hotel.stars || undefined;
          if (!enriched.hotelAddress)
            enriched.hotelAddress = hotel.address || hotel.location || undefined;
          if (!enriched.hotelContact) enriched.hotelContact = hotel.phone || undefined;

          // Only enrich room type / meal plan if the user did NOT supply one.
          // The frontend always sends selectedRoomType / selectedMealPlan with
          // the user's own entered basePrice / extraBedPrice / childPrice /
          // pricePerNight. Overwriting those with the DB catalogue values
          // silently destroyed the user's typed prices — and on subsequent
          // edit, the wizard would re-load the catalogue price and treat
          // that as the user's quote.
          if (!day.selectedRoomType) {
            if (hotel.roomTypes?.length > 0) {
              const rt = hotel.roomTypes[0];
              enriched.selectedRoomType = {
                name: rt.name,
                bedType: rt.bedType,
                basePrice: rt.basePrice,
                extraBedPrice: rt.extraBedPrice || undefined,
                childPrice: rt.childPrice || undefined,
              };
              if (rt.extraBedPrice) enriched.extraBedCost = rt.extraBedPrice;
              if (rt.childPrice) enriched.childWithoutBedCost = rt.childPrice;
            }
            if (hotel.mealPlans?.length > 0) {
              const mp = hotel.mealPlans[0];
              enriched.selectedMealPlan = {
                type: mp.type,
                label: mp.label,
                pricePerNight: mp.pricePerNight,
              };
            }
          }
        }

        if (day.vehicleId && vehicleMap[day.vehicleId]) {
          const vehicle = vehicleMap[day.vehicleId];
          // Always enrich vehicle images when vehicleId exists
          let vehicleImages = [];
          if (vehicle.images) {
            vehicleImages =
              typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images;
          }
          if (!enriched.vehicleImage) enriched.vehicleImage = vehicleImages[0] || null;
          if (!enriched.vehicleRegistration)
            enriched.vehicleRegistration = vehicle.registrationNumber || undefined;
          // Only enrich selectedVehicle if the user did not send one — the
          // frontend writes the user's own ratePerDay into selectedVehicle
          // and we must not overwrite that with the DB catalogue rate.
          if (!day.selectedVehicle) {
            enriched.selectedVehicle = {
              name: vehicle.name,
              brand: vehicle.brand || undefined,
              vehicleType: vehicle.vehicleType,
              seatingCapacity: vehicle.seatingCapacity,
              driverName: vehicle.driverName || undefined,
              driverPhone: vehicle.driverPhone || undefined,
              ratePerDay: vehicle.ratePerDay || undefined,
            };
          }
        }

        // Enrich hotel alternatives
        if (day.alternatives?.hotelOptions?.length > 0) {
          enriched.alternatives = {
            ...day.alternatives,
            hotelOptions: day.alternatives.hotelOptions.map(alt => {
              const hotel = hotelMap[alt.hotelId];
              if (!hotel) return alt;
              const altImages = hotel.images
                ? typeof hotel.images === 'string'
                  ? JSON.parse(hotel.images)
                  : hotel.images
                : [];
              return {
                ...alt,
                hotelName: alt.hotelName || hotel.name,
                hotelAddress: alt.hotelAddress || hotel.address || hotel.location,
                hotelStars: alt.hotelStars || hotel.stars,
                hotelImage: alt.hotelImage || altImages[0] || null,
                hotelContact: alt.hotelContact || hotel.phone || undefined,
                selectedRoomType: alt.selectedRoomType || enriched.selectedRoomType,
                selectedMealPlan: alt.selectedMealPlan || enriched.selectedMealPlan,
              };
            }),
          };
        }

        // Enrich vehicle alternatives
        if (day.alternatives?.vehicleOptions?.length > 0) {
          enriched.alternatives = {
            ...(enriched.alternatives || {}),
            ...day.alternatives,
            vehicleOptions: day.alternatives.vehicleOptions.map(alt => {
              const vehicle = vehicleMap[alt.vehicleId];
              if (!vehicle) return alt;
              const vImages = vehicle.images
                ? typeof vehicle.images === 'string'
                  ? JSON.parse(vehicle.images)
                  : vehicle.images
                : [];
              return {
                ...alt,
                vehicleName: alt.vehicleName || vehicle.name,
                selectedVehicle: alt.selectedVehicle || enriched.selectedVehicle,
                vehicleImage: alt.vehicleImage || vImages[0] || null,
              };
            }),
          };
        }

        return enriched;
      });
    }

    const itinerary = await prisma.itinerary.create({
      data: {
        leadId: leadId || null,
        branchId: leadBranchId || req.user.branchId,
        title: finalTitle,
        clientName: clientName || lead?.name || null,
        salutation: salutation || 'Mr',
        destination: destination || lead?.destination || null,
        daysJson: enrichedDaysJson,
        templateId: isLegacyTemplate ? templateId : null,
        // Provenance for either kind of template, and what the usage counts
        // read. Always set when a template was involved, so the counts never
        // double-count an itinerary that also has the legacy relation.
        sourceTemplateId: sourceTemplateId || templateId || null,
        version: 1,
        createdBy: req.user.id,
        coverImage,
        startDate: parseCalendarDate(startDate),
        endDate: parseCalendarDate(endDate),
        tripType,
        totalTravelers: totalTravelers ? Number(totalTravelers) : null,
        adults: adults ? Number(adults) : null,
        children: children ? Number(children) : null,
        childrenAges: normalizeChildrenAges(childrenAges),
        budget,
        currency: currency || lead?.branch?.currency || 'INR',
        totalCost: totalCost ? Number(totalCost) : null,
        notes,
        terms: terms || null,
        advanceAmount: advanceAmount ? Number(advanceAmount) : null,
        advancePaid: advancePaid || false,
        bankDetails: bankDetails
          ? typeof bankDetails === 'string'
            ? bankDetails
            : JSON.stringify(bankDetails)
          : null,
        included: included
          ? typeof included === 'string'
            ? included
            : JSON.stringify(included)
          : null,
        excluded: excluded
          ? typeof excluded === 'string'
            ? excluded
            : JSON.stringify(excluded)
          : null,
        quotes: quotes ? (typeof quotes === 'string' ? quotes : JSON.stringify(quotes)) : null,
        selectedQuote,
        options: options ? (typeof options === 'string' ? options : JSON.stringify(options)) : null,
        flightsJson: normalizeFlights(flights),
        selectedOption:
          selectedOption !== undefined
            ? Array.isArray(selectedOption)
              ? selectedOption.length > 0
                ? selectedOption[0]
                : null
              : Number(selectedOption)
            : null,
        tripId: tripId || (await generateTripId()),
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // The builder's incomplete copy has served its purpose. Best effort: the
    // itinerary is saved either way, and a leftover draft can be deleted.
    if (typeof draftId === 'string' && draftId) {
      await prisma.itineraryDraft.deleteMany({ where: { id: draftId } }).catch(error => {
        console.error('Create itinerary: could not remove draft:', error.message);
      });
    }

    // Create activity log only if there's a lead
    if (leadId && lead) {
      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: req.user.id,
          type: 'NOTE',
          description: `Itinerary "${finalTitle}" created`,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: { itinerary },
    });
  } catch (error) {
    console.error('Create itinerary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const updateItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      clientName,
      salutation,
      destination,
      daysJson,
      templateId,
      coverImage,
      startDate,
      endDate,
      tripType,
      totalTravelers,
      adults,
      children,
      childrenAges,
      budget,
      totalCost,
      currency,
      notes,
      terms,
      advanceAmount,
      advancePaid,
      bankDetails,
      included,
      excluded,
      quotes,
      selectedQuote,
      options,
      selectedOption,
      flights,
      sharedVia,
    } = req.body;

    const existing = await prisma.itinerary.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found. It may have been deleted or does not exist.',
      });
    }

    if (req.user.role === 'STAFF' && existing.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && existing.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const updateData = {
      version: existing.version + 1,
    };

    if (title !== undefined) updateData.title = title;
    if (destination !== undefined) updateData.destination = destination;
    if (currency !== undefined) updateData.currency = currency;

    if (daysJson !== undefined) {
      let enrichedDays = daysJson;
      if (Array.isArray(daysJson) && daysJson.length > 0) {
        const needsEnrichment = daysJson.some(
          d =>
            (d.hotelId && !d.selectedRoomType) ||
            (d.vehicleId && !d.selectedVehicle) ||
            (d.destinationId && (!d.destination || d.destinationHighlights === undefined))
        );

        if (needsEnrichment) {
          const hotelIds = [
            ...new Set(
              daysJson.flatMap(d =>
                [
                  d.hotelId,
                  ...(d.similarHotels?.map(sh => sh.hotelId) || []),
                  ...(d.alternatives?.hotelOptions?.map(alt => alt.hotelId) || []),
                ].filter(Boolean)
              )
            ),
          ];
          const vehicleIds = [...new Set(daysJson.filter(d => d.vehicleId).map(d => d.vehicleId))];
          const destinationIds = [
            ...new Set(daysJson.filter(d => d.destinationId).map(d => d.destinationId)),
          ];

          const [hotels, vehicles, destinations] = await Promise.all([
            hotelIds.length > 0 ? prisma.hotel.findMany({ where: { id: { in: hotelIds } } }) : [],
            vehicleIds.length > 0
              ? prisma.vehicle.findMany({ where: { id: { in: vehicleIds } } })
              : [],
            destinationIds.length > 0
              ? prisma.destination.findMany({ where: { id: { in: destinationIds } } })
              : [],
          ]);

          const hotelMap = Object.fromEntries(hotels.map(h => [h.id, h]));
          const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
          const destinationMap = Object.fromEntries(destinations.map(d => [d.id, d]));

          enrichedDays = daysJson.map(day => {
            const enriched = { ...day };

            // Enrich destination from DB if destinationId exists — ALWAYS fill in all fields from DB
            if (day.destinationId && destinationMap[day.destinationId]) {
              const dest = destinationMap[day.destinationId];
              enriched.destination = dest.name;
              enriched.destinationAddress = dest.address;
              enriched.destinationHighlights = dest.highlights || [];
              enriched.destinationShortDescription = dest.shortDescription || null;
              enriched.destinationDescription = dest.description || null;
              enriched.destinationAmenities = dest.amenities || [];
              enriched.destinationBestTimeToVisit = dest.bestTimeToVisit || null;
              enriched.destinationAverageTemperature = dest.averageTemperature || null;
              enriched.destinationLanguage = dest.language || null;
              enriched.destinationCurrency = dest.currency || null;
              enriched.destinationTimezone = dest.timezone || null;
              enriched.destinationThingsToKnow = dest.thingsToKnow || null;
            }

            if (day.hotelId && hotelMap[day.hotelId]) {
              const hotel = hotelMap[day.hotelId];

              // Always enrich hotelImage when hotelId exists
              if (!enriched.hotelImage) {
                const hotelImages = hotel.images
                  ? typeof hotel.images === 'string'
                    ? JSON.parse(hotel.images)
                    : hotel.images
                  : [];
                enriched.hotelImage = hotelImages[0] || null;
              }
              // Also enrich stars and address if missing
              if (!enriched.hotelStars) enriched.hotelStars = hotel.stars || undefined;
              if (!enriched.hotelAddress)
                enriched.hotelAddress = hotel.address || hotel.location || undefined;
              if (!enriched.hotelContact) enriched.hotelContact = hotel.phone || undefined;

              // Only enrich room type/meal plan if not already set
              if (!day.selectedRoomType) {
                if (hotel.roomTypes?.length > 0) {
                  const rt = hotel.roomTypes[0];
                  enriched.selectedRoomType = {
                    name: rt.name,
                    bedType: rt.bedType,
                    basePrice: rt.basePrice,
                    extraBedPrice: rt.extraBedPrice || undefined,
                    childPrice: rt.childPrice || undefined,
                  };
                  if (rt.extraBedPrice) enriched.extraBedCost = rt.extraBedPrice;
                  if (rt.childPrice) enriched.childWithoutBedCost = rt.childPrice;
                }
                if (hotel.mealPlans?.length > 0) {
                  const mp = hotel.mealPlans[0];
                  enriched.selectedMealPlan = {
                    type: mp.type,
                    label: mp.label,
                    pricePerNight: mp.pricePerNight,
                  };
                }
              }
            }

            if (day.vehicleId && vehicleMap[day.vehicleId]) {
              const vehicle = vehicleMap[day.vehicleId];
              // Always enrich vehicleImage when vehicleId exists
              if (!enriched.vehicleImage) {
                const vehicleImages = vehicle.images
                  ? typeof vehicle.images === 'string'
                    ? JSON.parse(vehicle.images)
                    : vehicle.images
                  : [];
                enriched.vehicleImage = vehicleImages[0] || null;
              }
              if (!enriched.selectedVehicle) {
                enriched.selectedVehicle = {
                  name: vehicle.name,
                  brand: vehicle.brand || undefined,
                  vehicleType: vehicle.vehicleType,
                  seatingCapacity: vehicle.seatingCapacity,
                  driverName: vehicle.driverName || undefined,
                  driverPhone: vehicle.driverPhone || undefined,
                  ratePerDay: vehicle.ratePerDay || undefined,
                };
              }
            }

            return enriched;
          });
        }
      }
      updateData.daysJson = enrichedDays;
    }

    if (templateId !== undefined) updateData.templateId = templateId;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (startDate !== undefined) updateData.startDate = parseCalendarDate(startDate);
    if (endDate !== undefined) updateData.endDate = parseCalendarDate(endDate);
    if (tripType !== undefined) updateData.tripType = tripType;
    if (totalTravelers !== undefined) updateData.totalTravelers = Number(totalTravelers) || null;
    if (adults !== undefined) updateData.adults = Number(adults) || null;
    if (children !== undefined) updateData.children = Number(children) || null;
    if (childrenAges !== undefined) updateData.childrenAges = normalizeChildrenAges(childrenAges);
    if (clientName !== undefined) updateData.clientName = clientName || null;
    if (salutation !== undefined) updateData.salutation = salutation || 'Mr';
    if (budget !== undefined) updateData.budget = budget;
    if (totalCost !== undefined) updateData.totalCost = Number(totalCost) || null;
    if (notes !== undefined) updateData.notes = notes;
    if (terms !== undefined) updateData.terms = terms || null;
    if (included !== undefined) {
      updateData.included =
        typeof included === 'string' ? included : JSON.stringify(included || []);
    }
    if (excluded !== undefined) {
      updateData.excluded =
        typeof excluded === 'string' ? excluded : JSON.stringify(excluded || []);
    }
    if (advanceAmount !== undefined) {
      updateData.advanceAmount = advanceAmount ? Number(advanceAmount) : null;
    }
    if (advancePaid !== undefined) updateData.advancePaid = Boolean(advancePaid);
    if (bankDetails !== undefined) {
      updateData.bankDetails =
        typeof bankDetails === 'string' ? bankDetails : JSON.stringify(bankDetails);
    }
    if (quotes !== undefined) {
      updateData.quotes = typeof quotes === 'string' ? quotes : JSON.stringify(quotes || []);
    }
    if (selectedQuote !== undefined) {
      updateData.selectedQuote = Array.isArray(selectedQuote)
        ? selectedQuote.length > 0
          ? selectedQuote[0]
          : null
        : selectedQuote !== null
          ? Number(selectedQuote)
          : null;
    }
    if (options !== undefined) {
      updateData.options = typeof options === 'string' ? options : JSON.stringify(options || []);
    }
    if (flights !== undefined) updateData.flightsJson = normalizeFlights(flights);
    // Set once the agent actually sends the itinerary to the client (WhatsApp
    // document/text, or the dedicated /share endpoint) — never cleared back
    // to null here, since un-sharing isn't a supported action.
    if (sharedVia !== undefined) updateData.sharedVia = sharedVia;
    if (selectedOption !== undefined) {
      updateData.selectedOption = Array.isArray(selectedOption)
        ? selectedOption.length > 0
          ? selectedOption[0]
          : null
        : selectedOption !== null
          ? Number(selectedOption)
          : null;
    }

    const itinerary = await prisma.itinerary.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            country: true,
            whatsappNumber: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: { itinerary },
    });
  } catch (error) {
    console.error('Update itinerary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const shareItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    const { via: viaParam, recipientPhone, pdfUrl } = req.body;
    const via = viaParam || 'whatsapp';

    if (via && !['whatsapp', 'link'].includes(via)) {
      return res.status(400).json({
        success: false,
        error: 'Valid sharing method is required (whatsapp or link)',
      });
    }

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      include: {
        branch: true,
        lead: true,
      },
    });

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found. It may have been deleted or does not exist.',
      });
    }

    if (req.user.role === 'STAFF' && itinerary.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && itinerary.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (via === 'whatsapp') {
      if (!recipientPhone && !itinerary.lead.phone) {
        return res.status(400).json({
          success: false,
          error: 'Recipient phone number is required',
        });
      }

      if (!pdfUrl) {
        return res.status(400).json({
          success: false,
          error: 'PDF URL is required for WhatsApp sharing. Please generate the PDF first.',
        });
      }

      const phoneToSend = recipientPhone || itinerary.lead.phone;

      // PDF is generated client-side and URL is passed here
      const pdfFullUrl = pdfUrl;
      const caption = `Hello ${itinerary.lead.name},\n\nYour itinerary for *${itinerary.destination}* - ${itinerary.title}\n\nRegards,\n${itinerary.branch.name}`;

      if (itinerary.branch.whatsappNumber) {
        // Send PDF as document via WhatsApp
        await sendDocument(
          itinerary.branch.whatsappNumber,
          phoneToSend,
          pdfFullUrl,
          caption,
          `${itinerary.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
        );

        await prisma.whatsappMessage.create({
          data: {
            branchId: itinerary.branchId,
            leadId: itinerary.leadId,
            waNumberId: itinerary.branch.whatsappNumber,
            direction: 'OUTBOUND',
            messageType: 'DOCUMENT',
            content: `Itinerary PDF sent to ${phoneToSend}`,
            sentAt: new Date(),
          },
        });
      }

      await prisma.itinerary.update({
        where: { id },
        data: { sharedVia: 'whatsapp' },
      });

      res.json({
        success: true,
        data: {
          message: 'Itinerary PDF shared via WhatsApp',
          sharedVia: 'whatsapp',
        },
      });
    } else {
      // PDF URL is provided by frontend (client-side generation)
      const shareUrl = pdfUrl || '';

      await prisma.itinerary.update({
        where: { id },
        data: { sharedVia: 'link' },
      });

      res.json({
        success: true,
        data: {
          shareUrl,
          sharedVia: 'link',
        },
      });
    }
  } catch (error) {
    console.error('Share itinerary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share itinerary',
    });
  }
};

/**
 * How many itineraries each template has produced.
 *
 * Counts both provenance fields without double-counting: rows written since
 * `sourceTemplateId` exists carry it, and older rows are picked up through the
 * legacy `templateId` relation only when `sourceTemplateId` is empty.
 *
 * Returns a plain `{ [templateId]: count }` map — the suggestion ranker treats
 * a missing key as "unknown" rather than zero.
 */
export const getTemplateUsage = async (req, res) => {
  try {
    const scope = req.user.role === 'ADMIN' ? {} : { branchId: req.user.branchId };

    const [bySource, byLegacyLink] = await Promise.all([
      prisma.itinerary.groupBy({
        by: ['sourceTemplateId'],
        where: { ...scope, isTemplate: false, sourceTemplateId: { not: null } },
        _count: { _all: true },
      }),
      prisma.itinerary.groupBy({
        by: ['templateId'],
        where: {
          ...scope,
          isTemplate: false,
          templateId: { not: null },
          sourceTemplateId: null,
        },
        _count: { _all: true },
      }),
    ]);

    const usage = {};
    for (const row of bySource) {
      usage[row.sourceTemplateId] = (usage[row.sourceTemplateId] || 0) + row._count._all;
    }
    for (const row of byLegacyLink) {
      usage[row.templateId] = (usage[row.templateId] || 0) + row._count._all;
    }

    res.json({ success: true, data: { usage } });
  } catch (error) {
    console.error('Get template usage error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch template usage' });
  }
};

export const getTemplates = async (req, res) => {
  try {
    // Fetch both ItineraryTemplate records and itineraries with isTemplate=true
    const [templateRecords, templateItineraries] = await Promise.all([
      // Legacy ItineraryTemplate records
      prisma.itineraryTemplate.findMany({
        where: {
          OR: [
            { isGlobal: true },
            { branchId: req.user.role === 'ADMIN' ? undefined : req.user.branchId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
        },
      }),
      // New: itineraries marked as templates
      prisma.itinerary.findMany({
        where: {
          isTemplate: true,
          ...(req.user.role !== 'ADMIN' ? { branchId: req.user.branchId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        // Only what the template list, pickers and suggestions read — not the
        // bulky quotes/options/flights/terms. Using a template loads the full
        // itinerary by id (GET /itineraries/:id).
        select: {
          id: true,
          title: true,
          templateName: true,
          isTemplate: true,
          destination: true,
          tripType: true,
          daysJson: true,
          startDate: true,
          endDate: true,
          totalTravelers: true,
          adults: true,
          children: true,
          totalCost: true,
          currency: true,
          notes: true,
          leadId: true,
          branchId: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          lead: { select: { id: true, name: true, phone: true } },
          branch: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        templates: templateRecords,
        templateItineraries,
        total: templateRecords.length + templateItineraries.length,
      },
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const { name, destination, daysJson, isGlobal } = req.body;

    if (!name || !destination || !daysJson) {
      return res.status(400).json({
        success: false,
        error: 'Name, destination, and daysJson are required',
      });
    }

    const template = await prisma.itineraryTemplate.create({
      data: {
        name,
        destination,
        daysJson,
        isGlobal: isGlobal === true && req.user.role === 'ADMIN',
        branchId: isGlobal === true && req.user.role === 'ADMIN' ? null : req.user.branchId,
        createdBy: req.user.id,
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'STAFF') {
      return res.status(403).json({
        success: false,
        error: 'Only managers and admins can delete templates',
      });
    }

    const template = await prisma.itineraryTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (
      req.user.role === 'MANAGER' &&
      template.branchId !== req.user.branchId &&
      !template.isGlobal
    ) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    await prisma.itineraryTemplate.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: {
        message: 'Template deleted successfully',
      },
    });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
    });
  }
};

export const saveAsTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found. It may have been deleted or does not exist.',
      });
    }

    if (req.user.role === 'STAFF' && itinerary.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && itinerary.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const templateName = name || `${itinerary.destination} - ${itinerary.title}`;

    // A separate copy, never the itinerary itself — Trips filters out
    // isTemplate rows, so flipping the flag on the original (the old
    // behaviour here) silently pulled a live, paying trip out of Trips.
    // Client-specific fields (lead, pricing, dates, payments) are
    // deliberately left off: a template is meant to be reusable, not tied to
    // the trip it was copied from.
    const template = await prisma.itinerary.create({
      data: {
        branchId: itinerary.branchId,
        title: itinerary.title,
        destination: itinerary.destination,
        daysJson: itinerary.daysJson,
        createdBy: req.user.id,
        tripType: itinerary.tripType,
        totalTravelers: itinerary.totalTravelers,
        adults: itinerary.adults,
        children: itinerary.children,
        childrenAges: itinerary.childrenAges,
        currency: itinerary.currency,
        terms: itinerary.terms,
        included: itinerary.included,
        excluded: itinerary.excluded,
        isTemplate: true,
        templateName,
      },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error('Save as template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save as template',
    });
  }
};

export const toggleTemplateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isTemplate, templateName } = req.body;

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
    });

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found. It may have been deleted or does not exist.',
      });
    }

    // Access check
    if (req.user.role === 'STAFF' && itinerary.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && itinerary.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const updatedItinerary = await prisma.itinerary.update({
      where: { id },
      data: {
        isTemplate: isTemplate !== undefined ? isTemplate : !itinerary.isTemplate,
        ...(templateName !== undefined ? { templateName } : {}),
      },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      data: { itinerary: updatedItinerary },
    });
  } catch (error) {
    console.error('Toggle template status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle template status',
    });
  }
};

export const deleteTemplateItinerary = async (req, res) => {
  try {
    const { id } = req.params;

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
    });

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found. It may have been deleted or does not exist.',
      });
    }

    if (!itinerary.isTemplate) {
      return res.status(400).json({
        success: false,
        error: 'This itinerary is not a template',
      });
    }

    // Access check
    if (req.user.role === 'STAFF' && itinerary.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'MANAGER' && itinerary.branchId !== req.user.branchId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    await prisma.itinerary.update({
      where: { id },
      data: {
        isTemplate: false,
        templateName: null,
      },
    });

    res.json({
      success: true,
      data: { message: 'Template status removed successfully' },
    });
  } catch (error) {
    console.error('Delete template itinerary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove template status',
    });
  }
};

export const deleteItinerary = async (req, res) => {
  try {
    const { id } = req.params;

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
    });

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found. It may have been deleted or does not exist.',
      });
    }

    // ADMIN can delete any itinerary
    if (req.user.role !== 'ADMIN') {
      // STAFF can only delete their own itineraries
      if (req.user.role === 'STAFF' && itinerary.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - you can only delete your own itineraries',
        });
      }
      // MANAGER can delete any itinerary in their branch
      if (req.user.role === 'MANAGER' && itinerary.branchId !== req.user.branchId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    }

    await prisma.itinerary.delete({
      where: { id },
    });

    res.json({
      success: true,
      data: { message: 'Itinerary deleted successfully' },
    });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete itinerary',
    });
  }
};

// DEBUG: Check hotel images in itinerary data
export const debugHotelImages = async (req, res) => {
  try {
    const { id } = req.params;

    const itinerary = await prisma.itinerary.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        daysJson: true,
      },
    });

    if (!itinerary) {
      return res.status(404).json({
        success: false,
        error: 'Itinerary not found. It may have been deleted or does not exist.',
      });
    }

    const days = Array.isArray(itinerary.daysJson)
      ? itinerary.daysJson
      : JSON.parse(itinerary.daysJson || '[]');

    // Extract all hotel images
    const hotelImageData = days.map((day, idx) => ({
      dayNumber: idx + 1,
      hotel: day.hotel,
      hotelId: day.hotelId,
      hotelImage: day.hotelImage,
      hasHotelImage: !!day.hotelImage,
    }));

    res.json({
      success: true,
      data: {
        itineraryId: id,
        totalDays: days.length,
        hotelImageData,
      },
    });
  } catch (error) {
    console.error('Debug hotel images error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hotel images',
    });
  }
};
