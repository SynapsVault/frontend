import { useCallback, useEffect, useState } from "react";
import { registerAppServiceWorker } from "../lib/pwa.js";

export function ServiceWorkerUpdatePrompt() {
  const [activateUpdate, setActivateUpdate] = useState<(() => void) | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => registerAppServiceWorker(setActivateUpdate), []);

  const applyUpdate = useCallback(() => {
    if (!activateUpdate) return;
    setActivating(true);
    activateUpdate();
  }, [activateUpdate]);

  if (!activateUpdate) return null;
  return (
    <aside
      className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg sm:left-auto sm:right-6 sm:max-w-md"
      role="status"
      aria-live="polite"
    >
      <span>{activating ? "Applying update when the app is idle…" : "A new version is ready."}</span>
      <button
        type="button"
        className="shrink-0 rounded-md bg-white px-3 py-1.5 font-semibold text-gray-900 disabled:opacity-60"
        onClick={applyUpdate}
        disabled={activating}
      >
        {activating ? "Updating…" : "Update"}
      </button>
    </aside>
  );
}
