/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL. Empty → same origin (dev server proxies API paths). */
  readonly VITE_API_URL?: string;
  /** Optional challenge/session service base URL; no credentials belong here. */
  readonly VITE_AUTH_PROXY_URL?: string;
  /** "testnet" (default) or "mainnet". */
  readonly VITE_NETWORK?: string;
  /** @deprecated Use VITE_NETWORK. */
  readonly VITE_STELLAR_NETWORK?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:pwa-register" {
  interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
