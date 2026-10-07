import { useState } from "react";
import { useAsync } from "./useAsync.js";
import { fetchCatalogWithCache } from "../lib/catalogCache.js";
import type { CatalogFilters } from "../api/resources.js";

export function useCatalog<T>(filters: CatalogFilters) {
  const [stale, setStale] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  // The filters the current `data` was fetched with. `filters` can run ahead
  // of `data` for a render while a new request starts.
  const [loadedFilters, setLoadedFilters] = useState<CatalogFilters | null>(null);

  const asyncState = useAsync<T[]>(
    async (signal) => {
      const result = await fetchCatalogWithCache(filters);
      // A superseded request must not relabel the data that's still shown.
      if (signal.aborted) return result.data as T[];
      setStale(result.stale);
      setSyncedAt(result.syncedAt);
      setLoadedFilters(filters);
      return result.data as T[];
    },
    [filters],
  );

  return { ...asyncState, stale, syncedAt, loadedFilters };
}
