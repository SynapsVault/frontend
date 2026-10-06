import React, { useMemo, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Toast } from "./components/Toast.js";
import { ResourceGridSkeleton } from "./components/ResourceCardSkeleton.js";
import { ErrorBanner } from "./components/ErrorBanner.js";
import { CatalogStaleBanner } from "./components/CatalogStaleBanner.js";
import { CatalogSearch } from "./components/CatalogSearch.js";
import { ResourceCard, type Resource } from "./components/ResourceCard.js";
import { KeyboardShortcutsHelp, type KeyboardShortcut } from "./components/KeyboardShortcutsHelp.js";
import { useTheme } from "./hooks/useTheme.js";
import { useAsync } from "./hooks/useAsync.js";
import { useCatalog } from "./hooks/useCatalog.js";
import { useDebouncedValue } from "./hooks/useDebouncedValue.js";
import { useWalletConnection } from "./hooks/useWalletConnection.js";
import { useKeyboardShortcuts, type ShortcutMap } from "./hooks/useKeyboardShortcuts.js";
import { fetchRegistryStatus } from "./api/resources.js";
import type { CatalogFilters } from "./api/resources.js";
import { loadLocale } from "./i18n/config.js";

export type { Resource };

const EditPriceModal         = lazy(() => import("./components/EditPriceModal.js").then((m) => ({ default: m.EditPriceModal })));
const TransferOwnershipModal = lazy(() => import("./components/TransferOwnershipModal.js").then((m) => ({ default: m.TransferOwnershipModal })));
const RegisterModal          = lazy(() => import("./components/RegisterModal.js").then((m) => ({ default: m.RegisterModal })));
const ResourcePreviewModal   = lazy(() => import("./components/ResourcePreviewModal.js").then((m) => ({ default: m.ResourcePreviewModal })));
const AnalyticsDashboard     = lazy(() => import("./components/AnalyticsDashboard.js").then((m) => ({ default: m.AnalyticsDashboard })));
const CreatorDashboard       = lazy(() => import("./components/CreatorDashboard.js").then((m) => ({ default: m.CreatorDashboard })));
const Leaderboard            = lazy(() => import("./components/Leaderboard.js").then((m) => ({ default: m.Leaderboard })));
const AgentStatusPage        = lazy(() => import("./components/AgentStatusPage.js").then((m) => ({ default: m.AgentStatusPage })));
const PublishModal           = lazy(() => import("./components/PublishModal.js").then((m) => ({ default: m.PublishModal })));
const PurchasesDashboard     = lazy(() => import("./components/PurchasesDashboard.js").then((m) => ({ default: m.PurchasesDashboard })));
const BuyModal               = lazy(() => import("./components/BuyModal.js").then((m) => ({ default: m.BuyModal })));

/* ─── types ─────────────────────────────────────────────────────────────── */
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
const PUBLISHING_DOCS_URL = "https://docs.synapsvault.app/publishing";

const DEFAULT_FILTERS: CatalogFilters = {
  search: "",
  minPrice: "",
  maxPrice: "",
  verificationStatus: "all",
  resourceType: "all",
};

const MARKETPLACE_TABS: Tab[] = ["catalog", "leaderboard", "purchases", "agent"];
const CREATOR_TABS: Tab[] = ["dashboard", "analytics"];
/** Number-key shortcuts, in display order. Creator tabs only bind with an API key. */
const TAB_HOTKEYS: Tab[] = [...MARKETPLACE_TABS, ...(API_KEY ? CREATOR_TABS : [])];

const TAB_LABEL_KEYS: Record<Tab, string> = {
  catalog: "app.tab_catalog", leaderboard: "app.tab_leaderboard", purchases: "app.tab_purchases",
  agent: "app.tab_agent", dashboard: "app.tab_dashboard", analytics: "app.tab_analytics",
};
const TAB_TITLE_KEYS: Record<Tab, string> = {
  catalog: "app.page_catalog", leaderboard: "app.page_leaderboard", purchases: "app.page_purchases",
  agent: "app.page_agent", dashboard: "app.page_dashboard", analytics: "app.page_analytics",
};
const TAB_SHORTCUT_KEYS: Record<Tab, string> = {
  catalog: "shortcuts.go_catalog", leaderboard: "shortcuts.go_leaderboard", purchases: "shortcuts.go_purchases",
  agent: "shortcuts.go_agent", dashboard: "shortcuts.go_dashboard", analytics: "shortcuts.go_analytics",
};

function hasActiveFilters(f: CatalogFilters): boolean {
  return Boolean(
    f.search || f.minPrice || f.maxPrice ||
    (f.verificationStatus && f.verificationStatus !== "all") ||
    (f.resourceType && f.resourceType !== "all"),
  );
}

/* ─── icons ─────────────────────────────────────────────────────────────── */
const iconProps = {
  className: "synapse-nav-item__icon", fill: "none", viewBox: "0 0 18 18",
  stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const, "aria-hidden": true,
};

const NavIcons: Record<Tab, React.ReactNode> = {
  catalog:     <svg {...iconProps}><rect x="2" y="2" width="6" height="6" rx="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5"/><rect x="2" y="10" width="6" height="6" rx="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5"/></svg>,
  dashboard:   <svg {...iconProps}><path d="M3 7.5 9 3l6 4.5V15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.5Z"/><path d="M7 16v-5h4v5"/></svg>,
  analytics:   <svg {...iconProps}><path d="M2.5 15.5 6.5 9l3 3.5 3-6 3 5"/></svg>,
  purchases:   <svg {...iconProps}><path d="M3 4h12l-1.3 7.5a1 1 0 0 1-1 .8H5.3a1 1 0 0 1-1-.8L3 4Zm0 0-.5-2H1"/><circle cx="6" cy="15" r="1"/><circle cx="12" cy="15" r="1"/></svg>,
  leaderboard: <svg {...iconProps}><path d="M5 16V9M9 16V3M13 16v-5"/></svg>,
  agent:       <svg {...iconProps}><rect x="3" y="5" width="12" height="9" rx="2.5"/><path d="M9 2v3M6.5 9.5h.01M11.5 9.5h.01M7 12h4"/></svg>,
};

/* ─── fallbacks ─────────────────────────────────────────────────────────── */
function LazyFallback({ label }: { label?: string }) {
  return (
    <div className="synapse-lazy-fallback" role="status" aria-live="polite">
      <span className="synapse-spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}

function LazyModalFallback() {
  return (
    <div className="synapse-modal-backdrop" role="status" aria-live="polite">
      <span className="synapse-spinner synapse-spinner--lg" aria-hidden="true" />
    </div>
  );
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
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const searchInputRef                  = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme }          = useTheme();
  const wallet                          = useWalletConnection();
  const { t, i18n }                     = useTranslation();

  /* catalog — debounced so typing doesn't fire a request per keystroke */
  const debouncedFilters = useDebouncedValue(filters, 250);
  const {
    status: resourcesStatus,
    data: rawResources,
    error: resourcesError,
    retry: retryResources,
    stale: catalogStale,
    syncedAt: catalogSyncedAt,
  } = useCatalog<Resource>(debouncedFilters);

  /* registry stats */
  const {
    status: registryStatus,
    data: registryData,
    retry: retryRegistry,
  } = useAsync<{ resourceCount: number }>(() => fetchRegistryStatus(), []);

  const resources = useMemo((): Resource[] => {
    if (!rawResources) return [];
    return rawResources.map((r) => ({ ...r, ...(overrides[r.id] ?? {}) }));
  }, [rawResources, overrides]);

  const applyOverride = useCallback((id: string, patch: Partial<Resource>) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...patch } }));
  }, []);

  const closeModal = useCallback(() => setActiveModal(null), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const closeShortcutsHelp = useCallback(() => setShowShortcutsHelp(false), []);

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setToast({ message: t("catalog.url_copied") });
    } catch {
      setToast({ message: t("catalog.copy_this_url"), fallbackUrl: url });
    }
  }, [t]);

  const toggleLanguage = useCallback(async () => {
    const next = i18n.language === "en" ? "es" : "en";
    await loadLocale(next);
    await i18n.changeLanguage(next);
    document.documentElement.lang = next;
  }, [i18n]);

  const goTo = useCallback((next: Tab) => {
    setTab(next);
    setSidebarOpen(false);
  }, []);

  // Keep showing the current results while a refetch is in flight; only show
  // skeletons on the very first load.
  const isRefreshing  = resourcesStatus === "loading" || filters !== debouncedFilters;
  const isFirstLoad   = (resourcesStatus === "idle" || resourcesStatus === "loading") && !rawResources;
  const registryCount = registryData?.resourceCount ?? null;
  const filtersActive = hasActiveFilters(debouncedFilters);

  /* ── Keyboard shortcuts ──────────────────────────────────────────────── */
  const shortcuts = useMemo<ShortcutMap>(() => {
    const map: ShortcutMap = {
      search: {
        key: "/",
        preventDefault: true,
        handler: () => {
          setTab("catalog");
          // Wait a frame so the catalog (and its input) is mounted.
          requestAnimationFrame(() => searchInputRef.current?.focus());
        },
      },
      help: { key: "?", shift: true, handler: () => setShowShortcutsHelp((v) => !v) },
      theme: { key: "t", handler: toggleTheme },
      language: { key: "l", handler: () => void toggleLanguage() },
      escape: {
        key: "Escape",
        allowInInput: true,
        handler: () => {
          if (activeModal) setActiveModal(null);
          else if (showPublish) setShowPublish(false);
          else if (sidebarOpen) setSidebarOpen(false);
        },
      },
    };
    TAB_HOTKEYS.forEach((target, i) => {
      map[`tab-${target}`] = { key: String(i + 1), handler: () => goTo(target) };
    });
    if (API_KEY) map.publish = { key: "p", handler: () => setShowPublish(true) };
    return map;
  }, [activeModal, showPublish, sidebarOpen, toggleTheme, toggleLanguage, goTo]);

  // While the help dialog is open it owns the keyboard (it handles Escape).
  useKeyboardShortcuts(shortcuts, !showShortcutsHelp);

  const shortcutHelpItems: KeyboardShortcut[] = useMemo(() => {
    const nav = t("shortcuts.group_navigation");
    const actions = t("shortcuts.group_actions");
    const help = t("shortcuts.group_help");
    return [
      ...TAB_HOTKEYS.map((target, i) => ({ keys: String(i + 1), description: t(TAB_SHORTCUT_KEYS[target]), group: nav })),
      { keys: "/", description: t("shortcuts.search"), group: actions },
      ...(API_KEY ? [{ keys: "P", description: t("shortcuts.publish"), group: actions }] : []),
      { keys: "T", description: t("shortcuts.toggle_theme"), group: actions },
      { keys: "L", description: t("shortcuts.toggle_language"), group: actions },
      { keys: "?", description: t("shortcuts.show_shortcuts"), group: help },
      { keys: "Esc", description: t("shortcuts.escape"), group: help },
    ];
  }, [t]);

  /* ── Sidebar ─────────────────────────────────────────────────────────── */
  const renderNavItem = (target: Tab) => (
    <button
      key={target}
      className={`synapse-nav-item ${tab === target ? "synapse-nav-item--active" : ""}`}
      aria-current={tab === target ? "page" : undefined}
      onClick={() => goTo(target)}
    >
      {NavIcons[target]}
      <span>{t(TAB_LABEL_KEYS[target])}</span>
      <kbd className="synapse-nav-item__kbd" aria-hidden="true">{TAB_HOTKEYS.indexOf(target) + 1}</kbd>
    </button>
  );

  const renderSidebar = () => (
    <aside id="app-sidebar" className={`synapse-sidebar ${sidebarOpen ? "synapse-sidebar--open" : ""}`}>
      <div className="synapse-sidebar__brand">
        <img src="/icon.svg" alt="" className="synapse-sidebar__logo" width={30} height={30} />
        <span className="synapse-sidebar__name">{t("app.title")}</span>
        <span className="synapse-sidebar__network">{import.meta.env.VITE_NETWORK || "testnet"}</span>
      </div>

      <nav className="synapse-sidebar__nav" aria-label={t("app.nav_label")}>
        <div className="synapse-nav-label">{t("app.nav_marketplace")}</div>
        {MARKETPLACE_TABS.map(renderNavItem)}

        {API_KEY && (
          <div className="synapse-nav-group">
            <div className="synapse-nav-label">{t("app.nav_creator")}</div>
            {CREATOR_TABS.map(renderNavItem)}
            <button className="synapse-nav-item" onClick={() => { setShowPublish(true); setSidebarOpen(false); }}>
              <svg {...iconProps}><path d="M9 3v12M3 9h12"/></svg>
              <span>{t("app.publish_resource")}</span>
            </button>
          </div>
        )}
      </nav>

      <div className="synapse-sidebar__bottom">
        {registryCount !== null && (
          <div className="synapse-registry">
            <span className="synapse-registry__pulse" aria-hidden="true" />
            {t("app.registry_onchain", { count: registryCount })}
          </div>
        )}
        <button
          className="synapse-wallet-btn"
          onClick={wallet.status === "connected" ? wallet.disconnect : wallet.connect}
          title={wallet.status === "connected" ? t("app.disconnect_wallet") : undefined}
        >
          <span className={`synapse-wallet-dot ${wallet.status === "connected" ? "synapse-wallet-dot--connected" : ""}`} aria-hidden="true" />
          {wallet.status === "connected" && wallet.address
            ? <span className="font-mono">{`${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}</span>
            : t("app.connect_wallet")}
        </button>
        <div className="synapse-sidebar__prefs">
          <button className="synapse-icon-btn" onClick={toggleTheme}
            aria-label={theme === "dark" ? t("app.theme_light") : t("app.theme_dark")}
            title={`${t("shortcuts.toggle_theme")} (T)`}>
            <svg width="16" height="16" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
              {theme === "dark"
                ? <><circle cx="9" cy="9" r="3.5"/><path d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.7 3.7l1 1M13.3 13.3l1 1M14.3 3.7l-1 1M4.7 13.3l-1 1"/></>
                : <path d="M15 10.5A6.5 6.5 0 0 1 7.5 3a6.5 6.5 0 1 0 7.5 7.5Z"/>}
            </svg>
          </button>
          <button className="synapse-icon-btn synapse-icon-btn--text" onClick={() => void toggleLanguage()}
            title={`${t("shortcuts.toggle_language")} (L)`} aria-label={t("language.switch_to")}>
            {i18n.language === "en" ? "ES" : "EN"}
          </button>
          <button className="synapse-icon-btn" onClick={() => setShowShortcutsHelp(true)}
            aria-label={t("shortcuts.open")} title={`${t("shortcuts.open")} (?)`}>
            <svg width="16" height="16" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
              <rect x="1.5" y="4" width="15" height="10" rx="2"/><path d="M4.5 7h.01M7.5 7h.01M10.5 7h.01M13.5 7h.01M5.5 11h7"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );

  /* ── Topbar ──────────────────────────────────────────────────────────── */
  const renderTopbar = () => (
    <header className="synapse-topbar">
      <button className="synapse-icon-btn synapse-topbar__menu-btn"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label={t("app.toggle_menu")} aria-expanded={sidebarOpen} aria-controls="app-sidebar">
        <svg width="18" height="18" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden="true">
          <path d="M3 5h12M3 9h12M3 13h12"/>
        </svg>
      </button>
      <h1 className="synapse-topbar__title">{t(TAB_TITLE_KEYS[tab])}</h1>
      <div className="synapse-topbar__actions">
        {registryStatus === "error" && (
          <button className="synapse-btn synapse-btn--ghost synapse-btn--sm" onClick={retryRegistry}>
            {t("app.retry_registry")}
          </button>
        )}
        {API_KEY && (
          <button className="synapse-btn synapse-btn--primary synapse-btn--sm" onClick={() => setShowPublish(true)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 18 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M9 3v12M3 9h12"/></svg>
            {t("app.publish")}
          </button>
        )}
      </div>
    </header>
  );

  /* ── Catalog tab ─────────────────────────────────────────────────────── */
  const renderCatalogBody = () => {
    if (isFirstLoad) return <ResourceGridSkeleton count={6} />;
    if (resourcesStatus === "error") {
      return <ErrorBanner message={resourcesError ?? t("errors.generic_description")} onRetry={retryResources} />;
    }
    if (resources.length === 0 && resourcesStatus === "success") {
      return filtersActive ? (
        <div className="synapse-empty">
          <div className="synapse-empty__icon" aria-hidden="true">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2M8.5 11h5"/></svg>
          </div>
          <p className="synapse-empty__title">{t("catalog.no_matches")}</p>
          <button className="synapse-btn synapse-btn--ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
            {t("catalog.clear_filters")}
          </button>
        </div>
      ) : (
        <div className="synapse-empty">
          <div className="synapse-empty__icon" aria-hidden="true">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg>
          </div>
          <h2 className="synapse-empty__title">{t("catalog.empty_title")}</h2>
          <p className="synapse-empty__body">{t("catalog.empty_description")}</p>
          <a className="synapse-btn synapse-btn--primary" href={PUBLISHING_DOCS_URL} target="_blank" rel="noopener noreferrer">
            {t("catalog.publish_cta")}
          </a>
        </div>
      );
    }
    return (
      <div className="synapse-resource-grid" aria-busy={isRefreshing}>
        {resources.map((r) => (
          <ResourceCard key={r.id} resource={r}
            onPreview={(res) => setActiveModal({ kind: "preview", resource: res })}
            onBuy={(res) => setActiveModal({ kind: "buy", resource: res })} />
        ))}
      </div>
    );
  };

  const renderCatalog = () => (
    <>
      <section className="synapse-hero">
        <p className="synapse-hero__eyebrow">x402 · Stellar · USDC</p>
        <p className="synapse-hero__lead">{t("app.page_catalog_desc")}</p>
      </section>

      {catalogStale && resourcesStatus === "success" && <CatalogStaleBanner syncedAt={catalogSyncedAt} />}

      <CatalogSearch
        filters={filters}
        total={resources.length}
        filtered={resources.length}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        searchInputRef={searchInputRef}
      />

      {renderCatalogBody()}
    </>
  );

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="synapse-shell">
      <a href="#main-content" className="synapse-skip-link">{t("app.skip_to_content")}</a>

      {sidebarOpen && <div className="synapse-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      {renderSidebar()}

      <div className="synapse-main">
        {renderTopbar()}

        <main id="main-content" className="synapse-content" tabIndex={-1}>
          {tab === "catalog" && renderCatalog()}
          {tab === "leaderboard" && (
            <Suspense fallback={<LazyFallback label={t("app.loading")} />}>
              <Leaderboard />
            </Suspense>
          )}
          {tab === "purchases" && (
            <Suspense fallback={<LazyFallback label={t("app.loading")} />}>
              <PurchasesDashboard initialWallet={wallet.address ?? ""} />
            </Suspense>
          )}
          {tab === "agent" && (
            <Suspense fallback={<LazyFallback label={t("app.loading")} />}>
              <AgentStatusPage />
            </Suspense>
          )}
          {tab === "dashboard" && API_KEY && (
            <Suspense fallback={<LazyFallback label={t("app.loading")} />}>
              <CreatorDashboard apiKey={API_KEY}
                onEditPrice={(r) => setActiveModal({ kind: "editPrice", resource: r as Resource })}
                onTransferOwnership={(r) => setActiveModal({ kind: "transferOwnership", resource: r as Resource })}
                onRegister={(r) => setActiveModal({ kind: "register", resource: r as Resource })} />
            </Suspense>
          )}
          {tab === "analytics" && API_KEY && (
            <Suspense fallback={<LazyFallback label={t("app.loading")} />}>
              <AnalyticsDashboard apiKey={API_KEY} />
            </Suspense>
          )}
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {activeModal?.kind === "preview" && (
        <Suspense fallback={<LazyModalFallback />}>
          <ResourcePreviewModal resourceId={activeModal.resource.id}
            onClose={closeModal} onCopyUrl={handleCopyUrl}
            onBuy={() => setActiveModal({ kind: "buy", resource: activeModal.resource })} />
        </Suspense>
      )}
      {activeModal?.kind === "buy" && (
        <Suspense fallback={<LazyModalFallback />}>
          <BuyModal resourceTitle={activeModal.resource.title} price={activeModal.resource.price}
            recipient={activeModal.resource.walletAddress} accessUrl={activeModal.resource.accessUrl}
            walletAddress={wallet.status === "connected" ? wallet.address : null}
            onClose={closeModal} onCopyUrl={handleCopyUrl} />
        </Suspense>
      )}
      {activeModal?.kind === "editPrice" && (
        <Suspense fallback={<LazyModalFallback />}>
          <EditPriceModal resourceId={activeModal.resource.id} currentPrice={activeModal.resource.price}
            apiKey={API_KEY} onClose={closeModal}
            onConfirmed={(price) => { applyOverride(activeModal.resource.id, { price }); closeModal(); }} />
        </Suspense>
      )}
      {activeModal?.kind === "transferOwnership" && (
        <Suspense fallback={<LazyModalFallback />}>
          <TransferOwnershipModal resourceId={activeModal.resource.id} apiKey={API_KEY}
            onClose={closeModal}
            onConfirmed={(addr) => { applyOverride(activeModal.resource.id, { walletAddress: addr }); closeModal(); }} />
        </Suspense>
      )}
      {activeModal?.kind === "register" && (
        <Suspense fallback={<LazyModalFallback />}>
          <RegisterModal resourceId={activeModal.resource.id} apiKey={API_KEY}
            onClose={closeModal}
            onConfirmed={() => { applyOverride(activeModal.resource.id, { onchainStatus: "registered" }); closeModal(); }} />
        </Suspense>
      )}
      {showPublish && API_KEY && (
        <Suspense fallback={<LazyModalFallback />}>
          <PublishModal apiKey={API_KEY} onClose={() => setShowPublish(false)}
            onPublished={() => retryResources()} />
        </Suspense>
      )}
      <KeyboardShortcutsHelp isOpen={showShortcutsHelp} onClose={closeShortcutsHelp} shortcuts={shortcutHelpItems} />
      {toast && (
        <Toast message={toast.message} fallbackUrl={toast.fallbackUrl} onDismiss={dismissToast} />
      )}
    </div>
  );
}
