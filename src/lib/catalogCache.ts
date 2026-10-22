import type { CatalogFilters } from "../api/resources.js";
import { fetchCatalog } from "../api/resources.js";
import { ApiError } from "../api/http.js";

const CACHE_PREFIX = "synapsvault-catalog:";

export interface CatalogFetchResult {
  data: unknown[];
  stale: boolean;
  syncedAt: Date | null;
}

function cacheKey(filters?: CatalogFilters): string {
  return `${CACHE_PREFIX}${JSON.stringify(filters ?? {})}`;
}

/**
 * Fetches the public catalog, persisting the last successful response in
 * sessionStorage so offline / flaky-network views can show cached data with a
 * stale indicator.
 */
export async function fetchCatalogWithCache(
  filters?: CatalogFilters,
  signal?: AbortSignal,
): Promise<CatalogFetchResult> {
  const key = cacheKey(filters);
  try {
    const data = await fetchCatalog(filters, signal);
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, at: Date.now() }));
    } catch {
      // Caching is best-effort: a full or unavailable store must not fail the fetch.
    }
    return { data, stale: false, syncedAt: new Date() };
  } catch (err) {
    // Only network-level failures fall back to cache; HTTP errors, validation
    // failures and aborts are surfaced to the caller.
    if (!(err instanceof ApiError && err.kind === "unreachable")) throw err;
    let raw: string | null = null;
    try { raw = sessionStorage.getItem(key); } catch { throw err; }
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "data" in parsed &&
          Array.isArray(parsed.data) &&
          "at" in parsed &&
          typeof parsed.at === "number" &&
          Number.isFinite(parsed.at)
        ) {
          return { data: parsed.data, stale: true, syncedAt: new Date(parsed.at) };
        }
      } catch {
        // Corrupt cache entries must never mask the original network error.
      }
      try { sessionStorage.removeItem(key); } catch { /* Best effort. */ }
    }
    throw err;
  }
}
