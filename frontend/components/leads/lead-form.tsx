'use client';

import { useForm, Controller } from 'react-hook-form';
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
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Lead, Branch, LeadAssignee } from '@/types';
import { useState } from 'react';
import { phoneSchema } from '@/lib/validators';

const LEAD_FORM_BRANCH_KEY = 'lead_form_selected_branch';

const leadSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  phone: phoneSchema,
  destination: z.string().optional(),
  travelDateFrom: z.string().optional(),
  travelDateTo: z.string().optional(),
  numberOfPax: z.string().min(1, 'Number of pax is required').default('1'),
  email: z.string().optional().or(z.literal('')),
  budget: z.coerce.number().optional().nullable(),
  tripType: z.string().optional(),
  hotelCategory: z.string().optional(),
  pickupPoint: z.string().optional(),
  childrenCount: z.coerce.number().int().min(0).default(0),
  notes: z.string().optional(),
  source: z.enum([
    'WEBSITE',
    'WHATSAPP',
    'WALKIN',
    'SOCIAL',
    'BULK_IMPORT',
    'META_ADS',
    'GOOGLE_ADS',
    'AD_CAMPAIGN',
  ]),
  assignedTo: z.string().optional().nullable(),
  priority: z.string().optional(),
  branchId: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  initialData?: Partial<Lead>;
  branchId?: string;
  userRole?: string;
  branches?: Branch[];
  staff?: LeadAssignee[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const sourceOptions = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WALKIN', label: 'Walk-in' },
  { value: 'SOCIAL', label: 'Social Media' },
  { value: 'META_ADS', label: 'Meta Ads' },
  { value: 'GOOGLE_ADS', label: 'Google Ads' },
  { value: 'BULK_IMPORT', label: 'Bulk Import' },
];

const tripTypeOptions = [
  { value: 'DOMESTIC', label: 'Domestic' },
  { value: 'INTERNATIONAL', label: 'International' },
];

const hotelCategoryOptions = [
  { value: 'BUDGET', label: 'Budget' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'LUXURY', label: 'Luxury' },
  { value: 'CUSTOM', label: 'Custom' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
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

export function LeadForm({
  initialData,
  branchId,
  userRole,
  branches = [],
  staff = [],
  onSubmit,
  onCancel,
  isLoading,
}: LeadFormProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [showInternal, setShowInternal] = useState(false);
  const [customHotelCategory, setCustomHotelCategory] = useState('');
  const isAdmin = userRole === 'ADMIN';

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      destination: initialData?.destination || '',
      travelDateFrom: initialData?.travelDateFrom ? initialData.travelDateFrom.split('T')[0] : '',
      travelDateTo: initialData?.travelDateTo ? initialData.travelDateTo.split('T')[0] : '',
      numberOfPax: String(initialData?.numberOfPax || '1'),
      email: initialData?.email || '',
      budget: initialData?.budget || undefined,
      tripType: initialData?.tripType || '',
      hotelCategory: initialData?.hotelCategory || '',
      pickupPoint: initialData?.pickupPoint || '',
      childrenCount: initialData?.childrenCount || 0,
      notes: initialData?.notes || '',
      source: initialData?.source || 'WEBSITE',
      assignedTo: initialData?.assignedTo || '',
      priority: initialData?.priority || '',
      branchId:
        initialData?.branchId ||
        (isAdmin ? localStorage.getItem(LEAD_FORM_BRANCH_KEY) || branchId || '' : branchId || ''),
    },
  });

  const handleFormSubmit = async (data: LeadFormData) => {
    const finalBranchId = isAdmin ? (data as any).branchId : branchId;
    const submitData: Record<string, unknown> = {
      name: data.name,
      phone: data.phone,
      source: data.source,
      branchId: finalBranchId || '',
      travelDateFrom: data.travelDateFrom || undefined,
      travelDateTo: data.travelDateTo || undefined,
      numberOfPax: data.numberOfPax,
      budget: data.budget ?? null,
      tripType: data.tripType || undefined,
      hotelCategory: data.hotelCategory || undefined,
      pickupPoint: data.pickupPoint || undefined,
      childrenCount: data.childrenCount,
      priority: data.priority || undefined,
    };
    if (data.email) submitData.email = data.email;
    if (data.destination) submitData.destination = data.destination;
    if (data.notes) submitData.notes = data.notes;
    if (data.assignedTo) submitData.assignedTo = data.assignedTo;
    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Required Fields */}
      <div className="space-y-3">
        <SectionHeader title="Lead Information" subtitle="Required details for the new lead" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Full Name */}
          <FormField label="Full Name" required error={errors.name?.message}>
            <div className="relative">
              <Input
                id="name"
                {...register('name')}
                placeholder="Rajesh Kumar"
                className={errors.name ? 'border-destructive' : ''}
              />
            </div>
          </FormField>

          {/* Phone */}
          <FormField label="Phone Number" required error={errors.phone?.message}>
            <PhoneInput control={control} name="phone" id="phone" required />
          </FormField>

          {/* Destination */}
          <FormField label="Destination Interested" error={errors.destination?.message as string}>
            <div className="relative">
              <Input
                id="destination"
                {...register('destination')}
                placeholder="Dubai, Maldives, Shimla..."
                className={errors.destination ? 'border-destructive' : ''}
              />
            </div>
          </FormField>

          {/* Number of Persons / Pax */}
          <FormField label="Number of Persons / Pax" required error={errors.numberOfPax?.message}>
            <div className="relative">
              <Input
                id="numberOfPax"
                type="text"
                {...register('numberOfPax')}
                placeholder="e.g. 2 adults, 1 adult 2 kids"
              />
            </div>
          </FormField>
        </div>

        {/* Travel Dates — full width */}
        <FormField label="Travel Dates">
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" {...register('travelDateFrom')} placeholder="From" />
            <Input type="date" {...register('travelDateTo')} placeholder="To" />
          </div>
        </FormField>

        {/* Lead Source - Admin/Manager only */}
        {(isAdmin || userRole === 'MANAGER') && (
          <FormField label="Lead Source" required error={errors.source?.message}>
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={errors.source ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Optional Fields — collapsible */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowOptional(v => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <SectionHeader title="Additional Details" subtitle="More information about this lead" />
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
            {/* Email */}
            <FormField label="Email">
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="rajesh@example.com"
              />
            </FormField>

            {/* Budget */}
            <FormField label="Budget">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"></span>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  step="0.01"
                  {...register('budget')}
                  placeholder="5,000"
                  className="pl-7"
                />
              </div>
            </FormField>

            {/* Trip Type */}
            <FormField label="Trip Type">
              <Controller
                control={control}
                name="tripType"
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {tripTypeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Hotel Category */}
            <FormField label="Hotel Category">
              <Controller
                control={control}
                name="hotelCategory"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Select
                      value={field.value || ''}
                      onValueChange={v => {
                        field.onChange(v === 'CUSTOM' ? 'CUSTOM' : v);
                        if (v !== 'CUSTOM') setCustomHotelCategory('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {hotelCategoryOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value === 'CUSTOM' && (
                      <Input
                        placeholder="Enter custom hotel category"
                        value={customHotelCategory}
                        onChange={e => {
                          setCustomHotelCategory(e.target.value);
                          field.onChange(e.target.value);
                        }}
                      />
                    )}
                  </div>
                )}
              />
            </FormField>

            {/* Pickup Point */}
            <FormField label="Pickup Point">
              <Input
                id="pickupPoint"
                {...register('pickupPoint')}
                placeholder="Airport, Hotel, Home address..."
              />
            </FormField>

            {/* Children Count */}
            <FormField label="Children Count">
              <Input
                id="childrenCount"
                type="number"
                min={0}
                {...register('childrenCount')}
                placeholder="0"
              />
            </FormField>

            {/* Notes — full width */}
            <div className="sm:col-span-2">
              <FormField label="Notes">
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Any additional notes about this lead..."
                  className="min-h-20 resize-none"
                />
              </FormField>
            </div>
          </div>
        )}
      </div>

      {/* Internal Fields — collapsible, admin/manager only */}
      {(isAdmin || userRole === 'MANAGER') && (
        <>
          <div className="border-t" />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowInternal(v => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <SectionHeader title="Assignment & Priority" subtitle="Internal use only" />
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="text-xs">{showInternal ? 'Hide' : 'Show'}</span>
                {showInternal ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </div>
            </button>

            {showInternal && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Branch — admin only */}
                {isAdmin && (
                  <FormField label="Branch">
                    <Controller
                      control={control}
                      name="branchId"
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={v => {
                            setValue('branchId', v);
                            localStorage.setItem(LEAD_FORM_BRANCH_KEY, v);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map(b => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                )}

                {/* Assigned Staff */}
                <FormField label="Assigned Staff">
                  <Controller
                    control={control}
                    name="assignedTo"
                    render={({ field }) => (
                      <Select
                        value={field.value || ''}
                        onValueChange={v => setValue('assignedTo', v === 'auto' ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isAdmin ? 'Auto-assign' : 'Assign to me'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">{isAdmin ? 'Auto-assign' : 'Assign to me'}</SelectItem>
                          {staff.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>

                {/* Priority */}
                <FormField label="Priority">
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>
            )}
          </div>
        </>
      )}

      {/* Actions — sticky bottom */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {initialData?.id ? 'Update Lead' : 'Create Lead'}
        </Button>
      </div>
    </form>
  );
}
