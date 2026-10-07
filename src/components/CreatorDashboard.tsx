import React, { useMemo } from "react";
import { useAsync } from "../hooks/useAsync.js";
import { ErrorBanner } from "./ErrorBanner.js";
import { ResourceGridSkeleton } from "./ResourceCardSkeleton.js";
import { ExplorerLink } from "./ExplorerLink.js";
import { StatusTag, formatPrice } from "./ResourceCard.js";
import { StatCard, formatCount } from "./StatCard.js";
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
    const pending = resources.filter(needsRegistration);
    return { total: resources.length, listed, verified, registered, pending };
  }, [resources]);

  if (isLoading) return <ResourceGridSkeleton count={6} />;

  if (status === "error") {
    return <ErrorBanner message={error ?? "Failed to load your resources."} onRetry={retry} />;
  }

  if (resources.length === 0) {
    return (
      <div className="synapse-empty">
        <div className="synapse-empty__icon" aria-hidden="true">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
            <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
            <path d="M3 7.5 12 12l9-4.5M12 12v9" />
          </svg>
        </div>
        <p className="synapse-empty__title">No resources yet</p>
        <p className="synapse-empty__body">Publish a resource to see it show up here.</p>
      </div>
    );
  }

  const { total, listed, verified, registered, pending } = summary;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total resources" value={formatCount(total)} />
        <StatCard
          label="Listed"
          value={formatCount(listed)}
          note={total - listed > 0 ? `${formatCount(total - listed)} unlisted` : undefined}
        />
        <StatCard label="Verified" value={formatCount(verified)} tone="success" progress={verified / total} />
        <StatCard label="Registered on-chain" value={formatCount(registered)} tone="accent" progress={registered / total} />
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-semibold text-warning">
              {pending.length} verified resource{pending.length !== 1 ? "s" : ""} not yet registered on-chain
            </p>
            <p className="mt-0.5 text-warning">
              Registering records the creator, title and price in the on-chain vault registry, so buyers and agents can
              verify who owns a resource without trusting SynapsVault.
            </p>
          </div>
          <button onClick={() => onRegister(pending[0])} className="synapse-btn synapse-btn--primary synapse-btn--sm shrink-0">
            Register next
          </button>
        </div>
      )}

      {/* Owned resource list */}
      <div className="relative overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-surface-sunken">
            <tr>
              <Th>Title</Th>
              <Th align="right">Price</Th>
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
              <tr key={r.id} className="transition-colors hover:bg-surface-hover">
                <td className="max-w-[16rem] px-3 py-3 sm:px-4">
                  <p className="truncate font-medium text-fg" title={r.title}>
                    {r.title}
                  </p>
                  <p className="text-xs capitalize text-fg-subtle">{r.resourceType}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-sm font-medium tabular-nums text-fg sm:px-4">
                  {formatPrice(r.price)} USDC
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <span className={`synapse-tag ${r.listed ? "synapse-tag--success" : "synapse-tag--neutral"}`}>
                    {r.listed ? "Listed" : "Unlisted"}
                  </span>
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <StatusTag status={r.verificationStatus} type="verify" />
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <div className="flex items-center gap-1.5">
                    <StatusTag status={r.onchainStatus} type="chain" />
                    {r.onchainStatus === "registered" && r.onchainTxHash && (
                      <ExplorerLink type="tx" value={r.onchainTxHash} className="text-xs">
                        <span aria-hidden="true">↗</span>
                        <span className="sr-only">View registration transaction</span>
                      </ExplorerLink>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 sm:px-4">
                  <div className="flex justify-end gap-1.5">
                    {needsRegistration(r) && (
                      <button onClick={() => onRegister(r)} className="synapse-btn synapse-btn--primary synapse-btn--sm">
                        Register
                      </button>
                    )}
                    <button onClick={() => onEditPrice(r)} className="synapse-btn synapse-btn--secondary synapse-btn--sm">
                      Edit price
                    </button>
                    <button onClick={() => onTransferOwnership(r)} className="synapse-btn synapse-btn--ghost synapse-btn--sm">
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

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-fg-muted sm:px-4 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
