'use client';

import { useMemo } from 'react';
import { useDestinationTree } from './useDestinations';

/**
 * The master destination a trip is scoped to.
 *
 * Step 1 stores the picked master's id, but an itinerary saved before the
 * master list existed — or one opened straight into a later step on the edit
 * page — only carries the destination's name. So fall back to matching the name
 * against the master list, which is how step 1 recognises those rows too.
 */
export function useMasterDestinationId(
  destinationId?: string,
  destinationName?: string
): string | undefined {
  const { data: tree = [] } = useDestinationTree(true);

  return useMemo(() => {
    if (destinationId) return destinationId;

    const name = (destinationName || '').trim().toLowerCase();
    if (!name) return undefined;

    return tree.find(node => !node.parentId && node.name.toLowerCase() === name)?.id;
  }, [tree, destinationId, destinationName]);
}
