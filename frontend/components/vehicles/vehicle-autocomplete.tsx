'use client';

import { useState, useEffect, useRef } from 'react';
import { useVehicleSearch } from '@/hooks/useVehicles';
import { Search, MapPin, Loader2, Car, Plus } from 'lucide-react';
import type { Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/providers';

interface VehicleAutocompleteProps {
  value: string;
  onChange: (value: string, vehicle?: Vehicle) => void;
  serviceArea?: string;
  onCreateVehicle?: () => void;
  showCreateButton?: boolean;
  showManualEntry?: boolean;
}

export function VehicleAutocomplete({
  value,
  onChange,
  serviceArea,
  onCreateVehicle,
  showCreateButton = true,
}: VehicleAutocompleteProps) {
  const { user } = useAuthContext();
  const isMainBranch = user?.branchId === 'branch-main';
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = search || serviceArea || '';
  const { vehicles, loading: isLoading } = useVehicleSearch(query, 0);

  // Follow the controlled value (adjusting state during render, not in an effect)
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSearch(value);
  }

  // Auto-open dropdown if serviceArea is provided (for pre-filled destination)
  useEffect(() => {
    if (serviceArea && !search) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-opens for a prefilled service area
      setIsOpen(true);
    }
  }, [serviceArea, search]);

  // Handlers
  const handleSelect = (vehicle: Vehicle) => {
    onChange(vehicle.name, vehicle);
    setSearch(vehicle.name);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue, undefined);
    setIsOpen(newValue.length >= 1);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showDropdown =
    isOpen &&
    (search.length > 0 || isLoading || (vehicles && vehicles.length > 0) || !!serviceArea);

  return (
    <div ref={containerRef} className="relative mt-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Start typing vehicle name..."
          className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching vehicles...</span>
            </div>
          ) : vehicles && vehicles.length > 0 ? (
            <div className="py-1">
              {vehicles.map(vehicle => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => handleSelect(vehicle)}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm text-foreground">{vehicle.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Car className="h-3 w-3" />
                        <span>{vehicle.vehicleType.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>{vehicle.seatingCapacity} Seats</span>
                        {vehicle.isAc && <span className="text-neutral-600">· AC</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {vehicle.baseLocation || vehicle.serviceArea || 'Location not set'}
                      </div>
                    </div>
                    {isMainBranch && vehicle.ratePerDay && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">
                          ₹{vehicle.ratePerDay.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-muted-foreground">per day</div>
                      </div>
                    )}
                  </div>
                  {vehicle.features && vehicle.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {vehicle.features.slice(0, 4).map((feature, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          {feature}
                        </span>
                      ))}
                      {vehicle.features.length > 4 && (
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                          +{vehicle.features.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  {vehicle.registrationNumber && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Reg: {vehicle.registrationNumber}
                    </div>
                  )}
                </button>
              ))}
              {showCreateButton && onCreateVehicle && (
                <div className="p-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setIsOpen(false);
                      onCreateVehicle();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Vehicle
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No vehicles found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
              {showCreateButton && onCreateVehicle && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setIsOpen(false);
                    onCreateVehicle();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Vehicle
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
