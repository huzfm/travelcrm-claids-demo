'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, X } from 'lucide-react';
import type { Vehicle } from '@/types';
import { useState } from 'react';

// Called from submit handlers only — the timestamp keeps local ids unique.
const manualId = () => `manual-${Date.now()}`;

const vehicleSchema = z.object({
  name: z.string().min(1, 'Vehicle name is required'),
  brand: z.string().optional(),
  vehicleType: z
    .enum([
      'SEDAN',
      'SUV',
      'MUV',
      'MINI_BUS',
      'BUS',
      'TEMPO_TRAVELLER',
      'CAR',
      'VAN',
      'JEEP',
      'LIMOUSINE',
      'OTHER',
    ])
    .optional(),
  category: z.enum(['ECONOMY', 'STANDARD', 'PREMIUM', 'LUXURY']).optional(),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  seatingCapacity: z.coerce.number().int().min(1).max(100).optional(),
  isAc: z.boolean().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  driverLicense: z.string().optional(),
  ratePerKm: z.coerce.number().min(0).optional().nullable(),
  ratePerDay: z.coerce.number().min(0).optional().nullable(),
  minimumCharge: z.coerce.number().min(0).optional().nullable(),
  currency: z.string().optional(),
  baseLocation: z.string().optional(),
  serviceArea: z.string().optional(),
  description: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  /** If false, skips DB save — calls onLocalSubmit with built vehicle object locally */
  saveToDb?: boolean;
  /** Called instead of API POST when saveToDb is false */
  onLocalSubmit?: (vehicle: Vehicle) => void;
}

const vehicleTypeOptions = [
  { value: 'SEDAN', label: 'Sedan' },
  { value: 'SUV', label: 'SUV' },
  { value: 'MUV', label: 'MUV (Multi-Utility Vehicle)' },
  { value: 'MINI_BUS', label: 'Mini Bus' },
  { value: 'BUS', label: 'Bus' },
  { value: 'TEMPO_TRAVELLER', label: 'Tempo Traveller' },
  { value: 'CAR', label: 'Car' },
  { value: 'VAN', label: 'Van' },
  { value: 'JEEP', label: 'Jeep' },
  { value: 'LIMOUSINE', label: 'Limousine' },
  { value: 'OTHER', label: 'Other' },
];

const categoryOptions = [
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'LUXURY', label: 'Luxury' },
];

const commonFeatures = [
  'AC',
  'Music System',
  'WiFi',
  'USB Charging',
  'Comfortable Seats',
  'Ample Luggage Space',
  'Push Back Seats',
  'Air Suspension',
  'Television',
  'Refrigerator',
];

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5 mb-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
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

export function VehicleForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  saveToDb = true,
  onLocalSubmit,
}: VehicleFormProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    typeof initialData?.features === 'string'
      ? JSON.parse(initialData.features as unknown as string)
      : Array.isArray(initialData?.features)
        ? initialData.features
        : []
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      brand: initialData?.brand || '',
      vehicleType: initialData?.vehicleType || 'SEDAN',
      category: initialData?.category || 'STANDARD',
      registrationNumber: initialData?.registrationNumber || '',
      seatingCapacity: initialData?.seatingCapacity || 4,
      isAc: initialData?.isAc ?? true,
      driverName: initialData?.driverName || '',
      driverPhone: initialData?.driverPhone || '',
      driverLicense: initialData?.driverLicense || '',
      ratePerKm: initialData?.ratePerKm || undefined,
      ratePerDay: initialData?.ratePerDay || undefined,
      minimumCharge: initialData?.minimumCharge || undefined,
      currency: initialData?.currency || 'INR',
      baseLocation: initialData?.baseLocation || '',
      serviceArea: initialData?.serviceArea || '',
      description: initialData?.description || '',
    },
  });

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
    setValue('features' as any, selectedFeatures);
  };

  const handleFormSubmit = async (data: VehicleFormData) => {
    if (!saveToDb && onLocalSubmit) {
      const localVehicle: Vehicle = {
        id: manualId(),
        name: data.name,
        registrationNumber: data.registrationNumber,
        brand: data.brand,
        vehicleType: data.vehicleType as any,
        category: data.category as any,
        seatingCapacity: data.seatingCapacity ?? 0,
        isAc: data.isAc ?? true,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        driverLicense: data.driverLicense,
        ratePerKm: data.ratePerKm ?? undefined,
        ratePerDay: data.ratePerDay ?? undefined,
        minimumCharge: data.minimumCharge ?? undefined,
        currency: data.currency || 'INR',
        baseLocation: data.baseLocation,
        serviceArea: data.serviceArea,
        description: data.description,
        features: selectedFeatures,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: '',
        branchId: '',
      };
      onLocalSubmit(localVehicle);
      return;
    }

    const submitData: Record<string, unknown> = {
      name: data.name,
      registrationNumber: data.registrationNumber,
    };

    if (data.brand) submitData.brand = data.brand;
    if (data.vehicleType) submitData.vehicleType = data.vehicleType;
    if (data.category) submitData.category = data.category;
    if (data.seatingCapacity) submitData.seatingCapacity = data.seatingCapacity;
    submitData.isAc = data.isAc ?? true;
    if (data.driverName) submitData.driverName = data.driverName;
    if (data.driverPhone) submitData.driverPhone = data.driverPhone;
    if (data.driverLicense) submitData.driverLicense = data.driverLicense;
    if (data.ratePerKm !== undefined) submitData.ratePerKm = data.ratePerKm;
    if (data.ratePerDay !== undefined) submitData.ratePerDay = data.ratePerDay;
    if (data.minimumCharge !== undefined) submitData.minimumCharge = data.minimumCharge;
    if (data.currency) submitData.currency = data.currency;
    if (data.baseLocation) submitData.baseLocation = data.baseLocation;
    if (data.serviceArea) submitData.serviceArea = data.serviceArea;
    if (data.description) submitData.description = data.description;
    submitData.features = selectedFeatures;

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Basic Info */}
      <div className="space-y-3">
        <SectionHeader title="Vehicle Information" subtitle="Basic details about the vehicle" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Vehicle Name */}
          <FormField label="Vehicle Name" required error={errors.name?.message}>
            <Input
              id="name"
              {...register('name')}
              placeholder="Toyota Innova Crysta"
              className={errors.name ? 'border-destructive' : ''}
            />
          </FormField>

          {/* Brand */}
          <FormField label="Brand">
            <Input id="brand" {...register('brand')} placeholder="Toyota" />
          </FormField>

          {/* Registration Number */}
          <FormField
            label="Registration Number"
            required
            error={errors.registrationNumber?.message}
          >
            <Input
              id="registrationNumber"
              {...register('registrationNumber')}
              placeholder="JK01AB1234"
              className={errors.registrationNumber ? 'border-destructive' : ''}
            />
          </FormField>

          {/* Seating Capacity */}
          <FormField label="Seating Capacity">
            <Input
              id="seatingCapacity"
              type="number"
              min={1}
              max={100}
              {...register('seatingCapacity')}
              placeholder="4"
            />
          </FormField>

          {/* Vehicle Type */}
          <FormField label="Vehicle Type">
            <Controller
              control={control}
              name="vehicleType"
              render={({ field }) => (
                <Select value={field.value || 'SEDAN'} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Category */}
          <FormField label="Category">
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value || 'STANDARD'} onValueChange={field.onChange}>
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

          {/* AC */}
          <FormField label="Air Conditioned">
            <Controller
              control={control}
              name="isAc"
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value ?? true}
                    onChange={e => field.onChange(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">AC Vehicle</span>
                </label>
              )}
            />
          </FormField>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-3">
        <SectionHeader title="Features" subtitle="Vehicle features and amenities" />

        <div className="flex flex-wrap gap-2">
          {commonFeatures.map(feature => (
            <button
              key={feature}
              type="button"
              onClick={() => toggleFeature(feature)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                selectedFeatures.includes(feature)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {feature}
            </button>
          ))}
        </div>

        {selectedFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedFeatures.map(feature => (
              <span
                key={feature}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
              >
                {feature}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => toggleFeature(feature)}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <SectionHeader title="Pricing" subtitle="Rate information" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Rate per KM">
            <Input
              id="ratePerKm"
              type="number"
              min={0}
              step="0.01"
              {...register('ratePerKm')}
              placeholder="12.00"
            />
          </FormField>

          <FormField label="Rate per Day">
            <Input
              id="ratePerDay"
              type="number"
              min={0}
              step="0.01"
              {...register('ratePerDay')}
              placeholder="2500.00"
            />
          </FormField>

          <FormField label="Minimum Charge">
            <Input
              id="minimumCharge"
              type="number"
              min={0}
              step="0.01"
              {...register('minimumCharge')}
              placeholder="500.00"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <FormField label="Base Location">
            <Input id="baseLocation" {...register('baseLocation')} placeholder="Srinagar" />
          </FormField>
        </div>

        <FormField label="Service Area">
          <Input
            id="serviceArea"
            {...register('serviceArea')}
            placeholder="Kashmir Valley, Ladakh"
          />
        </FormField>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <FormField label="Description">
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Additional notes about the vehicle..."
            className="min-h-20 resize-none"
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
          {initialData?.id ? 'Update Vehicle' : saveToDb ? 'Create Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
}
