import React, { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchResourceMeta } from "../api/resources.js";
import { useAsync } from "../hooks/useAsync.js";
import { ErrorBanner } from "./ErrorBanner.js";
import { ExplorerLink } from "./ExplorerLink.js";

interface ResourcePreviewModalProps {
  resourceId: string;
  onClose: () => void;
  onCopyUrl?: (url: string) => void;
  /** Open the in-browser purchase flow for this resource (issue #219). */
  onBuy?: () => void;
}

// ---------------------------------------------------------------------------
// LazyImage – renders with a skeleton placeholder until the image has loaded.
// Falls back to a text placeholder when src is missing or the load fails.
// ---------------------------------------------------------------------------

interface LazyImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

function LazyImage({ src, alt, className = "" }: LazyImageProps) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use IntersectionObserver to defer the src assignment until the element
  // enters the viewport, avoiding any network fetch before it is visible.
  useEffect(() => {
    if (!src || !imgRef.current) return;

    const img = imgRef.current;
    let observer: IntersectionObserver | null = null;

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            img.src = src;
            observer?.disconnect();
          }
        },
        { threshold: 0.1 },
      );
      observer.observe(img);
    } else {
      // Fallback for environments without IntersectionObserver (e.g. jsdom).
      img.src = src;
    }

    return () => observer?.disconnect();
  }, [src]);

  if (!src || errored) {
    return (
      <div
        role="img"
        aria-label={`${alt} (no preview available)`}
        className={`flex items-center justify-center rounded-lg bg-surface-hover text-fg-subtle text-xs ${className}`}
      >
        {t("preview.no_preview")}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Skeleton shown until image loads */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-line rounded-lg"
        />
      )}
      <img
        ref={imgRef}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResourcePreviewModal
// ---------------------------------------------------------------------------

export function ResourcePreviewModal({
  resourceId,
  onClose,
  onCopyUrl,
  onBuy,
}: ResourcePreviewModalProps) {
  const { t } = useTranslation();
  // Fetch is initiated only when the modal mounts (i.e. when it opens), so
  // content is loaded on-demand, not before the modal is rendered (#310).
  const { status, data, error, retry } = useAsync(
    (signal) => fetchResourceMeta(resourceId, signal),
    [resourceId],
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap
  const handleTabKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    if (!dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  }, []);

  // Lock body scroll
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
        aria-describedby={data?.description ? "preview-desc" : undefined}
        tabIndex={-1}
        onKeyDown={handleTabKey}
        className="relative w-full h-full max-w-none overflow-y-auto rounded-none bg-surface-raised p-4 shadow-xl outline-none sm:h-auto sm:max-w-lg sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="preview-title" className="text-xl font-bold text-fg">
            {t("preview.title")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("preview.close")}
            className="rounded-full p-1.5 text-fg-subtle hover:bg-surface-hover hover:text-fg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          {/* Skeleton placeholder while loading (#310) */}
          {(status === "idle" || status === "loading") && (
            <div role="status" aria-busy="true" aria-label={t("preview.loading")} className="space-y-3">
              {/* Thumbnail skeleton */}
              <div className="h-32 w-full animate-pulse rounded-lg bg-line" />
              {/* Title skeleton */}
              <div className="h-5 w-3/4 animate-pulse rounded bg-line" />
              {/* Meta skeletons */}
              <div className="h-4 w-1/2 animate-pulse rounded bg-line" />
              <div className="h-4 w-full animate-pulse rounded bg-line" />
              <span className="sr-only">{t("preview.loading")}</span>
            </div>
          )}

          {status === "error" && (
            <ErrorBanner
              message={
                error ?? "Could not load this resource preview. Check your connection and try again."
              }
              onRetry={retry}
            />
          )}

          {status === "success" && data && (
            <div className="space-y-4">
              {/* Lazy-loaded thumbnail (#310) */}
              {data.thumbnailUrl && (
                <LazyImage
                  src={data.thumbnailUrl}
                  alt={`${data.title} thumbnail`}
                  className="h-32 w-full"
                />
              )}

              <div>
                <h3 className="text-lg font-semibold text-fg">
                  {data.title}
                </h3>
                {data.publisherName && (
                  <p className="text-sm text-fg-muted">
                    {t("preview.by", { name: data.publisherName })}
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-fg">
                  {t("preview.description")}
                </h4>
                {data.description ? (
                  <p id="preview-desc" className="mt-1 text-sm text-fg-muted">
                    {data.description}
                  </p>
                ) : (
                  <p
                    id="preview-desc"
                    className="mt-1 text-sm italic text-fg-subtle"
                  >
                    {t("preview.no_description")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-lg bg-surface-sunken p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-fg-muted">
                    {t("preview.price")}
                  </p>
                  <p className="mt-1 font-medium text-accent-text">
                    {data.price} USDC
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-fg-muted">
                    {t("preview.type")}
                  </p>
                  <p className="mt-1 font-medium text-fg">
                    {data.resourceType}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-fg-muted">
                    {t("preview.verification")}
                  </p>
                  <p className="mt-1 font-medium text-fg">
                    {data.verificationStatus}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-fg-muted">
                    {t("preview.on_chain_status")}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-medium text-fg">
                      {data.onchainStatus === "none" ? t("preview.not_on_chain") : data.onchainStatus}
                    </span>
                    {data.onchainStatus === "registered" && data.onchainTxHash && (
                      <ExplorerLink
                        type="tx"
                        value={data.onchainTxHash}
                        className="text-xs text-accent-text hover:text-accent-hover"
                      >
                        ↗
                      </ExplorerLink>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-fg">
                  {t("preview.content_integrity")}
                </h4>
                {data.contentHash ? (
                  <div className="mt-1 space-y-2">
                    <p className="text-xs text-fg-muted">
                      {t("preview.integrity_description")}
                    </p>
                    <div className="flex items-start gap-2 rounded-lg bg-surface-sunken p-2">
                      <code className="break-all font-mono text-xs text-fg">
                        {data.contentHash}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(data.contentHash ?? "");
                        }}
                        aria-label={t("preview.copy_content_hash")}
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-accent-text hover:bg-accent-soft"
                      >
                        {t("preview.copy")}
                      </button>
                    </div>
                    {data.onchainStatus === "registered" && data.onchainTxHash && (
                      <ExplorerLink
                        type="tx"
                        value={data.onchainTxHash}
                        className="text-xs text-accent-text hover:text-accent-hover"
                      >
                        {t("preview.view_registration")}
                      </ExplorerLink>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-sm italic text-fg-subtle">
                    {t("preview.no_integrity")}
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  onClick={onClose}
                  className="w-full rounded-lg px-4 py-3 text-sm font-medium text-fg hover:bg-surface-hover sm:w-auto sm:py-2"
                >
                  {t("preview.close")}
                </button>
                <button
                  onClick={() => {
                    onCopyUrl?.(data.accessUrl);
                  }}
                  className="w-full rounded-lg border border-line-strong px-4 py-3 text-sm font-medium text-fg hover:bg-surface-hover sm:w-auto sm:py-2"
                >
                  {t("preview.copy_access_url")}
                </button>
                {onBuy && (
                  <button
                    onClick={onBuy}
                    className="synapse-btn synapse-btn--primary w-full sm:w-auto"
                  >
                    {t("preview.buy", { price: data.price })}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
