// Vehicle Database Types

export type VehicleCategory = 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'LUXURY';

export type VehicleType =
  | 'SEDAN'
  | 'SUV'
  | 'MUV'
  | 'MINI_BUS'
  | 'BUS'
  | 'TEMPO_TRAVELLER'
  | 'CAR'
  | 'VAN'
  | 'JEEP'
  | 'LIMOUSINE'
  | 'OTHER';

export interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  vehicleType: VehicleType;
  category: VehicleCategory;
  registrationNumber: string;
  vehicleNumber?: string;
  seatingCapacity: number;
  isAc: boolean;
  driverName?: string;
  driverPhone?: string;
  driverLicense?: string;
  features: string[];
  ratePerKm?: number;
  ratePerDay?: number;
  minimumCharge?: number;
  currency: string;
  baseLocation?: string;
  serviceArea?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branchId?: string;
  createdBy?: string;
  /** Internal property used for manual vehicle entry data */
  _manualData?: {
    roomType?: string;
    bedType?: string;
    notes?: string;
  };
}

export interface VehicleFilters {
  search?: string;
  vehicleType?: VehicleType;
  category?: VehicleCategory;
  seatingCapacity?: number;
  isAc?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const vehicleCategoryLabels: Record<VehicleCategory, string> = {
  ECONOMY: 'Economy',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  LUXURY: 'Luxury',
};

export const vehicleCategoryColors: Record<VehicleCategory, string> = {
  ECONOMY: 'bg-gray-100 text-gray-700',
  STANDARD: 'bg-blue-100 text-blue-700',
  PREMIUM: 'bg-purple-100 text-purple-700',
  LUXURY: 'bg-amber-100 text-amber-700',
};

export const vehicleTypeLabels: Record<VehicleType, string> = {
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

export const vehicleTypeIcons: Record<VehicleType, string> = {
  SEDAN: '🚗',
  SUV: '🚙',
  MUV: '🚐',
  MINI_BUS: '🚌',
  BUS: '🚌',
  TEMPO_TRAVELLER: '🚐',
  CAR: '🚗',
  VAN: '🚐',
  JEEP: '吉普',
  LIMOUSINE: '🚐',
  OTHER: '🚕',
};
