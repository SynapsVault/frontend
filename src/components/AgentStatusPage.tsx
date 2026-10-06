import { fetchAgentStatus, type AgentActivity } from "../api/agent.js";
import { useAsync } from "../hooks/useAsync.js";
import { ErrorBanner } from "./ErrorBanner.js";
import { ExplorerLink } from "./ExplorerLink.js";

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
  if (status === "idle" || status === "loading") {
    return (
      <div className="mt-8" role="status" aria-busy="true">
        <span className="sr-only">Loading agent status…</span>
        <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-hover" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="mt-8">
        <ErrorBanner message={error ?? "Failed to load agent status."} onRetry={retry} />
      </div>
    );
  }

  if (!data) return null;

  const { agent, stats, recentActivity } = data;

  return (
    <section aria-labelledby="agent-heading" className="mt-8 space-y-6">
      {/* ── Agent identity ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="agent-heading"
              className="text-lg font-semibold text-fg"
            >
              {agent.name}
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Owner:{" "}
              <ExplorerLink
                type="account"
                value={agent.walletAddress}
                className="text-fg-muted"
              >
                {agent.walletAddress}
              </ExplorerLink>
            </p>
            <p className="mt-1 text-xs text-fg-subtle">
              {agent.network} · {agent.pricePerVerification} {agent.currency} per verification
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              agent.status === "active"
                ? "bg-success-soft text-success"
                : "bg-surface-hover text-fg-muted"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                agent.status === "active" ? "bg-success" : "bg-fg-subtle"
              }`}
              aria-hidden="true"
            />
            {agent.status}
          </span>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Verifications processed" value={String(stats.totalVerifications)} />
        <StatCard
          label="Approved"
          value={String(stats.verified)}
          accent="text-success"
        />
        <StatCard
          label="Rejected"
          value={String(stats.rejected)}
          accent="text-danger"
        />
        <StatCard
          label="USDC earned"
          value={`${stats.totalEarned}`}
          note={`avg confidence ${stats.avgConfidence}`}
          accent="text-accent-text"
        />
      </div>

      {/* ── Recent activity ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-surface shadow-sm">
        <div className="border-b border-line px-5 py-4">
          <h3 className="text-base font-semibold text-fg">
            Recent activity
          </h3>
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

function StatCard({
  label,
  value,
  note,
  accent = "text-fg",
}: {
  label: string;
  value: string;
  note?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-fg-subtle">{note}</p>}
    </div>
  );
}

function ActivityRow({ activity: a }: { activity: AgentActivity }) {
  return (
    <li className="flex flex-col items-start gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg">
          {a.resourceTitle}
        </p>
        <p className="text-xs text-fg-subtle">
          {new Date(a.checkedAt).toLocaleString()} · confidence {a.confidence}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          a.isOriginal
            ? "bg-success-soft text-success"
            : "bg-danger-soft text-danger"
        }`}
      >
        {a.isOriginal ? "approved" : "rejected"}
      </span>
    </li>
  );
}
