import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError, getJson, isArray, hasKeys, authHeaders, setTokenProvider, readJson } from "./http.js";

function respond(body: string, status = 200, type = "application/json") {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status, headers: { "content-type": type } })));
}
afterEach(() => { vi.unstubAllGlobals(); setTokenProvider(null); });
describe("API responses", () => {
  it("reads and validates JSON", async () => {
    respond('[{"id":"1"}]');
    await expect(getJson("/resources", "Failed", undefined, isArray)).resolves.toEqual([{ id: "1" }]);
  });
  it("uses the runtime session token", async () => {
    setTokenProvider(() => "session-token"); respond('[]');
    await getJson("/resources", "Failed");
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer session-token");
  });
  it("sends no credentials on public reads", async () => {
    respond('[]'); await getJson("/resources", "Failed");
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
  });
  it("classifies HTML fallback as configuration failure", async () => {
    respond('<html></html>', 200, 'text/html');
    await expect(getJson("/resources", "Failed")).rejects.toMatchObject({ kind: "misconfigured" });
  });
  it.each([502,503,504])("classifies gateway %i as unreachable", async (status) => {
    respond('{}', status);
    await expect(getJson("/resources", "Failed")).rejects.toMatchObject({ kind: "unreachable", status });
  });
  it("preserves backend validation messages", async () => {
    respond('{"error":"Invalid price"}', 400);
    await expect(getJson("/resources", "Failed")).rejects.toThrow("Invalid price");
  });
  it("classifies network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(getJson("/resources", "Failed")).rejects.toBeInstanceOf(ApiError);
  });
  it("preserves caller cancellation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")));
    await expect(getJson("/resources", "Failed")).rejects.toMatchObject({ name: "AbortError" });
  });
  it("rejects unexpected response shapes", async () => {
    respond('{}');
    await expect(getJson("/agent/status", "Failed", undefined, hasKeys("agent"))).rejects.toMatchObject({ kind: "misconfigured" });
  });
  it("does not generate client HMAC headers", () => { expect(authHeaders("key")).toEqual({ "x-api-key": "key" }); });
  it("supports successful empty mutation responses", async () => {
    await expect(readJson(new Response(null, { status: 204 }), "Failed")).resolves.toBeUndefined();
  });
  it("identifies a crashed Vercel function as a server error", async () => {
    respond("A server error has occurred\nFUNCTION_INVOCATION_FAILED", 500, "text/plain");
    await expect(getJson("/resources", "Failed")).rejects.toMatchObject({ kind: "http", status: 500, message: expect.stringContaining("server error") });
  });
});
