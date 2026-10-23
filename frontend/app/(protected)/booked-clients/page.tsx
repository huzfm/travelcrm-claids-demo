'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Calendar,
  Users,
  MapPin,
  FileText,
  Loader2,
  Shield,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { useBookedClients } from '@/hooks/useItineraries';
import { useAuthContext } from '@/components/providers';
import { toast } from 'sonner';

const destinationGradients: Record<string, string> = {
  Paris: 'from-neutral-600 to-neutral-600',
  Dubai: 'from-red-600 to-red-600',
  Bali: 'from-neutral-500 to-neutral-500',
  Tokyo: 'from-red-500 to-red-600',
  Maldives: 'from-neutral-400 to-neutral-500',
  London: 'from-red-600 to-red-500',
  NewYork: 'from-neutral-600 to-neutral-500',
  Singapore: 'from-red-500 to-red-500',
  Bangkok: 'from-red-500 to-red-500',
  Istanbul: 'from-red-700 to-red-600',
  default: 'from-accent/60 to-primary/60',
};

function getDestinationGradient(dest?: string) {
  if (!dest) return destinationGradients.default;
  const key = Object.keys(destinationGradients).find(k =>
    dest?.toLowerCase().includes(k.toLowerCase())
  );
  return key ? destinationGradients[key] : destinationGradients.default;
}

export default function BookedClientsPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  // Which itinerary's confirmation PDF is being built, so only its button spins.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleConfirmation = async (itineraryId: string) => {
    setConfirmingId(itineraryId);
    try {
      const { downloadConfirmationPDF } = await import('@/components/itineraries/pdf/confirmation');
      await downloadConfirmationPDF(itineraryId);
      toast.success('Booking confirmation downloaded');
    } catch (error) {
      console.error('[booked-clients] Confirmation PDF failed:', error);
      toast.error('Could not generate the booking confirmation');
    } finally {
      setConfirmingId(null);
    }
  };

  const { data, isLoading, isFetching } = useBookedClients({
    page,
    limit: 20,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const clients = data?.clients || [];
  const pagination = data?.pagination;

  const totalItineraries = clients.reduce(
    (sum: number, c: { itineraries?: unknown[] }) => sum + (c.itineraries?.length || 0),
    0
  );
  const totalTravelers = clients.reduce(
    (sum: number, c: { numberOfPax?: string }) => sum + (parseInt(c.numberOfPax || '0') || 0),
    0
  );

  return (
    <PageWrapper>
      <PageHeader title="Booked Clients" description="Clients whose itinerary has been made" />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card className="bg-card border-border shadow-brand p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-primary">{clients.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Clients</p>
        </Card>
        <Card className="bg-card border-border shadow-brand p-4 text-center">
          <p className="text-2xl sm:text-3xl font-bold text-accent">{totalItineraries}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Itineraries</p>
        </Card>
        <Card className="bg-card border-border shadow-brand p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl sm:text-3xl font-bold text-success">{totalTravelers}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total Travelers</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        {/* Date Range Filter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Input
            type="date"
            value={dateFrom}
            onChange={e => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="text-xs h-9 flex-1 min-w-[100px]"
            placeholder="From"
          />
          <span className="text-muted-foreground text-xs shrink-0">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="text-xs h-9 flex-1 min-w-[100px]"
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

      {/* Loading */}
      {(isLoading || isFetching) && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isFetching && clients.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-10 sm:p-16 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-5 border border-border">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No booked clients found</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {search || dateFrom || dateTo
              ? 'Try adjusting your search or filters'
              : 'Clients whose itinerary has been made will appear here'}
          </p>
        </div>
      )}

      {/* Client Cards Grid */}
      {!isLoading && !isFetching && clients.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {clients.map((client: any) => {
              const latestItinerary = client.itineraries?.[0];
              const itineraryCount = client.itineraries?.length || 0;

              return (
                <Card
                  key={client.id}
                  className="group bg-card border-border shadow-brand hover:shadow-brand-lg transition-all duration-300 overflow-hidden flex flex-col"
                >
                  {/* Header */}
                  <div
                    className={cn(
                      'h-28 sm:h-32 bg-linear-to-br relative flex-shrink-0',
                      getDestinationGradient(latestItinerary?.destination)
                    )}
                  >
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

                    {/* Trip ID badge */}
                    {latestItinerary?.tripId && (
                      <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <span className="text-white/90 text-xs font-mono font-medium">
                          {latestItinerary.tripId}
                        </span>
                      </div>
                    )}

                    {/* Booked badge */}
                    <Badge className="absolute top-3 right-3 bg-success/90 text-white border-0 text-xs">
                      Booked
                    </Badge>

                    {/* Name & travelers */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg font-bold text-white truncate leading-tight">
                        {client.name}
                      </h3>
                      <p className="text-white/75 text-sm flex items-center gap-1.5 mt-1">
                        <Users className="h-3.5 w-3.5" />
                        {client.numberOfPax ? parseInt(client.numberOfPax) : 2} traveler
                        {(parseInt(client.numberOfPax) || 2) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <CardContent className="p-4 flex flex-col gap-3 flex-1">
                    {/* Contact */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                      <span className="font-medium text-foreground truncate">{client.phone}</span>
                      {client.email && (
                        <span className="text-xs truncate hidden sm:block">{client.email}</span>
                      )}
                    </div>

                    {/* Destination */}
                    {latestItinerary && (
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-accent/10">
                          <MapPin className="h-3.5 w-3.5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {latestItinerary.destination}
                          </p>
                          {latestItinerary.startDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(latestItinerary.startDate), 'MMM d')}
                              {latestItinerary.endDate &&
                                ` - ${format(new Date(latestItinerary.endDate), 'MMM d, yyyy')}`}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Itinerary info */}
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      <FileText className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      <span className="text-sm font-medium flex-1">
                        {itineraryCount === 1 ? '1 itinerary' : `${itineraryCount} itineraries`}
                      </span>
                      {!isAdmin && latestItinerary?.totalCost && (
                        <span className="text-sm font-semibold text-accent">
                          {formatCurrency(latestItinerary.totalCost, latestItinerary.currency)}
                        </span>
                      )}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* All itineraries list */}
                    {itineraryCount > 1 && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 bg-muted/50 border-b border-border">
                          All Itineraries
                        </p>
                        <div className="divide-y divide-border max-h-28 overflow-y-auto">
                          {client.itineraries.map((it: any) => (
                            <button
                              key={it.id}
                              onClick={() => router.push(`/itineraries/${it.id}`)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 transition-colors text-left"
                            >
                              <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs font-medium text-foreground truncate flex-1">
                                {it.title}
                              </span>
                              {it.tripId && (
                                <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                                  {it.tripId}
                                </span>
                              )}
                              <span
                                role="button"
                                title="Download booking confirmation"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!confirmingId) handleConfirmation(it.id);
                                }}
                                className="p-0.5 rounded text-muted-foreground hover:text-primary flex-shrink-0"
                              >
                                {confirmingId === it.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <FileCheck2 className="h-3 w-3" />
                                )}
                              </span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shared status */}
                    {latestItinerary?.sharedVia && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-xs text-success font-medium capitalize">
                          Shared via {latestItinerary.sharedVia}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    {latestItinerary && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-primary/40 text-primary hover:bg-primary/5"
                        disabled={!!confirmingId}
                        onClick={() => handleConfirmation(latestItinerary.id)}
                      >
                        {confirmingId === latestItinerary.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <FileCheck2 className="h-3 w-3 mr-1" />
                        )}
                        Booking Confirmation
                      </Button>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => router.push(`/leads/${client.id}`)}
                      >
                        Lead
                      </Button>
                      {latestItinerary && (
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => router.push(`/itineraries/${latestItinerary.id}`)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Itinerary
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
