'use client';

import { useState, useEffect } from 'react';
import { useHotelSearch } from '@/hooks/useHotels';
import { Search, MapPin, Loader2 } from 'lucide-react';
import type { Hotel } from '@/types';

interface HotelSelectorProps {
  destination?: string;
  onSelect: (hotel: Hotel) => void;
  trigger?: React.ReactNode;
}

export function HotelSelector({ destination, onSelect, trigger }: HotelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: hotels, isLoading } = useHotelSearch(search || destination || '');

  useEffect(() => {
    if (isOpen && destination) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the search when the picker opens
      setSearch(destination);
    }
  }, [isOpen, destination]);

  const handleSelect = (hotel: Hotel) => {
    onSelect(hotel);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-9 px-3 border rounded-md hover:bg-muted transition-colors flex items-center"
        >
          {typeof trigger === 'string' ? trigger : <Search className="h-4 w-4" />}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-80 bg-popover border rounded-lg shadow-lg z-50 p-3">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search hotels..."
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
                  autoFocus
                />
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : hotels && hotels.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {hotels.map(hotel => (
                    <button
                      key={hotel.id}
                      type="button"
                      onClick={() => handleSelect(hotel)}
                      className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="font-medium text-sm">{hotel.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="text-red-500">{hotel.stars} ★</span>
                        <span>·</span>
                        <span className="capitalize">{hotel.category}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {hotel.address || hotel.location}
                      </div>
                      {hotel.pricePerNight && (
                        <div className="mt-1 text-sm font-medium text-primary">
                          ₹{hotel.pricePerNight.toLocaleString('en-IN')}/night
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hotels found. Try a different search.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
