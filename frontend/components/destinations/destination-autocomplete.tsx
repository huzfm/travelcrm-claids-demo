'use client';

import { useState, useEffect, useRef } from 'react';
import { useDestinationSearch } from '@/hooks/useDestinations';
import { Search, MapPin, Loader2, Mountain, Plus, X } from 'lucide-react';
import type { Destination } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DestinationAutocompleteProps {
  value: string;
  onChange: (value: string, destination?: Destination) => void;
  destination?: string;
  onCreateDestination?: () => void;
  showCreateButton?: boolean;
}

const placeTypeColors: Record<string, string> = {
  MOUNTAIN: 'bg-neutral-100 text-neutral-700',
  BEACH: 'bg-neutral-100 text-neutral-700',
  CITY: 'bg-neutral-100 text-neutral-700',
  DESERT: 'bg-red-100 text-red-700',
  FOREST: 'bg-neutral-100 text-neutral-700',
  HISTORICAL: 'bg-red-100 text-red-700',
  ADVENTURE: 'bg-red-100 text-red-700',
  RELIGIOUS: 'bg-neutral-100 text-neutral-700',
  OTHER: 'bg-neutral-100 text-neutral-700',
};

export function DestinationAutocomplete({
  value,
  onChange,
  destination,
  onCreateDestination,
  showCreateButton = true,
}: DestinationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (dest: Destination) => {
    onChange(dest.name, dest);
    setSearch(dest.name);
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
    setIsOpen(true); // Always show dropdown on typing
  };

  // Query for destinations - when focused/empty show all, when typing filter
  const query = isOpen && !search ? '' : search || destination || '';
  const { data: destinations, isLoading } = useDestinationSearch(query, 0);

  // When opened without search, show all destinations
  const { data: allDestinations, isLoading: isLoadingAll } = useDestinationSearch('', 0);

  const displayDestinations = search.length >= 1 ? destinations || [] : allDestinations || [];

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
            placeholder="Search destination..."
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
          {isLoading || isLoadingAll ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : (
            <>
              {/* Show search results if searching, otherwise show all destinations */}
              {displayDestinations.length > 0 ? (
                <div className="py-1">
                  {displayDestinations.map(dest => (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => handleSelect(dest)}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                          <Mountain className="h-5 w-5 text-muted-foreground/50" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{dest.name}</span>
                            <span
                              className={cn(
                                'text-xs px-1.5 py-0.5 rounded-full shrink-0 capitalize',
                                placeTypeColors[dest.placeType] || placeTypeColors.OTHER
                              )}
                            >
                              {dest.placeType.toLowerCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{dest.address}</span>
                          </div>
                          {dest.shortDescription && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {dest.shortDescription}
                            </p>
                          )}
                          {dest.highlights && dest.highlights.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {dest.highlights.length} highlights
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  {showCreateButton && onCreateDestination && (
                    <div className="p-3 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setIsOpen(false);
                          onCreateDestination();
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Destination
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {search.length >= 1 ? 'No destinations found' : 'No destinations available'}
                  </p>
                  {showCreateButton && onCreateDestination && (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setIsOpen(false);
                        onCreateDestination();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Destination
                    </Button>
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
