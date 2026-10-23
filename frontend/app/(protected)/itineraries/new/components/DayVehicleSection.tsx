'use client';

import { useState } from 'react';
import { Car, Check, Snowflake, Plus, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VehicleAutocomplete } from '@/components/vehicles/vehicle-autocomplete';
import { VehicleCreateModal } from '@/components/vehicles/vehicle-create-modal';
import { VehicleManualEntryModal } from '@/components/vehicles/vehicle-manual-entry-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMainBranch } from '@/hooks/useAuth';
import type { DayBuilderData } from '../types';
import type { Vehicle } from '@/types/vehicle.types';

interface DayVehicleSectionProps {
  day: DayBuilderData;
  onChange: (patch: Partial<DayBuilderData>) => void;
  availableVehicles?: Array<{
    id: string;
    name?: string;
    vehicleType?: string;
    seatingCapacity?: number;
    isAc?: boolean;
    category?: string;
    ratePerDay?: number;
    images?: string[];
  }>;
  travelers?: number;
  isLeisureDay?: boolean;
}

export function DayVehicleSection({
  day,
  onChange,
  availableVehicles,
  travelers = 2,
  isLeisureDay = false,
}: DayVehicleSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingManualVehicle, setEditingManualVehicle] = useState<Partial<Vehicle> | undefined>(
    undefined
  );
  const isMainBranch = useIsMainBranch();
  const selectedVehicle = availableVehicles?.find(v => v.id === day.vehicleId);

  const handleVehicleSelect = (name: string, vehicle: Vehicle | undefined) => {
    if (vehicle) {
      onChange({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name || name,
        vehicleType: vehicle.vehicleType || '',
        ratePerDay: vehicle.ratePerDay || 0,
        vehicleCount: 1,
        // Vehicle photos are not wanted on itineraries, so none is captured.
        vehicleImage: null,
        pickupPoint: '',
        dropPoint: '',
        _isManualVehicleEntry: false,
      });
    }
  };

  const handleManualEntry = () => {
    if (day.vehicleId?.startsWith('manual-')) {
      setEditingManualVehicle({
        id: day.vehicleId,
        name: day.vehicleName,
        vehicleType: (day.vehicleType as Vehicle['vehicleType']) || 'SEDAN',
        seatingCapacity: day._manualVehicleCapacity,
        isAc: day._manualVehicleIsAc,
        ratePerDay: day.ratePerDay,
        baseLocation: day.pickupPoint || '',
        description: day._manualVehicleDescription,
      });
    } else {
      setEditingManualVehicle(undefined);
    }
    setShowManualModal(true);
  };

  const handleManualSave = (vehicleData: Partial<Vehicle>) => {
    const manualData = vehicleData._manualData as
      | { driverName?: string; driverPhone?: string }
      | undefined;

    onChange({
      vehicleId: vehicleData.id || `manual-${Date.now()}`,
      vehicleName: vehicleData.name || '',
      vehicleType: vehicleData.vehicleType || '',
      ratePerDay: vehicleData.ratePerDay || 0,
      vehicleCount: 1,
      pickupPoint: vehicleData.baseLocation || '',
      dropPoint: '',
      driverIncluded: true,
      vehicleImage: null,
      _manualVehicleDescription: vehicleData.description,
      _manualVehicleCapacity: vehicleData.seatingCapacity,
      _manualVehicleIsAc: vehicleData.isAc,
      _manualVehicleDriverName: manualData?.driverName,
      _manualVehicleDriverPhone: manualData?.driverPhone,
      _isManualVehicleEntry: true,
    });
  };

  const clearVehicle = () => {
    onChange({
      vehicleId: '',
      vehicleName: '',
      vehicleType: '',
      driverIncluded: true,
      ratePerDay: 0,
      vehicleCount: 1,
      pickupPoint: '',
      dropPoint: '',
      _isManualVehicleEntry: false,
    });
  };

  const capacityWarning =
    selectedVehicle?.seatingCapacity && selectedVehicle.seatingCapacity < travelers;

  const handleVehicleCreated = (vehicle: Vehicle) => {
    onChange({
      vehicleId: vehicle.id,
      vehicleName: vehicle.name || '',
      vehicleType: vehicle.vehicleType || '',
      ratePerDay: vehicle.ratePerDay || vehicle.minimumCharge || 0,
      vehicleCount: 1,
      pickupPoint: '',
      dropPoint: '',
    });
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car
              className={cn('h-4 w-4', day.vehicleId ? 'text-primary' : 'text-muted-foreground')}
            />
            <span className="text-sm font-medium">Transport</span>
            {isLeisureDay && (
              <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200 text-[10px] px-1.5 py-0">
                Rest Day
              </Badge>
            )}
          </div>
          {day.vehicleId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearVehicle}
              className="h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Remove
            </Button>
          )}
        </div>

        <VehicleAutocomplete
          value={day.vehicleName}
          onChange={handleVehicleSelect}
          serviceArea=""
          onCreateVehicle={isMainBranch ? () => setShowCreateModal(true) : undefined}
          showCreateButton={isMainBranch}
        />

        {/* Manual Entry for Non-Main Branch */}
        {!isMainBranch && (
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant={day.vehicleId?.startsWith('manual-') ? 'default' : 'outline'}
              size="sm"
              onClick={handleManualEntry}
              className="flex-1 gap-1"
            >
              {day.vehicleId?.startsWith('manual-') ? (
                <>
                  <Edit2 className="h-3 w-3" />
                  Edit Vehicle Details
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  Add Vehicle Details
                </>
              )}
            </Button>
          </div>
        )}

        {/* No vehicle toggle for leisure days */}
        {isLeisureDay && !day.vehicleId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
            <Car className="h-4 w-4 text-neutral-600 shrink-0" />
            <span>No vehicle needed — guests relax at the hotel.</span>
          </div>
        )}

        {/* Selected vehicle info */}
        {day.vehicleId && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-neutral-600" />
              <span className="text-sm font-medium">{day.vehicleName}</span>
              {day.ratePerDay > 0 && (
                <Badge variant="outline" className="bg-neutral-50">
                  ₹{(day.ratePerDay * (day.vehicleCount || 1)).toLocaleString()}/day
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedVehicle?.seatingCapacity && (
                <Badge variant="outline" className="text-xs">
                  {selectedVehicle.seatingCapacity} Seats
                </Badge>
              )}
              {selectedVehicle?.isAc && (
                <Badge
                  variant="outline"
                  className="text-xs bg-neutral-50 text-neutral-700 border-neutral-200"
                >
                  <Snowflake className="h-3 w-3 mr-1" />
                  AC
                </Badge>
              )}
              {selectedVehicle?.category && (
                <Badge variant="outline" className="text-xs capitalize">
                  {selectedVehicle.category.toLowerCase()}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Capacity warning */}
        {capacityWarning && (
          <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
            Warning: Vehicle has {selectedVehicle.seatingCapacity} seats but {travelers} travelers
          </div>
        )}

        {/* Pickup & Drop - Always visible */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">Pickup</Label>
          <Input
            value={day.pickupPoint}
            onChange={e => onChange({ pickupPoint: e.target.value })}
            placeholder="Airport, Hotel..."
            className="h-9 text-sm flex-1"
          />
          <span className="text-muted-foreground shrink-0">-</span>
          <Label className="text-xs text-muted-foreground shrink-0">Drop</Label>
          <Input
            value={day.dropPoint}
            onChange={e => onChange({ dropPoint: e.target.value })}
            placeholder="Hotel, Station..."
            className="h-9 text-sm flex-1"
          />
        </div>

        {/* Vehicle Count & Rate */}
        {day.vehicleId && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Vehicles</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                  onClick={() =>
                    onChange({ vehicleCount: Math.max(1, (day.vehicleCount || 1) - 1) })
                  }
                >
                  -
                </Button>
                <span className="text-sm font-semibold w-8 text-center">
                  {day.vehicleCount || 1}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                  onClick={() => onChange({ vehicleCount: (day.vehicleCount || 1) + 1 })}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rate/Day</Label>
              <Input
                type="number"
                value={day.ratePerDay || ''}
                onChange={e => onChange({ ratePerDay: parseFloat(e.target.value) || 0 })}
                className="h-9 text-sm"
                placeholder={isMainBranch ? '₹' : 'Add price'}
              />
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        {day.vehicleId && day.ratePerDay > 0 && (
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Vehicle ({day.vehicleCount || 1})</span>
              <span>₹{(day.ratePerDay * (day.vehicleCount || 1)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-1 border-t">
              <span>Total / Day</span>
              <span className="text-neutral-600">
                ₹{(day.ratePerDay * (day.vehicleCount || 1)).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {isMainBranch && (
        <VehicleCreateModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreated={handleVehicleCreated}
        />
      )}

      <VehicleManualEntryModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        onSave={handleManualSave}
        initialData={editingManualVehicle}
        mode={editingManualVehicle ? 'edit' : 'create'}
      />
    </>
  );
}
