import React, { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { EditPriceModal }         from "./components/EditPriceModal.js";
import { TransferOwnershipModal } from "./components/TransferOwnershipModal.js";
import { RegisterModal }          from "./components/RegisterModal.js";
import { ResourcePreviewModal }   from "./components/ResourcePreviewModal.js";
import { Toast }                  from "./components/Toast.js";
import { ResourceGridSkeleton }   from "./components/ResourceCardSkeleton.js";
import { ErrorBanner }            from "./components/ErrorBanner.js";
import { AnalyticsDashboard }     from "./components/AnalyticsDashboard.js";
import { CreatorDashboard }       from "./components/CreatorDashboard.js";
import { Leaderboard }            from "./components/Leaderboard.js";
import { AgentStatusPage }        from "./components/AgentStatusPage.js";
import { PublishModal }           from "./components/PublishModal.js";
import { PurchasesDashboard }     from "./components/PurchasesDashboard.js";
import { BuyModal }               from "./components/BuyModal.js";
import { CatalogStaleBanner }     from "./components/CatalogStaleBanner.js";
import { LanguageSwitcher }       from "./components/LanguageSwitcher.js";
import { ExplorerLink }           from "./components/ExplorerLink.js";
import { useTheme }               from "./hooks/useTheme.js";
import { useAsync }               from "./hooks/useAsync.js";
import { useCatalog }             from "./hooks/useCatalog.js";
import { useWalletConnection }    from "./hooks/useWalletConnection.js";
import { fetchRegistryStatus }    from "./api/resources.js";
import type { CatalogFilters }    from "./api/resources.js";

/* ─── types ─────────────────────────────────────────────────────────────── */
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

type ActiveModal =
  | { kind: "editPrice";          resource: Resource }
  | { kind: "transferOwnership";  resource: Resource }
  | { kind: "register";           resource: Resource }
  | { kind: "preview";            resource: Resource }
  | { kind: "buy";                resource: Resource }
  | null;

type Tab = "catalog" | "dashboard" | "analytics" | "leaderboard" | "purchases" | "agent";

/* ─── constants ─────────────────────────────────────────────────────────── */
const API_KEY = import.meta.env.VITE_API_KEY ?? "";

const DEFAULT_FILTERS: CatalogFilters = {
  search: "",
  minPrice: "",
  maxPrice: "",
  verificationStatus: "all",
  resourceType: "all",
};

/* ─── icon helpers ──────────────────────────────────────────────────────── */
const NavIcons: Record<Tab, React.ReactNode> = {
  catalog:     <svg className="synapse-nav-item__icon" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.8}><rect x="1" y="1" width="7" height="7" rx="1.5"/><rect x="10" y="1" width="7" height="7" rx="1.5"/><rect x="1" y="10" width="7" height="7" rx="1.5"/><rect x="10" y="10" width="7" height="7" rx="1.5"/></svg>,
  dashboard:   <svg className="synapse-nav-item__icon" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.8}><path d="M2 9a7 7 0 1 0 14 0A7 7 0 0 0 2 9Z"/><path d="M9 9V5M9 9l3 3"/></svg>,
  analytics:   <svg className="synapse-nav-item__icon" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.8}><path d="M2 16 6 9l3 4 3-6 4 7"/></svg>,
  purchases:   <svg className="synapse-nav-item__icon" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.8}><path d="M3 3h12l-1.5 9H4.5L3 3ZM6 14.5a.5.5 0 1 1 1 0 .5.5 0 0 1-1 0ZM11 14.5a.5.5 0 1 1 1 0 .5.5 0 0 1-1 0Z"/></svg>,
  leaderboard: <svg className="synapse-nav-item__icon" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.8}><path d="M9 2v14M5 6v10M13 4v12"/></svg>,
  agent:       <svg className="synapse-nav-item__icon" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.8}><circle cx="9" cy="7" r="4"/><path d="M1 17c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
};

/* ─── status tag ────────────────────────────────────────────────────────── */
function StatusTag({ status, type }: { status: string; type: "verify" | "chain" }) {
  const cls = type === "verify"
    ? status === "verified"  ? "synapse-card__tag--verified"
    : status === "rejected"  ? "synapse-card__tag--rejected"
    :                          "synapse-card__tag--pending"
    : status === "registered"? "synapse-card__tag--onchain"
    : status === "failed"    ? "synapse-card__tag--rejected"
    : status === "pending"   ? "synapse-card__tag--pending"
    :                          "synapse-card__tag--gray";
  const label = type === "chain" && status === "none" ? "off-chain" : status;
  return <span className={`synapse-card__tag ${cls}`}>{label}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   App
═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [activeModal, setActiveModal]   = useState<ActiveModal>(null);
  const [toast, setToast]               = useState<{ message: string; fallbackUrl?: string } | null>(null);
  const [filters, setFilters]           = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [overrides, setOverrides]       = useState<Record<string, Partial<Resource>>>({});
  const [tab, setTab]                   = useState<Tab>("catalog");
  const [showPublish, setShowPublish]   = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const { theme, toggleTheme }          = useTheme();
  const wallet                          = useWalletConnection();
  const { t }                           = useTranslation();

  /* catalog */
  const {
    status: resourcesStatus,
    data: rawResources,
    error: resourcesError,
    retry: retryResources,
    stale: catalogStale,
    syncedAt: catalogSyncedAt,
  } = useCatalog<Resource>(filters);

  /* registry stats */
  const {
    status: registryStatus,
    data: registryData,
    retry: retryRegistry,
  } = useAsync<{ resourceCount: number }>((_signal) => fetchRegistryStatus(), []);

  const filteredResources = useMemo((): Resource[] => {
    if (!rawResources) return [];
    return rawResources.map((r) => ({ ...r, ...(overrides[r.id] ?? {}) }));
  }, [rawResources, overrides]);

  const applyOverride = useCallback((id: string, patch: Partial<Resource>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  }, []);

  async function handleCopyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setToast({ message: "Access URL copied to clipboard" });
    } catch {
      setToast({ message: "Copy this URL:", fallbackUrl: url });
    }
  }

  const isLoading = resourcesStatus === "idle" || resourcesStatus === "loading";
  const registryCount = registryData?.resourceCount ?? null;

  /* ── Sidebar ─────────────────────────────────────────────────────────── */
  const renderSidebar = () => (
    <aside className={`synapse-sidebar ${sidebarOpen ? "synapse-sidebar--open" : ""}`}>
      {/* brand */}
      <div className="synapse-sidebar__brand">
        <div className="synapse-sidebar__logo">⬡</div>
        <span className="synapse-sidebar__name">SynapsVault</span>
      </div>

      {/* nav */}
      <nav className="synapse-sidebar__nav" role="navigation" aria-label="Main navigation">
        <div className="synapse-nav-label">Marketplace</div>
        {(["catalog", "leaderboard", "purchases", "agent"] as Tab[]).map((t) => (
          <button key={t} className={`synapse-nav-item ${tab === t ? "synapse-nav-item--active" : ""}`}
            onClick={() => { setTab(t); setSidebarOpen(false); }}>
            {NavIcons[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}

        {API_KEY && (
          <div className="synapse-nav-group">
            <div className="synapse-nav-label">Creator</div>
            {(["dashboard", "analytics"] as Tab[]).map((t) => (
              <button key={t} className={`synapse-nav-item ${tab === t ? "synapse-nav-item--active" : ""}`}
                onClick={() => { setTab(t); setSidebarOpen(false); }}>
                {NavIcons[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            <button className="synapse-nav-item" onClick={() => { setShowPublish(true); setSidebarOpen(false); }}>
              <svg className="synapse-nav-item__icon" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.8}>
                <path d="M9 2v14M2 9h14"/>
              </svg>
              Publish Resource
            </button>
          </div>
        )}
      </nav>

      {/* bottom: registry counter + wallet */}
      <div className="synapse-sidebar__bottom">
        {registryCount !== null && (
          <div style={{ padding: "6px 10px", fontSize: 11, color: "var(--synapse-text-muted)" }}>
            <span style={{ color: "var(--synapse-violet-hi)", fontWeight: 600 }}>{registryCount}</span>
            {" "}resource{registryCount !== 1 ? "s" : ""} on-chain
          </div>
        )}
        <button className="synapse-wallet-btn" onClick={wallet.status === "connected" ? wallet.disconnect : wallet.connect}
          style={{ width: "100%", justifyContent: "flex-start" }}>
          <span className={`synapse-wallet-dot ${wallet.status === "connected" ? "synapse-wallet-dot--connected" : "synapse-wallet-dot--disconnected"}`} />
          {wallet.status === "connected"
            ? `${wallet.address!.slice(0, 6)}…${wallet.address!.slice(-4)}`
            : "Connect Wallet"}
        </button>
        <button className="synapse-nav-item" onClick={toggleTheme}>
          <svg className="synapse-nav-item__icon" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.8}>
            {theme === "dark"
              ? <><circle cx="9" cy="9" r="4"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.5 3.5l1.5 1.5M13 13l1.5 1.5M13 3.5 11.5 5M4.5 13 3 14.5"/></>
              : <path d="M13.5 10.5A5 5 0 0 1 6.5 3.5a7 7 0 1 0 7 7Z"/>}
          </svg>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <LanguageSwitcher />
      </div>
    </aside>
  );

  /* ── Topbar ──────────────────────────────────────────────────────────── */
  const tabTitles: Record<Tab, string> = {
    catalog: "Resource Catalog", dashboard: "My Vault", analytics: "Analytics",
    purchases: "My Purchases", leaderboard: "Leaderboard", agent: "AI Agent",
  };

  const renderTopbar = () => (
    <header className="synapse-topbar">
      {/* mobile hamburger */}
      <button className="synapse-btn synapse-btn--ghost synapse-btn--sm synapse-topbar__menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu">
        ☰
      </button>
      <span className="synapse-topbar__title">{tabTitles[tab]}</span>
      <div className="synapse-topbar__actions">
        {registryStatus === "error" && (
          <button className="synapse-btn synapse-btn--ghost synapse-btn--sm" onClick={retryRegistry}>
            ⚠ Retry registry
          </button>
        )}
        {API_KEY && (
          <button className="synapse-btn synapse-btn--primary synapse-btn--sm" onClick={() => setShowPublish(true)}>
            + Publish
          </button>
        )}
      </div>
    </header>
  );

  /* ── Catalog tab ─────────────────────────────────────────────────────── */
  const renderCatalog = () => (
    <>
      {catalogStale && resourcesStatus === "success" && <CatalogStaleBanner syncedAt={catalogSyncedAt} />}

      {/* search bar */}
      <div className="synapse-search">
        <div className="synapse-search__field">
          <svg className="synapse-search__icon" width="14" height="14" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={2}>
            <circle cx="7.5" cy="7.5" r="5.5"/><path d="M13 13l3 3"/>
          </svg>
          <input className="synapse-input synapse-search__input" placeholder="Search resources…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        </div>
        <select className="synapse-input synapse-select synapse-search__select"
          value={filters.resourceType}
          onChange={(e) => setFilters((f) => ({ ...f, resourceType: e.target.value as "all" | "file" | "link" }))}>
          <option value="all">All types</option>
          <option value="file">Files</option>
          <option value="link">Links</option>
        </select>
        <select className="synapse-input synapse-select synapse-search__select"
          value={filters.verificationStatus}
          onChange={(e) => setFilters((f) => ({ ...f, verificationStatus: e.target.value as "all" | "verified" | "pending" | "rejected" }))}>
          <option value="all">All status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <input className="synapse-input synapse-search__price" placeholder="Min $"
          value={filters.minPrice}
          onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))} />
        <input className="synapse-input synapse-search__price" placeholder="Max $"
          value={filters.maxPrice}
          onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))} />
        {(filters.search || filters.resourceType !== "all" || filters.verificationStatus !== "all" || filters.minPrice || filters.maxPrice) && (
          <button className="synapse-btn synapse-btn--ghost synapse-btn--sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Clear
          </button>
        )}
        {resourcesStatus === "success" && (
          <span style={{ fontSize: 12, color: "var(--synapse-text-muted)", marginLeft: "auto" }}>
            {filteredResources.length} resource{filteredResources.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading && <ResourceGridSkeleton count={6} />}
      {resourcesStatus === "error" && <ErrorBanner message={resourcesError ?? "Failed to load"} onRetry={retryResources} />}

      {resourcesStatus === "success" && (
        filteredResources.length === 0
          ? <div className="synapse-empty">
              <div className="synapse-empty__icon">🗄</div>
              <div className="synapse-empty__title">No resources found</div>
              <p style={{ fontSize: 13 }}>
                {filters.search || filters.resourceType !== "all" || filters.verificationStatus !== "all"
                  ? "Try adjusting your filters."
                  : "Be the first to publish a resource on SynapsVault."}
              </p>
              {!(filters.search) && (
                <button className="synapse-btn synapse-btn--primary" onClick={() => setShowPublish(true)}>
                  Publish a resource
                </button>
              )}
            </div>
          : <div className="synapse-resource-grid">
              {filteredResources.map((r) => (
                <article key={r.id} className="synapse-resource-card">
                  <div className="synapse-resource-card__header">
                    <div className="synapse-resource-card__title">{r.title}</div>
                    <div className="synapse-resource-card__price">{r.price} USDC</div>
                  </div>
                  {r.publisherName && (
                    <div className="synapse-resource-card__publisher">by {r.publisherName}</div>
                  )}
                  <div className="synapse-resource-card__tags">
                    <StatusTag status={r.verificationStatus} type="verify" />
                    <StatusTag status={r.onchainStatus}      type="chain"  />
                    {r.onchainStatus === "registered" && r.onchainTxHash && (
                      <ExplorerLink type="tx" value={r.onchainTxHash}
                        className="synapse-card__tag synapse-card__tag--onchain">
                        View tx ↗
                      </ExplorerLink>
                    )}
                  </div>
                  <div className="synapse-resource-card__footer">
                    <ExplorerLink type="account" value={r.walletAddress}
                      className="synapse-resource-card__addr">
                      {r.walletAddress}
                    </ExplorerLink>
                    <div className="synapse-resource-card__actions">
                      <button className="synapse-btn synapse-btn--ghost synapse-btn--sm"
                        onClick={() => setActiveModal({ kind: "preview", resource: r })}>
                        Preview
                      </button>
                      <button className="synapse-btn synapse-btn--buy synapse-btn--sm"
                        onClick={() => setActiveModal({ kind: "buy", resource: r })}>
                        Buy
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
      )}
    </>
  );

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="synapse-shell">
      {/* overlay for mobile */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 35 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {renderSidebar()}

      <div className="synapse-main">
        {renderTopbar()}

        <main id="main-content" className="synapse-content">
          {tab === "catalog"     && renderCatalog()}
          {tab === "leaderboard" && <Leaderboard />}
          {tab === "purchases"   && <PurchasesDashboard initialWallet={wallet.address ?? ""} />}
          {tab === "agent"       && <AgentStatusPage />}
          {tab === "dashboard"   && API_KEY && (
            <CreatorDashboard apiKey={API_KEY}
              onEditPrice={(r) => setActiveModal({ kind: "editPrice", resource: r as Resource })}
              onTransferOwnership={(r) => setActiveModal({ kind: "transferOwnership", resource: r as Resource })}
              onRegister={(r) => setActiveModal({ kind: "register", resource: r as Resource })} />
          )}
          {tab === "analytics" && API_KEY && <AnalyticsDashboard apiKey={API_KEY} />}
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {activeModal?.kind === "preview" && (
        <ResourcePreviewModal resourceId={activeModal.resource.id}
          onClose={() => setActiveModal(null)} onCopyUrl={handleCopyUrl}
          onBuy={() => setActiveModal({ kind: "buy", resource: (activeModal as { resource: Resource }).resource })} />
      )}
      {activeModal?.kind === "buy" && (
        <BuyModal resourceTitle={activeModal.resource.title} price={activeModal.resource.price}
          recipient={activeModal.resource.walletAddress} accessUrl={activeModal.resource.accessUrl}
          walletAddress={wallet.status === "connected" ? wallet.address : null}
          onClose={() => setActiveModal(null)} onCopyUrl={handleCopyUrl} />
      )}
      {activeModal?.kind === "editPrice" && (
        <EditPriceModal resourceId={activeModal.resource.id} currentPrice={activeModal.resource.price}
          apiKey={API_KEY} onClose={() => setActiveModal(null)}
          onConfirmed={(price) => { applyOverride(activeModal.resource.id, { price }); setActiveModal(null); }} />
      )}
      {activeModal?.kind === "transferOwnership" && (
        <TransferOwnershipModal resourceId={activeModal.resource.id} apiKey={API_KEY}
          onClose={() => setActiveModal(null)}
          onConfirmed={(addr) => { applyOverride(activeModal.resource.id, { walletAddress: addr }); setActiveModal(null); }} />
      )}
      {activeModal?.kind === "register" && (
        <RegisterModal resourceId={activeModal.resource.id} apiKey={API_KEY}
          onClose={() => setActiveModal(null)}
          onConfirmed={() => { applyOverride(activeModal.resource.id, { onchainStatus: "registered" }); setActiveModal(null); }} />
      )}
      {showPublish && API_KEY && (
        <PublishModal apiKey={API_KEY} onClose={() => setShowPublish(false)}
          onPublished={() => retryResources()} />
      )}
      {toast && (
        <Toast message={toast.message} fallbackUrl={toast.fallbackUrl} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}