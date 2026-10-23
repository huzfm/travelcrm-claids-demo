import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useDebounce } from './useDebounce';
import type { SearchResults } from '@/types/dashboard.types';

/**
 * Global search across trips and leads, behind the top-bar search box.
 * The query is debounced and only fires from two characters up.
 */
export function useGlobalSearch(query: string, options: { limit?: number } = {}) {
  const debounced = useDebounce(query.trim(), 250);
  const enabled = debounced.length >= 2;

  const result = useQuery<SearchResults>({
    queryKey: ['global-search', debounced, options.limit ?? 8],
    queryFn: async () => {
      const res = await api.get('search', {
        params: { q: debounced, limit: options.limit ?? 8 },
      });
      return res.data.data;
    },
    enabled,
    staleTime: 30 * 1000,
  });

  return {
    ...result,
    /** True while the user has typed but the debounced request has not fired yet. */
    isPending: query.trim().length >= 2 && query.trim() !== debounced,
    enabled,
  };
}
