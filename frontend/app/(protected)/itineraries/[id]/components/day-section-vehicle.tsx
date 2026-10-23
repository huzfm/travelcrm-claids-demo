'use client';

import { useState } from 'react';
import { Car, ChevronDown, ChevronUp, X } from 'lucide-react';
import { VehicleAutocomplete } from '@/components/vehicles/vehicle-autocomplete';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Vehicle, ItineraryDay } from '@/types';
import { useIsMainBranch } from '@/hooks/useAuth';

interface DaySectionVehicleProps {
  day: ItineraryDay;
  destination: string;
  onUpdate: (updates: Partial<ItineraryDay>) => void;
  readOnly?: boolean;
}

export function DaySectionVehicle({
  day,
  destination,
  onUpdate,
  readOnly = false,
}: DaySectionVehicleProps) {
  const [isOpen, setIsOpen] = useState(false); // collapsed by default
  const isMainBranch = useIsMainBranch();

  const hasVehicle = !!day.vehicleId || !!day.vehicleName;
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const handleVehicleSelect = (name: string, vehicle?: Vehicle) => {
    if (!vehicle) {
      onUpdate({
        vehicleName: name,
        vehicleId: undefined,
        vehicleType: undefined,
        vehicleRatePerDay: undefined,
        selectedVehicle: undefined,
      });
      return;
    }

    onUpdate({
      vehicleName: vehicle.name,
      vehicleId: vehicle.id,
      vehicleType: vehicle.vehicleType,
      vehicleRegistration: vehicle.registrationNumber,
      vehicleDriver: vehicle.driverName,
      vehicleDriverPhone: vehicle.driverPhone,
      vehicleRatePerDay: vehicle.ratePerDay,
      vehicleFeatures: vehicle.features,
      // Vehicle photos are not wanted on itineraries.
      vehicleImage: undefined,
      transport: `${vehicle.name} - ${vehicle.vehicleType?.replace('_', ' ') || ''}`,
      selectedVehicle: {
        name: vehicle.name,
        brand: vehicle.brand,
        vehicleType: vehicle.vehicleType,
        seatingCapacity: vehicle.seatingCapacity,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        ratePerDay: vehicle.ratePerDay,
      },
    });
  };

  const handleClearVehicle = () => {
    onUpdate({
      vehicleName: undefined,
      vehicleId: undefined,
      vehicleType: undefined,
      vehicleRegistration: undefined,
      vehicleDriver: undefined,
      vehicleDriverPhone: undefined,
      vehicleRatePerDay: undefined,
      vehicleFeatures: undefined,
      transport: undefined,
      selectedVehicle: undefined,
    });
  };

  return (
    <div className="border-b py-3">
      {/* Header - always visible */}
      <button
        onClick={() => !readOnly && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-left -mx-2 px-2 py-1 rounded transition-colors ${
          !readOnly ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Transport</span>
          {day.dayType === 'leisure' && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-neutral-200 text-neutral-700 bg-neutral-50"
            >
              Leisure Day
            </Badge>
          )}
          {hasVehicle && (
            <span className="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full">
              ✓ {day.vehicleName}
              {day.selectedVehicle?.seatingCapacity
                ? ` · ${day.selectedVehicle.seatingCapacity} Seater`
                : ''}
            </span>
          )}
          {!hasVehicle && day.dayType !== 'leisure' && (
            <span className="text-xs text-muted-foreground">Not set</span>
          )}
        </div>
        {!readOnly &&
          (isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </button>

      {isOpen && (
        <div className="mt-3 pl-6 space-y-4">
          {/* Leisure day message */}
          {day.dayType === 'leisure' && (
            <div className="flex items-center gap-2 text-sm text-neutral-700 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
              <Car className="h-4 w-4 shrink-0" />
              <span>No vehicle needed — guests relax at the hotel or explore independently.</span>
            </div>
          )}

          {/* Vehicle search — hidden in read-only */}
          {!readOnly && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Search Vehicle</label>
              <VehicleAutocomplete
                value={day.vehicleName || ''}
                onChange={handleVehicleSelect}
                serviceArea={destination}
                showCreateButton={true}
              />
            </div>
          )}

          {hasVehicle && (
            <>
              {/* Clear button — hidden in read-only */}
              {!readOnly && (
                <button
                  onClick={handleClearVehicle}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear vehicle
                </button>
              )}

              {/* Number of vehicles and rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    No. of Vehicles
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={day.numberOfVehicles || 1}
                    readOnly={readOnly}
                    onChange={e =>
                      !readOnly &&
                      onUpdate({ numberOfVehicles: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="h-9 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Rate/vehicle/day (₹)
                  </label>
                  <Input
                    type="number"
                    value={day.vehicleRatePerDay || ''}
                    readOnly={readOnly}
                    onChange={e =>
                      !readOnly &&
                      onUpdate({
                        vehicleRatePerDay: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder={isMainBranch ? '2500' : 'Add price'}
                    className="h-9 disabled:bg-muted/30 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Driver info — read-only display */}
              {(day.selectedVehicle?.driverName || day.vehicleDriver) && (
                <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Driver:</span>
                    <span className="font-medium">
                      {day.selectedVehicle?.driverName || day.vehicleDriver}
                    </span>
                    {(day.selectedVehicle?.driverPhone || day.vehicleDriverPhone) && (
                      <span className="text-xs text-muted-foreground">
                        · {day.selectedVehicle?.driverPhone || day.vehicleDriverPhone}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Features */}
              {day.vehicleFeatures && day.vehicleFeatures.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Features</label>
                  <div className="flex flex-wrap gap-1">
                    {day.vehicleFeatures.map((feature, idx) => (
                      <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Transport cost display — main branch only (non-main enters price manually) */}
              {isMainBranch && day.vehicleRatePerDay && day.vehicleRatePerDay > 0 && (
                <div className="space-y-2 bg-neutral-50 rounded-lg px-4 py-3 text-sm">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-neutral-700">Transport cost / day</span>
                    <span className="font-semibold text-neutral-700">
                      {fmt((day.numberOfVehicles || 1) * day.vehicleRatePerDay)}
                    </span>
                  </div>
                  {/* Price breakdown */}
                  <div className="text-xs text-neutral-600 space-y-1 pl-2 border-l-2 border-neutral-300">
                    {(day.numberOfVehicles || 1) > 1 && (
                      <div className="flex justify-between">
                        <span>
                          Vehicles ({day.numberOfVehicles}x ₹
                          {day.vehicleRatePerDay.toLocaleString('en-IN')})
                        </span>
                        <span>
                          ₹
                          {((day.numberOfVehicles || 1) * day.vehicleRatePerDay).toLocaleString(
                            'en-IN'
                          )}
                        </span>
                      </div>
                    )}
                    {(day.numberOfVehicles || 1) === 1 && (
                      <div className="flex justify-between">
                        <span>1 vehicle</span>
                        <span>₹{day.vehicleRatePerDay.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
