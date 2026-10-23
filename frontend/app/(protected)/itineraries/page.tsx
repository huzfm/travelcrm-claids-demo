'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { useItineraries } from '@/hooks/useItineraries';
import { useItineraryDrafts, type ItineraryDraftSummary } from '@/hooks/use-itinerary-drafts';
import { Plus, FileText, MapPin, Plane, Search, Send, Tag, Hourglass } from 'lucide-react';
import { ItineraryCard } from '@/components/itineraries/itinerary-card';
import { IncompleteItineraryCard } from '@/components/itineraries/incomplete-itinerary-card';
import type { Itinerary } from '@/types';

export default function ItinerariesPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [destinationFilter, setDestinationFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tab, setTab] = useState('all');

  const { data: itinerariesData, isLoading } = useItineraries();
  const { data: drafts = [], isLoading: isLoadingDrafts } = useItineraryDrafts();

  const itineraries: Itinerary[] = useMemo(() => {
    if (!itinerariesData) return [];
    // Handle both new format { itineraries: [] } and legacy array format
    const arr = Array.isArray(itinerariesData)
      ? itinerariesData
      : Array.isArray(itinerariesData.itineraries)
        ? itinerariesData.itineraries
        : [];
    // Parse daysJson if it's a string (from backend JSON storage)
    return arr.map(it => ({
      ...it,
      daysJson:
        typeof it.daysJson === 'string'
          ? (() => {
              try {
                return JSON.parse(it.daysJson);
              } catch {
                return [];
              }
            })()
          : it.daysJson,
    }));
  }, [itinerariesData]);

  const stats = useMemo(() => {
    const total = itineraries.length;
    const drafts = itineraries.filter(it => !it.sharedVia).length;
    const sent = itineraries.filter(
      it => it.sharedVia === 'whatsapp' || it.sharedVia === 'link'
    ).length;
    return { total, drafts, sent };
  }, [itineraries]);

  const filteredItineraries = useMemo(() => {
    return itineraries.filter(it => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !it.title?.toLowerCase().includes(query) &&
          !it.destination?.toLowerCase().includes(query) &&
          !it.lead?.name?.toLowerCase().includes(query) &&
          !it.tripId?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'SENT' && !it.sharedVia) return false;
        if (statusFilter === 'DRAFT' && it.sharedVia) return false;
      }
      if (destinationFilter !== 'all' && it.destination !== destinationFilter) {
        return false;
      }
      // Date range filter - filters by travel start date
      if (dateFrom && it.startDate) {
        const startDate = new Date(it.startDate);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (startDate < fromDate) return false;
      }
      if (dateTo && it.startDate) {
        const startDate = new Date(it.startDate);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (startDate > toDate) return false;
      }
      return true;
    });
  }, [itineraries, searchQuery, statusFilter, destinationFilter, dateFrom, dateTo]);

  // Incomplete itineraries only carry what step 1 captured, so only the
  // search and destination filters apply to them.
  const filteredDrafts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return drafts.filter(d => {
      if (
        query &&
        !d.title?.toLowerCase().includes(query) &&
        !d.destination?.toLowerCase().includes(query) &&
        !d.clientName?.toLowerCase().includes(query) &&
        !d.lead?.name?.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (destinationFilter !== 'all' && d.destination !== destinationFilter) return false;
      return true;
    });
  }, [drafts, searchQuery, destinationFilter]);

  const availableDestinations = useMemo(() => {
    const dests = new Set(itineraries.map(it => it.destination).filter(Boolean));
    return Array.from(dests).sort();
  }, [itineraries]);

  return (
    <PageWrapper>
      <PageHeader
        title="Itineraries"
        description="Create beautiful travel plans for your clients"
        action={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Itinerary
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 stagger-children">
        <div className="rounded-xl border bg-card shadow-brand p-4 sm:p-5 text-center hover:shadow-brand-lg transition-all duration-200 hover:-translate-y-0.5">
          <p className="text-3xl font-bold text-primary stat-number">{stats.total}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Itineraries</p>
        </div>
        <div className="rounded-xl border bg-card shadow-brand p-4 sm:p-5 text-center hover:shadow-brand-lg transition-all duration-200 hover:-translate-y-0.5">
          <p className="text-3xl font-bold text-foreground stat-number">{stats.drafts}</p>
          <p className="text-sm text-muted-foreground mt-1">Drafts</p>
        </div>
        <div className="rounded-xl border bg-card shadow-brand p-4 sm:p-5 text-center hover:shadow-brand-lg transition-all duration-200 hover:-translate-y-0.5">
          <p className="text-3xl font-bold text-success stat-number">{stats.sent}</p>
          <p className="text-sm text-muted-foreground mt-1">Sent to Clients</p>
        </div>
        <button
          type="button"
          onClick={() => setTab('incomplete')}
          className="rounded-xl border bg-card shadow-brand p-4 sm:p-5 text-center hover:shadow-brand-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
        >
          <p className="text-3xl font-bold text-amber-600 stat-number">{drafts.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Incomplete</p>
        </button>
      </div>

      {/* Quick Create */}
      {itineraries.length === 0 && drafts.length === 0 && (
        <div className="rounded-xl border bg-card shadow-brand p-5 sm:p-6 mb-6">
          <h3 className="font-semibold mb-2 text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            Start a New Trip
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first itinerary to get started:
          </p>
          <Button onClick={() => router.push('/itineraries/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Itinerary
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 max-w-full overflow-x-auto justify-start">
          <TabsTrigger value="all">
            <FileText className="mr-1.5 h-4 w-4" /> All
          </TabsTrigger>
          <TabsTrigger value="drafts">
            <Tag className="mr-1.5 h-4 w-4" /> Drafts
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="mr-1.5 h-4 w-4" /> Sent
          </TabsTrigger>
          <TabsTrigger value="incomplete">
            <Hourglass className="mr-1.5 h-4 w-4" /> Incomplete
            {drafts.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                {drafts.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search itineraries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
            </SelectContent>
          </Select>
          {availableDestinations.length > 0 && (
            <Select value={destinationFilter} onValueChange={setDestinationFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Destinations</SelectItem>
                {availableDestinations.map(dest => (
                  <SelectItem key={dest} value={dest}>
                    {dest}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-36 h-9 text-xs"
              placeholder="From"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-36 h-9 text-xs"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <TabsContent value="all" className="mt-0">
          {renderItineraries(filteredItineraries, isLoading)}
        </TabsContent>
        <TabsContent value="drafts" className="mt-0">
          {renderItineraries(
            filteredItineraries.filter(i => !i.sharedVia),
            isLoading
          )}
        </TabsContent>
        <TabsContent value="sent" className="mt-0">
          {renderItineraries(
            filteredItineraries.filter(i => i.sharedVia),
            isLoading
          )}
        </TabsContent>
        <TabsContent value="incomplete" className="mt-0">
          {renderIncomplete(filteredDrafts, isLoadingDrafts)}
        </TabsContent>
      </Tabs>

      {/* Create Dialog - Navigate to wizard */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Plane className="h-5 w-5 text-accent" />
              </div>
              Create New Itinerary
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ll be taken to our step-by-step wizard to create your itinerary.
            </p>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowCreateDialog(false);
                router.push('/itineraries/new');
              }}
            >
              <Plane className="h-4 w-4 mr-2" />
              Start Creating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );

  function renderIncomplete(items: ItineraryDraftSummary[], loading: boolean) {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl border bg-card shadow-brand animate-pulse" />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-12 text-center">
          <div className="mb-4 rounded-2xl bg-amber-500/5 p-4 border border-amber-500/10">
            <Hourglass className="h-10 w-10 text-amber-500/70" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No incomplete itineraries</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchQuery || destinationFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Itineraries you start and leave before saving are kept here automatically, so you can pick up where you stopped.'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(d => (
          <IncompleteItineraryCard key={d.id} draft={d} />
        ))}
      </div>
    );
  }

  function renderItineraries(items: Itinerary[], loading: boolean) {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border bg-card shadow-brand animate-pulse" />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 p-12 text-center">
          <div className="mb-4 rounded-2xl bg-primary/5 p-4 border border-primary/10">
            <Plane className="h-10 w-10 text-primary/60" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No itineraries found</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first itinerary to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={() => router.push('/itineraries/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create Itinerary
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(it => (
          <ItineraryCard key={it.id} itinerary={it} />
        ))}
      </div>
    );
  }
}
