import { describe, expect, it, vi } from "vitest";
import { captureException } from "./sentry.js";
import * as Sentry from "@sentry/react";

vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
}));

describe("captureException", () => {
  it("forwards the error and React component stack to Sentry", async () => {
    const error = new Error("render failed");
    await captureException(error, { componentStack: "at BrokenWidget" });

    expect(Sentry.captureException).toHaveBeenCalledWith(error, {
      contexts: { react: { componentStack: "at BrokenWidget" } },
    });
  });

  it("captures errors without optional React metadata", async () => {
    const error = new Error("render failed");
    await captureException(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error, { contexts: undefined });
  });
});
import { scrubEvent, isSensitiveKey } from "./sentry";

describe("Sentry PII scrubbing", () => {
  describe("isSensitiveKey", () => {
    it("identifies sensitive keys regardless of casing", () => {
      expect(isSensitiveKey("password")).toBe(true);
      expect(isSensitiveKey("PASSWORD")).toBe(true);
      expect(isSensitiveKey("apiKey")).toBe(true);
      expect(isSensitiveKey("secret_token")).toBe(true);
      expect(isSensitiveKey("Authorization")).toBe(true);
      expect(isSensitiveKey("X-Payment")).toBe(true);
      expect(isSensitiveKey("x402Response")).toBe(true);
      expect(isSensitiveKey("signedXdrPayload")).toBe(true);
    });

    it("returns false for non-sensitive keys", () => {
      expect(isSensitiveKey("username")).toBe(false);
      expect(isSensitiveKey("amount")).toBe(false);
      expect(isSensitiveKey("timestamp")).toBe(false);
      expect(isSensitiveKey("status")).toBe(false);
    });
  });

  describe("scrubEvent", () => {
    it("scrubs sensitive headers and preserves non-sensitive headers", () => {
      const event = {
        request: {
          headers: {
            "content-type": "application/json",
            authorization: "Bearer secret-jwt-token",
            "x-payment": "proof-of-payment",
            accept: "application/json",
          },
        },
      };

      const result = scrubEvent(event);
      expect(result.request?.headers).toEqual({
        "content-type": "application/json",
        authorization: "[Filtered]",
        "x-payment": "[Filtered]",
        accept: "application/json",
      });
    });

    it("scrubs sensitive body payload fields", () => {
      const event = {
        request: {
          data: {
            publicKey: "GBX...",
            password: "super-secret-password",
            signedXdr: "AAAA...",
            x402: "token123",
            memo: "Public memo",
          },
        },
      };

      const result = scrubEvent(event);
      expect(result.request?.data).toEqual({
        publicKey: "GBX...",
        password: "[Filtered]",
        signedXdr: "[Filtered]",
        x402: "[Filtered]",
        memo: "Public memo",
      });
    });

    it("scrubs sensitive values from extra context", () => {
      const event = {
        extra: {
          accountId: "ACC-123",
          apiKey: "sk_live_12345",
          sharedSecret: "very-secret",
          retryCount: 3,
        },
      };

      const result = scrubEvent(event);
      expect(result.extra).toEqual({
        accountId: "ACC-123",
        apiKey: "[Filtered]",
        sharedSecret: "[Filtered]",
        retryCount: 3,
      });
    });

    it("scrubs sensitive values from breadcrumbs data", () => {
      const event = {
        breadcrumbs: {
          values: [
            {
              category: "xhr",
              data: {
                url: "/api/pay",
                token: "sensitive-token",
                method: "POST",
              },
            },
            {
              category: "navigation",
              data: {
                from: "/login",
                to: "/dashboard",
              },
            },
          ],
        },
      };

      const result = scrubEvent(event);
      expect(result.breadcrumbs.values[0].data).toEqual({
        url: "/api/pay",
        token: "[Filtered]",
        method: "POST",
      });
      expect(result.breadcrumbs.values[1].data).toEqual({
        from: "/login",
        to: "/dashboard",
      });
    });

    it("handles events with missing or null fields gracefully", () => {
      const emptyEvent = {};
      expect(scrubEvent(emptyEvent)).toEqual({});

      const partialEvent = { request: {} };
      expect(scrubEvent(partialEvent)).toEqual({ request: {} });
    });
  });
});
