'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { VehicleForm } from '@/components/vehicles/vehicle-form';
import { useAuthContext } from '@/components/providers';
import api from '@/lib/axios';
import {
  Plus,
  Search,
  Car,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Vehicle, VehicleFilters, VehicleType, VehicleCategory } from '@/types';

const categoryOptions = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'LUXURY', label: 'Luxury' },
];

const typeOptions = [
  { value: 'ALL', label: 'All Types' },
  { value: 'SEDAN', label: 'Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'MUV', label: 'MUV' },
  { value: 'MINI_BUS', label: 'Mini Bus' },
  { value: 'BUS', label: 'Bus' },
  { value: 'TEMPO_TRAVELLER', label: 'Tempo Traveller' },
  { value: 'CAR', label: 'Car' },
  { value: 'VAN', label: 'Van' },
  { value: 'JEEP', label: 'Jeep' },
  { value: 'LIMOUSINE', label: 'Limousine' },
  { value: 'OTHER', label: 'Other' },
];

const getCategoryColor = (category: VehicleCategory) => {
  const colors: Record<VehicleCategory, string> = {
    ECONOMY: 'bg-neutral-100 text-neutral-700',
    STANDARD: 'bg-neutral-100 text-neutral-700',
    PREMIUM: 'bg-neutral-100 text-neutral-700',
    LUXURY: 'bg-red-100 text-red-700',
  };
  return colors[category] || colors.STANDARD;
};

const getTypeLabel = (type: VehicleType) => {
  const labels: Record<VehicleType, string> = {
    SEDAN: 'Sedan',
    SUV: 'SUV',
    MUV: 'MUV',
    MINI_BUS: 'Mini Bus',
    BUS: 'Bus',
    TEMPO_TRAVELLER: 'Tempo Traveller',
    CAR: 'Car',
    VAN: 'Van',
    JEEP: 'Jeep',
    LIMOUSINE: 'Limousine',
    OTHER: 'Other',
  };
  return labels[type] || type;
};

export default function VehiclesPage() {
  const { user } = useAuthContext();
  const [filters, setFilters] = useState<VehicleFilters>({ page: 1, limit: 20 });
  const [searchInput, setSearchInput] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const debouncedSearch = useDebounce(searchInput, 300);
  const userRole = user?.role;
  const isAdmin = userRole === 'ADMIN';
  const canManage = isAdmin;

  const fetchVehicles = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.category && filters.category) params.set('category', filters.category);
      if (filters.vehicleType && filters.vehicleType)
        params.set('vehicleType', filters.vehicleType);
      if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
      params.set('page', String(filters.page || 1));
      params.set('limit', String(filters.limit || 20));

      const url = `/vehicles?${params.toString()}`;

      const res = await api.get(url);

      const data = res.data;

      if (data && (data.success || Array.isArray(data))) {
        // Handle both formats: { data: { vehicles: [...] } } and { data: [...] } and direct array [...]
        let vehiclesData: any[] = [];
        let paginationData = { page: 1, limit: 20, total: 0, pages: 0 };

        if (Array.isArray(data)) {
          // Direct array format (no wrapper)
          vehiclesData = data;
        } else if (Array.isArray(data.data)) {
          // Direct array inside data
          vehiclesData = data.data;
        } else if (data.data?.vehicles) {
          // Nested format with pagination
          vehiclesData = data.data.vehicles;
          paginationData = data.data.pagination || paginationData;
        } else {
          vehiclesData = [];
        }

        setVehicles(vehiclesData);
        setPagination(paginationData);
      } else {
        setVehicles([]);
        setPagination({ page: 1, limit: 20, total: 0, pages: 0 });
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load vehicles');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off a data fetch
    fetchVehicles();
  }, [fetchVehicles]);

  const handleCreateVehicle = useCallback(
    async (formData: Record<string, unknown>) => {
      setIsCreating(true);
      try {
        const res = await api.post('/vehicles', formData);
        const data = res.data;

        if (data.success) {
          toast.success('Vehicle created!');
          setIsAddDialogOpen(false);
          fetchVehicles();
        } else {
          toast.error(data.error || 'Failed to create vehicle');
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to create vehicle');
      } finally {
        setIsCreating(false);
      }
    },
    [fetchVehicles]
  );

  const handleUpdateVehicle = useCallback(
    async (formData: Record<string, unknown>) => {
      if (!editingVehicle) return;
      setIsUpdating(true);
      try {
        const res = await api.put(`/vehicles/${editingVehicle.id}`, formData);
        const data = res.data;

        if (data.success) {
          toast.success('Vehicle updated!');
          setEditingVehicle(null);
          fetchVehicles();
        } else {
          toast.error(data.error || 'Failed to update vehicle');
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.error || 'Failed to update vehicle');
      } finally {
        setIsUpdating(false);
      }
    },
    [editingVehicle, fetchVehicles]
  );

  const handleDeleteVehicle = useCallback(
    async (vehicle: Vehicle) => {
      if (
        !confirm(`Delete "${vehicle.name}" (${vehicle.registrationNumber})? This cannot be undone.`)
      )
        return;
      try {
        const res = await api.delete(`/vehicles/${vehicle.id}`);
        const data = res.data;

        if (data.success) {
          toast.success('Vehicle deleted!');
          fetchVehicles();
        } else {
          toast.error(data.error || 'Failed to delete vehicle');
        }
      } catch {
        toast.error('Failed to delete vehicle');
      }
    },
    [fetchVehicles]
  );

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  return (
    <PageWrapper>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-normal text-foreground">
            Vehicle Database
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage vehicle information for itineraries
          </p>
        </div>
        {canManage && (
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
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <VehicleForm
                key={`add-form-${formKey}`}
                onSubmit={handleCreateVehicle}
                onCancel={() => setIsAddDialogOpen(false)}
                isLoading={isCreating}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.category || 'ALL'}
          onValueChange={v =>
            setFilters(prev => ({
              ...prev,
              category: v === 'ALL' ? undefined : (v as VehicleCategory),
              page: 1,
            }))
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

        <Select
          value={filters.vehicleType || 'ALL'}
          onValueChange={v =>
            setFilters(prev => ({
              ...prev,
              vehicleType: v === 'ALL' ? undefined : (v as VehicleType),
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Vehicle Grid */}
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
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Car className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">No vehicles found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {searchInput ? 'Try adjusting your search' : 'Add vehicles to build your database'}
          </p>
          {canManage && !searchInput && (
            <Button className="mt-4" size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Vehicle
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(vehicle => (
            <div
              key={vehicle.id}
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card"
            >
              <div className="p-4 space-y-3">
                {/* Vehicle Name & Category */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1">{vehicle.name}</h3>
                    {vehicle.brand && (
                      <p className="text-xs text-muted-foreground">{vehicle.brand}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full shrink-0',
                      getCategoryColor(vehicle.category)
                    )}
                  >
                    {vehicle.category}
                  </span>
                </div>

                {/* Type & Seating */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Car className="h-3.5 w-3.5" />
                    {getTypeLabel(vehicle.vehicleType)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {vehicle.seatingCapacity} Seats
                  </span>
                  {vehicle.isAc && (
                    <span className="flex items-center gap-1 text-neutral-600">
                      <Star className="h-3 w-3 fill-neutral-600" />
                      AC
                    </span>
                  )}
                </div>

                {/* Registration */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                    {vehicle.registrationNumber}
                  </span>
                </div>

                {/* Price & Location */}
                <div className="flex items-center justify-between">
                  {vehicle.ratePerDay ? (
                    <span className="text-sm font-medium">
                      ₹{vehicle.ratePerDay.toLocaleString('en-IN')}
                      <span className="text-xs text-muted-foreground font-normal">/day</span>
                    </span>
                  ) : vehicle.ratePerKm ? (
                    <span className="text-sm font-medium">
                      ₹{vehicle.ratePerKm.toLocaleString('en-IN')}
                      <span className="text-xs text-muted-foreground font-normal">/km</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Rate on request</span>
                  )}
                  {vehicle.baseLocation && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {vehicle.baseLocation}
                    </span>
                  )}
                </div>

                {/* Features */}
                {vehicle.features && vehicle.features.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {vehicle.features.slice(0, 3).map((feature, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 bg-muted rounded-full">
                        {feature}
                      </span>
                    ))}
                    {vehicle.features.length > 3 && (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        +{vehicle.features.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Driver Info */}
                {vehicle.driverName && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>Driver: {vehicle.driverName}</span>
                    {vehicle.driverPhone && <span>• {vehicle.driverPhone}</span>}
                  </div>
                )}

                {/* Actions */}
                {canManage && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingVehicle(vehicle)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDeleteVehicle(vehicle)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
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

      {/* Edit Dialog */}
      <Dialog open={!!editingVehicle} onOpenChange={open => !open && setEditingVehicle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          {editingVehicle && (
            <VehicleForm
              initialData={editingVehicle}
              onSubmit={handleUpdateVehicle}
              onCancel={() => setEditingVehicle(null)}
              isLoading={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
