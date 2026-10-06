import React from "react";
import { useAnalytics } from "../hooks/useAnalytics.js";
import { RecentPayment, ResourceStat } from "../api/analytics.js";

interface Props {
  apiKey: string;
}

export function AnalyticsDashboard({ apiKey }: Props) {
  const { data, loading, error } = useAnalytics(apiKey);

  if (loading)
    return (
      <p className="mt-8 text-center text-sm text-fg-muted" aria-live="polite" aria-busy="true">
        Loading analytics…
      </p>
    );

  if (error)
    return (
      <p className="mt-8 text-center text-sm text-danger" aria-live="assertive">
        Error: {error}
      </p>
    );

  if (!data) return null;

  const { summary, resources } = data;

  // Empty state
  if (summary.totalResources === 0)
    return (
      <div
        className="mt-8 rounded-xl border border-dashed border-line p-10 text-center text-fg-muted"
        aria-live="polite"
      >
        <p className="text-lg font-medium">No resources yet</p>
        <p className="mt-1 text-sm">
          Publish your first resource to start earning USDC directly to your Stellar wallet.
        </p>
      </div>
    );

  return (
    <div className="mt-8 space-y-6" aria-live="polite">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          label="Total earned"
          value={`${summary.totalEarned} ${summary.currency}`}
          note="Paid directly to your Stellar wallet"
        />
        <StatCard
          label="Total sales"
          value={String(summary.totalSales)}
          note={`across ${summary.totalResources} resource${summary.totalResources !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Listed resources"
          value={`${summary.listedResources} / ${summary.totalResources}`}
          note={`${summary.verification.verified} verified · ${summary.verification.pending} pending`}
        />
      </div>

      {/* Per-resource breakdown */}
      <div className="space-y-4">
        {resources.map((r) => (
          <ResourceRow key={r.id} resource={r} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-fg">{value}</p>
      <p className="mt-1 text-xs text-fg-subtle">{note}</p>
    </div>
  );
}

function ResourceRow({ resource: r }: { resource: ResourceStat }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rounded-xl border border-line bg-surface shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-col items-start gap-2 px-4 py-4 text-left sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div>
          <p className="font-semibold text-fg">{r.title}</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {r.price} USDC ·{" "}
            <span
              className={
                r.verificationStatus === "verified"
                  ? "text-success"
                  : r.verificationStatus === "rejected"
                    ? "text-danger"
                    : "text-warning"
              }
            >
              {r.verificationStatus}
            </span>{" "}
            · {r.listed ? "listed" : "unlisted"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-accent-text">{r.totalEarned} USDC</p>
          <p className="text-xs text-fg-subtle">
            {r.totalSales} sale{r.totalSales !== 1 ? "s" : ""}
          </p>
        </div>
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-4">
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-fg-muted">
            Resource URL
          </p>
          <a
            href={r.accessUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate text-xs text-accent-text hover:underline"
          >
            {r.accessUrl}
          </a>

          {r.recentPayments.length > 0 && (
            <>
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-fg-muted">
                Recent payments
              </p>
              <ul className="mt-2 space-y-2">
                {r.recentPayments.map((p, i) => (
                  <PaymentRow key={i} payment={p} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentRow({ payment: p }: { payment: RecentPayment }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-1 text-xs text-fg-muted">
      <span className="font-mono">
        {p.payerAddress.slice(0, 8)}…{p.payerAddress.slice(-4)}
      </span>
      <span className="ml-2 font-medium text-fg">{p.amount} USDC</span>
      <span className="ml-2 text-fg-subtle">{new Date(p.paidAt).toLocaleDateString()}</span>
    </li>
  );
}
