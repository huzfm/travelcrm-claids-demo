'use client';

import {
  Bed,
  Car,
  CloudSun,
  Compass,
  Info,
  MapPin,
  Palmtree,
  Phone,
  Star,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { GenerateReservationEmailButton } from '@/components/itinerary/generate-reservation-email-dialog';
import type { HotelStayGroup, ReservationGuest, ReservationCompany } from '@/app/(protected)/itineraries/new/utils/reservationEmail';
import type { ItineraryDay } from '@/types/itinerary.types';

interface DayDetailViewProps {
  day: ItineraryDay;
  travelers: number;
  currency?: string;
  /** Set only on the first night of a hotel stay — shows the copy button. */
  stay?: HotelStayGroup;
  tripId?: string;
  guest?: ReservationGuest;
  company?: ReservationCompany;
}

/* ─── building blocks ──────────────────────────────────────────────────── */

type Tone = 'primary' | 'gold' | 'info';

const TONES: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-gold/15 text-gold-dark',
  info: 'bg-info/10 text-info',
};

export function Panel({
  icon: Icon,
  title,
  tone = 'primary',
  trailing,
  children,
}: {
  icon: typeof Bed;
  title: string;
  tone?: Tone;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('rounded-lg p-1.5', TONES[tone])}>
            <Icon className="h-4 w-4" />
          </span>
          <h4 className="truncate text-sm font-semibold">{title}</h4>
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** A labelled fact. Renders nothing when there is no value, so rows stay tight. */
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '' || value === 0) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground" title={String(value)}>
        {value}
      </dd>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">{children}</dl>;
}

export function Pill({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'info' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs',
        tone === 'info' ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'
      )}
    >
      {children}
    </span>
  );
}

function NotSet({ what }: { what: string }) {
  return (
    <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
      No {what} on this day.
    </p>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-gold" aria-label={`${count} star`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
    </span>
  );
}

/* ─── the day's stay, transport and place ──────────────────────────────── */

export function DayDetailView({
  day,
  travelers,
  currency = 'INR',
  stay,
  tripId,
  guest,
  company,
}: DayDetailViewProps) {
  const isLeisure = day.dayType === 'leisure';

  const rooms = day.numberOfRooms || 1;
  const extraBeds = day.extraBeds || 0;
  const childrenNoBed = day.childrenNoBed || 0;
  const roomPrice = day.selectedRoomType?.basePrice || 0;
  const extraBedPrice = day.selectedRoomType?.extraBedPrice || day.extraBedCost || 0;
  const childPrice = day.selectedRoomType?.childPrice || day.childWithoutBedCost || 0;
  const mealPlanPrice = day.selectedMealPlan?.pricePerNight || 0;

  // Same arithmetic as the day total: rooms are priced per room per night and
  // only the meal plan is charged per person.
  const hotelCost =
    roomPrice * rooms +
    extraBedPrice * extraBeds +
    childPrice * childrenNoBed +
    mealPlanPrice * rooms * travelers;

  const vehicleRate = day.vehicleRatePerDay || day.selectedVehicle?.ratePerDay || 0;
  const numVehicles = day.numberOfVehicles || 1;
  const vehicleCost = vehicleRate * numVehicles;

  const hasHotel = !!day.hotel;
  const hasVehicle = !!day.vehicleName;
  const hasDestination = !!day.destination || !!day.destinationAddress;

  const roomLabel =
    day.selectedRoomType?.name || day.customRoomCategory || day.roomCategory || undefined;
  const mealLabel = day.selectedMealPlan?.label || day.mealPlan || undefined;
  const vehicleType = day.selectedVehicle?.vehicleType || day.vehicleType;
  const driverName = day.selectedVehicle?.driverName || day.vehicleDriver;
  const driverPhone = day.selectedVehicle?.driverPhone || day.vehicleDriverPhone;

  const quickFacts = [
    day.destinationBestTimeToVisit && `Best time: ${day.destinationBestTimeToVisit}`,
    day.destinationAverageTemperature,
    day.destinationLanguage,
    day.destinationCurrency,
    day.destinationTimezone,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-3 py-4">
      {/* Leisure guidance replaces the destination panel on a rest day */}
      {isLeisure && (
        <Panel icon={Palmtree} title="Leisure day" tone="gold">
          {day.leisureGuidelines ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {day.leisureGuidelines}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              A free day — guests relax at the hotel or explore at their own pace.
            </p>
          )}
        </Panel>
      )}

      {/* ── Destination ── */}
      {!isLeisure && (
        <Panel
          icon={Compass}
          title="Destination"
          tone="info"
          trailing={
            day.destination ? (
              <span className="text-sm font-semibold text-foreground">{day.destination}</span>
            ) : undefined
          }
        >
          {hasDestination ? (
            <div className="space-y-3">
              {day.destinationAddress && (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {day.destinationAddress}
                </p>
              )}

              {(day.destinationShortDescription || day.destinationDescription) && (
                <p className="text-sm leading-relaxed text-foreground/80">
                  {day.destinationShortDescription || day.destinationDescription}
                </p>
              )}

              {quickFacts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {quickFacts.map(fact => (
                    <Pill key={fact} tone="info">
                      {fact}
                    </Pill>
                  ))}
                </div>
              )}

              {!!day.destinationHighlights?.length && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Highlights
                  </p>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {day.destinationHighlights.slice(0, 6).map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-sm">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
                        <span className="text-foreground/80">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!day.destinationAmenities?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {day.destinationAmenities.map((amenity, idx) => (
                    <Pill key={idx}>{amenity}</Pill>
                  ))}
                </div>
              )}

              {day.destinationThingsToKnow && (
                <p className="flex items-start gap-1.5 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {day.destinationThingsToKnow}
                </p>
              )}
            </div>
          ) : (
            <NotSet what="destination" />
          )}
        </Panel>
      )}

      {/* ── Stay ── */}
      <Panel
        icon={Bed}
        title="Stay"
        trailing={
          hotelCost > 0 ? (
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(hotelCost, currency)}
            </span>
          ) : undefined
        }
      >
        {hasHotel ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {day.hotelImage && (
                <img
                  src={day.hotelImage}
                  alt={day.hotel}
                  loading="lazy"
                  className="h-20 w-28 shrink-0 rounded-lg border object-cover"
                  onError={event => {
                    (event.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold">{day.hotel}</span>
                  {!!day.hotelStars && <Stars count={day.hotelStars} />}
                </div>
                {day.hotelAddress && (
                  <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    {day.hotelAddress}
                  </p>
                )}
                {day.hotelContact && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    {day.hotelContact}
                  </p>
                )}
              </div>
            </div>

            <FieldGrid>
              <Field label="Room" value={roomLabel} />
              <Field label="Bed type" value={day.selectedRoomType?.bedType} />
              <Field label="Meal plan" value={mealLabel} />
              <Field label="Rooms" value={rooms} />
              <Field label="Extra beds" value={extraBeds} />
              <Field label="Children (no bed)" value={childrenNoBed} />
              <Field
                label="Per room / night"
                value={roomPrice > 0 ? formatCurrency(roomPrice, currency) : undefined}
              />
              <Field
                label="Meal plan / person"
                value={mealPlanPrice > 0 ? formatCurrency(mealPlanPrice, currency) : undefined}
              />
            </FieldGrid>

            {stay && (
              <GenerateReservationEmailButton
                stay={stay}
                tripId={tripId}
                currency={currency}
                guest={guest || {}}
                company={company || {}}
              />
            )}

            {!!day.similarHotels?.length && (
              <div className="border-t pt-3">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Backup hotels
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {day.similarHotels.map(backup => (
                    <Pill key={backup.hotelId}>{backup.hotelName}</Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <NotSet what="hotel" />
        )}
      </Panel>

      {/* ── Transport ── */}
      <Panel
        icon={Car}
        title="Transport"
        trailing={
          vehicleCost > 0 ? (
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(vehicleCost, currency)}
            </span>
          ) : undefined
        }
      >
        {hasVehicle ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">{day.vehicleName}</span>
              {vehicleType && <Pill>{vehicleType.replace(/_/g, ' ')}</Pill>}
              {!!day.selectedVehicle?.seatingCapacity && (
                <Pill>
                  <Users className="h-3 w-3" />
                  {day.selectedVehicle.seatingCapacity} seater
                </Pill>
              )}
            </div>

            <FieldGrid>
              <Field label="Vehicles" value={numVehicles} />
              <Field
                label="Rate / vehicle / day"
                value={vehicleRate > 0 ? formatCurrency(vehicleRate, currency) : undefined}
              />
              <Field label="Registration" value={day.vehicleRegistration} />
              <Field label="Driver" value={driverName} />
              <Field label="Driver phone" value={driverPhone} />
              <Field label="Pickup" value={day.pickupPoint} />
              <Field label="Drop" value={day.dropPoint} />
            </FieldGrid>

            {!!day.vehicleFeatures?.length && (
              <div className="flex flex-wrap gap-1.5">
                {day.vehicleFeatures.map((feature, idx) => (
                  <Pill key={idx}>{feature}</Pill>
                ))}
              </div>
            )}
          </div>
        ) : isLeisure ? (
          <p className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            <Car className="h-4 w-4 shrink-0" />
            No vehicle needed — guests relax or explore independently.
          </p>
        ) : (
          <NotSet what="transport" />
        )}
      </Panel>

      {/* Anything time-bound the day carries but the panels above don't cover */}
      {(day.weather || day.transport) && (
        <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-muted-foreground">
          {day.weather && (
            <span className="inline-flex items-center gap-1.5">
              <CloudSun className="h-3.5 w-3.5" />
              {day.weather}
            </span>
          )}
          {day.transport && !hasVehicle && (
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5" />
              {day.transport}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
