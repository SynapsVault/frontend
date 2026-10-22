import { fetchAnalytics } from "../api/analytics.js";
import { useAsync } from "./useAsync.js";

export function useAnalytics(apiKey: string) {
  const { data, status, error, retry } = useAsync(
    async () => apiKey ? fetchAnalytics(apiKey) : null,
    [apiKey],
  );
  return { data: apiKey ? data : null, loading: Boolean(apiKey) && (status === "idle" || status === "loading"), error: apiKey ? error : null, retry };
}
