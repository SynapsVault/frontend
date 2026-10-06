import React from "react";
import type { WalletState } from "../hooks/useWalletConnection.js";

interface Props {
  wallet: WalletState;
}

/** Truncates a Stellar address to G…XXXX for display. */
function shortAddress(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/**
 * Header wallet button.
 *
 * - "restoring" → subtle skeleton so the header doesn't jump
 * - "disconnected" / "error" → "Connect wallet" button
 * - "connected" → address chip + disconnect button
 */
export function WalletButton({ wallet }: Props) {
  const { status, address, error, connect, disconnect } = wallet;

  if (status === "restoring") {
    return (
      <div
        aria-label="Restoring wallet connection…"
        className="h-8 w-32 animate-pulse rounded-lg bg-line"
      />
    );
  }

  if (status === "connected" && address) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {/* Green dot + address */}
        <span
          title={address}
          className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm font-medium text-success"
        >
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full bg-success"
          />
          {shortAddress(address)}
        </span>

        {/* Disconnect */}
        <button
          onClick={disconnect}
          aria-label="Disconnect wallet"
          title="Disconnect wallet"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // disconnected or error
  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        onClick={connect}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Connect wallet
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
