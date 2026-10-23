// Applies one package option's hotels and vehicles onto the shared days, the
// same way the per-option hotel/transport sections always have: matched by
// day number, falling back to the day's own values.

import type { ItineraryDay, ItineraryOption } from '@/types/index';

export function applyOptionHotels(days: ItineraryDay[], option: ItineraryOption): ItineraryDay[] {
  return days
    .map(day => {
      const optHotel = option.hotels?.find(h => h.dayNumber === day.dayNumber);
      // Only nights this option actually books a hotel for are listed.
      if (!optHotel?.hotelName?.trim()) return null;
      return {
        ...day,
        hotel: optHotel.hotelName,
        hotelId: optHotel.hotelId || day.hotelId,
        hotelAddress: optHotel.hotelAddress || day.hotelAddress,
        hotelContact: optHotel.hotelContact || day.hotelContact,
        hotelStars: optHotel.hotelStars ?? day.hotelStars,
        hotelImage: optHotel.hotelImage || day.hotelImage,
        selectedRoomType: optHotel.roomType
          ? {
              name: optHotel.roomType,
              bedType: optHotel.bedType || day.selectedRoomType?.bedType || 'Double',
              basePrice: optHotel.pricePerNight || day.selectedRoomType?.basePrice || 0,
            }
          : day.selectedRoomType,
        selectedMealPlan: optHotel.mealPlan
          ? {
              type: optHotel.mealPlan as 'EP' | 'CP' | 'MAP' | 'APAI',
              label: optHotel.mealPlan,
              pricePerNight: optHotel.pricePerNight || 0,
            }
          : day.selectedMealPlan,
        numberOfRooms: optHotel.numberOfRooms ?? day.numberOfRooms ?? 1,
        extraBeds: optHotel.extraBeds ?? day.extraBeds ?? 0,
        childrenNoBed: optHotel.childWithoutBed ?? day.childrenNoBed ?? 0,
      } as ItineraryDay;
    })
    .filter((day): day is ItineraryDay => day !== null);
}

export function applyOptionVehicles(days: ItineraryDay[], option: ItineraryOption): ItineraryDay[] {
  return days.map(day => {
    const optVehicle = option.vehicles?.find(v => v.dayNumber === day.dayNumber);
    if (!optVehicle) return day;
    return {
      ...day,
      vehicleId: optVehicle.vehicleId || day.vehicleId,
      vehicleName: optVehicle.vehicleName || day.vehicleName,
      vehicleType: optVehicle.vehicleType || day.vehicleType,
      numberOfVehicles: optVehicle.numberOfVehicles ?? day.numberOfVehicles ?? 1,
    };
  });
}

/** Option price shown to the guest: user-edited final price, then the breakdown, then cost. */
export const optionPrice = (option: ItineraryOption): number =>
  option.finalPrice ?? option.breakdown?.finalPrice ?? option.totalCost ?? 0;
