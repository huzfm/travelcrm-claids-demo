import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import type { Vehicle, VehicleFilters } from '@/types';

interface UseVehiclesOptions {
  page?: number;
  limit?: number;
  filters?: VehicleFilters;
  enabled?: boolean;
}

export function useVehicles({
  page = 1,
  limit = 20,
  filters = {},
  enabled = true,
}: UseVehiclesOptions = {}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const fetchVehicles = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (filters.search) params.append('search', filters.search);
        if (filters.vehicleType) params.append('vehicleType', filters.vehicleType);
        if (filters.category) params.append('category', filters.category);
        if (filters.isAc !== undefined) params.append('isAc', String(filters.isAc));
        if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
        if (filters.seatingCapacity)
          params.append('seatingCapacity', String(filters.seatingCapacity));

        const response = await api.get(`/vehicles?${params.toString()}`);
        const data = response.data.data;

        setVehicles(data.vehicles || []);
        setPagination(data.pagination || pagination);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch vehicles');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [page, limit, JSON.stringify(filters), enabled]);

  return { vehicles, loading, error, pagination };
}

// Hook for searching vehicles (for autocomplete)
export function useVehicleSearch(query: string = '', minChars = 2) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (minChars > 0 && query.length < minChars) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears results below the minimum query length
      setVehicles([]);
      return;
    }

    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/vehicles/search?q=${encodeURIComponent(query)}`);
        setVehicles(response.data.data || []);
      } catch (err: any) {
        // Ignore aborted requests (normal during debounce)
        if (err.code === 'ERR_CANCELED' || err.message?.includes('abort')) {
          return;
        }
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchVehicles, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, minChars]);

  return { vehicles, loading };
}

// Hook for getting a single vehicle
export function useVehicle(id: string) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- part of the fetch lifecycle
      setLoading(false);
      return;
    }

    const fetchVehicle = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(`/vehicles/${id}`);
        setVehicle(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch vehicle');
        setVehicle(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [id]);

  return { vehicle, loading, error };
}

// Hook for vehicle CRUD operations
export function useVehicleMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createVehicle = async (data: Partial<Vehicle>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/vehicles', data);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create vehicle';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateVehicle = async (id: string, data: Partial<Vehicle>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.put(`/vehicles/${id}`, data);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update vehicle';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteVehicle = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/vehicles/${id}`);
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete vehicle';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (id: string, file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post(`/vehicles/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to upload image';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createVehicle,
    updateVehicle,
    deleteVehicle,
    uploadImage,
    loading,
    error,
  };
}
