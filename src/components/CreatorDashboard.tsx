import React, { useMemo } from "react";
import { useAsync } from "../hooks/useAsync.js";
import { ErrorBanner } from "./ErrorBanner.js";
import { ResourceGridSkeleton } from "./ResourceCardSkeleton.js";
import { ExplorerLink } from "./ExplorerLink.js";
import { fetchMyResources } from "../api/resources.js";

export interface DashboardResource {
  id: string;
  title: string;
  price: string;
  resourceType: string;
  walletAddress: string;
  verificationStatus: string;
  onchainStatus: string;
  onchainTxHash?: string;
  listed: boolean;
  accessUrl: string;
}

interface Props {
  apiKey: string;
  onEditPrice: (resource: DashboardResource) => void;
  onTransferOwnership: (resource: DashboardResource) => void;
  onRegister: (resource: DashboardResource) => void;
}

const needsRegistration = (r: DashboardResource) =>
  r.verificationStatus === "verified" && r.onchainStatus !== "registered";

/**
 * Creator-only view of resources published by the authenticated API key,
 * separate from the public catalog. Surfaces verification, on-chain, price,
 * and listing state, plus entry points into the existing edit-price,
 * transfer-ownership, and register flows (#164).
 */
export function CreatorDashboard({ apiKey, onEditPrice, onTransferOwnership, onRegister }: Props) {
  const { status, data, error, retry } = useAsync<DashboardResource[]>(
    () => fetchMyResources<DashboardResource>(apiKey),
    [apiKey],
  );

  const resources = useMemo(() => data ?? [], [data]);
  const isLoading = status === "idle" || status === "loading";

  const summary = useMemo(() => {
    const listed = resources.filter((r) => r.listed).length;
    const verified = resources.filter((r) => r.verificationStatus === "verified").length;
    const registered = resources.filter((r) => r.onchainStatus === "registered").length;
    const pendingRegistration = resources.filter(needsRegistration).length;
    return { total: resources.length, listed, verified, registered, pendingRegistration };
  }, [resources]);

  if (isLoading) return <ResourceGridSkeleton count={6} />;

  if (status === "error") {
    return <ErrorBanner message={error ?? "Failed to load your resources."} onRetry={retry} />;
  }

  if (resources.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-line p-10 text-center text-fg-muted">
        <p className="text-lg font-medium">No resources yet</p>
        <p className="mt-1 text-sm">Publish a resource to see it show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <SummaryStat label="Total resources" value={summary.total} />
        <SummaryStat label="Listed" value={summary.listed} />
        <SummaryStat label="Verified" value={summary.verified} />
        <SummaryStat label="Registered on-chain" value={summary.registered} />
      </div>

      {summary.pendingRegistration > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft p-4">
          <p className="text-sm font-medium text-warning">
            {summary.pendingRegistration} resource{summary.pendingRegistration !== 1 ? "s" : ""}{" "}
            verified but not yet registered on-chain.
          </p>
        </div>
      )}

      {/* Owned resource list */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-surface-sunken">
            <tr>
              <Th>Title</Th>
              <Th>Price</Th>
              <Th>Listing</Th>
              <Th>Verification</Th>
              <Th>On-chain</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {resources.map((r) => (
              <tr key={r.id}>
                <td className="px-2 py-3 sm:px-4">
                  <p className="font-medium text-fg">{r.title}</p>
                  <p className="text-xs text-fg-subtle">{r.resourceType}</p>
                </td>
                <td className="px-2 py-3 text-sm font-medium text-accent-text sm:px-4">
                  {r.price} USDC
                </td>
                <td className="px-2 py-3 sm:px-4">
                  <StatusBadge
                    label={r.listed ? "listed" : "unlisted"}
                    tone={r.listed ? "green" : "gray"}
                  />
                </td>
                <td className="px-2 py-3 sm:px-4">
                  <StatusBadge
                    label={r.verificationStatus}
                    tone={
                      r.verificationStatus === "verified"
                        ? "green"
                        : r.verificationStatus === "rejected"
                          ? "red"
                          : "gray"
                    }
                  />
                </td>
                <td className="px-2 py-3 sm:px-4">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge
                      label={r.onchainStatus === "none" ? "not on-chain" : r.onchainStatus}
                      tone={
                        r.onchainStatus === "registered"
                          ? "indigo"
                          : r.onchainStatus === "failed"
                            ? "red"
                            : r.onchainStatus === "pending"
                              ? "yellow"
                              : "gray"
                      }
                    />
                    {r.onchainStatus === "registered" && r.onchainTxHash && (
                      <ExplorerLink
                        type="tx"
                        value={r.onchainTxHash}
                        className="text-xs text-accent-text hover:text-accent-hover"
                      >
                        ↗
                      </ExplorerLink>
                    )}
                  </div>
                </td>
                <td className="px-2 py-3 text-right sm:px-4">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {needsRegistration(r) && (
                      <button
                        onClick={() => onRegister(r)}
                        className="rounded-lg border border-warning/30 bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning hover:border-warning/60"
                      >
                        Register
                      </button>
                    )}
                    <button
                      onClick={() => onEditPrice(r)}
                      className="rounded-lg bg-surface-hover px-2.5 py-1 text-xs font-medium text-fg hover:bg-line"
                    >
                      Edit price
                    </button>
                    <button
                      onClick={() => onTransferOwnership(r)}
                      className="rounded-lg bg-surface-hover px-2.5 py-1 text-xs font-medium text-fg hover:bg-line"
                    >
                      Transfer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-fg">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-fg-muted">
      {children}
    </th>
  );
}

const TONE_CLASSES: Record<string, string> = {
  green: "bg-success-soft text-success",
  red: "bg-danger-soft text-danger",
  yellow: "bg-warning-soft text-warning",
  indigo: "bg-accent-soft text-accent-text",
  gray: "bg-surface-hover text-fg-muted",
};

function StatusBadge({ label, tone }: { label: string; tone: keyof typeof TONE_CLASSES }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
