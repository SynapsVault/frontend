import { fetchAgentStatus, type AgentActivity } from "../api/agent.js";
import { useAsync } from "../hooks/useAsync.js";
import { ErrorBanner } from "./ErrorBanner.js";
import { ExplorerLink } from "./ExplorerLink.js";
import { formatPrice, shortAddress } from "./ResourceCard.js";
import { StatCard, formatCount, timeAgo } from "./StatCard.js";

const HEALTHY_STATUSES = new Set(["active", "online", "healthy", "ok", "running"]);

/** "0.88" or 88 → 88; values above 1 are taken as already being a percentage. */
function toPercent(value: string | number): number | null {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n <= 1 ? n * 100 : n);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Verification agent status page (issue #221).
 *
 * Surfaces the public `GET /agent/status` feed in the web UI — verifications
 * processed, approved, rejected, and USDC earned — so the README's "full
 * activity feed is visible on the Agent page" claim holds without using MCP.
 */
export function AgentStatusPage() {
  const { status, data, error, retry } = useAsync((signal) => fetchAgentStatus(signal), []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!data && (status === "idle" || status === "loading")) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">Loading agent status…</span>
        <div className="animate-pulse space-y-6" aria-hidden="true">
          <div className="h-24 rounded-xl bg-surface-hover" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-surface-hover" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === "error") {
    return <ErrorBanner message={error ?? "Failed to load agent status."} onRetry={retry} />;
  }

  if (!data) return null;

  const { agent, stats, recentActivity } = data;
  const healthy = HEALTHY_STATUSES.has(agent.status.toLowerCase());
  const decided = stats.verified + stats.rejected;
  const approvalRate = decided > 0 ? stats.verified / decided : 0;
  const avgConfidence = toPercent(stats.avgConfidence);
  const refreshing = status === "loading";

  return (
    <section aria-labelledby="agent-heading" className="space-y-6">
      {/* ── Agent identity ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text" aria-hidden="true">
          <svg width="24" height="24" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="12" height="9" rx="2.5" />
            <path d="M9 2v3M6.5 9.5h.01M11.5 9.5h.01M7 12h4" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="agent-heading" className="font-display text-lg font-semibold text-fg">
              {agent.name}
            </h2>
            <span className={`synapse-tag ${healthy ? "synapse-tag--success" : "synapse-tag--neutral"}`}>
              <span className="synapse-tag__dot" aria-hidden="true" />
              {agent.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-fg-muted">
            Owner{" "}
            <ExplorerLink type="account" value={agent.walletAddress} className="font-mono text-fg-muted">
              {shortAddress(agent.walletAddress)} ↗
            </ExplorerLink>
            <span aria-hidden="true"> · </span>
            {capitalize(agent.network)}
            <span aria-hidden="true"> · </span>
            {formatPrice(agent.pricePerVerification)} {agent.currency} per verification
          </p>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Verifications processed" value={formatCount(stats.totalVerifications)} />
        <StatCard
          label="Approved"
          value={formatCount(stats.verified)}
          tone="success"
          progress={approvalRate}
          note={`${Math.round(approvalRate * 100)}% approval rate`}
        />
        <StatCard
          label="Rejected"
          value={formatCount(stats.rejected)}
          tone="danger"
          progress={decided > 0 ? stats.rejected / decided : 0}
        />
        <StatCard
          label="USDC earned"
          value={stats.totalEarned}
          unit="USDC"
          tone="accent"
          note={avgConfidence !== null ? `avg confidence ${avgConfidence}%` : undefined}
        />
      </div>

      {/* ── Recent activity ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h3 className="text-base font-semibold text-fg">Recent activity</h3>
          <button onClick={retry} disabled={refreshing} className="synapse-btn synapse-btn--ghost synapse-btn--sm">
            {refreshing ? (
              <span className="synapse-spinner" aria-hidden="true" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
              </svg>
            )}
            Refresh
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-subtle">
            No verifications yet. Activity will appear here once the agent processes its first
            request.
          </p>
        ) : (
          <ul role="list" className="divide-y divide-line">
            {recentActivity.map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ActivityRow({ activity: a }: { activity: AgentActivity }) {
  const confidence = toPercent(a.confidence) ?? 0;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          a.isOriginal ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
        }`}
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {a.isOriginal ? <path d="M3.5 8.5l3 3 6-7" /> : <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />}
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{a.resourceTitle}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
          <time dateTime={a.checkedAt} title={new Date(a.checkedAt).toLocaleString()}>
            {timeAgo(a.checkedAt)}
          </time>
          {a.flags.map((flag) => (
            <span key={flag} className="rounded bg-surface-sunken px-1.5 py-px font-mono text-[11px] text-fg-muted">
              {flag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2" title="Confidence">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
          <div
            className={`h-full rounded-full ${a.isOriginal ? "bg-success" : "bg-danger"}`}
            style={{ width: `${Math.min(100, confidence)}%` }}
          />
        </div>
        <span className="w-9 text-right text-xs tabular-nums text-fg-muted">
          <span className="sr-only">Confidence </span>
          {confidence}%
        </span>
      </div>

      <span
        className={`synapse-tag w-[5.5rem] justify-center ${a.isOriginal ? "synapse-tag--success" : "synapse-tag--danger"}`}
      >
        {a.isOriginal ? "approved" : "rejected"}
      </span>
    </li>
  );
}
