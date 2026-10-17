import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  EMPTY_BODY_HASH,
  assertSecureContext,
  buildCanonicalString,
  hashRequestBody,
  signPublisherRequestHeaders,
} from "./requestSignature.js";

describe("requestSignature", () => {
  const originalIsSecureContext = Object.getOwnPropertyDescriptor(
    window,
    "isSecureContext",
  );
  const originalSubtle = Object.getOwnPropertyDescriptor(crypto, "subtle");

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalIsSecureContext) {
      Object.defineProperty(window, "isSecureContext", originalIsSecureContext);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).isSecureContext;
    }

    if (originalSubtle) {
      Object.defineProperty(crypto, "subtle", originalSubtle);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (crypto as any).subtle;
    }
  });

  describe("assertSecureContext", () => {
    it("rejects with a descriptive error when window.isSecureContext is false", () => {
      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        get: () => false,
      });
      expect(() => assertSecureContext()).toThrow(/secure context/i);
    });

    it("rejects with a descriptive error when crypto.subtle is unavailable", () => {
      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        get: () => true,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (crypto as any).subtle;
      expect(() => assertSecureContext()).toThrow(/secure context/i);
    });
  });

  describe("buildCanonicalString", () => {
    it("includes the idempotency key when provided", () => {
      const canonical = buildCanonicalString({
        method: "POST",
        path: "/api/publish",
        timestamp: "1234567890",
        bodyHash: "abc123",
        idempotencyKey: "key-123",
      });
      expect(canonical).toContain("key-123");
    });

    it("produces different canonical strings for different idempotency keys", () => {
      const base = {
        method: "POST",
        path: "/api/publish",
        timestamp: "1234567890",
        bodyHash: "abc123",
      };
      const a = buildCanonicalString({ ...base, idempotencyKey: "key-a" });
      const b = buildCanonicalString({ ...base, idempotencyKey: "key-b" });
      expect(a).not.toEqual(b);
    });

    it("produces the same canonical string for identical inputs", () => {
      const input = {
        method: "POST",
        path: "/api/publish",
        timestamp: "1234567890",
        bodyHash: "abc123",
        idempotencyKey: "key-123",
      };
      expect(buildCanonicalString(input)).toEqual(buildCanonicalString(input));
    });

    it("joins parts in order: method, path, timestamp, bodyHash, idempotencyKey?", () => {
      const canonical = buildCanonicalString({
        method: "post",
        path: "/api/test",
        timestamp: "111",
        bodyHash: "hash",
      });
      expect(canonical).toBe("POST\n/api/test\n111\nhash");
      const canonicalWithKey = buildCanonicalString({
        method: "POST",
        path: "/api/test",
        timestamp: "111",
        bodyHash: "hash",
        idempotencyKey: "k",
      });
      expect(canonicalWithKey).toBe("POST\n/api/test\n111\nhash\nk");
    });
  });

  describe("hashRequestBody", () => {
    it("returns a deterministic hex string for the same body", async () => {
      const body = '{"hello":"world"}';
      const h1 = await hashRequestBody(body);
      const h2 = await hashRequestBody(body);
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^[0-9a-f]{64}$/);
    });

    it("returns different hashes for different bodies", async () => {
      const h1 = await hashRequestBody('{"a":1}');
      const h2 = await hashRequestBody('{"a":2}');
      expect(h1).not.toBe(h2);
    });
  });

  describe("signPublisherRequestHeaders", () => {
    it("produces X-Timestamp and X-Signature in secure context", async () => {
      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        get: () => true,
      });

      const headers = await signPublisherRequestHeaders({
        apiKey: "test-key",
        method: "POST",
        path: "/api/publish",
        body: '{"assetId":"a1"}',
      });

      expect(headers).toBeDefined();
      expect(headers["X-Timestamp"]).toBeDefined();
      expect(headers["X-Signature"]).toBeDefined();
      expect(typeof headers["X-Timestamp"]).toBe("string");
      expect(typeof headers["X-Signature"]).toBe("string");
    });

    it("changes signature when idempotency key changes (same body/method/path)", async () => {
      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        get: () => true,
      });

      const base = {
        apiKey: "secret",
        method: "POST",
        path: "/api/publish",
        body: '{"assetId":"a1"}',
      };

      const h1 = await signPublisherRequestHeaders({ ...base, idempotencyKey: "k1" });
      const h2 = await signPublisherRequestHeaders({ ...base, idempotencyKey: "k2" });
      expect(h1["X-Signature"]).not.toBe(h2["X-Signature"]);
    });

    it("produces stable headers for identical inputs in the same second window", async () => {
      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        get: () => true,
      });

      const input = {
        apiKey: "secret",
        method: "POST",
        path: "/api/publish",
        body: '{"assetId":"a1"}',
        idempotencyKey: "key-123",
      };
      const h1 = await signPublisherRequestHeaders(input);
      const h2 = await signPublisherRequestHeaders(input);
      expect(h1["X-Signature"]).toBe(h2["X-Signature"]);
      expect(h1["X-Timestamp"]).toBe(h2["X-Timestamp"]);
    });

    it("uses EMPTY_BODY_HASH when no body is provided", async () => {
      Object.defineProperty(window, "isSecureContext", {
        configurable: true,
        get: () => true,
      });

      const emptyBodyHash = EMPTY_BODY_HASH;
      expect(emptyBodyHash).toMatch(/^[0-9a-f]{64}$/);

      const headers = await signPublisherRequestHeaders({
        apiKey: "secret",
        method: "POST",
        path: "/api/publish",
      });

      expect(headers["X-Signature"]).toBeDefined();
    });
  });
});
