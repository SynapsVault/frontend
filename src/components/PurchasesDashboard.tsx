import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchBuyerPayments, receiptUrl, type PaymentReceipt } from "../api/payments.js";
import { formatPrice, shortAddress } from "./ResourceCard.js";
import { sumUsdc } from "./StatCard.js";

/** Stellar account ID (ed25519 public key, StrKey "G…"). */
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

interface Props {
  /** Looked up automatically when set (e.g. the connected wallet). */
  initialWallet?: string;
  /** Connected wallet, offered as a one-click shortcut. */
  connectedWallet?: string | null;
  /** id → title for resources seen in the catalog. */
  resourceTitles?: Record<string, string>;
}

export function PurchasesDashboard({ initialWallet = "", connectedWallet = null, resourceTitles = {} }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const errorId = useId();
  const [address, setAddress] = useState(initialWallet);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [searched, setSearched] = useState<string | null>(null);
  // Only the latest lookup may update state; older responses are dropped.
  const requestId = useRef(0);

  const search = useCallback(
    async (raw: string) => {
      const target = raw.trim().toUpperCase();
      if (!STELLAR_ADDRESS.test(target)) {
        requestId.current++;
        setLoading(false);
        setInvalid(true);
        setError(null);
        return;
      }
      const id = ++requestId.current;
      setAddress(target);
      setInvalid(false);
      setError(null);
      setLoading(true);
      try {
        const data = await fetchBuyerPayments(target);
        if (id !== requestId.current) return;
        setPayments([...data].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()));
        setSearched(target);
      } catch (err) {
        if (id !== requestId.current) return;
        // "" falls back to the translated generic message at render time.
        setError((err instanceof Error && err.message) || "");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialWallet) void search(initialWallet);
  }, [initialWallet, search]);

  // Drop in-flight responses after unmount.
  useEffect(() => () => void requestId.current++, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void search(address);
  };

  const errorMessage = invalid ? t("purchases.invalid_address") : error === "" ? t("purchases.load_failed") : error;
  const total = useMemo(() => sumUsdc(payments.map((p) => p.amount)), [payments]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <p className="text-sm text-fg-muted">{t("purchases.description")}</p>

        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor={inputId} className="sr-only">
            {t("purchases.wallet_label")}
          </label>
          <input
            id={inputId}
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (invalid) setInvalid(false);
            }}
            placeholder={t("purchases.placeholder")}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            aria-describedby={errorMessage ? errorId : undefined}
            className="synapse-input font-mono sm:flex-1"
          />
          <button type="submit" disabled={loading} className="synapse-btn synapse-btn--primary">
            {loading && <span className="synapse-spinner" aria-hidden="true" />}
            {t("purchases.look_up")}
          </button>
        </form>

        {connectedWallet && connectedWallet !== searched && (
          <button
            type="button"
            onClick={() => void search(connectedWallet)}
            className="mt-2 text-xs font-medium text-accent-text hover:underline"
          >
            {t("purchases.use_connected")} · <span className="font-mono">{shortAddress(connectedWallet)}</span>
          </button>
        )}

        {errorMessage && (
          <p id={errorId} role="alert" className="mt-3 text-sm text-danger">
            {errorMessage}
          </p>
        )}
      </div>

      {searched === null && !loading && (
        <div className="synapse-empty">
          <div className="synapse-empty__icon" aria-hidden="true">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M20 20l-4.2-4.2" />
            </svg>
          </div>
          <p className="synapse-empty__title">{t("purchases.prompt_title")}</p>
          <p className="synapse-empty__body">{t("purchases.prompt_body")}</p>
        </div>
      )}

      {searched !== null && !loading && payments.length === 0 && error === null && (
        <div className="synapse-empty">
          <div className="synapse-empty__icon" aria-hidden="true">
            <svg width="24" height="24" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h12l-1.3 7.5a1 1 0 0 1-1 .8H5.3a1 1 0 0 1-1-.8L3 4Zm0 0-.5-2H1" />
              <circle cx="6" cy="15" r="1" />
              <circle cx="12" cy="15" r="1" />
            </svg>
          </div>
          <p className="synapse-empty__title">{t("purchases.empty_title")}</p>
          <p className="synapse-empty__body">{t("purchases.empty_body")}</p>
        </div>
      )}

      {payments.length > 0 && (
        <div className="rounded-xl border border-line bg-surface shadow-sm" aria-busy={loading}>
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-fg sm:px-5">
            {t("purchases.total", { count: payments.length, amount: total })}
          </h2>
          <ul role="list" className="divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5">
                <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {resourceTitles[p.resourceId] ?? t("purchases.resource_fallback", { id: p.resourceId.slice(0, 8) })}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    <time dateTime={p.paidAt}>{new Date(p.paidAt).toLocaleDateString()}</time>
                    <span aria-hidden="true"> · </span>
                    <span className="whitespace-nowrap font-mono" title={t("purchases.paid_to", { address: p.recipientAddress })}>
                      → {shortAddress(p.recipientAddress)}
                    </span>
                  </p>
                </div>
                <span className="mr-auto font-mono text-sm font-semibold tabular-nums text-fg sm:mr-0">{formatPrice(p.amount)} USDC</span>
                <a
                  href={receiptUrl(p.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="synapse-btn synapse-btn--secondary synapse-btn--sm"
                >
                  {t("purchases.view_receipt")} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
