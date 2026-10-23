
// Destination Database Types

export type PlaceType =
  | 'MOUNTAIN'
  | 'BEACH'
  | 'CITY'
  | 'DESERT'
  | 'FOREST'
  | 'HISTORICAL'
  | 'ADVENTURE'
  | 'RELIGIOUS'
  | 'OTHER';

export const placeTypeLabels: Record<PlaceType, string> = {
  MOUNTAIN: 'Mountain',
  BEACH: 'Beach',
  CITY: 'City',
  DESERT: 'Desert',
  FOREST: 'Forest',
  HISTORICAL: 'Historical',
  ADVENTURE: 'Adventure',
  RELIGIOUS: 'Religious',
  OTHER: 'Other',
};

export const placeTypeColors: Record<PlaceType, string> = {
  MOUNTAIN: 'bg-emerald-100 text-emerald-700',
  BEACH: 'bg-cyan-100 text-cyan-700',
  CITY: 'bg-blue-100 text-blue-700',
  DESERT: 'bg-amber-100 text-amber-700',
  FOREST: 'bg-green-100 text-green-700',
  HISTORICAL: 'bg-orange-100 text-orange-700',
  ADVENTURE: 'bg-red-100 text-red-700',
  RELIGIOUS: 'bg-purple-100 text-purple-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

/**
 * Destinations form a two-level tree.
 *
 *   Kashmir          <- master destination, parentId === null
 *     Gulmarg        <- destination inside it
 *     Sonmarg
 *   Delhi            <- master with nothing inside it yet
 *
 * A master is simply a destination with no parent. Hotels point at either rung.
 */
export interface DestinationCounts {
  children: number;
  hotels: number;
}

/** The trimmed shape embedded in a hotel record or a parent reference. */
export interface DestinationRef {
  id: string;
  name: string;
  country?: string | null;
  address?: string | null;
  placeType?: PlaceType;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
}

export interface Destination {
  id: string;
  name: string;
  /** Master destinations only — the ones inside them inherit it. */
  country?: string | null;
  /** Only for a destination inside a master; a master has a country instead. */
  address?: string | null;
  /** null means this is a master destination. */
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  children?: Destination[];
  _count?: DestinationCounts;
  placeType: PlaceType;
  shortDescription?: string;
  description?: string;
  highlights: string[];
  amenities: string[];
  bestTimeToVisit?: string;
  averageTemperature?: string;
  language?: string;
  currency?: string;
  timezone?: string;
  thingsToKnow?: string;
  altNames: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branchId?: string;
  createdBy?: string;
}

/** A node as returned by `/destinations/tree`, with the ones inside it nested. */
export interface DestinationNode {
  id: string;
  name: string;
  country?: string | null;
  address?: string | null;
  placeType: PlaceType;
  shortDescription?: string | null;
  isActive: boolean;
  parentId: string | null;
  children: DestinationNode[];
  _count?: DestinationCounts;
}

/** "Gulmarg, Kashmir" for one inside a master, plain "Kashmir" for a master. */
export function destinationLabel(name: string, parentName?: string | null): string {
  return parentName ? `${name}, ${parentName}` : name;
}

/** Hotels and destinations counted across a master and everything inside it. */
export function rollUpHotels(node: DestinationNode): number {
  return (
    (node._count?.hotels ?? 0) +
    node.children.reduce((sum, child) => sum + rollUpHotels(child), 0)
  );
}

/** Flatten masters and their children into one list, tagged with depth. */
export function flattenDestinations(
  nodes: DestinationNode[]
): Array<DestinationNode & { depth: number }> {
  return nodes.flatMap(node => [
    { ...node, depth: 0 },
    ...node.children.map(child => ({ ...child, depth: 1 })),
  ]);
}

export interface DestinationFilters {
  search?: string;
  placeType?: PlaceType;
  /** A master id, or `'root'` for the master destinations only. */
  parentId?: string | 'root';
  isActive?: boolean;
  page?: number;
  limit?: number;
}
