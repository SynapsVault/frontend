import React from "react";
import { useAsync } from "../hooks/useAsync.js";
import { fetchLeaderboard, type LeaderboardEntry } from "../api/resources.js";
import { ExplorerLink } from "./ExplorerLink.js";
import { ErrorBanner } from "./ErrorBanner.js";

function truncateWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Leaderboard() {
  const {
    status,
    data: entries,
    error,
    retry,
  } = useAsync<LeaderboardEntry[]>((signal) => fetchLeaderboard(signal), []);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex justify-center py-20" aria-live="polite" aria-busy="true">
        <span className="synapse-spinner synapse-spinner--lg" aria-hidden="true" />
        <span className="sr-only">Loading leaderboard...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div aria-live="assertive">
        <ErrorBanner message={error ?? "Failed to load leaderboard."} onRetry={retry} />
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div
        className="py-20 text-center text-sm text-fg-subtle"
        aria-live="polite"
      >
        No publishers yet. Be the first to publish a resource!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" aria-live="polite">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-fg-muted">
            <th className="whitespace-nowrap px-2 py-3 sm:px-4">#</th>
            <th className="whitespace-nowrap px-2 py-3 sm:px-4">Creator</th>
            <th className="whitespace-nowrap px-2 py-3 sm:px-4">Wallet</th>
            <th className="whitespace-nowrap px-2 py-3 text-right sm:px-4">Resources</th>
            <th className="whitespace-nowrap px-2 py-3 text-right sm:px-4">Sales</th>
            <th className="whitespace-nowrap px-2 py-3 text-right sm:px-4">Earned (USDC)</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={entry.id}
              className="border-b border-line transition-colors hover:bg-surface-hover"
            >
              <td className="px-2 py-3 font-medium text-fg-muted sm:px-4">{idx + 1}</td>
              <td className="px-2 py-3 font-medium text-fg sm:px-4">
                {entry.name}
              </td>
              <td className="px-2 py-3 sm:px-4">
                <ExplorerLink
                  type="account"
                  value={entry.walletAddress}
                  className="text-xs text-fg-muted"
                >
                  {truncateWallet(entry.walletAddress)}
                </ExplorerLink>
              </td>
              <td className="px-2 py-3 text-right text-fg sm:px-4">
                {entry.totalResources}
              </td>
              <td className="px-2 py-3 text-right text-fg sm:px-4">
                {entry.totalSales}
              </td>
              <td className="px-2 py-3 text-right font-semibold text-accent-text sm:px-4">
                {entry.totalEarned}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
