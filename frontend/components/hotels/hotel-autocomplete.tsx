'use client';

import { useState, useEffect, useRef } from 'react';
import { useHotelSearch } from '@/hooks/useHotels';
import { useIsMainBranch } from '@/hooks/useAuth';
import { Search, MapPin, Loader2, Star, Plus, X } from 'lucide-react';
import type { Hotel } from '@/types';
import { Button } from '@/components/ui/button';

interface HotelAutocompleteProps {
  value: string;
  onChange: (value: string, hotel?: Hotel) => void;
  destination?: string;
  /** Master destination to limit results to; the API includes everything in it. */
  destinationId?: string;
  /** Name of that master, shown so it's obvious why the list is short. */
  destinationLabel?: string;
  onCreateHotel?: () => void;
  showCreateButton?: boolean;
}

export function HotelAutocomplete({
  value,
  onChange,
  destination,
  destinationId,
  destinationLabel,
  onCreateHotel,
  showCreateButton = true,
}: HotelAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  // Escape hatch: a hotel that hasn't been filed under a destination yet would
  // otherwise be unreachable from a scoped picker.
  const [ignoreScope, setIgnoreScope] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMainBranch = useIsMainBranch();

  // Follow the controlled value (adjusting state during render, not in an effect)
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSearch(value);
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (hotel: Hotel) => {
    onChange(hotel.name, hotel);
    setSearch(hotel.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('', undefined);
    setSearch('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue, undefined);
    setIsOpen(true);
  };

  const scopeId = ignoreScope ? undefined : destinationId;
  // With a scope the destination name must not also be used as the text query,
  // or it would match on hotel names as well.
  const query = search || (scopeId ? '' : destination || '');
  const { data: hotels, isLoading } = useHotelSearch(query, 0, scopeId);

  return (
    <div ref={containerRef} className="relative mt-1">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder="Search hotel..."
            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
          />
        </div>
        {search && (
          <button
            onClick={handleClear}
            className="px-2 py-2 text-muted-foreground hover:text-foreground border rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {destinationId && (
            <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {ignoreScope
                    ? 'Showing hotels from all destinations'
                    : `Hotels in ${destinationLabel || 'this destination'}`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setIgnoreScope(v => !v)}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                {ignoreScope ? 'Limit to destination' : 'Search all'}
              </button>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : hotels && hotels.length > 0 ? (
            <div className="py-1">
              {hotels.map(hotel => (
                <button
                  key={hotel.id}
                  type="button"
                  onClick={() => handleSelect(hotel)}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{hotel.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 text-red-500 fill-red-500" />
                        <span>{hotel.stars} Stars</span>
                        <span>·</span>
                        <span className="capitalize">{hotel.category}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {hotel.address || hotel.location}
                      </div>
                      {hotel.roomTypes?.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {hotel.roomTypes.length} rooms · {hotel.mealPlans?.length || 0} meal plans
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {isMainBranch && hotel.pricePerNight ? (
                        <>
                          <div className="text-sm font-semibold text-primary">
                            ₹{hotel.pricePerNight.toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-muted-foreground">per night</div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No price set</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {showCreateButton && onCreateHotel && (
                <div className="p-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setIsOpen(false);
                      onCreateHotel();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Hotel
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {scopeId && destinationLabel
                  ? `No hotels in ${destinationLabel}${search ? ' match that search' : ' yet'}`
                  : 'No hotels found'}
              </p>
              {showCreateButton && onCreateHotel && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setIsOpen(false);
                    onCreateHotel();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Hotel
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
