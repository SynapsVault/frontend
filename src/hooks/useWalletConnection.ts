import { useCallback, useEffect, useState } from "react";
import { FREIGHTER_INSTALL_URL, freighterErrorMessage, loadFreighter } from "../lib/freighter.js";

export type WalletStatus = "restoring" | "disconnected" | "connecting" | "connected" | "error";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const STORAGE_KEY = "synapsvault-wallet";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(address: string | null): void {
  try {
    if (address) localStorage.setItem(STORAGE_KEY, address);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the connection still works for this session.
  }
}

/**
 * Manages the Freighter wallet connection (@stellar/freighter-api v6).
 *
 * - connect(): checks the extension is installed, then calls requestAccess(),
 *   which opens Freighter's approval prompt and resolves with the address.
 * - On mount, a previously connected address is restored silently when
 *   Freighter still reports this site as allowed (no prompt).
 * - disconnect() forgets the address locally. Freighter has no programmatic
 *   revoke; users remove site access from the extension itself.
 */
export function useWalletConnection(): WalletState {
  const [status, setStatus] = useState<WalletStatus>(() => (readStored() ? "restoring" : "disconnected"));
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Restore on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const stored = readStored();
    if (!stored) return;

    let cancelled = false;
    (async () => {
      try {
        const freighter = await loadFreighter();
        const [{ isConnected }, { isAllowed }] = await Promise.all([
          freighter.isConnected(),
          freighter.isAllowed(),
        ]);
        if (!isConnected || !isAllowed) throw new Error("not allowed");

        const result = await freighter.getAddress();
        if (result.error || !result.address) throw new Error("no address");
        if (cancelled) return;
        writeStored(result.address);
        setAddress(result.address);
        setStatus("connected");
      } catch {
        if (cancelled) return;
        writeStored(null);
        setStatus("disconnected");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");

    try {
      const freighter = await loadFreighter();

      const installed = await freighter.isConnected();
      if (installed.error || !installed.isConnected) {
        setError(
          `Freighter wallet not found. Install the Freighter browser extension from ${FREIGHTER_INSTALL_URL}, then reload this page.`,
        );
        setStatus("error");
        return;
      }

      // Opens Freighter's "connect to this site" prompt if not yet allowed.
      const access = await freighter.requestAccess();
      if (access.error || !access.address) {
        setError(
          freighterErrorMessage(
            access.error,
            "Connection was not approved. Open Freighter, unlock it, and approve the request.",
          ),
        );
        setStatus("error");
        return;
      }

      writeStored(access.address);
      setAddress(access.address);
      setStatus("connected");
    } catch (err) {
      setError(
        freighterErrorMessage(
          err,
          "Failed to connect wallet. Make sure Freighter is installed and unlocked, then try again.",
        ),
      );
      setStatus("error");
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    writeStored(null);
    setAddress(null);
    setStatus("disconnected");
    setError(null);
  }, []);

  return { status, address, error, connect, disconnect };
}
