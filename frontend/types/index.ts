// User & Branch types
export type { UserRole, User, Branch, WorkingHours } from './user.types';

// Lead types
export type {
  LeadStatus,
  LeadSource,
  LeadQualification,
  ActivityType,
  Lead,
  LeadAssignee,
  LeadFilters,
  LeadActivity,
  Activity,
  LeadTag,
  DuplicateLead,
} from './lead.types';
export {
  leadStatusLabels,
  leadStatusColors,
  leadQualificationLabels,
  leadQualificationColors,
  activityTypeLabels,
} from './lead.types';

// Itinerary types
export type {
  ActivityCategory,
  TripType,
  TripTypeValue,
  DayActivity,
  DayMeals,
  ItineraryDay,
  Itinerary,
  ItineraryTemplate,
  Quote,
  ItineraryOption,
  OptionHotel,
  OptionVehicle,
  OptionActivity,
  HotelAlternative,
  VehicleAlternative,
  FlightDirection,
  FlightSource,
  FlightCabinClass,
  FlightSegment,
} from './itinerary.types';
export { FLIGHT_DIRECTION_LABELS, FLIGHT_CABIN_CLASSES } from './itinerary.types';

// Hotel types (includes MealPlan re-exported for itinerary)
export type { MealPlan } from './hotel.types';
export { MEAL_PLAN_LABELS } from './hotel.types';

// Follow-up types
export type {
  FollowUpStatus,
  FollowUpType,
  FollowUpOutcome,
  FollowUp,
  FollowUpAssignee,
  FollowUpDashboard,
  CalendarEvent,
} from './followup.types';
export { followUpTypeLabels, followUpOutcomeLabels } from './followup.types';

// WhatsApp types
export type {
  MessageDirection,
  MessageType,
  WhatsAppMessage,
  WhatsAppConversation,
  WhatsAppInbox,
  WhatsAppConversationDetail,
} from './whatsapp.types';

// Analytics types
export type {
  PipelineData,
  SourceData,
  ConversionData,
  TeamPerformance,
  AnalyticsData,
} from './analytics.types';

// Common types
export type {
  PaginatedResponse,
  AuditAction,
  AuditEntity,
  AuditLog,
  AssignmentRule,
} from './common.types';

// Hotel types
export type { HotelCategory, Hotel, HotelFilters, RoomType, HotelMealPlan } from './hotel.types';
export { hotelCategoryLabels, hotelCategoryColors } from './hotel.types';

// Vehicle types
export type { VehicleCategory, VehicleType, Vehicle, VehicleFilters } from './vehicle.types';
export {
  vehicleCategoryLabels,
  vehicleCategoryColors,
  vehicleTypeLabels,
  vehicleTypeIcons,
} from './vehicle.types';

// Destination types (a two-level tree: master destinations hold the ones inside them)
export type {
  PlaceType,
  Destination,
  DestinationNode,
  DestinationRef,
  DestinationCounts,
  DestinationFilters,
} from './destination.types';
export {
  placeTypeLabels,
  placeTypeColors,
  destinationLabel,
  rollUpHotels,
  flattenDestinations,
} from './destination.types';

// Dashboard types
export type {
  SalesPeriod,
  SalesStats,
  FollowUpBucket,
  FollowUpSummary,
  TripTimings,
  DueTripScope,
  DueTrip,
  DueTripsResponse,
  DashboardOverview,
  TripLifecycleStatus,
  SearchTripResult,
  SearchLeadResult,
  SearchResults,
} from './dashboard.types';
export type { TripFinanceSummary, TripFollowUp, TripDetail } from './dashboard.types';
