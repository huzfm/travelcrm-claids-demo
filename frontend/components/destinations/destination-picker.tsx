'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { useDestinationTree } from '@/hooks/useDestinations';
import { destinationLabel, type DestinationNode } from '@/types';

// Radix Select rejects an empty-string item value, so "nothing picked" needs a sentinel.
const NONE = '__none__';

interface DestinationPickerProps {
  /** Id of the picked destination — a master, or one inside it. */
  value?: string | null;
  /** `label` is the display form ("Gulmarg, Kashmir") the API will store. */
  onChange: (
    destinationId: string | null,
    node: DestinationNode | null,
    label: string
  ) => void;
  /** Only offer destinations that are switched on. */
  activeOnly?: boolean;
  disabled?: boolean;
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Two dropdowns: the master destination, then the one inside it. Staying at
 * "Kashmir" is a valid answer, so the second dropdown is always optional — a
 * hotel can sit at either rung.
 */
export function DestinationPicker({
  value,
  onChange,
  activeOnly = true,
  disabled,
  label = 'Destination',
  error,
  hint,
}: DestinationPickerProps) {
  const { data: tree = [], isLoading } = useDestinationTree(activeOnly);

  // The value may be a master or one inside it, so look in both places.
  const master =
    tree.find(node => node.id === value || node.children.some(c => c.id === value)) ?? null;
  const child = master?.children.find(node => node.id === value) ?? null;

  const handleMaster = (nextId: string) => {
    if (nextId === NONE) {
      onChange(null, null, '');
      return;
    }
    const node = tree.find(candidate => candidate.id === nextId) || null;
    onChange(node?.id ?? null, node, node ? destinationLabel(node.name) : '');
  };

  const handleChild = (nextId: string) => {
    // Clearing falls back to the master rather than emptying the field, so the
    // broader answer survives.
    if (nextId === NONE) {
      onChange(master?.id ?? null, master, master ? destinationLabel(master.name) : '');
      return;
    }
    const node = master?.children.find(candidate => candidate.id === nextId) || null;
    onChange(
      node?.id ?? null,
      node,
      node ? destinationLabel(node.name, master?.name) : ''
    );
  };

  const breadcrumb = [master?.name, child?.name].filter(Boolean).join(' › ');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {breadcrumb && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {breadcrumb}
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select
          value={master?.id ?? NONE}
          onValueChange={handleMaster}
          disabled={disabled || isLoading}
        >
          <SelectTrigger className={error ? 'border-destructive' : undefined}>
            <SelectValue placeholder="Master destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No destination</SelectItem>
            {tree.map(node => (
              <SelectItem key={node.id} value={node.id}>
                {node.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={child?.id ?? NONE}
          onValueChange={handleChild}
          disabled={disabled || isLoading || !master || master.children.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                master && master.children.length === 0
                  ? `Nothing inside ${master.name} yet`
                  : 'Inside it (optional)'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>All of {master?.name ?? 'it'}</SelectItem>
            {(master?.children ?? []).map(node => (
              <SelectItem key={node.id} value={node.id}>
                {node.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && !value && <p className="text-xs text-muted-foreground">{hint}</p>}
      {!isLoading && tree.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No destinations yet — add one on the Destinations page first.
        </p>
      )}
    </div>
  );
}
