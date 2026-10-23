'use client';

import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronDown, ChevronUp, X, Upload, Plus, Trash2 } from 'lucide-react';
import type { Hotel, RoomType, HotelMealPlan, MealPlan } from '@/types';
import { useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { optionalPhoneSchema } from '@/lib/validators';
import { DestinationPicker } from '@/components/destinations/destination-picker';

// Matches the multer limit on POST /uploads/image and /hotels/:id/images, so
// an oversized file is rejected here instead of after a pointless upload
// attempt. Hard cap — files over this are refused outright, never compressed.
// Called from submit handlers only — the timestamp keeps local ids unique.
const manualId = () => `manual-${Date.now()}`;

const MAX_MANUAL_IMAGE_BYTES = 500 * 1024;

const hotelSchema = z.object({
  name: z.string().min(1, 'Hotel name is required'),
  category: z.enum(['BUDGET', 'STANDARD', 'PREMIUM', 'LUXURY']).optional(),
  stars: z.coerce.number().int().min(1).max(5).optional(),
  location: z.string().min(1, 'Location is required'),
  destinationId: z.string().nullable().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  phone: optionalPhoneSchema,
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().optional(),
  amenities: z.string().optional(),
  pricePerNight: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().optional(),
  description: z.string().optional(),
});

type HotelFormData = z.infer<typeof hotelSchema>;

interface HotelFormProps {
  initialData?: Partial<Hotel>;
  userRole?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  /** If false, skips DB save — calls onSelect with built hotel object locally */
  saveToDb?: boolean;
  /** Called instead of API POST when saveToDb is false */
  onLocalSubmit?: (hotel: Hotel) => void;
  /** Force room types section to be expanded by default (for manual entry) */
  forceExpandRoomTypes?: boolean;
  /** Force meal plans section to be expanded by default (for manual entry) */
  forceExpandMealPlans?: boolean;
}

const categoryOptions = [
  { value: 'BUDGET', label: 'Budget' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'LUXURY', label: 'Luxury' },
];

const starOptions = [
  { value: '1', label: '1 Star' },
  { value: '2', label: '2 Stars' },
  { value: '3', label: '3 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '5', label: '5 Stars' },
];

const commonAmenities = [
  'WiFi',
  'Pool',
  'Gym',
  'Restaurant',
  'Spa',
  'Parking',
  'Room Service',
  'Air Conditioning',
  'Bar/Lounge',
  'Business Center',
  'Laundry',
  'Airport Shuttle',
  'Kids Club',
  'Beach Access',
];

const BED_TYPES = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'DOUBLE', label: 'Double' },
  { value: 'TWIN', label: 'Twin' },
  { value: 'TRIPLE', label: 'Triple' },
  { value: 'QUAD', label: 'Quad' },
  { value: 'KING', label: 'King' },
  { value: 'QUEEN', label: 'Queen' },
];

const MEAL_PLAN_OPTIONS: { value: MealPlan; label: string }[] = [
  { value: 'EP', label: 'EP - Room Only' },
  { value: 'CP', label: 'CP - Breakfast' },
  { value: 'MAP', label: 'MAP - Breakfast & Dinner' },
  { value: 'APAI', label: 'APAI - All Meals' },
];

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5 mb-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground/60">{subtitle}</p>}
    </div>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function HotelForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  saveToDb = true,
  onLocalSubmit,
  forceExpandRoomTypes = false,
  forceExpandMealPlans = false,
}: HotelFormProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showRoomTypes, setShowRoomTypes] = useState(forceExpandRoomTypes);
  const [showMealPlans, setShowMealPlans] = useState(forceExpandMealPlans);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    typeof initialData?.amenities === 'string'
      ? JSON.parse(initialData.amenities as unknown as string)
      : Array.isArray(initialData?.amenities)
        ? initialData.amenities
        : []
  );
  const initialImages = Array.isArray(initialData?.images)
    ? initialData.images.map((url: string, i: number) => ({ id: `init-${i}`, url }))
    : [];

  const [images, setImages] = useState<{ id: string; url: string }[]>(initialImages);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [roomTypes, setRoomTypes] = useState<RoomType[]>(
    Array.isArray(initialData?.roomTypes) ? initialData.roomTypes : []
  );

  const [mealPlans, setMealPlans] = useState<HotelMealPlan[]>(
    Array.isArray(initialData?.mealPlans) ? initialData.mealPlans : []
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      category: initialData?.category || undefined,
      stars: initialData?.stars || 3,
      location: initialData?.location || '',
      destinationId: initialData?.destinationId ?? null,
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      country: initialData?.country || '',
      zipCode: initialData?.zipCode || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      website: initialData?.website || '',
      pricePerNight: initialData?.pricePerNight || undefined,
      currency: initialData?.currency || 'INR',
      description: initialData?.description || '',
    },
  });

  // Drives the read-only state of the label input below the picker.
  const pickedDestinationId = useWatch({ control, name: 'destinationId' });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // A manually-entered hotel (saveToDb=false, used inline from the itinerary
    // wizard) has no DB row to attach the image to, but it must still be
    // uploaded rather than embedded as base64 — that base64 string used to
    // ride along inside the itinerary's own save payload, adding tens of MB
    // per photo and making 10+ day itineraries slow or fail to save.
    if (file.size > MAX_MANUAL_IMAGE_BYTES) {
      toast.error(
        `That photo is ${Math.ceil(file.size / 1024)} KB — the maximum is ${MAX_MANUAL_IMAGE_BYTES / 1024} KB.`
      );
      event.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      // A real, already-saved hotel gets its image attached via /hotels/:id/images.
      // Everything else — a brand-new DB hotel with no id yet, AND a manual-entry
      // hotel (whose "id" is a client-side `manual-<timestamp>` placeholder, not
      // a real row) — goes through the generic /uploads/image endpoint instead.
      const hasRealHotelId = saveToDb && !!initialData?.id;

      const formData = new FormData();
      formData.append(hasRealHotelId ? 'image' : 'file', file);
      if (!hasRealHotelId) {
        formData.append('type', 'hotel');
      }

      const uploadUrl = hasRealHotelId ? `/hotels/${initialData.id}/images` : '/uploads/image';

      const res = await api.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        // Get the image URL from response - always use HTTPS Cloudinary URL
        const imageUrl = res.data.data?.imageUrl || res.data.data?.url;
        if (imageUrl) {
          setImages(prev => [...prev, { id: `server-${Date.now()}`, url: imageUrl }]);
          toast.success('Image uploaded!');
        } else {
          toast.error('Failed to get image URL from server');
        }
      } else {
        toast.error(res.data.error || 'Failed to upload image');
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
    setValue('amenities', JSON.stringify(selectedAmenities));
  };

  const handleFormSubmit = async (data: HotelFormData) => {
    // For manual entry (saveToDb=false), require at least one room type with a base price
    if (
      !saveToDb &&
      (roomTypes.length === 0 || roomTypes.every(r => !r.basePrice || r.basePrice <= 0))
    ) {
      toast.error('Please add at least one room type with a base price');
      // Open the room types section if not already open
      if (!showRoomTypes) setShowRoomTypes(true);
      return;
    }

    if (
      !saveToDb &&
      (mealPlans.length === 0 || mealPlans.every(p => !p.pricePerNight || p.pricePerNight <= 0))
    ) {
      toast.error('Please add at least one meal plan with a price');
      // Open the meal plans section if not already open
      if (!showMealPlans) setShowMealPlans(true);
      return;
    }

    if (!saveToDb && onLocalSubmit) {
      // Build hotel object locally — no DB save
      const localHotel: Hotel = {
        id: manualId(),
        name: data.name,
        location: data.location || data.address || '',
        destinationId: data.destinationId ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        country: data.country ?? null,
        zipCode: data.zipCode ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        website: data.website ?? null,
        stars: data.stars ?? 0,
        category: data.category as any,
        pricePerNight: data.pricePerNight ?? null,
        currency: data.currency || 'INR',
        amenities: selectedAmenities,
        images: images.map(img => img.url),
        roomTypes,
        mealPlans,
        description: data.description ?? null,
        latitude: null,
        longitude: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: '',
        branchId: '',
      };
      onLocalSubmit(localHotel);
      return;
    }

    const submitData: Record<string, unknown> = {
      name: data.name,
      location: data.location,
      // null clears the link; the API then keeps the free-text label as-is.
      destinationId: data.destinationId ?? null,
    };

    if (data.category) submitData.category = data.category;
    if (data.stars) submitData.stars = data.stars;
    if (data.address) submitData.address = data.address;
    if (data.city) submitData.city = data.city;
    if (data.state) submitData.state = data.state;
    if (data.country) submitData.country = data.country;
    if (data.zipCode) submitData.zipCode = data.zipCode;
    if (data.phone) submitData.phone = data.phone;
    if (data.email) submitData.email = data.email;
    if (data.website) submitData.website = data.website;
    submitData.amenities = selectedAmenities;
    if (data.pricePerNight !== undefined) submitData.pricePerNight = data.pricePerNight;
    if (data.currency) submitData.currency = data.currency;
    submitData.images = images.map(img => img.url);
    submitData.roomTypes = roomTypes;
    submitData.mealPlans = mealPlans;
    if (data.description) submitData.description = data.description;

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Basic Info */}
      <div className="space-y-3">
        <SectionHeader title="Hotel Information" subtitle="Basic details about the hotel" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Hotel Name */}
          <FormField label="Hotel Name" required error={errors.name?.message}>
            <Input
              id="name"
              {...register('name')}
              placeholder="Grand Hotel Kashmir"
              className={errors.name ? 'border-destructive' : ''}
            />
          </FormField>

          {/* Category */}
          <FormField label="Category">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Stars */}
          <FormField label="Star Rating">
            <Controller
              control={control}
              name="stars"
              render={({ field }) => (
                <Select
                  value={String(field.value || 3)}
                  onValueChange={v => field.onChange(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stars" />
                  </SelectTrigger>
                  <SelectContent>
                    {starOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Price Per Night */}
          <FormField label="Price Per Night">
            <div className="relative">
              <Input
                id="pricePerNight"
                type="number"
                min={0}
                step="0.01"
                {...register('pricePerNight')}
                placeholder="150.00"
              />
            </div>
          </FormField>

          {/* Currency */}
          <FormField label="Currency">
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value || 'INR'} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="MUR">MUR - Mauritian Rupee</SelectItem>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="THB">THB - Thai Baht</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        {/* Destination - full width */}
        <div className="space-y-3">
          <Controller
            control={control}
            name="destinationId"
            render={({ field }) => (
              <DestinationPicker
                value={field.value ?? null}
                hint="Pick where the hotel sits — Kashmir, or somewhere inside it like Gulmarg."
                onChange={(destinationId, _node, label) => {
                  field.onChange(destinationId);
                  // Mirror what the API will store, so the label never looks stale.
                  if (label) setValue('location', label);
                }}
              />
            )}
          />

          <FormField label="Location label" required error={errors.location?.message}>
            <Input
              id="location"
              {...register('location')}
              placeholder="Dal Lake, Srinagar"
              readOnly={!!pickedDestinationId}
              className={[
                errors.location ? 'border-destructive' : '',
                pickedDestinationId ? 'bg-muted text-muted-foreground' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {pickedDestinationId
                ? 'Taken from the selected location.'
                : 'Shown on itineraries and PDFs.'}
            </p>
          </FormField>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Room Types */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowRoomTypes(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <SectionHeader
              title="Room Types & Bed Configurations"
              subtitle="Define room categories with pricing"
            />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">{showRoomTypes ? 'Hide' : 'Show'}</span>
            {showRoomTypes ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        </button>

        {showRoomTypes && (
          <div className="space-y-3">
            {roomTypes.length > 0 && (
              <div className="space-y-2">
                {roomTypes.map((room, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20"
                  >
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Room Name</p>
                        <p className="text-sm font-medium">{room.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bed Type</p>
                        <p className="text-sm">{room.bedType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Base Price</p>
                        <p className="text-sm font-medium">₹{room.basePrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Extra/Child</p>
                        <p className="text-xs text-muted-foreground">
                          {room.extraBedPrice ? `+₹${room.extraBedPrice}` : '-'} /{' '}
                          {room.childPrice ? `₹${room.childPrice}` : '-'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRoomTypes(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <AddRoomTypeForm
              onAdd={room => setRoomTypes(prev => [...prev, room])}
              autoOpen={forceExpandRoomTypes}
            />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Meal Plans */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowMealPlans(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <SectionHeader title="Meal Plans" subtitle="Define available meal plan options" />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">{showMealPlans ? 'Hide' : 'Show'}</span>
            {showMealPlans ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        </button>

        {showMealPlans && (
          <div className="space-y-3">
            {mealPlans.length > 0 && (
              <div className="space-y-2">
                {mealPlans.map((plan, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Plan Type</p>
                        <p className="text-sm font-medium">{plan.label}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Extra Per Night</p>
                        <p className="text-sm font-medium">
                          ₹{plan.pricePerNight.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMealPlans(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <AddMealPlanForm
              onAdd={plan => setMealPlans(prev => [...prev, plan])}
              autoOpen={forceExpandMealPlans}
            />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Amenities */}
      <div className="space-y-3">
        <SectionHeader title="Amenities" subtitle="Select hotel features and facilities" />

        <div className="flex flex-wrap gap-2">
          {commonAmenities.map(amenity => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedAmenities.includes(amenity)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>

        {selectedAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedAmenities.map(amenity => (
              <span
                key={amenity}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
              >
                {amenity}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => toggleAmenity(amenity)}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Optional Fields */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowOptional(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <SectionHeader title="Address" subtitle="Additional location details" />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">{showOptional ? 'Hide' : 'Show'}</span>
            {showOptional ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        </button>

        {showOptional && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Address */}
            <div className="sm:col-span-2">
              <FormField label="Street Address">
                <Input id="address" {...register('address')} placeholder="123 Main Road" />
              </FormField>
            </div>

            {/* City */}
            <FormField label="City">
              <Input id="city" {...register('city')} placeholder="Srinagar" />
            </FormField>

            {/* State */}
            <FormField label="State/Province">
              <Input id="state" {...register('state')} placeholder="Jammu & Kashmir" />
            </FormField>

            {/* Country */}
            <FormField label="Country">
              <Input id="country" {...register('country')} placeholder="India" />
            </FormField>

            {/* ZIP Code */}
            <FormField label="ZIP/Postal Code">
              <Input id="zipCode" {...register('zipCode')} placeholder="190001" />
            </FormField>
          </div>
        )}
      </div>

      {/* Contact Info - collapsible */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowContact(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <SectionHeader title="Contact Information" subtitle="Phone, email, website" />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-xs">{showContact ? 'Hide' : 'Show'}</span>
            {showContact ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        </button>

        {showContact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone */}
            <FormField label="Phone" error={errors.phone?.message}>
              <PhoneInput control={control} name="phone" id="phone" />
            </FormField>

            {/* Email */}
            <FormField label="Email" error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} placeholder="info@hotel.com" />
            </FormField>

            {/* Website */}
            <div className="sm:col-span-2">
              <FormField label="Website">
                <Input id="website" {...register('website')} placeholder="https://www.hotel.com" />
              </FormField>
            </div>
          </div>
        )}
      </div>

      {/* Images */}
      <div className="space-y-3">
        <SectionHeader title="Hotel Images" subtitle="Upload hotel photos" />
        <div className="border-2 border-dashed border-border rounded-lg p-4">
          <label className="cursor-pointer flex flex-col items-center justify-center">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploadingImage}
            />
            <div className="flex flex-col items-center gap-2">
              {uploadingImage ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploadingImage ? 'Uploading...' : 'Click to upload image'}
              </span>
            </div>
          </label>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {images.map(img => (
              <div
                key={img.id}
                className="relative group aspect-square rounded-lg overflow-hidden border"
              >
                <img src={img.url} alt={`Hotel image`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description - full width */}
      <div className="space-y-1.5">
        <FormField label="Description">
          <Textarea
            id="description"
            {...register('description')}
            placeholder="A brief description of the hotel, its history, special features..."
            className="min-h-24 resize-none"
          />
        </FormField>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {initialData?.id ? 'Update Hotel' : saveToDb ? 'Create Hotel' : 'Add Hotel'}
        </Button>
      </div>
    </form>
  );
}

function AddRoomTypeForm({
  onAdd,
  autoOpen = false,
}: {
  onAdd: (room: RoomType) => void;
  autoOpen?: boolean;
}) {
  const [name, setName] = useState('');
  const [bedType, setBedType] = useState('DOUBLE');
  const [basePrice, setBasePrice] = useState('');
  const [extraBedPrice, setExtraBedPrice] = useState('');
  const [childPrice, setChildPrice] = useState('');
  const [isOpen, setIsOpen] = useState(autoOpen);

  const handleAdd = () => {
    if (!name.trim() || !basePrice) {
      toast.error('Please enter room name and base price');
      return;
    }
    onAdd({
      name: name.trim(),
      bedType,
      basePrice: Number(basePrice),
      extraBedPrice: extraBedPrice ? Number(extraBedPrice) : undefined,
      childPrice: childPrice ? Number(childPrice) : undefined,
    });
    setName('');
    setBasePrice('');
    setExtraBedPrice('');
    setChildPrice('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Room Type with Prices
      </Button>
    );
  }

  return (
    <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-primary">Add Room Type</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-primary">Room Name *</Label>
          <Input
            placeholder="Standard Room"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-9 text-sm bg-white"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-primary">Bed Type</Label>
          <Select value={bedType} onValueChange={setBedType}>
            <SelectTrigger className="h-9 text-sm bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BED_TYPES.map(bt => (
                <SelectItem key={bt.value} value={bt.value}>
                  {bt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-primary">Base Price /room (₹) *</Label>
          <Input
            type="number"
            placeholder="2000"
            value={basePrice}
            onChange={e => setBasePrice(e.target.value)}
            className="h-9 text-sm bg-white font-medium"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Extra Bed (₹)</Label>
          <Input
            type="number"
            placeholder="500"
            value={extraBedPrice}
            onChange={e => setExtraBedPrice(e.target.value)}
            className="h-9 text-sm bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Child w/o Bed (₹)</Label>
          <Input
            type="number"
            placeholder="300"
            value={childPrice}
            onChange={e => setChildPrice(e.target.value)}
            className="h-9 text-sm bg-white"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-primary/20">
        <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleAdd} disabled={!name.trim() || !basePrice}>
          <Plus className="h-4 w-4 mr-1" /> Add Room Type
        </Button>
      </div>
    </div>
  );
}

function AddMealPlanForm({
  onAdd,
  autoOpen = false,
}: {
  onAdd: (plan: HotelMealPlan) => void;
  autoOpen?: boolean;
}) {
  const [type, setType] = useState<MealPlan>('MAP'); // Default to MAP for manual entry
  const [pricePerNight, setPricePerNight] = useState('');
  const [isOpen, setIsOpen] = useState(autoOpen);

  const handleAdd = () => {
    if (!pricePerNight || Number(pricePerNight) <= 0) {
      toast.error('Please enter a price for the meal plan');
      return;
    }
    const option = MEAL_PLAN_OPTIONS.find(o => o.value === type);
    onAdd({
      type,
      label: option?.label || type,
      pricePerNight: Number(pricePerNight) || 0,
    });
    setPricePerNight('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Meal Plan with Price
      </Button>
    );
  }

  return (
    <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">Add Meal Plan</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-6 w-6 p-0"
        >
          ✕
        </Button>
      </div>

      {/* Price input FIRST - most important */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold text-red-600">Price Per Room /night (₹) *</Label>
        <Input
          type="number"
          placeholder="e.g. 600"
          value={pricePerNight}
          onChange={e => setPricePerNight(e.target.value)}
          className="h-10 text-base border-red-300 focus:border-red-500 bg-white font-bold"
          autoFocus
        />
      </div>

      {/* Plan type dropdown */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Plan Type</Label>
        <Select value={type} onValueChange={v => setType(v as MealPlan)}>
          <SelectTrigger className="h-9 text-sm bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEAL_PLAN_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add button */}
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        disabled={!pricePerNight || Number(pricePerNight) <= 0}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1" /> Add Meal Plan (₹{pricePerNight || '0'}/room)
      </Button>
    </div>
  );
}
