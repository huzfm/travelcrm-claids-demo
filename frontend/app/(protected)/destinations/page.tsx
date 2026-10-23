'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DestinationForm } from '@/components/destinations/destination-form';
import { useAuthContext } from '@/components/providers';
import api from '@/lib/axios';
import { Plus, Search, Globe, Building, Edit2, Trash2, ArrowRight, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useDeleteDestination,
  useDestinationTree,
  useInvalidateDestinations,
} from '@/hooks/useDestinations';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { placeTypeColors, placeTypeLabels, type Destination, type DestinationNode } from '@/types';

/** How many of the places inside a master to name on its card before summarising. */
const PREVIEW_COUNT = 4;

/**
 * Step one of the destination database: the master destinations. Each card opens
 * onto the places inside it, which is where the place-level detail lives.
 */
export default function DestinationsPage() {
  const { user } = useAuthContext();
  const [searchInput, setSearchInput] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DestinationNode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // The tree gives each master the names of the places inside it, so a card can
  // show what is actually in there instead of just a count.
  const { data: tree = [], isLoading, refetch } = useDestinationTree(false);
  const deleteDestination = useDeleteDestination();
  const invalidateDestinations = useInvalidateDestinations();
  const debouncedSearch = useDebounce(searchInput, 300);

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Match on the master, its country, or anything inside it — searching "Gulmarg"
  // should surface Kashmir.
  const masters = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return tree;
    return tree.filter(master =>
      [master.name, master.country ?? '', ...master.children.map(child => child.name)]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [tree, debouncedSearch]);

  const refresh = useCallback(() => {
    invalidateDestinations();
    refetch();
  }, [invalidateDestinations, refetch]);

  const handleCreate = useCallback(
    async (formData: Record<string, unknown>) => {
      setIsCreating(true);
      try {
        const res = await api.post('/destinations', formData);
        if (res.data.success) {
          toast.success('Master destination created!');
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
      if (!editing) return;
      setIsUpdating(true);
      try {
        const res = await api.put(`/destinations/${editing.id}`, formData);
        if (res.data.success) {
          toast.success('Master destination updated!');
          setEditing(null);
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
    [editing, refresh]
  );

  const handleDelete = useCallback(
    async (master: DestinationNode) => {
      // The API refuses a master that still holds places or hotels, so this only
      // needs to guard against an accidental click.
      if (!confirm(`Delete "${master.name}"? This cannot be undone.`)) return;
      try {
        const res = await deleteDestination.mutateAsync(master.id);
        if (res.success) {
          toast.success('Master destination deleted!');
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

  /** Only the fields a master actually owns, in the shape the form wants. */
  const toFormData = (master: DestinationNode): Partial<Destination> => ({
    id: master.id,
    name: master.name,
    country: master.country,
    placeType: master.placeType,
    isActive: master.isActive,
    parentId: null,
    _count: master._count,
  });

  return (
    <PageWrapper>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-medium tracking-normal text-foreground">
            Destinations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Open a master destination to manage the places inside it
          </p>
        </div>
        {canManage && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Master Destination
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Master Destination</DialogTitle>
              </DialogHeader>
              <DestinationForm
                key={`add-master-${formKey}`}
                lockParent
                onSubmit={handleCreate}
                onCancel={() => setIsAddDialogOpen(false)}
                isLoading={isCreating}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="my-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search destinations..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      ) : masters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">No master destinations yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {debouncedSearch
              ? 'Try adjusting your search'
              : 'Start with a master like Kashmir, then add Gulmarg and Sonmarg inside it.'}
          </p>
          {canManage && !debouncedSearch && (
            <Button className="mt-4" size="sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Master Destination
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {masters.map(master => {
            const inside = master.children;
            const preview = inside.slice(0, PREVIEW_COUNT);
            const remaining = inside.length - preview.length;

            return (
              <div
                key={master.id}
                className={cn(
                  'group flex flex-col border rounded-lg bg-card transition-shadow hover:shadow-md',
                  !master.isActive && 'opacity-60'
                )}
              >
                <Link
                  href={`/destinations/${master.id}`}
                  className="flex-1 p-4 rounded-t-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* The name wraps instead of clamping, so "Kashmir" is never cut to "Kash…" */}
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-semibold text-base leading-tight break-words min-w-0"
                      title={master.name}
                    >
                      {master.name}
                    </h3>
                    <span
                      className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                        placeTypeColors[master.placeType] || placeTypeColors.OTHER
                      )}
                    >
                      {placeTypeLabels[master.placeType]}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {master.country && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {master.country}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3 shrink-0" />
                      {inside.length} inside
                    </span>
                    {!!master._count?.hotels && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3 shrink-0" />
                        {master._count.hotels} hotel{master._count.hotels === 1 ? '' : 's'}
                      </span>
                    )}
                    {!master.isActive && <span className="text-destructive">Inactive</span>}
                  </div>

                  {/* What is actually in there, so the card says something at a glance. */}
                  <div className="mt-3 min-h-9">
                    {inside.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Nothing inside yet — open to add places.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {preview.map(child => (
                          <span
                            key={child.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded-full max-w-full truncate"
                          >
                            {child.name}
                          </span>
                        ))}
                        {remaining > 0 && (
                          <span className="text-xs text-muted-foreground px-1 py-0.5">
                            +{remaining} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground/70 group-hover:text-foreground">
                    Open
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>

                {canManage && (
                  <div className="flex items-center gap-2 px-4 py-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setFormKey(k => k + 1);
                        setEditing(master);
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(master)}
                      disabled={deleteDestination.isPending}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
          </DialogHeader>
          {editing && (
            <DestinationForm
              key={`edit-${editing.id}-${formKey}`}
              initialData={toFormData(editing)}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
