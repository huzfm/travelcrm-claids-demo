'use client';

import { useState } from 'react';
import { Bed, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { HotelAutocomplete } from '@/components/hotels/hotel-autocomplete';
import { useHotels } from '@/hooks/useHotels';
import { useIsMainBranch } from '@/hooks/useAuth';
import type { Hotel, ItineraryDay } from '@/types';
import type { HotelAlternative } from '@/types/itinerary.types';

interface DaySectionHotelProps {
  day: ItineraryDay;
  destination: string;
  onUpdate: (updates: Partial<ItineraryDay>) => void;
  readOnly?: boolean;
}

export function DaySectionHotel({
  day,
  destination,
  onUpdate,
  readOnly = false,
}: DaySectionHotelProps) {
  const [isOpen, setIsOpen] = useState(false); // collapsed by default
  const isMainBranch = useIsMainBranch();

  // ── Price helpers ───────────────────────────────────────────
  const rooms = day.numberOfRooms || 1;
  const extraBeds = day.extraBeds || 0;
  const childrenNoBed = day.childrenNoBed || 0;
  const roomPrice = day.selectedRoomType?.basePrice || 0;
  const extraBedPrice = day.selectedRoomType?.extraBedPrice || day.extraBedCost || 0;
  const childPrice = day.selectedRoomType?.childPrice || day.childWithoutBedCost || 0;
  const mealPlanPrice = day.selectedMealPlan?.pricePerNight || 0;

  // Hotel cost per night
  const hotelNightCost =
    roomPrice * rooms +
    extraBedPrice * extraBeds +
    childPrice * childrenNoBed +
    mealPlanPrice * rooms;
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  // All room types from the selected hotel
  const hotelRoomTypes = day.selectedHotelData?.roomTypes || [];
  const hotelMealPlans = day.selectedHotelData?.mealPlans || [];

  const hasHotel = !!day.hotelId || !!day.hotel;

  const handleRoomTypeSelect = (rt: NonNullable<ItineraryDay['selectedRoomType']>) => {
    onUpdate({
      selectedRoomType: rt,
      extraBedCost: rt.extraBedPrice,
      childWithoutBedCost: rt.childPrice,
    });
  };

  const handleMealSelect = (mp: { type: string; label: string; pricePerNight: number }) => {
    onUpdate({
      selectedMealPlan: {
        type: mp.type as any,
        label: mp.label,
        pricePerNight: mp.pricePerNight,
      },
    });
  };

  const handleHotelSelect = (name: string, hotel?: Hotel) => {
    if (!hotel) {
      onUpdate({
        hotel: name,
        hotelId: undefined,
        selectedHotelData: undefined,
        selectedRoomType: undefined,
        selectedMealPlan: undefined,
        numberOfRooms: 1,
        extraBeds: 0,
        childrenNoBed: 0,
        similarHotels: undefined,
      });
      return;
    }
    const firstRoom = hotel.roomTypes?.[0];
    const firstMeal = hotel.mealPlans?.[0];
    onUpdate({
      hotel: hotel.name,
      hotelId: hotel.id,
      hotelAddress: hotel.address || hotel.location,
      hotelContact: hotel.phone || undefined,
      hotelImage: hotel.images?.[0] || undefined,
      hotelStars: hotel.stars || undefined,
      selectedHotelData: {
        id: hotel.id,
        name: hotel.name,
        roomTypes: hotel.roomTypes || [],
        mealPlans: hotel.mealPlans || [],
      },
      selectedRoomType: firstRoom
        ? {
            name: firstRoom.name,
            bedType: firstRoom.bedType || '',
            basePrice: firstRoom.basePrice || hotel.pricePerNight || 0,
            extraBedPrice: firstRoom.extraBedPrice,
            childPrice: firstRoom.childPrice,
          }
        : undefined,
      selectedMealPlan: firstMeal
        ? {
            type: firstMeal.type as any,
            label: firstMeal.label || firstMeal.type,
            pricePerNight: firstMeal.pricePerNight || 0,
          }
        : undefined,
      numberOfRooms: 1,
      extraBeds: 0,
      childrenNoBed: 0,
      similarHotels: undefined,
    });
  };

  const handleClear = () => {
    onUpdate({
      hotel: undefined,
      hotelId: undefined,
      hotelAddress: undefined,
      hotelContact: undefined,
      hotelImage: undefined,
      hotelStars: undefined,
      selectedHotelData: undefined,
      selectedRoomType: undefined,
      selectedMealPlan: undefined,
      numberOfRooms: undefined,
      extraBeds: undefined,
      childrenNoBed: undefined,
      similarHotels: undefined,
    });
  };

  const handleAddSimilar = (hotel: Hotel) => {
    const existing = day.similarHotels || [];
    if (existing.length >= 2 || existing.some(sh => sh.hotelId === hotel.id)) return;
    const newSimilar: HotelAlternative = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelAddress: hotel.address || hotel.location,
      hotelImage: hotel.images?.[0],
      hotelStars: hotel.stars,
      isSimilar: true,
    };
    onUpdate({ similarHotels: [...existing, newSimilar] });
    setShowSimilar(false);
    setSimilarSearch('');
  };

  const handleRemoveSimilar = (hotelId: string) => {
    const existing = day.similarHotels || [];
    onUpdate({ similarHotels: existing.filter(sh => sh.hotelId !== hotelId) });
  };

  // Similar hotel search. The list is only rendered inside the backup-hotel
  // picker, so it is only fetched once that picker is open — otherwise every
  // expanded day on the read-only detail page fires a hotels request whose
  // result it can never show.
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarSearch, setSimilarSearch] = useState('');
  const { data: similarHotelsData, isLoading: loadingSimilar } = useHotels(
    { search: similarSearch || undefined, limit: 15 },
    { enabled: showSimilar && !readOnly }
  );

  // Leisure days have no hotel. This sits below the hooks above on purpose:
  // returning earlier would change the hook count when a day is switched
  // between leisure and activity, which crashes the render.
  if (day.dayType === 'leisure') {
    return null;
  }

  return (
    <div className="border-b py-3">
      {/* Header - always visible, click to expand */}
      <button
        onClick={() => !readOnly && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-left -mx-2 px-2 py-1 rounded transition-colors ${
          !readOnly ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-2">
          <Bed className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Hotel</span>
          {hasHotel && (
            <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">
              ✓ {day.hotel}
              {day.hotelStars ? ` ${'★'.repeat(day.hotelStars)}` : ''}
              {day.selectedRoomType ? ` · ${day.selectedRoomType.name}` : ''}
            </span>
          )}
          {!hasHotel && <span className="text-xs text-muted-foreground">Not set</span>}
        </div>
        {!readOnly &&
          (isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </button>

      {isOpen && (
        <div className="mt-3 pl-6 space-y-4">
          {/* Hotel search — hidden in read-only */}
          {!readOnly && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Search Hotel</label>
              <HotelAutocomplete
                value={day.hotel || ''}
                onChange={handleHotelSelect}
                destination={destination}
                showCreateButton={true}
              />
            </div>
          )}

          {hasHotel && (
            <>
              {/* Clear — hidden in read-only */}
              {!readOnly && (
                <button
                  onClick={handleClear}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Remove hotel
                </button>
              )}

              {/* Room Type with individual price inputs */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Room Type
                  {isMainBranch && day.selectedRoomType?.basePrice
                    ? ` — ${fmt(day.selectedRoomType.basePrice)}/night`
                    : ''}
                </label>
                {hotelRoomTypes.length > 0 ? (
                  <div className="space-y-2">
                    {hotelRoomTypes.map((rt, idx) => {
                      const isSelected = day.selectedRoomType?.name === rt.name;
                      const hasPrice = rt.basePrice > 0;
                      const showPriceInput = !isMainBranch && !hasPrice;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'p-2.5 rounded-lg border transition-all',
                            isSelected ? 'bg-primary/10 border-primary' : 'bg-white border-muted'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <button
                                type="button"
                                onClick={() => !readOnly && handleRoomTypeSelect(rt)}
                                className="text-left"
                              >
                                <div className="text-sm font-medium">{rt.name}</div>
                                <div className="text-xs text-muted-foreground">{rt.bedType}</div>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => !readOnly && handleRoomTypeSelect(rt)}
                              disabled={readOnly}
                              className="text-xs px-3 py-1 rounded border"
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground">Room/night (₹)</label>
                              {showPriceInput ? (
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={isSelected ? day.selectedRoomType?.basePrice || '' : ''}
                                  onChange={e =>
                                    !readOnly &&
                                    isSelected &&
                                    onUpdate({
                                      selectedRoomType: {
                                        ...day.selectedRoomType!,
                                        name: rt.name,
                                        bedType: rt.bedType,
                                        basePrice: parseInt(e.target.value) || 0,
                                        extraBedPrice: day.selectedRoomType?.extraBedPrice || 0,
                                        childPrice: day.selectedRoomType?.childPrice || 0,
                                      },
                                    })
                                  }
                                  className="w-full h-7 px-2 text-xs border rounded"
                                />
                              ) : hasPrice ? (
                                <div className="text-xs font-medium">₹{fmt(rt.basePrice)}</div>
                              ) : (
                                <div className="text-xs text-muted-foreground">-</div>
                              )}
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Extra Bed (₹)</label>
                              {showPriceInput ? (
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={isSelected ? day.selectedRoomType?.extraBedPrice || '' : ''}
                                  onChange={e =>
                                    !readOnly &&
                                    isSelected &&
                                    onUpdate({
                                      selectedRoomType: {
                                        ...day.selectedRoomType!,
                                        name: rt.name,
                                        bedType: rt.bedType,
                                        basePrice: day.selectedRoomType?.basePrice || 0,
                                        extraBedPrice: parseInt(e.target.value) || 0,
                                        childPrice: day.selectedRoomType?.childPrice || 0,
                                      },
                                    })
                                  }
                                  className="w-full h-7 px-2 text-xs border rounded"
                                />
                              ) : rt.extraBedPrice > 0 ? (
                                <div className="text-xs text-muted-foreground">₹{rt.extraBedPrice}</div>
                              ) : (
                                <div className="text-xs text-muted-foreground">-</div>
                              )}
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Child w/o Bed (₹)</label>
                              {showPriceInput ? (
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={isSelected ? day.selectedRoomType?.childPrice || '' : ''}
                                  onChange={e =>
                                    !readOnly &&
                                    isSelected &&
                                    onUpdate({
                                      selectedRoomType: {
                                        ...day.selectedRoomType!,
                                        name: rt.name,
                                        bedType: rt.bedType,
                                        basePrice: day.selectedRoomType?.basePrice || 0,
                                        extraBedPrice: day.selectedRoomType?.extraBedPrice || 0,
                                        childPrice: parseInt(e.target.value) || 0,
                                      },
                                    })
                                  }
                                  className="w-full h-7 px-2 text-xs border rounded"
                                />
                              ) : rt.childPrice > 0 ? (
                                <div className="text-xs text-muted-foreground">₹{rt.childPrice}</div>
                              ) : (
                                <div className="text-xs text-muted-foreground">-</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Room type name"
                    value={day.selectedRoomType?.name || ''}
                    readOnly={readOnly}
                    onChange={e =>
                      !readOnly &&
                      onUpdate({
                        selectedRoomType: {
                          ...day.selectedRoomType!,
                          name: e.target.value,
                          basePrice: day.selectedRoomType?.basePrice || 0,
                          bedType: day.selectedRoomType?.bedType || '',
                        },
                      })
                    }
                    className="w-full h-10 px-3 border rounded-lg text-sm disabled:bg-muted/30 disabled:cursor-not-allowed"
                  />
                )}
              </div>

              {/* Meal Plan - only show if hotel has meal plans */}
              {hotelMealPlans.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Meal Plan</label>
                  <div className="flex flex-wrap gap-2">
                    {hotelMealPlans.map((mp, idx) => {
                      const type =
                        (mp as { type?: string }).type ||
                        (mp as { value?: string }).value ||
                        String(idx);
                      const price = (mp as { pricePerNight?: number }).pricePerNight || 0;
                      const label = mp.label;
                      const isSelected = day.selectedMealPlan?.type === type;
                      return (
                        <button
                          key={type}
                          onClick={() =>
                            !readOnly && handleMealSelect({ type, label, pricePerNight: price })
                          }
                          className={`px-4 py-2 rounded-full border text-sm transition-all ${
                            isSelected
                              ? 'bg-primary text-white border-primary font-medium'
                              : readOnly
                                ? 'border-border text-muted-foreground cursor-default'
                                : 'border-border hover:border-primary/50 text-muted-foreground cursor-pointer'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rooms + Extra Beds + Children in one row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rooms</label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      disabled={readOnly}
                      onClick={() =>
                        !readOnly && onUpdate({ numberOfRooms: Math.max(1, rooms - 1) })
                      }
                    >
                      -
                    </Button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rooms}
                      readOnly={readOnly}
                      onChange={e =>
                        !readOnly &&
                        onUpdate({ numberOfRooms: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="h-9 w-full text-sm border rounded-lg px-2 text-center focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted/30 disabled:cursor-not-allowed"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      disabled={readOnly}
                      onClick={() => !readOnly && onUpdate({ numberOfRooms: rooms + 1 })}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Extra Beds</label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      disabled={readOnly}
                      onClick={() =>
                        !readOnly && onUpdate({ extraBeds: Math.max(0, (day.extraBeds || 0) - 1) })
                      }
                    >
                      -
                    </Button>
                    <input
                      type="number"
                      min={0}
                      max={rooms}
                      value={day.extraBeds || 0}
                      readOnly={readOnly}
                      onChange={e =>
                        !readOnly &&
                        onUpdate({ extraBeds: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="h-9 w-full text-sm border rounded-lg px-2 text-center focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted/30 disabled:cursor-not-allowed"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      disabled={readOnly}
                      onClick={() =>
                        !readOnly &&
                        onUpdate({ extraBeds: Math.min(rooms, (day.extraBeds || 0) + 1) })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Children (no bed)
                  </label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      disabled={readOnly}
                      onClick={() =>
                        !readOnly &&
                        onUpdate({ childrenNoBed: Math.max(0, (day.childrenNoBed || 0) - 1) })
                      }
                    >
                      -
                    </Button>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={day.childrenNoBed || 0}
                      readOnly={readOnly}
                      onChange={e =>
                        !readOnly &&
                        onUpdate({ childrenNoBed: Math.max(0, parseInt(e.target.value) || 0) })
                      }
                      className="h-9 w-full text-sm border rounded-lg px-2 text-center focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-muted/30 disabled:cursor-not-allowed"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      disabled={readOnly}
                      onClick={() =>
                        !readOnly &&
                        onUpdate({ childrenNoBed: Math.min(10, (day.childrenNoBed || 0) + 1) })
                      }
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {/* Price breakdown with all components — main branch only */}
              {isMainBranch && hotelNightCost > 0 && (
                <div className="space-y-2 bg-muted/50 rounded-lg px-4 py-3 text-sm">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-muted-foreground">Hotel cost / night</span>
                    <span className="font-semibold text-primary">{fmt(hotelNightCost)}</span>
                  </div>
                  {/* Price breakdown */}
                  <div className="text-xs text-muted-foreground space-y-1 pl-2 border-l-2 border-muted-foreground/30">
                    {(roomPrice > 0 || rooms > 1) && (
                      <div className="flex justify-between">
                        <span>
                          Room ({rooms}x ₹{roomPrice.toLocaleString('en-IN')})
                        </span>
                        <span>₹{(roomPrice * rooms).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {mealPlanPrice > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Meal plan ({rooms}x ₹{mealPlanPrice.toLocaleString('en-IN')})
                        </span>
                        <span>₹{(mealPlanPrice * rooms).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {extraBeds > 0 && extraBedPrice > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Extra beds ({extraBeds}x ₹{extraBedPrice.toLocaleString('en-IN')})
                        </span>
                        <span>₹{(extraBedPrice * extraBeds).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {childrenNoBed > 0 && childPrice > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Children no bed ({childrenNoBed}x ₹{childPrice.toLocaleString('en-IN')})
                        </span>
                        <span>₹{(childPrice * childrenNoBed).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Backup Hotels — show in read-only but read-only display */}
              {(day.similarHotels?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-muted-foreground">Backup:</span>
                  {day.similarHotels!.map(sh => (
                    <div
                      key={sh.hotelId}
                      className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1"
                    >
                      <span className="text-xs">{sh.hotelName}</span>
                      {!readOnly && (
                        <button
                          onClick={() => handleRemoveSimilar(sh.hotelId)}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add backup hotel — hidden in read-only */}
              {!readOnly && (day.similarHotels?.length || 0) < 2 && isMainBranch && (
                <button
                  onClick={() => setShowSimilar(p => !p)}
                  className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-3 py-1 hover:bg-muted transition-colors"
                >
                  + Add backup hotel
                </button>
              )}

              {/* Backup hotel picker — hidden in read-only */}
              {!readOnly && showSimilar && (
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Backup Hotels</span>
                    <button
                      onClick={() => {
                        setShowSimilar(false);
                        setSimilarSearch('');
                      }}
                      className="text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search hotel name..."
                    value={similarSearch}
                    onChange={e => setSimilarSearch(e.target.value)}
                    className="w-full text-xs border rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {loadingSimilar ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground py-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {similarHotelsData?.hotels
                        ?.filter(
                          h =>
                            h.id !== day.hotelId &&
                            !day.similarHotels?.some(sh => sh.hotelId === h.id)
                        )
                        .slice(0, 10)
                        .map(h => (
                          <button
                            key={h.id}
                            onClick={() => handleAddSimilar(h)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border rounded-full text-xs hover:border-primary/50 transition-colors cursor-pointer"
                          >
                            <span>{h.name}</span>
                          </button>
                        ))}
                      {(!similarHotelsData?.hotels || similarHotelsData.hotels.length === 0) && (
                        <span className="text-xs text-muted-foreground">No hotels found</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
