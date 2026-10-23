'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  X,
  Tag,
  Bed,
  Car,
  CalendarDays,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { HotelSelectDialog } from '@/components/hotels/hotel-select-dialog';
import { VehicleSelectDialog } from '@/components/vehicles/vehicle-select-dialog';
import { useAuthContext } from '@/components/providers';
import { useHotels } from '@/hooks/useHotels';
import type { Hotel, ActivityCategory, Vehicle } from '@/types';
import type { ItineraryDay, HotelAlternative, VehicleAlternative } from '@/types/itinerary.types';

const CATEGORIES = [
  { value: 'FLIGHT', label: 'Flight' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'FOOD', label: 'Dining' },
  { value: 'SHOPPING', label: 'Shopping' },
  { value: 'OTHER', label: 'Other' },
];

interface DayCardProps {
  day: ItineraryDay;
  isExpanded: boolean;
  destination: string;
  onToggleExpand: () => void;
  onRemove: () => void;
  onUpdateDay: (updates: Partial<ItineraryDay>) => void;
  onQuickAdd: (title: string, category: ActivityCategory) => void;
  onOpenEdit: (actIndex: number) => void;
  onDeleteAct: (actIndex: number) => void;
  formatDate: (date: string) => string;
}

export function DayCard({
  day,
  isExpanded,
  destination,
  onToggleExpand,
  onRemove,
  onUpdateDay,
  onQuickAdd,
  onOpenEdit,
  onDeleteAct,
  formatDate,
}: DayCardProps) {
  const [showHotelDialog, setShowHotelDialog] = useState(false);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showSimilarHotelPicker, setShowSimilarHotelPicker] = useState(false);
  const [similarSearch, setSimilarSearch] = useState('');
  const { user } = useAuthContext();
  const isMainBranch = user?.branchId === 'branch-main';

  const { data: similarHotelsData, isLoading: loadingSimilarHotels } = useHotels({
    search: similarSearch || undefined,
    limit: 20,
  });

  // For activity dialog
  const [activityForm, setActivityForm] = useState({
    title: '',
    time: '',
    location: '',
    description: '',
    duration: '',
    cost: undefined as number | undefined,
    bookingRef: '',
    contactNumber: '',
    category: 'ACTIVITY' as ActivityCategory,
  });

  const handleAddSimilarHotel = (hotel: Hotel) => {
    const existing = day.similarHotels || [];
    if (existing.length >= 2) return;
    if (existing.some(sh => sh.hotelId === hotel.id)) return;
    const newSimilar: HotelAlternative = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelAddress: hotel.address || hotel.location,
      hotelImage: hotel.images?.[0],
      hotelStars: hotel.stars,
      isSimilar: true,
    };
    onUpdateDay({ similarHotels: [...existing, newSimilar] });
    setShowSimilarHotelPicker(false);
    setSimilarSearch('');
  };

  const handleRemoveSimilarHotel = (hotelId: string) => {
    const existing = day.similarHotels || [];
    onUpdateDay({ similarHotels: existing.filter(sh => sh.hotelId !== hotelId) });
  };

  const handleSelectHotel = (details: {
    hotels: Hotel[];
    selectedRoomType?: {
      name: string;
      bedType: string;
      basePrice: number;
      extraBedPrice?: number;
      childPrice?: number;
    };
    selectedMealPlan?: { type: 'EP' | 'CP' | 'MAP' | 'APAI'; label: string; pricePerNight: number };
  }) => {
    const { hotels: hotelList, selectedRoomType, selectedMealPlan } = details;
    const primary = hotelList[0];
    onUpdateDay({
      hotel: primary.name,
      hotelId: primary.id,
      hotelIds: hotelList.length > 1 ? hotelList.map(h => h.id) : undefined,
      hotelAddress: primary.address || primary.location,
      hotelContact: primary.phone || undefined,
      hotelImage: primary.images?.[0] || undefined,
      hotelStars: primary.stars || undefined,
      selectedRoomType,
      extraBedCost: selectedRoomType?.extraBedPrice,
      childWithoutBedCost: selectedRoomType?.childPrice,
      selectedMealPlan,
      roomCategory: undefined,
      customRoomCategory: undefined,
      mealPlan: undefined,
    });
    setShowHotelDialog(false);
  };

  const handleAddHotelAlternative = (details: {
    hotels: Hotel[];
    selectedRoomType?: {
      name: string;
      bedType: string;
      basePrice: number;
      extraBedPrice?: number;
      childPrice?: number;
    };
    selectedMealPlan?: { type: 'EP' | 'CP' | 'MAP' | 'APAI'; label: string; pricePerNight: number };
  }) => {
    const { hotels: hotelList, selectedRoomType, selectedMealPlan } = details;
    const primary = hotelList[0];
    const alt: HotelAlternative = {
      hotelId: primary.id,
      hotelName: primary.name,
      hotelAddress: primary.address || primary.location,
      hotelContact: primary.phone || undefined,
      hotelImage: primary.images?.[0] || undefined,
      hotelStars: primary.stars || undefined,
      selectedRoomType,
      selectedMealPlan,
      extraBedCost: selectedRoomType?.extraBedPrice,
      childWithoutBedCost: selectedRoomType?.childPrice,
    };
    onUpdateDay({
      alternatives: {
        hotelOptions: [...(day.alternatives?.hotelOptions || []), alt],
        vehicleOptions: day.alternatives?.vehicleOptions || [],
      },
    });
    setShowHotelDialog(false);
  };

  const handleAddVehicleAlternative = (details: {
    vehicle: Vehicle;
    selectedRate?: number;
    selectedFeatures?: string[];
  }) => {
    const { vehicle, selectedRate, selectedFeatures } = details;
    const alt: VehicleAlternative = {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      vehicleType: vehicle.vehicleType,
      vehicleRatePerDay: selectedRate || vehicle.ratePerDay,
      selectedVehicle: {
        name: vehicle.name,
        brand: vehicle.brand,
        vehicleType: vehicle.vehicleType,
        seatingCapacity: vehicle.seatingCapacity,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        ratePerDay: selectedRate || vehicle.ratePerDay,
      },
      vehicleFeatures: selectedFeatures || vehicle.features,
    };
    onUpdateDay({
      alternatives: {
        hotelOptions: day.alternatives?.hotelOptions || [],
        vehicleOptions: [...(day.alternatives?.vehicleOptions || []), alt],
      },
    });
    setShowVehicleDialog(false);
  };

  const handleSelectVehicle = (details: {
    vehicle: Vehicle;
    selectedRate?: number;
    selectedFeatures?: string[];
  }) => {
    const { vehicle, selectedRate, selectedFeatures } = details;
    onUpdateDay({
      vehicleName: vehicle.name,
      vehicleId: vehicle.id,
      vehicleType: vehicle.vehicleType,
      vehicleRegistration: vehicle.registrationNumber,
      vehicleDriverPhone: vehicle.driverPhone,
      vehicleRatePerDay: selectedRate || vehicle.ratePerDay,
      vehicleFeatures: selectedFeatures || vehicle.features,
      transport: `${vehicle.name} - ${vehicle.vehicleType?.replace('_', ' ') || ''}`,
      selectedVehicle: {
        name: vehicle.name,
        brand: vehicle.brand,
        vehicleType: vehicle.vehicleType,
        seatingCapacity: vehicle.seatingCapacity,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        ratePerDay: selectedRate || vehicle.ratePerDay,
      },
    });
    setShowVehicleDialog(false);
  };

  const handleAddActivity = () => {
    if (!activityForm.title.trim()) return;
    onQuickAdd(activityForm.title.trim(), activityForm.category);
    setActivityForm({
      title: '',
      time: '',
      location: '',
      description: '',
      duration: '',
      cost: undefined,
      bookingRef: '',
      contactNumber: '',
      category: 'ACTIVITY',
    });
    setShowActivityDialog(false);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <div
        className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              day.dayType === 'leisure'
                ? 'bg-neutral-500 text-white'
                : 'bg-primary text-white'
            )}
          >
            {day.dayNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                {day.dayType === 'leisure' ? 'Leisure Day' : day.title || `Day ${day.dayNumber}`}
              </p>
              {day.dayType === 'leisure' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                  Rest Day
                </span>
              )}
            </div>
            {day.date && <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded - popup buttons only */}
      {isExpanded && (
        <div className="p-4 border-t bg-card">
          {/* Quick add activities inline — hidden for leisure days */}
          {day.dayType !== 'leisure' && (
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">Quick Add Activity</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Airport Pickup',
                  'City Tour',
                  'Hotel Check-in',
                  'Breakfast',
                  'Lunch',
                  'Dinner',
                  'Flight Arrival',
                ].map(title => {
                  const cat = title.includes('Flight')
                    ? 'FLIGHT'
                    : title.includes('Hotel')
                      ? 'HOTEL'
                      : title.includes('Airport')
                        ? 'TRANSPORT'
                        : title.match(/Breakfast|Lunch|Dinner/)
                          ? 'FOOD'
                          : 'ACTIVITY';
                  return (
                    <button
                      key={title}
                      onClick={() => onQuickAdd(title, cat as ActivityCategory)}
                      className="text-xs px-3 py-1.5 border rounded-full hover:bg-muted cursor-pointer"
                    >
                      + {title}
                    </button>
                  );
                })}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setShowActivityDialog(true)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Custom
                </Button>
              </div>
            </div>
          )}

          {/* Section buttons grid */}
          {day.dayType !== 'leisure' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Day Details */}
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => setShowDetailsDialog(true)}
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs">Day Details</span>
              <span className="text-xs text-muted-foreground">{day.title ? '✓' : '—'}</span>
            </Button>

            {/* Hotel */}
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => setShowHotelDialog(true)}
            >
              <Bed className="h-5 w-5" />
              <span className="text-xs">Hotel</span>
              <span className="text-xs text-muted-foreground truncate max-w-full flex items-center gap-1">
                {day.hotel ? '✓' : '—'}
                {day.alternatives?.hotelOptions && day.alternatives.hotelOptions.length > 0 && (
                  <span className="bg-neutral-100 text-neutral-700 px-1 rounded text-[10px]">
                    {day.alternatives.hotelOptions.length + 1} alts
                  </span>
                )}
                {day.similarHotels && day.similarHotels.length > 0 && (
                  <span className="bg-red-100 text-red-700 px-1 rounded text-[10px]">
                    +{day.similarHotels.length} similar
                  </span>
                )}
              </span>
            </Button>

            {/* Transport */}
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => setShowVehicleDialog(true)}
            >
              <Car className="h-5 w-5" />
              <span className="text-xs">Transport</span>
              <span className="text-xs text-muted-foreground truncate max-w-full flex items-center gap-1">
                {day.vehicleName ? '✓' : '—'}
                {day.alternatives?.vehicleOptions && day.alternatives.vehicleOptions.length > 0 && (
                  <span className="bg-neutral-100 text-neutral-700 px-1 rounded text-[10px]">
                    {day.alternatives.vehicleOptions.length + 1} alts
                  </span>
                )}
              </span>
            </Button>
          </div>
          )}

      {/* Day Details Dialog */}
          {day.hotel && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-red-800">Backup Hotels</span>
                  <span className="text-[10px] text-red-600">(if primary unavailable)</span>
                </div>
                {(day.similarHotels?.length || 0) < 2 && isMainBranch && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs text-red-700 hover:text-red-900 hover:bg-red-100 px-2"
                    onClick={() => setShowSimilarHotelPicker(p => !p)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>

              {/* Saved similar hotels */}
              {day.similarHotels && day.similarHotels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {day.similarHotels.map(sh => (
                    <div
                      key={sh.hotelId}
                      className="flex items-center gap-1.5 bg-white border border-red-300 rounded-full px-3 py-1"
                    >
                      <span className="text-xs font-medium text-red-900">{sh.hotelName}</span>
                      {sh.hotelStars && (
                        <span className="text-[10px] text-red-600">
                          {'★'.repeat(sh.hotelStars)}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveSimilarHotel(sh.hotelId)}
                        className="ml-1 text-red-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Hotel picker */}
              {showSimilarHotelPicker && (
                <div className="mt-2">
                  <Input
                    placeholder="Search backup hotel..."
                    value={similarSearch}
                    onChange={e => setSimilarSearch(e.target.value)}
                    className="h-8 text-xs mb-2"
                  />
                  {loadingSimilarHotels ? (
                    <div className="text-xs text-muted-foreground py-2">Loading...</div>
                  ) : similarHotelsData?.hotels?.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2">No hotels found</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {similarHotelsData?.hotels
                        ?.filter(
                          (h: Hotel) =>
                            h.id !== day.hotelId &&
                            !day.similarHotels?.some(sh => sh.hotelId === h.id)
                        )
                        .slice(0, 8)
                        .map((hotel: Hotel) => (
                          <button
                            key={hotel.id}
                            onClick={() => handleAddSimilarHotel(hotel)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-red-200 rounded-full text-xs hover:border-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            <span className="text-red-500">{'★'.repeat(hotel.stars || 0)}</span>
                            <span className="text-red-900">{hotel.name}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes - separate button */}
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotesDialog(true)}
              className="w-full justify-start"
            >
              <FileText className="h-4 w-4 mr-2" />
              {day.notes ? 'View/Edit Notes' : 'Add Notes'}
            </Button>
          </div>

          {/* Activities list */}
          {day.activities.length > 0 && (
            <div className="mt-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Activities ({day.activities.length})
              </Label>
              <div className="space-y-2">
                {day.activities.map((act, idx) => (
                  <div
                    key={act.id || idx}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="w-14 text-xs text-muted-foreground font-mono shrink-0">
                      {act.time || '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{act.title}</p>
                      {act.location && (
                        <p className="text-xs text-muted-foreground">{act.location}</p>
                      )}
                    </div>
                    {act.cost && (
                      <span className="text-xs bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded shrink-0">
                        ₹{act.cost.toLocaleString()}
                      </span>
                    )}
                    <button
                      onClick={() => onOpenEdit(idx)}
                      className="p-1.5 hover:bg-muted rounded shrink-0"
                    >
                      <Tag className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => onDeleteAct(idx)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete day */}
          <div className="mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-red-50"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove Day
            </Button>
          </div>
        </div>
      )}

      {/* Day Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {day.dayType === 'leisure' ? 'Leisure Day' : `Day ${day.dayNumber}`} — Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Day Type</Label>
              <div className="flex gap-2">
                {(['activity', 'leisure'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => onUpdateDay({ dayType: type })}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors',
                      day.dayType === type
                        ? type === 'leisure'
                          ? 'bg-neutral-500 text-white border-neutral-500'
                          : 'bg-primary text-white border-primary'
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                    )}
                  >
                    {type === 'activity' ? 'Activity Day' : 'Leisure Day'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Day Title</Label>
              <Input
                value={day.title || ''}
                onChange={e => onUpdateDay({ title: e.target.value })}
                placeholder="e.g., Arrival Day"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={day.date || ''}
                onChange={e => onUpdateDay({ date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={day.description || ''}
                onChange={e => onUpdateDay({ description: e.target.value })}
                placeholder="Brief description of this day..."
                rows={3}
              />
            </div>
            {/* Leisure Guidelines — only shown for leisure days */}
            {day.dayType === 'leisure' && (
              <div className="space-y-1.5">
                <Label>
                  Client Guidelines
                  <span className="ml-1 text-[10px] text-neutral-600 font-normal">(shown in PDF)</span>
                </Label>
                <Textarea
                  value={day.leisureGuidelines || ''}
                  onChange={e => onUpdateDay({ leisureGuidelines: e.target.value })}
                  placeholder="Add guidelines for the client (e.g., recommended restaurants, spa tips, nearby attractions)..."
                  rows={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotel Dialog */}
      <HotelSelectDialog
        open={showHotelDialog}
        onOpenChange={setShowHotelDialog}
        selectedHotelId={day.hotelId}
        onSelect={handleSelectHotel}
        onAddAsAlternative={handleAddHotelAlternative}
        serviceArea={destination}
      />

      {/* Vehicle Dialog */}
      <VehicleSelectDialog
        open={showVehicleDialog}
        onOpenChange={setShowVehicleDialog}
        selectedVehicleId={day.vehicleId}
        onSelect={handleSelectVehicle}
        onAddAsAlternative={handleAddVehicleAlternative}
        serviceArea={destination}
      />

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notes for Day {day.dayNumber}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={day.notes || ''}
              onChange={e => onUpdateDay({ notes: e.target.value })}
              placeholder="Add any notes for this day..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNotesDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-7 gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() =>
                    setActivityForm(f => ({ ...f, category: cat.value as ActivityCategory }))
                  }
                  className={cn(
                    'py-2 px-1 text-xs rounded-lg border transition-colors cursor-pointer',
                    activityForm.category === cat.value
                      ? 'bg-primary text-white border-primary'
                      : 'hover:bg-muted border-transparent'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Desert Safari"
                value={activityForm.title}
                onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={activityForm.time}
                  onChange={e => setActivityForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  placeholder="Venue"
                  value={activityForm.location}
                  onChange={e => setActivityForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input
                  placeholder="e.g., 3 hours"
                  value={activityForm.duration}
                  onChange={e => setActivityForm(f => ({ ...f, duration: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cost (₹)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={activityForm.cost || ''}
                  onChange={e =>
                    setActivityForm(f => ({
                      ...f,
                      cost: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Details..."
                value={activityForm.description}
                onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowActivityDialog(false);
                setActivityForm({
                  title: '',
                  time: '',
                  location: '',
                  description: '',
                  duration: '',
                  cost: undefined,
                  bookingRef: '',
                  contactNumber: '',
                  category: 'ACTIVITY',
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddActivity} disabled={!activityForm.title.trim()}>
              Add Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
