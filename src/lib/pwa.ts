import { registerSW } from "virtual:pwa-register";

export type ServiceWorkerUpdateHandler = (update: () => void) => void;

/**
 * Register the PWA without taking control during the current session.
 * vite-plugin-pwa leaves the new worker waiting; the caller decides when the
 * user has accepted the update and this helper activates it during idle time.
 */
export function registerAppServiceWorker(onUpdateAvailable: ServiceWorkerUpdateHandler): () => void {
  const updateSW = registerSW({
    immediate: false,
    onNeedRefresh() {
      onUpdateAvailable(() => {
        const activate = () => void updateSW(true);
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(activate, { timeout: 30_000 });
        } else {
          window.setTimeout(activate, 1_000);
        }
      });
    },
  });
  // vite-plugin-pwa does not expose an unregister operation from registerSW;
  // the worker lifecycle is managed by the browser after registration.
  return () => undefined;
}
