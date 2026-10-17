import type { ErrorInfo } from "react";

const SENSITIVE_KEYS = [
  "password",
  "secret",
  "key",
  "token",
  "authorization",
  "x-payment",
  "x402",
  "signedXdr",
];

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => lower.includes(sensitive));
}

export function scrubEvent<T extends {
  request?: { headers?: Record<string, unknown>; data?: unknown };
  extra?: Record<string, unknown>;
  breadcrumbs?: { values?: Array<{ data?: Record<string, unknown> }> } | Array<{ data?: Record<string, unknown> }>;
}>(event: T): T {
  // Scrub request headers
  if (event.request?.headers) {
    for (const [key] of Object.entries(event.request.headers)) {
      if (isSensitiveKey(key)) {
        (event.request.headers as Record<string, unknown>)[key] = "[Filtered]";
      }
    }
  }

  // Scrub request data (body)
  if (event.request?.data && typeof event.request.data === "object" && event.request.data !== null) {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(event.request.data as Record<string, unknown>)) {
      scrubbed[key] = isSensitiveKey(key) ? "[Filtered]" : value;
    }
    event.request.data = scrubbed;
  }

  // Scrub extra data
  if (event.extra) {
    for (const [key] of Object.entries(event.extra)) {
      if (isSensitiveKey(key)) {
        event.extra[key] = "[Filtered]";
      }
    }
  }

  // Scrub breadcrumbs
  const breadcrumbs = Array.isArray(event.breadcrumbs)
    ? event.breadcrumbs
    : event.breadcrumbs?.values;
  if (breadcrumbs && Array.isArray(breadcrumbs)) {
    for (const breadcrumb of breadcrumbs) {
      if (breadcrumb.data && typeof breadcrumb.data === "object" && breadcrumb.data !== null) {
        for (const [key] of Object.entries(breadcrumb.data as Record<string, unknown>)) {
          if (isSensitiveKey(key)) {
            (breadcrumb.data as Record<string, unknown>)[key] = "[Filtered]";
          }
        }
      }
    }
  }

  return event;
}

export async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import("@sentry/react");

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    integrations: [Sentry.browserTracingIntegration()],
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}

/** Capture an error caught by a React error boundary without eagerly loading Sentry. */
export async function captureException(error: Error, errorInfo?: ErrorInfo): Promise<void> {
  const Sentry = await import("@sentry/react");
  Sentry.captureException(error, {
    contexts: errorInfo
      ? { react: { componentStack: errorInfo.componentStack } }
      : undefined,
  });
}

export default initSentry;
