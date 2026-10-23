'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { HotelForm } from '@/components/hotels/hotel-form';
import { DestinationFilterSelect } from '@/components/destinations/destination-filter-select';
import { useAuthContext } from '@/components/providers';
import api from '@/lib/axios';
import { hasPermission } from '@/lib/permissions';
import {
  Plus,
  Search,
  Star,
  MapPin,
  Building,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Hotel, HotelFilters, HotelCategory } from '@/types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
  'https://travelcrm-azeesbackend.boi7rl.easypanel.host';

const getImageUrl = (path: string) => {
  if (!path) return undefined;
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
};

const categoryOptions = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'BUDGET', label: 'Budget' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'LUXURY', label: 'Luxury' },
];

const starOptions = [
  { value: '0', label: 'All Stars' },
  { value: '3', label: '3 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '5', label: '5 Stars' },
];

export default function HotelsPage() {
  const { user } = useAuthContext();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<HotelFilters>({
    page: 1,
    limit: 20,
    destinationId: searchParams.get('destinationId') || undefined,
  });
  const [searchInput, setSearchInput] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const debouncedSearch = useDebounce(searchInput, 300);

  // The same keys the API guards on, so a non-admin granted hotel access (a
  // reservation manager, say) gets the buttons the server will accept.
  const canCreate = hasPermission(user, 'hotels.create');
  const canEdit = hasPermission(user, 'hotels.edit');
  const canDelete = hasPermission(user, 'hotels.delete');
  const userRole = user?.role;

  const fetchHotels = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.category && filters.category !== 'ALL') params.set('category', filters.category);
      if (filters.stars) params.set('stars', String(filters.stars));
      if (filters.destinationId) params.set('destinationId', filters.destinationId);
      if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 20));

      const res = await api.get(`/hotels?${params.toString()}`);
      const data = res.data;

      if (data.success) {
        setHotels(data.data.hotels || []);
        setPagination(data.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
      } else {
        toast.error(data.error || 'Failed to load hotels');
      }
    } catch {
      toast.error('Failed to load hotels');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off a data fetch
    fetchHotels();
  }, [fetchHotels]);

  const handleCreateHotel = useCallback(
    async (formData: Record<string, unknown>) => {
      setIsCreating(true);
      try {
        const res = await api.post('/hotels', formData);
        const data = res.data;

        if (data.success) {
          toast.success('Hotel created!');
          setIsAddDialogOpen(false);
          fetchHotels();
        } else {
          toast.error(data.error || 'Failed to create hotel');
        }
      } catch {
        toast.error('Failed to create hotel');
      } finally {
        setIsCreating(false);
      }
    },
    [fetchHotels]
  );

  const handleUpdateHotel = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!editingHotel) return;
      setIsUpdating(true);
      try {
        const res = await api.put(`/hotels/${editingHotel.id}`, formData);
        const data = res.data;

        if (data.success) {
          toast.success('Hotel updated!');
          setEditingHotel(null);
          fetchHotels();
        } else {
          toast.error(data.error || 'Failed to update hotel');
        }
      } catch {
        toast.error('Failed to update hotel');
      } finally {
        setIsUpdating(false);
      }
    },
    [editingHotel, fetchHotels]
  );

  const handleDeleteHotel = useCallback(
    async (hotel: Hotel) => {
      if (!confirm(`Delete "${hotel.name}"? This cannot be undone.`)) return;
      try {
        const res = await api.delete(`/hotels/${hotel.id}`);
        const data = res.data;

        if (data.success) {
          toast.success('Hotel deleted!');
          fetchHotels();
        } else {
          toast.error(data.error || 'Failed to delete hotel');
        }
      } catch {
        toast.error('Failed to delete hotel');
      }
    },
    [fetchHotels]
  );

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn('h-3 w-3', i < count ? 'fill-red-400 text-red-400' : 'text-neutral-300')}
      />
    ));
  };

  const getCategoryColor = (category: HotelCategory) => {
    const colors: Record<HotelCategory, string> = {
      BUDGET: 'bg-neutral-100 text-neutral-700',
      STANDARD: 'bg-neutral-200 text-neutral-800',
      PREMIUM: 'bg-neutral-900 text-white',
      LUXURY: 'bg-red-600 text-white',
    };
    return colors[category] || colors.STANDARD;
  };

  return (
    <PageWrapper>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-normal text-foreground">
            Hotel Database
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage hotel information for itineraries
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Dialog
              open={isAddDialogOpen}
              onOpenChange={open => {
                setIsAddDialogOpen(open);
                if (open) setFormKey(k => k + 1);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Hotel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Hotel</DialogTitle>
                </DialogHeader>
                <HotelForm
                  key={`add-form-${formKey}`}
                  userRole={userRole}
                  onSubmit={handleCreateHotel}
                  onCancel={() => setIsAddDialogOpen(false)}
                  isLoading={isCreating}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hotels..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.category || 'ALL'}
          onValueChange={v =>
            setFilters(prev => ({ ...prev, category: v as HotelCategory | 'ALL', page: 1 }))
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DestinationFilterSelect
          value={filters.destinationId}
          onChange={destinationId => setFilters(prev => ({ ...prev, destinationId, page: 1 }))}
        />

        <Select
          value={String(filters.stars || '0')}
          onValueChange={v =>
            setFilters(prev => ({ ...prev, stars: v === '0' ? undefined : parseInt(v), page: 1 }))
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {starOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hotel Grid */}
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
      ) : hotels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">No hotels found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchInput ? 'Try adjusting your search' : 'Add hotels to build your database'}
          </p>
          {canCreate && !searchInput && (
            <Button className="mt-4" size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Hotel
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotels.map(hotel => (
              <div
                key={hotel.id}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card"
              >
                {/* Image placeholder or actual image */}
                <div className="h-32 bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center relative group">
                  {hotel.images && hotel.images.length > 0 ? (
                    <>
                      <img
                        src={getImageUrl(hotel.images[0])}
                        alt={hotel.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {hotel.images.length > 1 && (
                        <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                          +{hotel.images.length - 1}
                        </div>
                      )}
                    </>
                  ) : (
                    <Building className="h-12 w-12 text-muted-foreground/50" />
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Hotel Name & Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm line-clamp-1">{hotel.name}</h3>
                      <div className="flex items-center gap-1 mt-1">{renderStars(hotel.stars)}</div>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full shrink-0',
                        getCategoryColor(hotel.category)
                      )}
                    >
                      {hotel.category}
                    </span>
                  </div>

                  {/* Where it sits — the breadcrumb when it is filed under a destination */}
                  <div
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    title={hotel.location}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-1">
                      {hotel.destination
                        ? [hotel.destination.parent?.name, hotel.destination.name]
                            .filter(Boolean)
                            .join(' › ')
                        : hotel.location}
                    </span>
                  </div>

                  {/* Price & Amenities */}
                  <div className="flex items-center justify-between">
                    {hotel.pricePerNight ? (
                      <span className="text-sm font-medium">
                        {hotel.currency || 'INR'} {hotel.pricePerNight.toLocaleString()}
                        <span className="text-xs text-muted-foreground font-normal">/night</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Price on request</span>
                    )}
                    {hotel.images && hotel.images.length > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        {hotel.images.length} images
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setEditingHotel(hotel)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDeleteHotel(hotel)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingHotel} onOpenChange={open => !open && setEditingHotel(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Hotel - Add Images</DialogTitle>
          </DialogHeader>
          {editingHotel && (
            <HotelForm
              initialData={editingHotel}
              userRole={userRole}
              onSubmit={handleUpdateHotel}
              onCancel={() => setEditingHotel(null)}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
