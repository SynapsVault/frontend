import React, { useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useBuyResource } from "../hooks/useBuyResource.js";
import { FREIGHTER_INSTALL_URL, FREIGHTER_NOT_FOUND_CODE, type WalletErrorCode } from "../lib/freighter.js";
import { safeExternalUrl } from "../lib/safeUrl.js";
import { useDialogA11y } from "../hooks/useDialogA11y.js";
import { formatPrice, shortAddress } from "./ResourceCard.js";

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
  /** Starts the Freighter connection from inside the dialog. */
  onConnect?: () => void;
  /** True while the wallet connection is in progress. */
  connecting?: boolean;
  /** Last wallet connection error, shown inline. */
  walletError?: string | null;
  /** Machine-readable error code for the last wallet connection error. */
  walletErrorCode?: WalletErrorCode | null;
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
  onConnect,
  connecting = false,
  walletError,
  walletErrorCode,
}: BuyModalProps) {
  const { t } = useTranslation();
  const { status, result, error, errorCode, buy, reset } = useBuyResource(walletAddress);
  const displayPrice = formatPrice(price);
  const safeResultUrl = result?.url ? safeExternalUrl(result.url) : null;

  // Block close mid-payment so a half-signed flow isn't abandoned silently.
  const handleClose = useCallback(() => {
    if (status === "paying") return;
    reset();
    onClose();
  }, [status, reset, onClose]);

  const dialogRef = useDialogA11y<HTMLDivElement>({
    onClose: handleClose,
    canClose: () => status !== "paying",
  });

  return (
    <div
      className="synapse-modal-backdrop"
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
        className="synapse-modal outline-none"
      >
        <div className="synapse-modal__header">
          <h2 id="buy-title" className="synapse-modal__title">
            {t("buy.title")}
          </h2>
          <button
            onClick={handleClose}
            aria-label={t("buy.close")}
            disabled={status === "paying"}
            className="synapse-icon-btn disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="synapse-modal__body">
          {/* ── Summary ───────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-line bg-surface-sunken p-4">
            <p className="text-sm font-medium text-fg">{resourceTitle}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">{displayPrice} USDC</p>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">{t("buy.pays_to")}</dt>
                <dd className="font-mono text-fg" title={recipient}>
                  {shortAddress(recipient)}
                </dd>
              </div>
              {walletAddress && (
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-muted">{t("buy.from")}</dt>
                  <dd className="font-mono text-fg" title={walletAddress}>
                    {shortAddress(walletAddress)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* ── Confirm ───────────────────────────────────────────────────── */}
          {(status === "idle" || status === "paying") && (
            <>
              {!walletAddress && (
                <div className="space-y-3 rounded-xl border border-warning/30 bg-warning-soft p-3.5">
                  <p className="text-sm text-warning">
                    {t("buy.connect_prompt")}
                  </p>
                  {onConnect && (
                    <button
                      onClick={onConnect}
                      disabled={connecting}
                      aria-busy={connecting || undefined}
                      className="synapse-btn synapse-btn--secondary synapse-btn--sm"
                    >
                      {connecting && <span className="synapse-spinner" aria-hidden="true" />}
                      {t("buy.connect")}
                    </button>
                  )}
                  {walletError && (
                    <p role="alert" className="text-xs text-danger">
                      {walletError}
                      {walletErrorCode === FREIGHTER_NOT_FOUND_CODE && (
                        <>
                          {" "}
                          <a href={FREIGHTER_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                            {t("app.install_freighter")} ↗
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}

              {status === "paying" ? (
                <div role="status" aria-busy="true" className="flex items-center gap-3 text-sm text-fg-muted">
                  <span className="synapse-spinner" aria-hidden="true" />
                  {t("buy.approve_and_wait")}
                </div>
              ) : (
                <button
                  onClick={() => buy(accessUrl)}
                  disabled={!walletAddress}
                  className="synapse-btn synapse-btn--primary synapse-btn--lg w-full"
                >
                  {t("buy.pay", { price: displayPrice })}
                </button>
              )}
            </>
          )}

          {/* ── Success ───────────────────────────────────────────────────── */}
          {status === "success" && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-soft text-success" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </span>
                {t("buy.payment_success")}
              </div>

              {safeResultUrl ? (
                <a href={safeResultUrl} target="_blank" rel="noopener noreferrer" className="synapse-btn synapse-btn--primary w-full">
                  {t("buy.open_resource")} ↗
                </a>
              ) : (
                result.url && (
                  <p className="text-xs text-fg-subtle">
                    {t("buy.unsafe_resource")}
                  </p>
                )
              )}

              {result.download && (
                <a href={result.download.objectUrl} download={result.download.filename} className="synapse-btn synapse-btn--primary w-full">
                  {t("buy.download", { filename: result.download.filename })}
                </a>
              )}

              {result.explorerUrl ? (
                <a
                  href={result.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-accent-text hover:underline"
                >
                  {t("buy.view_transaction")} ↗
                </a>
              ) : (
                <p className="text-xs text-fg-subtle">
                  {t("buy.settlement_no_hash")}
                </p>
              )}
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {status === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger">
                <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.25" />
                  <path d="M8 5v3.5M8 11h.01" />
                </svg>
                <div>
                  <p>{error}</p>
                  {errorCode === FREIGHTER_NOT_FOUND_CODE && (
                    <a
                      href={FREIGHTER_INSTALL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block font-semibold underline"
                    >
                      {t("app.install_freighter")} ↗
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => buy(accessUrl)}
                disabled={!walletAddress}
                className="synapse-btn synapse-btn--primary w-full"
              >
                {t("buy.try_again")}
              </button>
            </div>
          )}

          {/* ── Copy URL fallback (always available) ───────────────────────── */}
          <div className="border-t border-line pt-4">
            <button onClick={() => onCopyUrl(accessUrl)} className="synapse-btn synapse-btn--ghost w-full">
              {t("buy.copy_access_url")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
