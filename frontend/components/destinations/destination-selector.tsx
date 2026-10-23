'use client';

import { useState, useEffect, useRef } from 'react';
import { useDestinationSearch, useDestinationsInMaster } from '@/hooks/useDestinations';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Destination } from '@/types';

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

export interface SelectedDestination {
  id: string;
  name: string;
  address?: string;
  placeType?: string;
  bestTimeToVisit?: string;
  highlights?: string[];
  shortDescription?: string;
  description?: string;
  amenities?: string[];
  averageTemperature?: string;
  language?: string;
  currency?: string;
  timezone?: string;
  thingsToKnow?: string;
}

interface DestinationSelectorProps {
  value: SelectedDestination | null;
  onChange: (destination: SelectedDestination | null) => void;
  placeholder?: string;
  prefillQuery?: string;
  showAddressInput?: boolean;
  className?: string;
  /**
   * Master destination the trip is scoped to. Offers that master and the places
   * inside it instead of searching every destination, so a Kashmir trip picks
   * between Srinagar, Gulmarg and Pahalgam.
   */
  parentId?: string;
  /** Name of that master, shown so it's clear why the list is short. */
  parentName?: string;
}

// ─── Selected Destination Card ─────────────────────────────────────────────────
function SelectedDestinationCard({
  value,
  onChange,
  showAddressInput,
  onChangeClick,
}: {
  value: SelectedDestination;
  onChange: (destination: SelectedDestination | null) => void;
  showAddressInput: boolean;
  onChangeClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [customAddress, setCustomAddress] = useState(value.address || '');

  const handleClear = () => {
    onChange(null);
  };

  // Quick info pills
  const quickInfo: { label: string; value: string; color: string }[] = [];
  if (value.bestTimeToVisit)
    quickInfo.push({
      label: 'Best Time',
      value: value.bestTimeToVisit,
      color: 'bg-neutral-50 text-neutral-700',
    });
  if (value.averageTemperature)
    quickInfo.push({
      label: 'Temp',
      value: value.averageTemperature,
      color: 'bg-red-50 text-red-700',
    });
  if (value.language)
    quickInfo.push({
      label: 'Lang',
      value: value.language,
      color: 'bg-neutral-50 text-neutral-700',
    });
  if (value.currency)
    quickInfo.push({
      label: 'Currency',
      value: value.currency,
      color: 'bg-neutral-50 text-neutral-700',
    });

  return (
    <div
      className="animate-in fade-in zoom-in-95 duration-150"
      style={{ animationDuration: '150ms', animationFillMode: 'both' }}
    >
      <div className="bg-[rgba(219,2,1,0.05)] border border-[rgba(219,2,1,0.2)] rounded-xl p-3">
        {/* Main row: image + info + actions */}
        <div className="flex items-start gap-3">
          {/* Image thumbnail */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-6 w-6 text-primary/50" />
          </div>

          {/* Destination info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground leading-tight">
                  {value.name}
                </p>
                {value.address && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{value.address}</p>
                )}
                {/* Category badge */}
                {value.placeType && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium mt-1.5',
                      placeTypeColors[value.placeType] || 'bg-neutral-100 text-neutral-700'
                    )}
                  >
                    {value.placeType}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onChangeClick}
                  className="text-[rgb(219,2,1)] text-xs font-medium px-2 py-1 rounded-md hover:bg-[rgba(219,2,1,0.1)] transition-colors"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-red-400 text-xs font-medium px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Short description */}
        {value.shortDescription && (
          <p className="text-xs text-muted-foreground mt-3 pl-0.5 leading-relaxed">
            {value.shortDescription}
          </p>
        )}

        {/* Quick info pills */}
        {quickInfo.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {quickInfo.map((info, idx) => (
              <span
                key={idx}
                className={cn('text-[11px] px-2 py-0.5 rounded font-medium', info.color)}
              >
                {info.label}: {info.value}
              </span>
            ))}
          </div>
        )}

        {/* Highlights */}
        {value.highlights && value.highlights.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
              Highlights
            </p>
            <div className="flex flex-wrap gap-1.5">
              {value.highlights.map((highlight, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded font-medium"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expand/collapse for more details */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 pt-2 border-t border-[rgba(219,2,1,0.15)] flex items-center justify-between text-[11px] text-[rgba(219,2,1,0.7)] hover:text-[rgba(219,2,1,1)] transition-colors"
        >
          <span>{expanded ? 'Show less' : 'Show more details'}</span>
          <span className={cn('transition-transform', expanded && 'rotate-180')}>▼</span>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Description */}
            {value.description && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
                  Description
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{value.description}</p>
              </div>
            )}

            {/* Amenities */}
            {value.amenities && value.amenities.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
                  Amenities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {value.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 bg-neutral-50 text-neutral-700 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Things to know */}
            {value.thingsToKnow && (
              <div className="bg-red-50/50 border border-red-100 rounded-lg p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-red-700 mb-1 font-medium">
                  Things to Know
                </p>
                <p className="text-xs text-red-800 leading-relaxed">{value.thingsToKnow}</p>
              </div>
            )}

            {/* Timezone */}
            {value.timezone && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-medium">Timezone:</span>
                <span>{value.timezone}</span>
              </div>
            )}
          </div>
        )}

        {/* Custom address input */}
        {showAddressInput && (
          <div className="mt-3 pt-3 border-t border-[rgba(219,2,1,0.15)]">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1 uppercase tracking-wider">
              <MapPin className="h-3 w-3" /> Custom Address
            </label>
            <input
              type="text"
              value={customAddress}
              onChange={e => {
                setCustomAddress(e.target.value);
                onChange({ ...value, address: e.target.value });
              }}
              placeholder="Enter custom address..."
              className="w-full px-3 py-1.5 text-sm border border-[rgba(219,2,1,0.2)] rounded-md focus:outline-none focus:ring-2 focus:ring-[rgba(219,2,1,0.2)] bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function DestinationSelector({
  value,
  onChange,
  placeholder = 'Search destination...',
  prefillQuery,
  showAddressInput = false,
  className = '',
  parentId,
  parentName,
}: DestinationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value?.name || prefillQuery || '');
  // Escape hatch for a day that genuinely sits outside the trip's master.
  const [ignoreScope, setIgnoreScope] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scopeId = ignoreScope ? undefined : parentId;
  const isScoped = Boolean(scopeId);

  // Scoped: one cached fetch of the master and everything in it, filtered as
  // you type. Unscoped: the original search across every destination.
  const { data: inMaster, isLoading: isLoadingMaster } = useDestinationsInMaster(scopeId);
  const query = search || prefillQuery || '';
  const { data, isLoading: isLoadingSearch } = useDestinationSearch(isScoped ? '' : query, 2);

  const isLoading = isScoped ? isLoadingMaster : isLoadingSearch;
  const results = isScoped
    ? (inMaster || []).filter(d => {
        if (!d?.id) return false;
        const term = search.trim().toLowerCase();
        return !term || d.name.toLowerCase().includes(term);
      })
    : (data || []).filter(d => d.id);

  // Follow the selected value (adjusting state during render, not in an effect)
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) setSearch(value.name);
  }

  useEffect(() => {
    if (prefillQuery && !search) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- applies the prefill query once
      setSearch(prefillQuery);
      setIsOpen(true);
    }
  }, [prefillQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setIsOpen(isScoped || newValue.length >= 2);
  };

  const handleSelect = (destination: Destination) => {
    onChange({
      id: destination.id,
      name: destination.name,
      // A master destination has a country instead of an address.
      address: destination.address ?? undefined,
      placeType: destination.placeType,
      bestTimeToVisit: destination.bestTimeToVisit,
      highlights: destination.highlights,
      shortDescription: destination.shortDescription,
      description: destination.description,
      amenities: destination.amenities,
      averageTemperature: destination.averageTemperature,
      language: destination.language,
      currency: destination.currency,
      timezone: destination.timezone,
      thingsToKnow: destination.thingsToKnow,
    });
    setSearch(destination.name);
    setIsOpen(false);
  };

  const handleChangeClick = () => {
    setSearch('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shouldShowDropdown =
    isOpen && (isScoped || search.length >= 2 || isLoading || (results && results.length > 0));

  // ─── SELECTED STATE ───────────────────────────────────────────────────────
  if (value && value.id) {
    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <SelectedDestinationCard
          value={value}
          onChange={onChange}
          showAddressInput={showAddressInput}
          onChangeClick={handleChangeClick}
        />
      </div>
    );
  }

  // ─── SEARCH INPUT STATE ──────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleSearchChange}
          onFocus={() => (isScoped || search.length >= 2) && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-10 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-[rgb(219,2,1)] focus:ring-2 focus:ring-[rgba(219,2,1,0.15)] transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Helper text when empty */}
      {!search && (
        <p className="text-[12px] text-muted-foreground mt-1.5 pl-0.5">
          {parentId && !ignoreScope
            ? `Places in ${parentName || 'this destination'}`
            : 'Type to search from your destinations database'}
        </p>
      )}

      {/* Dropdown */}
      {shouldShowDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[280px] overflow-y-auto">
          {parentId && (
            <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {ignoreScope
                    ? 'Showing all destinations'
                    : `Places in ${parentName || 'this destination'}`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setIgnoreScope(v => !v)}
                className="shrink-0 text-xs font-medium text-[rgb(219,2,1)] hover:underline"
              >
                {ignoreScope ? 'Limit to trip' : 'Search all'}
              </button>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[rgb(219,2,1)]" />
              <span className="ml-2 text-sm text-muted-foreground">Searching destinations...</span>
            </div>
          ) : results && results.length > 0 ? (
            <div className="py-1.5">
              {results.map(destination => (
                <button
                  key={destination.id}
                  type="button"
                  onClick={() => handleSelect(destination)}
                  className="w-full text-left px-4 py-3 hover:bg-[rgba(219,2,1,0.06)] transition-colors duration-150 border-b border-border/30 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-foreground">{destination.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {destination.address && (
                          <span className="text-[12px] text-muted-foreground truncate">
                            {destination.address}
                          </span>
                        )}
                      </div>
                      {destination.placeType && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium mt-1.5',
                            placeTypeColors[destination.placeType] ||
                              'bg-neutral-100 text-neutral-700'
                          )}
                        >
                          {destination.placeType}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-[13px] text-muted-foreground">
                {isScoped
                  ? `Nothing inside ${parentName || 'this destination'}${search ? ' matches that search' : ' yet'}`
                  : 'No destinations found — Try a different search term'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
