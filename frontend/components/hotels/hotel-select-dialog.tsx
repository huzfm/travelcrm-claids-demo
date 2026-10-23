'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HotelForm } from './hotel-form';
import { useHotels } from '@/hooks/useHotels';
import { useAuthContext } from '@/components/providers';
import {
  Search,
  MapPin,
  Star,
  Check,
  X,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Hotel, RoomType, HotelMealPlan } from '@/types';
import { toast } from 'sonner';
import api from '@/lib/axios';

interface SelectedHotelDetails {
  hotels: Hotel[];
  selectedRoomType?: RoomType;
  selectedMealPlan?: HotelMealPlan;
}

interface HotelSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHotelId?: string;
  onSelect: (details: SelectedHotelDetails) => void;
  onAddAsAlternative?: (details: SelectedHotelDetails) => void;
  serviceArea?: string;
}

export function HotelSelectDialog({
  open,
  onOpenChange,
  selectedHotelId,
  onSelect,
  onAddAsAlternative,
}: HotelSelectDialogProps) {
  const { user } = useAuthContext();
  const isMainBranch = user?.branchId === 'branch-main';

  const [search, setSearch] = useState('');
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedHotels, setSelectedHotels] = useState<Hotel[]>([]);

  const [selections, setSelections] = useState<
    Record<
      string,
      {
        roomType?: RoomType;
        mealPlan?: HotelMealPlan;
      }
    >
  >({});
  const [altMode, setAltMode] = useState(false);

  const { data: hotelsData, isLoading } = useHotels({
    search: search || undefined,
    limit: 50,
  });

  const hotels = hotelsData?.hotels || [];

  const toggleExpand = (hotelId: string) => {
    setExpandedHotelId(prev => (prev === hotelId ? null : hotelId));
  };

  const toggleHotelSelection = (hotel: Hotel) => {
    setSelectedHotels(prev => {
      const exists = prev.some(h => h.id === hotel.id);
      if (exists) return prev.filter(h => h.id !== hotel.id);
      if (prev.length >= 2) return prev;
      return [...prev, hotel];
    });
  };

  const isHotelSelected = (hotelId: string) =>
    selectedHotels.some(h => h.id === hotelId) || selectedHotelId === hotelId;

  const handleRoomSelect = (hotelId: string, roomType: RoomType) => {
    setSelections(prev => ({
      ...prev,
      [hotelId]: { ...prev[hotelId], roomType },
    }));
  };

  const handleMealPlanSelect = (hotelId: string, mealPlan: HotelMealPlan) => {
    setSelections(prev => ({
      ...prev,
      [hotelId]: { ...prev[hotelId], mealPlan },
    }));
  };

  const calculateTotalPrice = (hotelId: string) => {
    const selection = selections[hotelId];
    if (!selection) return null;
    let total = 0;
    if (selection.roomType) total += selection.roomType.basePrice;
    if (selection.mealPlan) total += selection.mealPlan.pricePerNight;
    return { total };
  };

  const handleSelectHotel = (hotel: Hotel) => {
    const selection = selections[hotel.id];
    if (hotel.roomTypes?.length > 0 || hotel.mealPlans?.length > 0) {
      if (!selection?.roomType && !selection?.mealPlan) {
        const firstRoom = hotel.roomTypes?.[0];
        const firstMeal = hotel.mealPlans?.[0];
        if (firstRoom || firstMeal) {
          setSelections(prev => ({
            ...prev,
            [hotel.id]: { roomType: firstRoom, mealPlan: firstMeal },
          }));
          onSelect({ hotels: [hotel], selectedRoomType: firstRoom, selectedMealPlan: firstMeal });
        } else {
          onSelect({ hotels: [hotel] });
        }
      } else {
        onSelect({
          hotels: [hotel],
          selectedRoomType: selection?.roomType,
          selectedMealPlan: selection?.mealPlan,
        });
      }
    } else {
      onSelect({ hotels: [hotel] });
    }
    onOpenChange(false);
    setExpandedHotelId(null);
    setSelections({});
  };

  const handleCreateHotel = async (hotelData: Record<string, unknown>) => {
    try {
      const res = await api.post('/hotels', hotelData);
      if (res.data.success) {
        toast.success('Hotel created successfully!');
        onSelect({ hotels: [res.data.data] });
        onOpenChange(false);
        setShowCreateForm(false);
      }
    } catch (error) {
      toast.error('Failed to create hotel');
      throw error;
    }
  };

  const handleClose = () => {
    setSearch('');
    setExpandedHotelId(null);
    setShowCreateForm(false);
    setShowManualEntry(false);
    setSelections({});
    setSelectedHotels([]);
    setAltMode(false);
    onOpenChange(false);
  };

  const handleConfirmSelection = () => {
    if (selectedHotels.length === 0) return;
    if (altMode && onAddAsAlternative) {
      // For alt mode, select first hotel with selections as the alternative
      const hotel = selectedHotels[0];
      const selection = selections[hotel.id];
      onAddAsAlternative({
        hotels: selectedHotels,
        selectedRoomType: selection?.roomType,
        selectedMealPlan: selection?.mealPlan,
      });
    } else {
      onSelect({ hotels: selectedHotels });
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🏨</span>
            Select Hotel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          {isMainBranch && !showCreateForm && !showManualEntry && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search hotels by name or location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          {/* Action Buttons */}
          {!showCreateForm && !showManualEntry && (
            <div className="flex gap-2">
              {isMainBranch ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" /> Create New Hotel
                  </Button>
                  <Button variant="ghost" onClick={() => setShowManualEntry(true)}>
                    Or Enter Manually
                  </Button>
                </>
              ) : (
                <Button variant="default" onClick={() => setShowManualEntry(true)}>
                  Enter Hotel Details Manually
                </Button>
              )}
            </div>
          )}

          {/* Create Hotel Form */}
          {showCreateForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Create New Hotel</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <HotelForm onSubmit={handleCreateHotel} onCancel={() => setShowCreateForm(false)} />
            </div>
          )}

          {/* Manual Entry */}
          {showManualEntry && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {isMainBranch ? 'Enter Hotel Details Manually' : 'Add Hotel'}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <HotelForm
                saveToDb={isMainBranch}
                onSubmit={handleCreateHotel}
                onCancel={() => setShowManualEntry(false)}
                onLocalSubmit={details => {
                  const hotel: Hotel = {
                    id: `manual-${Date.now()}`,
                    name: (details as any).name || '',
                    location: (details as any).location || (details as any).address || '',
                    address: (details as any).address || '',
                    city: null,
                    state: null,
                    country: null,
                    zipCode: null,
                    latitude: null,
                    longitude: null,
                    stars: (details as any).stars ?? 0,
                    category: (details as any).category,
                    pricePerNight: (details as any).pricePerNight ?? null,
                    phone: (details as any).phone,
                    email: null,
                    website: null,
                    images: (details as any).images || [],
                    roomTypes: (details as any).roomTypes || [],
                    mealPlans: (details as any).mealPlans || [],
                    amenities: (details as any).amenities || [],
                    description: null,
                    currency: 'INR',
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    branchId: user?.branchId || '',
                  };
                  onSelect({ hotels: [hotel] });
                  setShowManualEntry(false);
                  onOpenChange(false);
                }}
              />
            </div>
          )}

          {/* Hotel Grid */}
          {isMainBranch && !showCreateForm && !showManualEntry && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : hotels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No hotels found. Try a different search or create a new hotel.</p>
                </div>
              ) : (
                <>
                  {/* Selection Banner */}
                  {selectedHotels.length > 0 && (
                    <div className="sticky top-0 z-10 bg-accent/10 border border-accent/30 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xs font-medium text-accent shrink-0">
                          {altMode
                            ? `Alternative (${selectedHotels.length} max):`
                            : `Selected (${selectedHotels.length}/2):`}
                        </span>
                        {onAddAsAlternative && (
                          <div className="flex gap-1 bg-white rounded-full p-0.5 border border-accent/30">
                            <button
                              type="button"
                              onClick={() => setAltMode(false)}
                              className={cn(
                                'px-2 py-0.5 text-xs rounded-full transition-colors',
                                !altMode ? 'bg-accent text-white' : 'hover:bg-accent/10'
                              )}
                            >
                              Replace
                            </button>
                            <button
                              type="button"
                              onClick={() => setAltMode(true)}
                              className={cn(
                                'px-2 py-0.5 text-xs rounded-full transition-colors',
                                altMode ? 'bg-neutral-500 text-white' : 'hover:bg-neutral-50'
                              )}
                            >
                              Add as Alt
                            </button>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5 overflow-hidden">
                          {selectedHotels.map(h => (
                            <span
                              key={h.id}
                              className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full flex items-center gap-1"
                            >
                              {h.name}
                              <button
                                type="button"
                                onClick={() => toggleHotelSelection(h)}
                                className="hover:text-red-500"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setSelectedHotels([])}
                        >
                          Clear
                        </Button>
                        <Button size="sm" className="h-7 text-xs" onClick={handleConfirmSelection}>
                          Confirm {selectedHotels.length} Hotel
                          {selectedHotels.length > 1 ? 's' : ''}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Hotel List */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {hotels.map(hotel => {
                      const isExpanded = expandedHotelId === hotel.id;
                      const hasRoomTypes = hotel.roomTypes && hotel.roomTypes.length > 0;
                      const hasMealPlans = hotel.mealPlans && hotel.mealPlans.length > 0;
                      const selection = selections[hotel.id];
                      const pricing = calculateTotalPrice(hotel.id);

                      return (
                        <div
                          key={hotel.id}
                          className={cn(
                            'rounded-xl border overflow-hidden transition-all',
                            isHotelSelected(hotel.id)
                              ? 'ring-2 ring-accent border-accent'
                              : 'hover:border-primary/50'
                          )}
                        >
                          {/* Hotel Header */}
                          <div
                            className="flex items-center gap-4 p-4 cursor-pointer"
                            onClick={() => {
                              if (hasRoomTypes || hasMealPlans) {
                                toggleExpand(hotel.id);
                              } else if (isMainBranch) {
                                toggleHotelSelection(hotel);
                              } else {
                                handleSelectHotel(hotel);
                              }
                            }}
                          >
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                              {hotel.images && hotel.images.length > 0 ? (
                                <img
                                  src={hotel.images[0]}
                                  alt={hotel.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-2xl">🏨</span>
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 bg-white/90 rounded-full px-1.5 py-0.5 shadow-sm flex items-center gap-0.5">
                                <Star className="h-2.5 w-2.5 text-red-500 fill-red-500" />
                                <span className="text-[10px] font-semibold">{hotel.stars}</span>
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base">{hotel.name}</h3>
                              <div className="flex items-center gap-1 mt-0.5 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {hotel.address || hotel.location || 'Location not set'}
                                </span>
                              </div>
                              {selection?.roomType && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selection.roomType && (
                                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                      {selection.roomType.name}
                                    </span>
                                  )}
                                  {selection.mealPlan && (
                                    <span className="text-xs px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-full">
                                      {selection.mealPlan.label}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {pricing && (
                                <div className="text-right">
                                  <span className="text-sm font-semibold text-primary">
                                    ₹{pricing.total.toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-xs text-muted-foreground"> /night</span>
                                </div>
                              )}
                              {(hasRoomTypes || hasMealPlans) && (
                                <Button variant="ghost" size="sm" className="h-6 px-2">
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Expanded Options */}
                          {isExpanded && (
                            <div className="border-t p-4 bg-muted/30">
                              <div className="space-y-4">
                                {hasRoomTypes && (
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">
                                      Select Room Type
                                    </Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {hotel.roomTypes!.map((room, idx) => {
                                        const isRoomSelected =
                                          selection?.roomType?.name === room.name;
                                        return (
                                          <div
                                            key={idx}
                                            onClick={() => handleRoomSelect(hotel.id, room)}
                                            className={cn(
                                              'p-3 rounded-lg border cursor-pointer transition-all',
                                              isRoomSelected
                                                ? 'bg-primary/10 border-primary'
                                                : 'bg-white hover:border-primary/50'
                                            )}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <div className="font-medium text-sm">
                                                  {room.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {room.bedType}
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className="font-semibold text-sm">
                                                  ₹{room.basePrice.toLocaleString('en-IN')}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  /night
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2">
                                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <input
                                                  type="checkbox"
                                                  checked={isRoomSelected}
                                                  onChange={() => handleRoomSelect(hotel.id, room)}
                                                  className="rounded"
                                                />{' '}
                                                Select
                                              </label>
                                              {room.extraBedPrice && (
                                                <span className="text-xs text-muted-foreground">
                                                  Extra Bed: ₹
                                                  {room.extraBedPrice.toLocaleString('en-IN')}
                                                </span>
                                              )}
                                              {room.childPrice && (
                                                <span className="text-xs text-muted-foreground">
                                                  Child: ₹{room.childPrice.toLocaleString('en-IN')}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {hasMealPlans && (
                                  <div>
                                    <Label className="text-sm font-medium mb-2 block">
                                      Select Meal Plan
                                    </Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {hotel.mealPlans!.map((plan, idx) => {
                                        const isPlanSelected =
                                          selection?.mealPlan?.type === plan.type;
                                        return (
                                          <div
                                            key={idx}
                                            onClick={() => handleMealPlanSelect(hotel.id, plan)}
                                            className={cn(
                                              'p-3 rounded-lg border cursor-pointer transition-all text-center',
                                              isPlanSelected
                                                ? 'bg-neutral-50 border-neutral-500'
                                                : 'bg-white hover:border-neutral-300'
                                            )}
                                          >
                                            <div className="font-medium text-sm">{plan.label}</div>
                                            {plan.pricePerNight > 0 && (
                                              <div className="text-xs text-muted-foreground mt-1">
                                                +₹{plan.pricePerNight.toLocaleString('en-IN')}/night
                                              </div>
                                            )}
                                            <div className="mt-2">
                                              <input
                                                type="checkbox"
                                                checked={isPlanSelected}
                                                onChange={() =>
                                                  handleMealPlanSelect(hotel.id, plan)
                                                }
                                                className="rounded"
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t">
                                  <div>
                                    {pricing && (
                                      <div className="text-sm">
                                        <span className="text-muted-foreground">Total: </span>
                                        <span className="font-semibold text-primary">
                                          ₹{pricing.total.toLocaleString('en-IN')}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {' '}
                                          /night
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleExpand(hotel.id)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        isMainBranch
                                          ? toggleHotelSelection(hotel)
                                          : handleSelectHotel(hotel)
                                      }
                                    >
                                      <Check className="h-4 w-4 mr-1" /> Confirm
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {!hasRoomTypes && !hasMealPlans && (
                            <div className="px-4 pb-4">
                              <Button
                                className="w-full"
                                onClick={() =>
                                  isMainBranch
                                    ? toggleHotelSelection(hotel)
                                    : handleSelectHotel(hotel)
                                }
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {isMainBranch ? 'Add Hotel' : 'Select Hotel'}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
