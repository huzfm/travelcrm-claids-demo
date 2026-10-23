'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/components/providers';
import { useItineraries, useBookedClients } from '@/hooks/useItineraries';
import {
  Search,
  Calendar,
  Users,
  MapPin,
  FileText,
  Plane,
  ArrowRight,
  Loader2,
  Star,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types';

export default function BookedClientsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [itineraryFilter, setItineraryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('won');

  const { data: bookedClientsData, isLoading: bookedClientsLoading } = useBookedClients({
    limit: 500,
  });

  const { data: itinerariesData, isLoading: itinerariesLoading } = useItineraries();

  const [tripIdSearch, setTripIdSearch] = useState('');

  const bookedLeads: Lead[] = useMemo(() => {
    if (!bookedClientsData?.clients) return [];
    return bookedClientsData.clients;
  }, [bookedClientsData]);

  // Separate won and quote sent leads
  const wonLeads = useMemo(() => bookedLeads.filter(l => l.status === 'WON'), [bookedLeads]);
  const quoteSentLeads = useMemo(
    () => bookedLeads.filter(l => l.status === 'QUOTE_SENT'),
    [bookedLeads]
  );

  const itineraries = useMemo(() => {
    if (!itinerariesData) return [];
    return Array.isArray(itinerariesData) ? itinerariesData : [];
  }, [itinerariesData]);

  // Get itineraries for booked leads
  const bookedItineraries = useMemo(() => {
    const leadIds = new Set(bookedLeads.map(l => l.id));
    let filtered = itineraries.filter((it: any) => it.leadId && leadIds.has(it.leadId));

    // Filter by tripId search (admin only)
    if (isAdmin && tripIdSearch) {
      const tripQuery = tripIdSearch.toLowerCase();
      filtered = filtered.filter((it: any) => it.tripId?.toLowerCase().includes(tripQuery));
    }

    return filtered;
  }, [itineraries, bookedLeads, isAdmin, tripIdSearch]);

  // Create a map of leadId -> itineraries
  const leadItineraryMap = useMemo(() => {
    const map = new Map<string, any[]>();
    bookedItineraries.forEach((it: any) => {
      const existing = map.get(it.leadId) || [];
      map.set(it.leadId, [...existing, it]);
    });
    return map;
  }, [bookedItineraries]);

  // Filter leads by search
  const filteredLeads = useMemo(() => {
    if (!searchQuery) return bookedLeads;
    const query = searchQuery.toLowerCase();
    return bookedLeads.filter(
      (lead: Lead) =>
        lead.name?.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.email?.toLowerCase().includes(query)
    );
  }, [bookedLeads, searchQuery]);

  // Filter by itinerary presence and status
  const filteredLeadsWithItinerary = useMemo(() => {
    let leads = filteredLeads;
    if (statusFilter === 'won') {
      leads = leads.filter((lead: Lead) => lead.status === 'WON');
    } else if (statusFilter === 'quote-sent') {
      leads = leads.filter((lead: Lead) => lead.status === 'QUOTE_SENT');
    }
    if (itineraryFilter === 'with-itinerary') {
      return leads.filter((lead: Lead) => leadItineraryMap.has(lead.id));
    }
    if (itineraryFilter === 'without-itinerary') {
      return leads.filter((lead: Lead) => !leadItineraryMap.has(lead.id));
    }
    return leads;
  }, [filteredLeads, itineraryFilter, statusFilter, leadItineraryMap]);

  const getDestinationGradient = (dest: string) => {
    const images: Record<string, string> = {
      Paris: 'from-neutral-600 to-neutral-600',
      Dubai: 'from-red-600 to-red-600',
      Bali: 'from-neutral-500 to-neutral-500',
      Tokyo: 'from-red-500 to-red-600',
      Maldives: 'from-neutral-400 to-neutral-500',
      default: 'from-neutral-600 to-neutral-600',
    };
    const key = Object.keys(images).find(k => dest?.toLowerCase().includes(k.toLowerCase()));
    return images[key || 'default'];
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Booked Clients"
        description={
          isAdmin
            ? 'View all booked clients and their itineraries'
            : 'View your booked clients and their itineraries'
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="bg-card border-border shadow-brand p-4 text-center">
          <p className="text-3xl font-bold text-primary">{bookedLeads.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Booked</p>
        </Card>
        <Card className="bg-card border-border shadow-brand p-4 text-center">
          <p className="text-3xl font-bold text-success">{wonLeads.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Won</p>
        </Card>
        <Card className="bg-card border-border shadow-brand p-4 text-center">
          <p className="text-3xl font-bold text-neutral-600">{quoteSentLeads.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Quote Sent</p>
        </Card>
        <Card className="bg-card border-border shadow-brand p-4 text-center">
          <p className="text-3xl font-bold text-accent">
            {bookedLeads.length - bookedItineraries.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Pending Itinerary</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {isAdmin && (
          <Input
            placeholder="Search by Trip ID..."
            value={tripIdSearch}
            onChange={e => setTripIdSearch(e.target.value)}
            className="w-48"
          />
        )}
        <Select value={itineraryFilter} onValueChange={setItineraryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by itinerary" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="with-itinerary">With Itinerary</SelectItem>
            <SelectItem value="without-itinerary">Without Itinerary</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="won">Won Only</SelectItem>
            <SelectItem value="quote-sent">Quote Sent Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {(bookedClientsLoading || itinerariesLoading) && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!bookedClientsLoading && filteredLeadsWithItinerary.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4 border border-border">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No booked clients found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery || itineraryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Booked clients will appear here once leads are marked as WON'}
          </p>
        </div>
      )}

      {/* Client Cards Grid */}
      {!bookedClientsLoading && filteredLeadsWithItinerary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeadsWithItinerary.map((lead: Lead) => {
            const leadItineraries = leadItineraryMap.get(lead.id) || [];
            const latestItinerary = leadItineraries[0];
            const hasItinerary = leadItineraries.length > 0;

            return (
              <Card
                key={lead.id}
                className="bg-card border-border shadow-brand hover:shadow-brand-lg transition-all duration-200 overflow-hidden"
              >
                {/* Header with gradient */}
                <div
                  className={cn(
                    'h-24 bg-linear-to-br relative',
                    latestItinerary
                      ? getDestinationGradient(latestItinerary.destination)
                      : 'from-primary/20 to-accent/20'
                  )}
                >
                  <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-lg font-semibold text-white truncate">{lead.name}</h3>
                    <p className="text-white/70 text-sm flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {lead.numberOfPax ? parseInt(lead.numberOfPax) || 2 : 2} travelers
                    </p>
                  </div>
                  {hasItinerary && (
                    <Badge className="absolute top-3 right-3 bg-success/90 text-white border-0">
                      Booked
                    </Badge>
                  )}
                  <Badge
                    className={cn(
                      'absolute top-3 left-3 text-xs',
                      lead.status === 'WON'
                        ? 'bg-success/90 text-white border-0'
                        : 'bg-neutral-600/90 text-white border-0'
                    )}
                  >
                    {lead.status === 'WON' ? 'Won' : 'Quote Sent'}
                  </Badge>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Contact Info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {lead.phone}
                    </span>
                    {lead.email && <span className="truncate text-xs">{lead.email}</span>}
                  </div>

                  {/* Destination */}
                  {latestItinerary && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="font-medium">{latestItinerary.destination}</span>
                    </div>
                  )}

                  {/* Trip Dates */}
                  {latestItinerary?.startDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {format(new Date(latestItinerary.startDate), 'MMM d')}
                        {latestItinerary.endDate &&
                          ` - ${format(new Date(latestItinerary.endDate), 'MMM d, yyyy')}`}
                      </span>
                    </div>
                  )}

                  {/* Itinerary Info */}
                  {hasItinerary ? (
                    <div className="flex items-center gap-2 text-sm bg-accent/10 rounded-lg p-2">
                      <FileText className="h-4 w-4 text-accent" />
                      <span className="flex-1">
                        {leadItineraries.length} itinerary{leadItineraries.length > 1 ? 'es' : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {latestItinerary.daysJson?.length || latestItinerary.days?.length || 0} days
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-2">
                      <FileText className="h-4 w-4" />
                      <span>No itinerary created</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/leads/${lead.id}`)}
                    >
                      View Lead
                    </Button>
                    {hasItinerary ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/itineraries/${latestItinerary.id}`)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        View Itinerary
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/itineraries?leadId=${lead.id}`)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Create Itinerary
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Itinerary Quick Access - Recent Itineraries */}
      {!bookedClientsLoading && bookedItineraries.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Plane className="h-5 w-5 text-accent" />
              Booked Itineraries
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/itineraries')}
              className="text-muted-foreground"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {bookedItineraries.slice(0, 8).map((itinerary: any) => {
              const lead = bookedLeads.find((l: Lead) => l.id === itinerary.leadId);
              return (
                <Card
                  key={itinerary.id}
                  className="bg-card border-border shadow-brand hover:shadow-brand-lg transition-all duration-200 cursor-pointer"
                  onClick={() => router.push(`/itineraries/${itinerary.id}`)}
                >
                  <div className="h-20 bg-linear-to-br from-accent/30 to-primary/30 relative">
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <p className="text-white font-semibold truncate">{itinerary.title}</p>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    {itinerary.tripId && (
                      <div className="flex items-center gap-2 text-xs bg-accent/20 text-accent px-2 py-1 rounded font-medium">
                        <span>Trip ID: {itinerary.tripId}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{itinerary.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{lead?.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {itinerary.daysJson?.length || 0} days
                      </span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-medium',
                          itinerary.sharedVia
                            ? 'bg-success/20 text-success'
                            : 'bg-muted/60 text-muted-foreground'
                        )}
                      >
                        {itinerary.sharedVia ? 'Shared' : 'Draft'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
