'use client';

import { useState } from 'react';
import { Check, BedDouble, Plus, Edit2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HotelAutocomplete } from '@/components/hotels/hotel-autocomplete';
import { HotelCreateModal } from '@/components/hotels/hotel-create-modal';
import { HotelManualEntryModal } from '@/components/hotels/hotel-manual-entry-modal';
import type { DayBuilderData, HotelAlt } from '../types';
import type { Hotel } from '@/types';
import { useIsMainBranch } from '@/hooks/useAuth';

interface DayHotelSectionProps {
  day: DayBuilderData;
  onChange: (patch: Partial<DayBuilderData>) => void;
  /** Master destination the trip is scoped to; limits the hotel picker. */
  destinationId?: string;
  destinationLabel?: string;
  availableHotels?: Array<{
    id: string;
    name?: string;
    roomTypes?: Array<{
      name: string;
      bedType: string;
      basePrice: number;
      extraBedPrice?: number;
      childPrice?: number;
    }>;
    mealPlans?: Array<{ type: string; label: string; pricePerNight: number }>;
    pricePerNight?: number | null;
  }>;
  hideMealPlan?: boolean;
}

// Standard meal plan options with fallback prices
const MEAL_PLAN_OPTIONS = [
  { type: 'EP', label: 'EP - Room Only', defaultPrice: 0 },
  { type: 'CP', label: 'CP - Breakfast', defaultPrice: 300 },
  { type: 'MAP', label: 'MAP - Breakfast & Dinner', defaultPrice: 600 },
  { type: 'APAI', label: 'APAI - All Meals', defaultPrice: 900 },
];

function getMealPlanLabel(type: string): string {
  const plan = MEAL_PLAN_OPTIONS.find(p => p.type === type);
  return plan?.label || type;
}

export function DayHotelSection({
  day,
  onChange,
  availableHotels,
  hideMealPlan,
  destinationId,
  destinationLabel,
}: DayHotelSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingManualHotel, setEditingManualHotel] = useState<Partial<Hotel> | undefined>(
    undefined
  );
  const isMainBranch = useIsMainBranch();
  // Use available hotels or check for manual room types
  const selectedHotel = availableHotels?.find(h => h.id === day.hotelId);
  const hasManualRoomTypes = day._manualRoomTypes && day._manualRoomTypes.length > 0;
  const hasManualMealPlans = day._manualMealPlans && day._manualMealPlans.length > 0;

  const handleHotelSelect = (name: string, hotel: Hotel | undefined) => {
    if (hotel) {
      // Get the first room type's price (or hotel's pricePerNight as fallback)
      const firstRoom = hotel.roomTypes?.[0];
      const basePrice = firstRoom?.basePrice || hotel.pricePerNight || 0;
      const extraBedPrice = firstRoom?.extraBedPrice || 0;
      const childPrice = firstRoom?.childPrice || 0;

      // Only set meal plan if hotel actually has meal plans defined
      const hotelHasMealPlans = hotel.mealPlans && hotel.mealPlans.length > 0;
      const defaultMealPlan = hotelHasMealPlans
        ? hotel.mealPlans.find(p => p.type === 'MAP') || hotel.mealPlans[0]
        : null;
      const mealPlanPrice = defaultMealPlan?.pricePerNight || 0;
      const mealPlanLabel = defaultMealPlan?.label || '';

      onChange({
        hotelId: hotel.id,
        hotelName: hotel.name || name,
        roomType: firstRoom?.name || '',
        bedType: firstRoom?.bedType || '',
        basePrice,
        roomTypePrice: 0,
        extraBedPrice,
        childPrice,
        hotelImage: hotel.images?.[0] || null,
        hotelStars: hotel.stars,
        hotelAddress: hotel.address || hotel.location || '',
        hotelContact: hotel.phone || '',
        ...(hotelHasMealPlans && defaultMealPlan
          ? {
              mealPlan: defaultMealPlan.type,
              mealPlanLabel,
              mealPlanPrice,
            }
          : {
              mealPlan: '',
              mealPlanLabel: '',
              mealPlanPrice: 0,
            }),
        roomCount: 1,
        extraBedCount: 0,
        childCount: 0,
        _isManualHotelEntry: false,
      });
    }
    // For non-main branch: just store the name, user must use manual entry form
    // Don't auto-fill anything - let them use the manual entry button
  };

  const handleManualEntry = () => {
    // If there's already a manual hotel, edit it
    if (day.hotelId?.startsWith('manual-')) {
      // Build initial room types from current day pricing
      const initialRoomTypes = [
        {
          name: day.roomType || 'Standard Room',
          bedType: day.bedType || 'DOUBLE',
          basePrice: day.basePrice || 0,
          extraBedPrice: day.extraBedPrice || 0,
          childPrice: day.childPrice || 0,
        },
      ];

      // Build initial meal plans from current day pricing
      const initialMealPlans = day.mealPlan
        ? [
            {
              type: day.mealPlan as 'EP' | 'CP' | 'MAP' | 'APAI',
              label: day.mealPlanLabel || getMealPlanLabel(day.mealPlan),
              pricePerNight: day.mealPlanPrice || 0,
            },
          ]
        : [];

      setEditingManualHotel({
        id: day.hotelId,
        name: day.hotelName,
        location: day.location || '',
        description: day._manualHotelDescription,
        roomTypes: initialRoomTypes,
        mealPlans: initialMealPlans,
      });
    } else {
      setEditingManualHotel(undefined);
    }
    setShowManualModal(true);
  };

  const handleManualSave = (hotelData: Partial<Hotel>) => {
    // Extract room types and meal plans from the hotel object
    const hotelRoomTypes = Array.isArray(hotelData.roomTypes) ? hotelData.roomTypes : [];
    const hotelMealPlans = Array.isArray(hotelData.mealPlans) ? hotelData.mealPlans : [];

    // Get the first room type for basic pricing
    const firstRoom = hotelRoomTypes[0];
    const selectedMealPlan = hotelMealPlans.find(p => p.type === day.mealPlan) || hotelMealPlans[0];

    onChange({
      hotelId: hotelData.id || `manual-${Date.now()}`,
      hotelName: hotelData.name || '',
      hotelAddress: hotelData.address || '',
      hotelStars: hotelData.stars,
      hotelContact: hotelData.phone || undefined,
      hotelImage: hotelData.images?.[0] || null,
      roomType: firstRoom?.name || '',
      bedType: firstRoom?.bedType || '',
      basePrice: firstRoom?.basePrice || 0,
      roomTypePrice: 0,
      extraBedPrice: firstRoom?.extraBedPrice || 0,
      childPrice: firstRoom?.childPrice || 0,
      // Store room types and meal plans for use in day builder
      _manualRoomTypes: hotelRoomTypes,
      _manualMealPlans: hotelMealPlans,
      ...(selectedMealPlan
        ? {
            mealPlan: selectedMealPlan.type,
            mealPlanLabel: selectedMealPlan.label,
            mealPlanPrice: selectedMealPlan.pricePerNight,
          }
        : {
            mealPlan: '',
            mealPlanLabel: '',
            mealPlanPrice: 0,
          }),
      roomCount: day.roomCount || 1,
      extraBedCount: day.extraBedCount || 0,
      childCount: day.childCount || 0,
      // Store manual hotel data for reference
      _manualHotelDescription: hotelData.description ?? undefined,
      _isManualHotelEntry: true,
    });
  };

  const clearHotel = () => {
    onChange({
      hotelId: '',
      hotelName: '',
      roomType: '',
      bedType: '',
      basePrice: 0,
      extraBedPrice: 0,
      childPrice: 0,
      mealPlan: '',
      mealPlanLabel: '',
      mealPlanPrice: 0,
      roomCount: 1,
      extraBedCount: 0,
      childCount: 0,
      _isManualHotelEntry: false,
    });
  };

  const handleRoomTypeSelect = (room: {
    name: string;
    bedType: string;
    basePrice: number;
    extraBedPrice?: number;
    childPrice?: number;
  }) => {
    onChange({
      roomType: room.name,
      bedType: room.bedType,
      basePrice: room.basePrice,
      roomTypePrice: 0,
      extraBedPrice: room.extraBedPrice || 0,
      childPrice: room.childPrice || 0,
    });
  };

  const incrementExtraBed = () => {
    onChange({ extraBedCount: day.extraBedCount + 1 });
  };

  const decrementExtraBed = () => {
    onChange({ extraBedCount: Math.max(0, day.extraBedCount - 1) });
  };

  const incrementChild = () => {
    onChange({ childCount: day.childCount + 1 });
  };

  const decrementChild = () => {
    onChange({ childCount: Math.max(0, day.childCount - 1) });
  };

  const handleHotelCreated = (hotel: Hotel) => {
    // Auto-select the newly created hotel
    const hotelHasMealPlans = hotel.mealPlans && hotel.mealPlans.length > 0;
    const firstMealPlan = hotelHasMealPlans ? hotel.mealPlans[0] : null;

    onChange({
      hotelId: hotel.id,
      hotelName: hotel.name || '',
      roomType: '',
      bedType: '',
      basePrice: hotel.roomTypes?.[0]?.basePrice || hotel.pricePerNight || 0,
      extraBedPrice: hotel.roomTypes?.[0]?.extraBedPrice || 0,
      childPrice: hotel.roomTypes?.[0]?.childPrice || 0,
      ...(hotelHasMealPlans && firstMealPlan
        ? {
            mealPlan: firstMealPlan.type,
            mealPlanLabel: firstMealPlan.label,
            mealPlanPrice: firstMealPlan.pricePerNight,
          }
        : {
            mealPlan: '',
            mealPlanLabel: '',
            mealPlanPrice: 0,
          }),
      roomCount: 1,
      extraBedCount: 0,
      childCount: 0,
    });
  };

  // Calculate total per night
  const roomCost = day.basePrice * day.roomCount;
  const mealCost = day.mealPlanPrice * day.roomCount;
  const extraBedCost = day.extraBedCount * day.extraBedPrice;
  const childCost = day.childCount * day.childPrice;
  const totalPerNight = roomCost + mealCost + extraBedCost + childCost;

  const hasRoomTypes = selectedHotel?.roomTypes && selectedHotel.roomTypes.length > 0;
  const hasMealPlans = selectedHotel?.mealPlans && selectedHotel.mealPlans.length > 0;

  // Combine hotel room types and manual room types for display
  const displayRoomTypes = hasManualRoomTypes
    ? day._manualRoomTypes
    : selectedHotel?.roomTypes || [];

  // Combine hotel meal plans and manual meal plans for display
  const displayMealPlans = hasManualMealPlans
    ? day._manualMealPlans
    : selectedHotel?.mealPlans || [];

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BedDouble
              className={cn('h-4 w-4', day.hotelId ? 'text-primary' : 'text-muted-foreground')}
            />
            <span className="text-sm font-medium">Hotel</span>
          </div>
          {day.hotelId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearHotel}
              className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Remove
            </Button>
          )}
        </div>

        <HotelAutocomplete
          value={day.hotelName}
          onChange={handleHotelSelect}
          destination=""
          destinationId={destinationId}
          destinationLabel={destinationLabel}
          onCreateHotel={isMainBranch ? () => setShowCreateModal(true) : undefined}
          showCreateButton={isMainBranch}
        />

        {/* Manual Entry for Non-Main Branch */}
        {!isMainBranch && (
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant={day.hotelId?.startsWith('manual-') ? 'default' : 'outline'}
              size="sm"
              onClick={handleManualEntry}
              className="flex-1 gap-1"
            >
              {day.hotelId?.startsWith('manual-') ? (
                <>
                  <Edit2 className="h-3 w-3" />
                  Edit Hotel Details
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  Add Hotel Details
                </>
              )}
            </Button>
          </div>
        )}

        {day.hotelId && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-3">
            {/* Selected hotel info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-neutral-600" />
                <span className="text-sm font-medium">{day.hotelName}</span>
              </div>
              {totalPerNight > 0 && (
                <Badge variant="outline" className="bg-neutral-50">
                  ₹{totalPerNight.toLocaleString()}/night
                </Badge>
              )}
            </div>

            {/* Similar Hotels Badge + Add Button */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Similar Options</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newAlt: HotelAlt = {
                    hotelId: '',
                    hotelName: '',
                    roomType: '',
                    bedType: '',
                    basePrice: 0,
                    mealPlan: '',
                    mealPlanLabel: '',
                    mealPlanPrice: 0,
                  };
                  onChange({ hotelAlts: [...(day.hotelAlts || []), newAlt] });
                }}
                className="h-6 px-2 text-xs gap-1"
              >
                <Plus className="h-3 w-3" /> Add Similar
              </Button>
            </div>

            {/* Similar Hotels List */}
            {(day.hotelAlts || []).length > 0 && (
              <div className="space-y-2 bg-white rounded-lg p-2">
                {(day.hotelAlts || []).map((alt, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <Input
                        placeholder="Hotel name"
                        value={alt.hotelName}
                        onChange={e => {
                          const updated = [...(day.hotelAlts || [])];
                          updated[idx] = { ...alt, hotelName: e.target.value };
                          onChange({ hotelAlts: updated });
                        }}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={alt.mealPlan}
                        onChange={e => {
                          const updated = [...(day.hotelAlts || [])];
                          updated[idx] = {
                            ...alt,
                            mealPlan: e.target.value,
                            mealPlanLabel:
                              e.target.value === 'EP'
                                ? 'Room Only'
                                : e.target.value === 'CP'
                                  ? 'Breakfast'
                                  : e.target.value === 'MAP'
                                    ? 'Breakfast & Dinner'
                                    : e.target.value === 'APAI'
                                      ? 'All Meals'
                                      : '',
                          };
                          onChange({ hotelAlts: updated });
                        }}
                        className="h-7 text-xs border rounded px-1"
                      >
                        <option value="">None</option>
                        <option value="EP">EP</option>
                        <option value="CP">CP</option>
                        <option value="MAP">MAP</option>
                        <option value="APAI">APAI</option>
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const updated = (day.hotelAlts || []).filter((_, i) => i !== idx);
                          onChange({ hotelAlts: updated });
                        }}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Room Type Selection with individual price inputs */}
            {(hasRoomTypes || hasManualRoomTypes) && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Room Type</Label>
                <div className="grid grid-cols-1 gap-2">
                  {displayRoomTypes?.map((room, idx) => {
                    const isSelected = day.roomType === room.name;
                    const hasRoomPrice = room.basePrice > 0;
                    // For non-main branch: show editable inputs for ALL room types (manual pricing)
                    // For main branch: show read-only if DB has price, editable only if no price
                    const showEditableInput = !isMainBranch;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'p-2.5 rounded-lg border text-left transition-all',
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : 'bg-white hover:border-primary/50 border-muted'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleRoomTypeSelect(room)}
                              className="text-left w-full"
                            >
                              <div className="text-sm font-medium truncate">{room.name}</div>
                              <div className="text-xs text-muted-foreground">{room.bedType}</div>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRoomTypeSelect(room)}
                            className="text-sm font-semibold ml-2"
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">
                              Room/night (₹)
                            </Label>
                            {showEditableInput ? (
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={isSelected ? (day.basePrice ?? '') : ''}
                                onChange={e => {
                                  if (isSelected) {
                                    onChange({
                                      roomType: room.name,
                                      bedType: room.bedType,
                                      basePrice: e.target.value === '' ? 0 : Number(e.target.value),
                                      extraBedPrice: day.extraBedPrice || 0,
                                      childPrice: day.childPrice || 0,
                                    });
                                  }
                                }}
                                className="h-7 text-xs"
                              />
                            ) : hasRoomPrice ? (
                              <div className="text-xs font-medium">
                                ₹{room.basePrice.toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">-</div>
                            )}
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">
                              Extra Bed (₹)
                            </Label>
                            {showEditableInput ? (
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={isSelected ? day.extraBedPrice || '' : ''}
                                onChange={e => {
                                  if (isSelected) {
                                    onChange({
                                      roomType: room.name,
                                      bedType: room.bedType,
                                      basePrice: day.basePrice || 0,
                                      extraBedPrice:
                                        e.target.value === '' ? 0 : Number(e.target.value),
                                      childPrice: day.childPrice || 0,
                                    });
                                  }
                                }}
                                className="h-7 text-xs"
                              />
                            ) : room.extraBedPrice > 0 ? (
                              <div className="text-xs text-muted-foreground">
                                ₹{room.extraBedPrice.toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">-</div>
                            )}
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">
                              Child w/o Bed (₹)
                            </Label>
                            {showEditableInput ? (
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={isSelected ? day.childPrice || '' : ''}
                                onChange={e => {
                                  if (isSelected) {
                                    onChange({
                                      roomType: room.name,
                                      bedType: room.bedType,
                                      basePrice: day.basePrice || 0,
                                      extraBedPrice: day.extraBedPrice || 0,
                                      childPrice:
                                        e.target.value === '' ? 0 : Number(e.target.value),
                                    });
                                  }
                                }}
                                className="h-7 text-xs"
                              />
                            ) : room.childPrice > 0 ? (
                              <div className="text-xs text-muted-foreground">
                                ₹{room.childPrice.toLocaleString()}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">-</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra Services - Only show when hotel is selected */}
            {day.hotelId && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Extra Services</Label>
                <div className="flex flex-wrap gap-3">
                  {/* Extra Bed - Show if extraBedPrice has been set (including 0 for manual entry) */}
                  {day.extraBedPrice !== undefined && day.extraBedPrice >= 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white">
                      <span className="text-xs font-medium">Extra Bed</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full"
                          onClick={decrementExtraBed}
                        >
                          -
                        </Button>
                        <span className="text-xs font-semibold w-6 text-center">
                          {day.extraBedCount}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full"
                          onClick={incrementExtraBed}
                        >
                          +
                        </Button>
                      </div>
                      {day.extraBedPrice > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ×₹{day.extraBedPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Child (no bed) - Show if childPrice has been set (including 0 for manual entry) */}
                  {day.childPrice !== undefined && day.childPrice >= 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white">
                      <span className="text-xs font-medium">Child w/o Bed</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full"
                          onClick={decrementChild}
                        >
                          -
                        </Button>
                        <span className="text-xs font-semibold w-6 text-center">
                          {day.childCount}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 rounded-full"
                          onClick={incrementChild}
                        >
                          +
                        </Button>
                      </div>
                      {day.childPrice > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ×₹{day.childPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rooms Count */}
            {day.hotelId && (
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Rooms</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onChange({ roomCount: Math.max(1, day.roomCount - 1) })}
                  >
                    -
                  </Button>
                  <span className="text-xs font-semibold w-8 text-center">{day.roomCount}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onChange({ roomCount: day.roomCount + 1 })}
                  >
                    +
                  </Button>
                </div>
              </div>
            )}

            {/* Meal Plan Selection & Price */}
            {!hideMealPlan && (hasMealPlans || hasManualMealPlans) && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Meal Plan</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={day.mealPlan || ''}
                    onChange={e => {
                      const plan = displayMealPlans.find(p => p.type === e.target.value);
                      onChange({
                        mealPlan: e.target.value,
                        mealPlanLabel: plan?.label || e.target.value,
                        mealPlanPrice: plan?.pricePerNight || 0,
                      });
                    }}
                    className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Select Meal Plan</option>
                    {displayMealPlans.map(plan => {
                      const type = (plan as { type?: string }).type || '';
                      const label = plan.label || type;
                      return (
                        <option key={type} value={type}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Price"
                      value={day.mealPlanPrice ?? ''}
                      onChange={e =>
                        onChange({
                          mealPlanPrice: e.target.value === '' ? 0 : Number(e.target.value),
                        })
                      }
                      className="h-8 w-24 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">/room</span>
                  </div>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            {totalPerNight > 0 && (
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Room ({day.roomCount})</span>
                  <span>₹{roomCost.toLocaleString()}</span>
                </div>
                {day.mealPlanPrice > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Meal Plan</span>
                    <span>+₹{mealCost.toLocaleString()}</span>
                  </div>
                )}
                {day.extraBedCount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Extra Bed</span>
                    <span>+₹{extraBedCost.toLocaleString()}</span>
                  </div>
                )}
                {day.childCount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Child (no bed)</span>
                    <span>+₹{childCost.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                  <span>Total / Night</span>
                  <span className="text-neutral-600">₹{totalPerNight.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isMainBranch && (
        <HotelCreateModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreated={handleHotelCreated}
        />
      )}

      {/* Manual Entry Modal for Non-Main Branch */}
      <HotelManualEntryModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        onSave={handleManualSave}
        initialData={editingManualHotel}
        mode={editingManualHotel ? 'edit' : 'create'}
      />
    </>
  );
}
