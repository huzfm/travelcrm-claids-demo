// Hotel types
export type HotelCategory = 'BUDGET' | 'STANDARD' | 'PREMIUM' | 'LUXURY';

export const hotelCategoryLabels: Record<HotelCategory, string> = {
  BUDGET: 'Budget',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  LUXURY: 'Luxury',
};

export const hotelCategoryColors: Record<HotelCategory, string> = {
  BUDGET: 'secondary',
  STANDARD: 'default',
  PREMIUM: 'contacted',
  LUXURY: 'proposal',
};

export type MealPlan = 'EP' | 'CP' | 'MAP' | 'APAI';

export interface RoomType {
  name: string;
  bedType: string;
  basePrice: number;
  extraBedPrice?: number;
  childPrice?: number;
}

export interface HotelMealPlan {
  type: MealPlan;
  label: string;
  pricePerNight: number;
}

export const MEAL_PLAN_LABELS: Record<MealPlan, string> = {
  EP: 'EP - Room Only',
  CP: 'CP - Breakfast',
  MAP: 'MAP - Breakfast & Dinner',
  APAI: 'APAI - All Meals',
};

import type { DestinationRef } from './destination.types';

export interface Hotel {
  id: string;
  name: string;
  category: HotelCategory;
  stars: number;
  /** Display label ("Gulmarg, Kashmir"), kept in sync with `destination` when one is set. */
  location: string;
  /** The destination this hotel is filed under — a master or one inside it. */
  destinationId?: string | null;
  destination?: DestinationRef | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  amenities: string[];
  pricePerNight: number | null;
  currency: string;
  roomTypes: RoomType[];
  mealPlans: HotelMealPlan[];
  images: string[];
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branchId?: string;
  createdBy?: string;
  /** Internal property used for manual hotel entry data */
  _manualData?: {
    roomType?: string;
    bedType?: string;
    mealPlan?: string;
    notes?: string;
  };
}

export interface HotelFilters {
  search?: string;
  category?: HotelCategory | 'ALL';
  stars?: number;
  /** Matches the destination and everything inside it. */
  destinationId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
