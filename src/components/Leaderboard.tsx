import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAsync } from "../hooks/useAsync.js";
import { fetchLeaderboard, type LeaderboardEntry } from "../api/resources.js";
import { ExplorerLink } from "./ExplorerLink.js";
import { ErrorBanner } from "./ErrorBanner.js";
import { formatPrice, shortAddress } from "./ResourceCard.js";
import { formatCount, sumUsdc } from "./StatCard.js";

// Full class names so Tailwind/purge keeps them (see DESIGN_SYSTEM.md).
const RANK_CLASS: Record<number, string> = {
  1: "synapse-rank synapse-rank--gold",
  2: "synapse-rank synapse-rank--silver",
  3: "synapse-rank synapse-rank--bronze",
};

const earnedOf = (e: LeaderboardEntry) => {
  const n = Number.parseFloat(e.totalEarned);
  return Number.isFinite(n) ? n : 0;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Leaderboard() {
  const { t } = useTranslation();
  const {
    status,
    data: entries,
    error,
    retry,
  } = useAsync<LeaderboardEntry[]>((signal) => fetchLeaderboard(signal), []);

  const ranked = useMemo(() => [...(entries ?? [])].sort((a, b) => earnedOf(b) - earnedOf(a)), [entries]);
  const totalEarned = useMemo(() => sumUsdc(ranked.map((e) => e.totalEarned)), [ranked]);
  const totalNumber = Number.parseFloat(totalEarned);

  const header = (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2 className="font-display text-lg font-semibold text-fg">{t("leaderboard.title")}</h2>
        <p className="mt-0.5 text-sm text-fg-muted">{t("leaderboard.description")}</p>
      </div>
      {ranked.length > 0 && (
        <p className="text-sm tabular-nums text-fg-muted">
          {t("leaderboard.creators", { count: ranked.length })}
          <span aria-hidden="true"> · </span>
          <span className="font-semibold text-fg">{t("leaderboard.total_earned", { amount: totalEarned })}</span>
        </p>
      )}
    </div>
  );

  if (status === "idle" || status === "loading") {
    return (
      <>
        {header}
        <div className="flex justify-center py-20" aria-live="polite" aria-busy="true">
          <span className="synapse-spinner synapse-spinner--lg" aria-hidden="true" />
          <span className="sr-only">{t("leaderboard.loading")}</span>
        </div>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        {header}
        <div aria-live="assertive">
          <ErrorBanner message={error ?? t("leaderboard.load_failed")} onRetry={retry} />
        </div>
      </>
    );
  }

  if (ranked.length === 0) {
    return (
      <>
        {header}
        <div className="synapse-empty" aria-live="polite">
          <div className="synapse-empty__icon" aria-hidden="true">
            <svg width="24" height="24" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              <path d="M5 16V9M9 16V3M13 16v-5" />
            </svg>
          </div>
          <p className="synapse-empty__title">{t("leaderboard.empty")}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="relative overflow-x-auto rounded-xl border border-line bg-surface shadow-sm" aria-live="polite">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-sunken">
            <tr className="border-b border-line text-xs font-medium uppercase tracking-wide text-fg-muted">
              <th scope="col" className="w-14 whitespace-nowrap px-3 py-2.5 sm:px-4">
                <span className="sr-only">{t("leaderboard.rank")}</span>#
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 sm:px-4">{t("leaderboard.creator")}</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right sm:px-4">{t("leaderboard.resources")}</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right sm:px-4">{t("leaderboard.sales")}</th>
              <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right sm:px-4">{t("leaderboard.earned")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ranked.map((entry, idx) => {
              const rank = idx + 1;
              const share = totalNumber > 0 ? earnedOf(entry) / totalNumber : 0;
              return (
                <tr key={entry.id} className="transition-colors hover:bg-surface-hover">
                  <td className="px-3 py-3 sm:px-4">
                    <span className={RANK_CLASS[rank] ?? "synapse-rank"}>{rank}</span>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-text"
                        aria-hidden="true"
                      >
                        {initials(entry.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{entry.name}</p>
                        <ExplorerLink type="account" value={entry.walletAddress} className="font-mono text-xs text-fg-subtle">
                          <span className="sr-only">{t("leaderboard.wallet")} </span>
                          {shortAddress(entry.walletAddress)}
                        </ExplorerLink>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums sm:px-4">
                    <span className="text-fg">{formatCount(entry.totalResources)}</span>
                    {entry.verifiedResources > 0 && (
                      <span className="mt-0.5 block text-xs text-success">{formatCount(entry.verifiedResources)} ✓</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-fg sm:px-4">
                    {formatCount(entry.totalSales)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                    <div className="flex items-center justify-end gap-3">
                      <div
                        className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken sm:block"
                        title={`${t("leaderboard.share")}: ${Math.round(share * 100)}%`}
                        aria-hidden="true"
                      >
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(share * 100)}%` }} />
                      </div>
                      <span className="min-w-[4.5rem] text-right font-semibold tabular-nums text-accent-text">{formatPrice(entry.totalEarned)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
