import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCatalogWithCache } from "./catalogCache.js";
import { fetchCatalog } from "../api/resources.js";
import { ApiError } from "../api/http.js";

vi.mock("../api/resources.js", () => ({
  fetchCatalog: vi.fn(),
}));

describe("fetchCatalogWithCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("returns fresh data when the network request succeeds", async () => {
    vi.mocked(fetchCatalog).mockResolvedValue([{ id: "1", title: "A" }]);

    const result = await fetchCatalogWithCache({ search: "test" });

    expect(result.stale).toBe(false);
    expect(result.data).toEqual([{ id: "1", title: "A" }]);
    expect(result.syncedAt).toBeInstanceOf(Date);
  });

  it("returns cached data with stale=true when the network fails", async () => {
    vi.mocked(fetchCatalog)
      .mockResolvedValueOnce([{ id: "1", title: "A" }])
      .mockRejectedValueOnce(new ApiError("Network down", "unreachable"));

    await fetchCatalogWithCache();
    const result = await fetchCatalogWithCache();

    expect(result.stale).toBe(true);
    expect(result.data).toEqual([{ id: "1", title: "A" }]);
    expect(result.syncedAt).toBeInstanceOf(Date);
  });

  it("rethrows when there is no cache and the network fails", async () => {
    vi.mocked(fetchCatalog).mockRejectedValue(new ApiError("Network down", "unreachable"));

    await expect(fetchCatalogWithCache()).rejects.toThrow("Network down");
  });

  it("drops corrupt cached JSON and rethrows the network error", async () => {
    const networkError = new Error("Network down");
    vi.mocked(fetchCatalog).mockRejectedValue(networkError);
    sessionStorage.setItem('synapsvault-catalog:{"search":"corrupt"}', "not-json");

    await expect(fetchCatalogWithCache({ search: "corrupt" })).rejects.toBe(networkError);
    expect(sessionStorage.getItem('synapsvault-catalog:{"search":"corrupt"}')).toBeNull();
  });

  it("forwards the abort signal to the catalog request", async () => {
    const signal = new AbortController().signal;
    vi.mocked(fetchCatalog).mockResolvedValue([]);

    await fetchCatalogWithCache({ search: "signal" }, signal);

    expect(fetchCatalog).toHaveBeenCalledWith({ search: "signal" }, signal);
  it("rethrows non-network errors even when cached data exists", async () => {
    vi.mocked(fetchCatalog)
      .mockResolvedValueOnce([{ id: "1", title: "A" }])
      .mockRejectedValueOnce(new ApiError("Forbidden", "http", 403));

    await fetchCatalogWithCache();

    await expect(fetchCatalogWithCache()).rejects.toThrow("Forbidden");
  });
});
