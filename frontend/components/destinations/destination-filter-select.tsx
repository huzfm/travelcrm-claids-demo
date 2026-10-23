'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDestinationTree } from '@/hooks/useDestinations';
import { flattenDestinations } from '@/types';

const ALL = '__all__';

interface DestinationFilterSelectProps {
  value?: string;
  onChange: (destinationId: string | undefined) => void;
  className?: string;
  placeholder?: string;
}

/**
 * One flat dropdown over the tree, the ones inside a master indented under it.
 * Filter bars have no room for the picker's two selects, and choosing a master
 * already covers everything inside it.
 */
export function DestinationFilterSelect({
  value,
  onChange,
  className = 'w-[190px]',
  placeholder = 'All destinations',
}: DestinationFilterSelectProps) {
  const { data: tree = [], isLoading } = useDestinationTree(true);
  const rows = flattenDestinations(tree);

  return (
    <Select
      value={value || ALL}
      onValueChange={next => onChange(next === ALL ? undefined : next)}
      disabled={isLoading}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {rows.map(row => (
          <SelectItem key={row.id} value={row.id}>
            {/* Non-breaking spaces survive the trigger's single-line rendering. */}
            {row.depth > 0 ? '   ' : ''}
            {row.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
