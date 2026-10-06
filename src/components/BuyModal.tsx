import React, { useEffect, useRef } from "react";
import { useBuyResource } from "../hooks/useBuyResource.js";

interface BuyModalProps {
  resourceTitle: string;
  price: string;
  recipient: string;
  accessUrl: string;
  /** Connected wallet address, or null when disconnected. */
  walletAddress: string | null;
  onClose: () => void;
  /** Copy-URL fallback so buyers can still pay via another x402 client. */
  onCopyUrl: (url: string) => void;
}

/**
 * One-click x402 purchase dialog (issue #219). Confirms price and recipient,
 * pays with Freighter, then shows the settlement result (tx hash + explorer
 * link, link URL, or file download). The Copy URL fallback stays available at
 * every step so the manual flow is never lost.
 */
export function BuyModal({
  resourceTitle,
  price,
  recipient,
  accessUrl,
  walletAddress,
  onClose,
  onCopyUrl,
}: BuyModalProps) {
  const { status, result, error, buy, reset } = useBuyResource(walletAddress);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  // Block close mid-payment so a half-signed flow isn't abandoned silently.
  const handleClose = () => {
    if (status === "paying") return;
    reset();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Mirror handleClose: don't allow Escape to abandon an in-flight payment.
      if (e.key !== "Escape" || status === "paying") return;
      reset();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [status, reset, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-title"
        tabIndex={-1}
        className="h-full w-full max-w-none overflow-y-auto rounded-none bg-surface-raised p-4 shadow-xl outline-none sm:h-auto sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="buy-title" className="text-lg font-semibold text-fg">
            Buy resource
          </h2>
          <button
            onClick={handleClose}
            aria-label="Close"
            disabled={status === "paying"}
            className="rounded-full p-2.5 text-fg-subtle hover:bg-surface-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* ── Confirm ─────────────────────────────────────────────────────── */}
        {(status === "idle" || status === "paying") && (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">{resourceTitle}</p>
            <dl className="space-y-2 rounded-lg bg-surface-sunken p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-fg-muted">Price</dt>
                <dd className="font-medium text-accent-text">{price} USDC</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">Pays to</dt>
                <dd
                  className="truncate font-mono text-xs text-fg"
                  title={recipient}
                >
                  {recipient}
                </dd>
              </div>
            </dl>

            {!walletAddress && (
              <p className="text-sm text-warning">
                Connect your Freighter wallet to pay, or use Copy URL below.
              </p>
            )}

            {status === "paying" ? (
              <div
                role="status"
                aria-busy="true"
                className="flex items-center gap-3 text-sm text-fg-muted"
              >
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                Approve in Freighter and wait for settlement…
              </div>
            ) : (
              <button
                onClick={() => buy(accessUrl)}
                disabled={!walletAddress}
                className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
              >
                Pay {price} USDC
              </button>
            )}
          </div>
        )}

        {/* ── Success ─────────────────────────────────────────────────────── */}
        {status === "success" && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-soft text-success">
                ✓
              </span>
              Payment successful
            </div>

            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block break-all rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent-text hover:bg-accent/15"
              >
                Open resource ↗
              </a>
            )}

            {result.download && (
              <a
                href={result.download.objectUrl}
                download={result.download.filename}
                className="block rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent-text hover:bg-accent/15"
              >
                Download {result.download.filename}
              </a>
            )}

            {result.explorerUrl ? (
              <a
                href={result.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent-text hover:text-accent-hover"
              >
                View transaction on Stellar Explorer ↗
              </a>
            ) : (
              <p className="text-xs text-fg-subtle">
                Settlement confirmed. Transaction hash unavailable for this payment.
              </p>
            )}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-danger">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                ✕
              </span>
              <p>{error}</p>
            </div>
            <button
              onClick={() => buy(accessUrl)}
              disabled={!walletAddress}
              className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Copy URL fallback (always available) ─────────────────────────── */}
        <div className="mt-4 border-t border-line pt-4">
          <button
            onClick={() => onCopyUrl(accessUrl)}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium text-fg-muted hover:bg-surface-hover sm:py-2"
          >
            Copy access URL instead
          </button>
        </div>
      </div>
    </div>
  );
}
