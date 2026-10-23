'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VehicleForm } from './vehicle-form';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuthContext } from '@/components/providers';
import {
  Search,
  Check,
  X,
  Car,
  Users,
  Phone,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types';
import { toast } from 'sonner';
import api from '@/lib/axios';

interface SelectedVehicleDetails {
  vehicle: Vehicle;
  selectedRate?: number;
  selectedFeatures?: string[];
}

interface VehicleSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVehicleId?: string;
  onSelect: (details: SelectedVehicleDetails) => void;
  onAddAsAlternative?: (details: SelectedVehicleDetails) => void;
  serviceArea?: string;
}

export function VehicleSelectDialog({
  open,
  onOpenChange,
  selectedVehicleId,
  onSelect,
  onAddAsAlternative,
}: VehicleSelectDialogProps) {
  const { user } = useAuthContext();
  const isMainBranch = user?.branchId === 'branch-main';

  const [search, setSearch] = useState('');
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Selection state for each vehicle
  const [selections, setSelections] = useState<
    Record<
      string,
      {
        selectedRate?: number;
        selectedFeatures: string[];
      }
    >
  >({});
  const [, setAltMode] = useState(false);

  // Manual entry state
  const [manualVehicle, setManualVehicle] = useState({
    name: '',
    vehicleType: 'SEDAN',
    registrationNumber: '',
    seatingCapacity: '4',
    driverName: '',
    driverPhone: '',
    ratePerDay: '',
    isAc: true,
    features: [] as string[],
  });

  const { vehicles, loading } = useVehicles({
    page: 1,
    limit: 50,
    filters: {
      search: search || undefined,
    },
  });

  const toggleExpand = (vehicleId: string) => {
    setExpandedVehicleId(prev => (prev === vehicleId ? null : vehicleId));
  };

  const handleFeatureToggle = (vehicleId: string, feature: string) => {
    setSelections(prev => {
      const current = prev[vehicleId] || { selectedFeatures: [] };
      const features = current.selectedFeatures.includes(feature)
        ? current.selectedFeatures.filter(f => f !== feature)
        : [...current.selectedFeatures, feature];
      return {
        ...prev,
        [vehicleId]: {
          ...current,
          selectedFeatures: features,
        },
      };
    });
  };

  const getVehiclePrice = (vehicle: Vehicle) => {
    return vehicle.ratePerDay || vehicle.minimumCharge || 0;
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    const selection = selections[vehicle.id];
    const rate = selection?.selectedRate || vehicle.ratePerDay;
    const features = selection?.selectedFeatures || vehicle.features || [];

    onSelect({
      vehicle,
      selectedRate: rate,
      selectedFeatures: features,
    });

    onOpenChange(false);
    setExpandedVehicleId(null);
    setSelections({});
  };

  const handleCreateVehicle = async (vehicleData: Record<string, unknown>) => {
    try {
      const res = await api.post('/vehicles', vehicleData);
      if (res.data.success) {
        toast.success('Vehicle created successfully!');
        const newVehicle = res.data.data;
        onSelect({ vehicle: newVehicle });
        onOpenChange(false);
        setShowCreateForm(false);
      }
    } catch (error) {
      toast.error('Failed to create vehicle');
      throw error;
    }
  };

  const handleManualSubmit = () => {
    if (!manualVehicle.name.trim()) {
      toast.error('Vehicle name is required');
      return;
    }

    const vehicle: Vehicle = {
      id: `manual-${Date.now()}`,
      name: manualVehicle.name,
      vehicleType: manualVehicle.vehicleType as any,
      registrationNumber: manualVehicle.registrationNumber || '',
      seatingCapacity: parseInt(manualVehicle.seatingCapacity) || 4,
      driverName: manualVehicle.driverName || undefined,
      driverPhone: manualVehicle.driverPhone || undefined,
      ratePerDay: manualVehicle.ratePerDay ? parseInt(manualVehicle.ratePerDay) : undefined,
      isAc: manualVehicle.isAc,
      features: manualVehicle.features,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user?.id || '',
      branchId: user?.branchId || '',
      category: 'STANDARD',
      currency: 'INR',
    };

    onSelect({ vehicle });
    onOpenChange(false);
    setManualVehicle({
      name: '',
      vehicleType: 'SEDAN',
      registrationNumber: '',
      seatingCapacity: '4',
      driverName: '',
      driverPhone: '',
      ratePerDay: '',
      isAc: true,
      features: [],
    });
    setShowManualEntry(false);
  };

  const toggleFeature = (feature: string) => {
    setManualVehicle(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleClose = () => {
    setSearch('');
    setExpandedVehicleId(null);
    setShowCreateForm(false);
    setShowManualEntry(false);
    setSelections({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🚗</span>
            Select Vehicle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar - Only for main branch */}
          {isMainBranch && !showCreateForm && !showManualEntry && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles by name or service area..."
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
                    <Plus className="h-4 w-4" />
                    Create New Vehicle
                  </Button>
                  <Button variant="ghost" onClick={() => setShowManualEntry(true)}>
                    Or Enter Manually
                  </Button>
                </>
              ) : (
                <Button variant="default" onClick={() => setShowManualEntry(true)}>
                  Enter Vehicle Details Manually
                </Button>
              )}
            </div>
          )}

          {/* Create Vehicle Form */}
          {showCreateForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Create New Vehicle</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <VehicleForm
                onSubmit={handleCreateVehicle}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}

          {/* Manual Entry Form */}
          {showManualEntry && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Enter Vehicle Details Manually</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Vehicle Name *</Label>
                  <Input
                    value={manualVehicle.name}
                    onChange={e => setManualVehicle({ ...manualVehicle, name: e.target.value })}
                    placeholder="e.g., Toyota Innova Crysta"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Vehicle Type</Label>
                  <Select
                    value={manualVehicle.vehicleType}
                    onValueChange={v => setManualVehicle({ ...manualVehicle, vehicleType: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEDAN">Sedan</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="MUV">MUV</SelectItem>
                      <SelectItem value="MINI_BUS">Mini Bus</SelectItem>
                      <SelectItem value="BUS">Bus</SelectItem>
                      <SelectItem value="TEMPO_TRAVELLER">Tempo Traveller</SelectItem>
                      <SelectItem value="CAR">Car</SelectItem>
                      <SelectItem value="VAN">Van</SelectItem>
                      <SelectItem value="JEEP">Jeep</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Seating Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={manualVehicle.seatingCapacity}
                    onChange={e =>
                      setManualVehicle({ ...manualVehicle, seatingCapacity: e.target.value })
                    }
                    placeholder="e.g., 6"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Registration Number</Label>
                  <Input
                    value={manualVehicle.registrationNumber}
                    onChange={e =>
                      setManualVehicle({ ...manualVehicle, registrationNumber: e.target.value })
                    }
                    placeholder="e.g., JK01AB1234"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Rate Per Day (₹)</Label>
                  <Input
                    type="number"
                    value={manualVehicle.ratePerDay}
                    onChange={e =>
                      setManualVehicle({ ...manualVehicle, ratePerDay: e.target.value })
                    }
                    placeholder="e.g., 2500"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Driver Name</Label>
                  <input
                    type="text"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-1p="disabled"
                    name="driver-name"
                    value={manualVehicle.driverName}
                    onChange={e =>
                      setManualVehicle({ ...manualVehicle, driverName: e.target.value })
                    }
                    placeholder="e.g., Mohammad Ali"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgb(232,230,228)',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'white',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginTop: '0.25rem',
                    }}
                  />
                </div>

                <div>
                  <Label>Driver Phone</Label>
                  <input
                    type="tel"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-1p="disabled"
                    name="driver-phone"
                    value={manualVehicle.driverPhone}
                    onChange={e =>
                      setManualVehicle({ ...manualVehicle, driverPhone: e.target.value })
                    }
                    placeholder="e.g., +91 9876543210"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: '2.5rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgb(232,230,228)',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      backgroundColor: 'white',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginTop: '0.25rem',
                    }}
                  />
                </div>
              </div>

              {/* AC Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAc"
                  checked={manualVehicle.isAc}
                  onChange={e => setManualVehicle({ ...manualVehicle, isAc: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isAc" className="cursor-pointer">
                  Air Conditioned
                </Label>
              </div>

              {/* Features */}
              <div>
                <Label className="mb-2 block">Features</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'AC',
                    'Music System',
                    'WiFi',
                    'USB Charging',
                    'Comfortable Seats',
                    'Ample Luggage',
                  ].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFeature(f)}
                      className={cn(
                        'px-3 py-1.5 text-xs rounded-full border transition-colors',
                        manualVehicle.features.includes(f)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50'
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowManualEntry(false)}>
                  Cancel
                </Button>
                <Button onClick={handleManualSubmit}>Add Vehicle</Button>
              </div>
            </div>
          )}

          {/* Vehicle Grid - Main Branch Only */}
          {isMainBranch && !showCreateForm && !showManualEntry && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No vehicles found. Try a different search or create a new vehicle.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {vehicles.map(vehicle => {
                    const isSelected = selectedVehicleId === vehicle.id;
                    const isExpanded = expandedVehicleId === vehicle.id;
                    const selection = selections[vehicle.id];
                    const price = getVehiclePrice(vehicle);

                    return (
                      <div
                        key={vehicle.id}
                        className={cn(
                          'rounded-xl border overflow-hidden transition-all',
                          isSelected
                            ? 'ring-2 ring-primary border-primary'
                            : 'hover:border-primary/50'
                        )}
                      >
                        {/* Vehicle Header */}
                        <div
                          className="flex items-center gap-4 p-4 cursor-pointer"
                          onClick={() => toggleExpand(vehicle.id)}
                        >
                          {/* Vehicle Icon */}
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-neutral-500/10 to-neutral-500/5">
                            <Car className="h-6 w-6 text-neutral-500/50" />
                          </div>

                          {/* Vehicle Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base">{vehicle.name}</h3>
                            <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {vehicle.seatingCapacity} Seats
                              </span>
                              <span className="capitalize">
                                {vehicle.vehicleType?.replace('_', ' ') || 'Vehicle'}
                              </span>
                              {vehicle.isAc && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-500 text-white">
                                  AC
                                </span>
                              )}
                            </div>

                            {/* Selection Summary */}
                            {selection && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {selection.selectedFeatures &&
                                  selection.selectedFeatures.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {selection.selectedFeatures.slice(0, 3).map((f, i) => (
                                        <span
                                          key={i}
                                          className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                                        >
                                          {f}
                                        </span>
                                      ))}
                                      {selection.selectedFeatures.length > 3 && (
                                        <span className="text-xs text-muted-foreground">
                                          +{selection.selectedFeatures.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>

                          {/* Price & Expand */}
                          <div className="flex flex-col items-end gap-1">
                            {price > 0 && (
                              <div className="text-right">
                                <span className="text-sm font-semibold text-primary">
                                  ₹{price.toLocaleString('en-IN')}
                                </span>
                                <span className="text-xs text-muted-foreground"> /day</span>
                              </div>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Options */}
                        {isExpanded && (
                          <div className="border-t p-4 bg-muted/30">
                            <div className="space-y-4">
                              {/* Features Selection */}
                              {vehicle.features && vehicle.features.length > 0 && (
                                <div>
                                  <Label className="text-sm font-medium mb-2 block">
                                    Select Features
                                  </Label>
                                  <div className="flex flex-wrap gap-2">
                                    {vehicle.features.map((feature, idx) => {
                                      const isFeatureSelected =
                                        selection?.selectedFeatures?.includes(feature);
                                      return (
                                        <button
                                          key={idx}
                                          onClick={() => handleFeatureToggle(vehicle.id, feature)}
                                          className={cn(
                                            'px-3 py-1.5 text-xs rounded-full border transition-colors',
                                            isFeatureSelected
                                              ? 'bg-primary text-primary-foreground border-primary'
                                              : 'bg-white border-border hover:border-primary/50'
                                          )}
                                        >
                                          {feature}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Driver Info */}
                              {(vehicle.driverName || vehicle.driverPhone) && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <Label className="text-xs text-muted-foreground mb-1 block">
                                    Driver Details
                                  </Label>
                                  <div className="flex items-center gap-4">
                                    {vehicle.driverName && (
                                      <span className="text-sm font-medium">
                                        {vehicle.driverName}
                                      </span>
                                    )}
                                    {vehicle.driverPhone && (
                                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        {vehicle.driverPhone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Vehicle Number */}
                              {vehicle.registrationNumber && (
                                <div className="bg-white p-3 rounded-lg border">
                                  <Label className="text-xs text-muted-foreground mb-1 block">
                                    Vehicle Number
                                  </Label>
                                  <span className="font-mono font-semibold">
                                    {vehicle.registrationNumber}
                                  </span>
                                </div>
                              )}

                              {/* Confirm */}
                              <div className="flex items-center justify-end pt-2 border-t">
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleExpand(vehicle.id)}
                                  >
                                    Cancel
                                  </Button>
                                  {onAddAsAlternative && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const selection = selections[vehicle.id];
                                        const rate = selection?.selectedRate || vehicle.ratePerDay;
                                        const features =
                                          selection?.selectedFeatures || vehicle.features || [];
                                        onAddAsAlternative?.({
                                          vehicle,
                                          selectedRate: rate,
                                          selectedFeatures: features,
                                        });
                                        onOpenChange(false);
                                        setExpandedVehicleId(null);
                                        setSelections({});
                                        setAltMode(false);
                                      }}
                                    >
                                      Add as Alt
                                    </Button>
                                  )}
                                  <Button size="sm" onClick={() => handleSelectVehicle(vehicle)}>
                                    <Check className="h-4 w-4 mr-1" />
                                    Select Vehicle
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
