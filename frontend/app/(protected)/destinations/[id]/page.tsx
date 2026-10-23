'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DestinationForm } from '@/components/destinations/destination-form';
import { DestinationCard } from '@/components/destinations/destination-card';
import { useAuthContext } from '@/components/providers';
import api from '@/lib/axios';
import { Plus, Search, ArrowLeft, MapPin, Edit2, Mountain } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { useDeleteDestination, useInvalidateDestinations } from '@/hooks/useDestinations';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { placeTypeColors, type Destination, type PlaceType } from '@/types';

const placeTypeOptions = [
  { value: 'ALL', label: 'All Types' },
  { value: 'MOUNTAIN', label: 'Mountain' },
  { value: 'BEACH', label: 'Beach' },
  { value: 'CITY', label: 'City' },
  { value: 'DESERT', label: 'Desert' },
  { value: 'FOREST', label: 'Forest' },
  { value: 'HISTORICAL', label: 'Historical' },
  { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'RELIGIOUS', label: 'Religious' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * Step two: everything inside one master destination. This is where the
 * place-level detail lives, so the cards here are the rich ones.
 */
export default function MasterDestinationPage() {
  const params = useParams();
  const router = useRouter();
  const masterId = String(params.id);

  const { user } = useAuthContext();
  const [master, setMaster] = useState<Destination | null>(null);
  const [children, setChildren] = useState<Destination[]>([]);
  const [total, setTotal] = useState(0);
  // One generous page with a "Load more" rather than page controls — a master
  // rarely holds enough places to need paging at all.
  const [limit, setLimit] = useState(60);
  const [searchInput, setSearchInput] = useState('');
  const [placeType, setPlaceType] = useState<PlaceType | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [isEditingMaster, setIsEditingMaster] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const deleteDestination = useDeleteDestination();
  const invalidateDestinations = useInvalidateDestinations();
  const debouncedSearch = useDebounce(searchInput, 300);

  const userRole = user?.role;
  const canManage = userRole === 'ADMIN' || userRole === 'MANAGER';

  const fetchMaster = useCallback(async () => {
    try {
      const res = await api.get(`/destinations/${masterId}`);
      if (res.data.success) {
        // This page only makes sense for a master. A link to something inside one
        // — from a hotel, say — lands on its master instead of an empty screen.
        if (res.data.data.parentId) {
          router.replace(`/destinations/${res.data.data.parentId}`);
          return;
        }
        setMaster(res.data.data);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
  }, [masterId, router]);

  const fetchChildren = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = new URLSearchParams();
      query.set('parentId', masterId);
      query.set('limit', String(limit));
      if (debouncedSearch) query.set('search', debouncedSearch);
      if (placeType) query.set('placeType', placeType);

      const res = await api.get(`/destinations?${query.toString()}`);
      if (res.data.success) {
        setChildren(res.data.data.destinations || []);
        setTotal(res.data.data.pagination?.total ?? 0);
      } else {
        toast.error(res.data.error || 'Failed to load destinations');
      }
    } catch {
      toast.error('Failed to load destinations');
    } finally {
      setIsLoading(false);
    }
  }, [masterId, debouncedSearch, placeType, limit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off a data fetch
    fetchMaster();
  }, [fetchMaster]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off a data fetch
    fetchChildren();
  }, [fetchChildren]);

  const refresh = useCallback(() => {
    invalidateDestinations();
    fetchMaster();
    fetchChildren();
  }, [invalidateDestinations, fetchMaster, fetchChildren]);

  const handleCreate = useCallback(
    async (formData: Record<string, unknown>) => {
      setIsCreating(true);
      try {
        const res = await api.post('/destinations', formData);
        if (res.data.success) {
          toast.success('Destination created!');
          setIsAddDialogOpen(false);
          refresh();
        } else {
          toast.error(res.data.error || 'Failed to create destination');
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to create destination');
      } finally {
        setIsCreating(false);
      }
    },
    [refresh]
  );

  const handleUpdate = useCallback(
    async (formData: Record<string, unknown>) => {
      const target = isEditingMaster ? master : editingDestination;
      if (!target) return;
      setIsUpdating(true);
      try {
        const res = await api.put(`/destinations/${target.id}`, formData);
        if (res.data.success) {
          toast.success('Destination updated!');
          setEditingDestination(null);
          setIsEditingMaster(false);
          refresh();
        } else {
          toast.error(res.data.error || 'Failed to update destination');
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to update destination');
      } finally {
        setIsUpdating(false);
      }
    },
    [isEditingMaster, master, editingDestination, refresh]
  );

  const handleDelete = useCallback(
    async (destination: Destination) => {
      // The API refuses one that still has hotels, so this only guards misclicks.
      if (!confirm(`Delete "${destination.name}"? This cannot be undone.`)) return;
      try {
        const res = await deleteDestination.mutateAsync(destination.id);
        if (res.success) {
          toast.success('Destination deleted!');
          refresh();
        } else {
          toast.error(res.error || 'Failed to delete destination');
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to delete destination');
      }
    },
    [deleteDestination, refresh]
  );

  const openAddDialog = () => {
    setFormKey(k => k + 1);
    setIsAddDialogOpen(true);
  };

  if (notFound) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Mountain className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">Destination not found</h3>
          <p className="text-sm text-muted-foreground mt-1">It may have been deleted or moved.</p>
          <Button className="mt-4" size="sm" onClick={() => router.push('/destinations')}>
            Back to destinations
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Link
        href="/destinations"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All master destinations
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-medium tracking-normal text-foreground">
              {master?.name ?? <Skeleton className="h-7 w-40 inline-block align-middle" />}
            </h1>
            {master && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full capitalize',
                  placeTypeColors[master.placeType] || placeTypeColors.OTHER
                )}
              >
                {master.placeType.toLowerCase()}
              </span>
            )}
          </div>
          {master?.country && (
            <p className="mt-1 flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {master.country}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canManage && master && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditingMaster(true);
                setFormKey(k => k + 1);
              }}
            >
              <Edit2 className="h-4 w-4 mr-1.5" />
              Edit Master
            </Button>
          )}
          {canManage && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Destination
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add destination inside {master?.name}</DialogTitle>
                </DialogHeader>
                <DestinationForm
                  key={`add-child-${formKey}`}
                  lockParent
                  initialData={{ parentId: masterId }}
                  onSubmit={handleCreate}
                  onCancel={() => setIsAddDialogOpen(false)}
                  isLoading={isCreating}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 my-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search inside ${master?.name ?? 'this destination'}...`}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={placeType || 'ALL'}
          onValueChange={v => setPlaceType(v === 'ALL' ? undefined : (v as PlaceType))}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {placeTypeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : children.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Mountain className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">Nothing inside {master?.name} yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchInput || placeType
              ? 'Try adjusting your search or filter'
              : `Add the places inside ${master?.name ?? 'it'} — the ones you write itineraries about.`}
          </p>
          {canManage && !searchInput && !placeType && (
            <Button className="mt-4" size="sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Destination
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map(destination => (
            <DestinationCard
              key={destination.id}
              destination={destination}
              canManage={canManage}
              onEdit={setEditingDestination}
              onDelete={handleDelete}
              isDeleting={deleteDestination.isPending}
            />
          ))}
        </div>
      )}

      {children.length > 0 && total > children.length && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-xs text-muted-foreground">
            Showing {children.length} of {total}
          </span>
          <Button variant="outline" size="sm" onClick={() => setLimit(n => n + 60)}>
            Load more
          </Button>
        </div>
      )}

      {/* Edit — either the master itself or one of the destinations inside it */}
      <Dialog
        open={!!editingDestination || isEditingMaster}
        onOpenChange={open => {
          if (!open) {
            setEditingDestination(null);
            setIsEditingMaster(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {isEditingMaster ? master?.name : editingDestination?.name}
            </DialogTitle>
          </DialogHeader>
          {(isEditingMaster ? master : editingDestination) && (
            <DestinationForm
              key={`edit-${isEditingMaster ? master?.id : editingDestination?.id}-${formKey}`}
              initialData={(isEditingMaster ? master : editingDestination) ?? undefined}
              onSubmit={handleUpdate}
              onCancel={() => {
                setEditingDestination(null);
                setIsEditingMaster(false);
              }}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
