import React from "react";
import { useTranslation } from "react-i18next";
import { ExplorerLink } from "./ExplorerLink.js";

export interface Resource {
  id: string;
  title: string;
  price: string;
  resourceType: string;
  publisherName?: string;
  walletAddress: string;
  verificationStatus: string;
  onchainStatus: string;
  onchainTxHash?: string;
  listed: boolean;
  accessUrl: string;
}

type Tone = "success" | "warning" | "danger" | "accent" | "neutral";

// Full class names (not `synapse-tag--${tone}`) so Tailwind's content scan
// keeps these rules in the build.
const TONE_CLASS: Record<Tone, string> = {
  success: "synapse-tag--success",
  warning: "synapse-tag--warning",
  danger: "synapse-tag--danger",
  accent: "synapse-tag--accent",
  neutral: "synapse-tag--neutral",
};

const VERIFY_TONE: Record<string, Tone> = { verified: "success", pending: "warning", rejected: "danger" };
const CHAIN_TONE: Record<string, Tone> = { registered: "accent", pending: "warning", failed: "danger" };

/** Pill showing a verification or on-chain status, colored by meaning. */
export function StatusTag({ status, type }: { status: string; type: "verify" | "chain" }) {
  const { t } = useTranslation();
  const tone = (type === "verify" ? VERIFY_TONE : CHAIN_TONE)[status] ?? (type === "verify" ? "warning" : "neutral");
  return (
    <span className={`synapse-tag ${TONE_CLASS[tone]}`}>
      <span className="synapse-tag__dot" aria-hidden="true" />
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  );
}

/** Truncates a Stellar address to GABC…WXYZ. */
function shortAddress(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

interface Props {
  resource: Resource;
  onPreview: (resource: Resource) => void;
  onBuy: (resource: Resource) => void;
}

/** Catalog card for a single paywalled resource. */
export function ResourceCard({ resource: r, onPreview, onBuy }: Props) {
  const { t } = useTranslation();
  return (
    <article className="synapse-resource-card" aria-labelledby={`resource-${r.id}-title`}>
      <div className="synapse-resource-card__header">
        <span className="synapse-resource-card__type" aria-hidden="true">
          {r.resourceType === "link" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M6.5 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.6.6M9.5 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.6-.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M9 1.5H4.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5L9 1.5Z M9 1.5V5h3.5" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <div className="synapse-resource-card__price">
          {r.price} <span>USDC</span>
        </div>
      </div>

      <div>
        <h3 id={`resource-${r.id}-title`} className="synapse-resource-card__title">
          {r.title}
        </h3>
        {r.publisherName && (
          <div className="synapse-resource-card__publisher">
            {t("catalog.by_publisher", { name: r.publisherName })}
          </div>
        )}
      </div>

      <div className="synapse-resource-card__tags">
        <StatusTag status={r.verificationStatus} type="verify" />
        <StatusTag status={r.onchainStatus} type="chain" />
        {r.onchainStatus === "registered" && r.onchainTxHash && (
          <ExplorerLink type="tx" value={r.onchainTxHash} className="synapse-tag synapse-tag--link">
            {t("catalog.view_tx")} ↗
          </ExplorerLink>
        )}
      </div>

      <div className="synapse-resource-card__footer">
        <ExplorerLink type="account" value={r.walletAddress} className="synapse-resource-card__addr">
          {shortAddress(r.walletAddress)}
        </ExplorerLink>
        <div className="synapse-resource-card__actions">
          <button className="synapse-btn synapse-btn--ghost synapse-btn--sm" onClick={() => onPreview(r)}>
            {t("catalog.preview")}
          </button>
          <button className="synapse-btn synapse-btn--primary synapse-btn--sm" onClick={() => onBuy(r)}>
            {t("catalog.buy")}
          </button>
        </div>
      </div>
    </article>
  );
}
