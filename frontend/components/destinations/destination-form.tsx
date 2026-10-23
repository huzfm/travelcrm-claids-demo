'use client';

import { useForm, useWatch, Controller } from 'react-hook-form';
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
import { Loader2, List } from 'lucide-react';
import type { Destination } from '@/types';
import { useDestinationTree } from '@/hooks/useDestinations';
import { useRef } from 'react';

// Radix Select rejects an empty-string item value, so "no parent" needs a sentinel.
const NO_PARENT = '__master__';

const destinationSchema = z.object({
  name: z.string().min(1, 'Destination name is required'),
  // Empty means this is a master destination.
  parentId: z.string().nullable().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  placeType: z
    .enum([
      'MOUNTAIN',
      'BEACH',
      'CITY',
      'DESERT',
      'FOREST',
      'HISTORICAL',
      'ADVENTURE',
      'RELIGIOUS',
      'OTHER',
    ])
    .optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
});

// A master is a grouping, so it carries a country and no address. A destination
// inside one is a real place, so it carries an address and inherits the country.
const destinationFormSchema = destinationSchema
  .refine(data => Boolean(data.parentId) || Boolean(data.country?.trim()), {
    path: ['country'],
    message: 'Country is required for a master destination',
  })
  .refine(data => !data.parentId || Boolean(data.address?.trim()), {
    path: ['address'],
    message: 'Address is required',
  });

type DestinationFormData = z.infer<typeof destinationSchema>;

interface DestinationFormProps {
  initialData?: Partial<Destination>;
  /**
   * Hide the placement dropdown because the caller already decided the rung —
   * the masters page only creates masters, and a master page only creates the
   * destinations inside it. Editing leaves it visible so things can be moved.
   */
  lockParent?: boolean;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const placeTypeOptions = [
  { value: 'MOUNTAIN', label: 'Mountain' },
  { value: 'BEACH', label: 'Beach' },
  { value: 'CITY', label: 'City' },
  { value: 'DESERT', label: 'Desert' },
  { value: 'FOREST', label: 'Forest' },
  { value: 'HISTORICAL', label: 'Historical' },
  { value: 'ADVENTURE', label: 'Adventure' },
  { value: 'RELIGIOUS', label: 'Religious' },
  { value: 'OTHER', label: 'Other' },
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
  action,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-foreground/80">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {action}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function DestinationForm({
  initialData,
  lockParent,
  onSubmit,
  onCancel,
  isLoading,
}: DestinationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DestinationFormData>({
    resolver: zodResolver(destinationFormSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      parentId: initialData?.parentId ?? null,
      country: initialData?.country || '',
      address: initialData?.address || '',
      placeType: initialData?.placeType || undefined,
      shortDescription: initialData?.shortDescription || '',
      description: initialData?.description || '',
    },
  });

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref: descriptionRegisterRef, ...descriptionField } = register('description');

  // Inserts a "• " bullet at the cursor (on a new line if not already at the
  // start of one) so the description can be authored as a bulleted list.
  const insertBulletPoint = () => {
    const textarea = descriptionRef.current;
    const currentValue = getValues('description') || '';
    const start = textarea?.selectionStart ?? currentValue.length;
    const end = textarea?.selectionEnd ?? currentValue.length;
    const needsNewlineBefore = start > 0 && currentValue[start - 1] !== '\n';
    const insertion = `${needsNewlineBefore ? '\n' : ''}• `;
    const newValue = currentValue.slice(0, start) + insertion + currentValue.slice(end);
    setValue('description', newValue, { shouldDirty: true });
    requestAnimationFrame(() => {
      if (!textarea) return;
      const cursorPos = start + insertion.length;
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  // Once a bullet exists, Enter continues the list onto the next line automatically.
  // Shift+Enter is a plain newline (escape hatch). Enter on an empty bullet ("• " with
  // nothing typed after it) drops the marker and exits the list, like Docs/Word do.
  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const textarea = e.currentTarget;
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const currentLine = value.slice(lineStart, start);

    if (!/^•\s/.test(currentLine)) return; // not inside a bulleted line — plain Enter

    e.preventDefault();

    if (/^•\s*$/.test(currentLine)) {
      // Empty bullet — exit the list instead of adding another one.
      const newValue = value.slice(0, lineStart) + value.slice(end);
      setValue('description', newValue, { shouldDirty: true });
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart, lineStart);
      });
      return;
    }

    const insertion = '\n• ';
    const newValue = value.slice(0, start) + insertion + value.slice(end);
    setValue('description', newValue, { shouldDirty: true });
    requestAnimationFrame(() => {
      const cursorPos = start + insertion.length;
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const { data: tree = [] } = useDestinationTree(false);

  // A master is a grouping with just a name, country and place type; everything
  // else on this form describes an actual place and only applies inside a master.
  const watchedParentId = useWatch({ control, name: 'parentId' });
  const isMaster = !watchedParentId;

  // Only masters can take children, and a destination cannot parent itself.
  const parentOptions = tree.filter(node => node.id !== initialData?.id);

  // A destination that already holds others has to stay a master, so the API
  // would reject a move — reflect that here instead of letting it fail on save.
  const holdsOthers = (initialData?._count?.children ?? 0) > 0;

  const handleFormSubmit = async (data: DestinationFormData) => {
    const parentId = data.parentId ?? null;

    const submitData: Record<string, unknown> = {
      name: data.name,
      // null makes it a master destination.
      parentId,
    };

    if (data.placeType) submitData.placeType = data.placeType;

    // A master stops here — the rest describes an actual place.
    if (!parentId) {
      submitData.country = data.country;
      await onSubmit(submitData);
      return;
    }

    submitData.address = data.address;
    if (data.shortDescription) submitData.shortDescription = data.shortDescription;
    if (data.description) submitData.description = data.description;

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Basic Info */}
      <div className="space-y-3">
        <SectionHeader
          title="Destination Information"
          subtitle="Basic details about the destination"
        />

        {/* Where it sits in the tree */}
        {lockParent ? (
          <p className="text-xs text-muted-foreground">
            {isMaster
              ? 'Creating a master destination — it groups the places inside it.'
              : `Adding inside ${parentOptions.find(node => node.id === watchedParentId)?.name ?? 'this destination'}.`}
          </p>
        ) : (
          <FormField label="Master destination" error={errors.parentId?.message}>
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <Select
                  value={field.value ?? NO_PARENT}
                  onValueChange={next => field.onChange(next === NO_PARENT ? null : next)}
                  disabled={holdsOthers}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>None — this is a master destination</SelectItem>
                    {parentOptions.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        Inside {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {holdsOthers
                ? `This destination holds ${initialData?._count?.children ?? 0} other(s), so it stays a master.`
                : 'Leave as None to create a master like Kashmir, or pick one to add a destination inside it.'}
            </p>
          </FormField>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Destination Name */}
          <FormField label="Destination Name" required error={errors.name?.message}>
            <Input
              id="name"
              {...register('name')}
              placeholder="Eiffel Tower"
              className={errors.name ? 'border-destructive' : ''}
            />
          </FormField>

          {/* Country on a master, address on a place inside one */}
          {isMaster ? (
            <FormField label="Country" required error={errors.country?.message}>
              <Input
                id="country"
                {...register('country')}
                placeholder="India"
                className={errors.country ? 'border-destructive' : ''}
              />
            </FormField>
          ) : (
            <FormField label="Address / Location" required error={errors.address?.message}>
              <Input
                id="address"
                {...register('address')}
                placeholder="Paris, France"
                className={errors.address ? 'border-destructive' : ''}
              />
            </FormField>
          )}

          {/* Place Type */}
          <FormField label="Place Type">
            <Controller
              control={control}
              name="placeType"
              render={({ field }) => (
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {placeTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Short Description */}
          {!isMaster && (
            <FormField label="Short Description">
              <Input
                id="shortDescription"
                {...register('shortDescription')}
                placeholder="One liner for cards"
              />
            </FormField>
          )}
        </div>

        {/* Full Description */}
        {!isMaster && (
          <FormField
            label="Full Description"
            action={
              <button
                type="button"
                onClick={insertBulletPoint}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
              >
                <List className="h-3.5 w-3.5" />
                Add bullet
              </button>
            }
          >
            <Textarea
              id="description"
              {...descriptionField}
              ref={el => {
                descriptionRegisterRef(el);
                descriptionRef.current = el;
              }}
              onKeyDown={handleDescriptionKeyDown}
              placeholder="Detailed description for itinerary use..."
              className="min-h-20 resize-none"
            />
          </FormField>
        )}
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
          {initialData?.id ? 'Update Destination' : 'Create Destination'}
        </Button>
      </div>
    </form>
  );
}
