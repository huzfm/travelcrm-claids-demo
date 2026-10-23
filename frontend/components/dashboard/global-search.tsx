'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrencyText } from '@/lib/currency';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Loader2, MapPin, Search, User } from 'lucide-react';

export interface GlobalSearchProps {
  placeholder?: string;
  className?: string;
}

/**
 * Search box over trips and leads. Every itinerary is a trip and carries a
 * tripId, so a trip is findable by its id, title, destination or customer.
 */
export function GlobalSearch({
  placeholder = 'Search trip ID, client, phone...',
  className,
}: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isFetching, isPending, enabled } = useGlobalSearch(query);

  const results = [
    ...(data?.trips ?? []).map(t => ({ kind: 'trip' as const, item: t })),
    ...(data?.leads ?? []).map(l => ({ kind: 'lead' as const, item: l })),
  ];

  // Close when focus or the pointer leaves the search box entirely.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // Results change as the user types, so clamp rather than resetting the
  // index from an effect.
  const highlighted = activeIndex < results.length ? activeIndex : 0;

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    // Typing a whole trip ID is unambiguous, so Enter jumps to that trip
    // rather than making the user pick it out of the list.
    if (event.key === 'Enter' && data?.exactMatch) {
      event.preventDefault();
      go(data.exactMatch.href);
      return;
    }

    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(i => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(i => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = results[highlighted];
      if (chosen) go(chosen.item.href);
    }
  };

  const showPanel = open && enabled;
  const busy = isFetching || isPending;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="pl-9 pr-9"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-autocomplete="list"
      />
      {busy && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg"
        >
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {busy ? 'Searching…' : `No matches for "${query.trim()}"`}
              </p>
              {!busy && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Try a trip ID, client name, phone number or email.
                </p>
              )}
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result, index) => (
                <li key={`${result.kind}-${result.item.id}`}>
                  {(index === 0 || results[index - 1].kind !== result.kind) && (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {result.kind === 'trip' ? 'Trips' : 'Clients'}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === highlighted}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(result.item.href)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                      index === highlighted ? 'bg-muted' : 'hover:bg-muted/50'
                    )}
                  >
                    {result.kind === 'trip' ? (
                      <>
                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {result.item.lead?.name
                              ? `${result.item.lead.name} — ${result.item.destination || result.item.title}`
                              : result.item.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {result.item.exact && (
                              <span className="mr-1 rounded bg-primary/10 px-1 py-px font-medium text-primary">
                                exact match
                              </span>
                            )}
                            {result.item.tripId ?? 'Trip'}
                            {result.item.startDate &&
                              ` • ${new Date(result.item.startDate).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                timeZone: 'UTC',
                              })}`}
                          </span>
                        </span>
                        {result.item.totalCost ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatCurrencyText(result.item.totalCost, result.item.currency)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {result.item.name}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {result.item.status}
                            {result.item.phone && ` • ${result.item.phone}`}
                          </span>
                        </span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
