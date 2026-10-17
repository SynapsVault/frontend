import { useCallback, useEffect, useState } from "react";
import {
  FREIGHTER_INSTALL_URL,
  FREIGHTER_NOT_FOUND_CODE,
  freighterErrorMessage,
  isFreighterNotFoundError,
  loadFreighter,
  type WalletErrorCode,
} from "../lib/freighter.js";

export type WalletStatus = "restoring" | "disconnected" | "connecting" | "connected" | "error";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  error: string | null;
  errorCode: WalletErrorCode | null;
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
  const [errorCode, setErrorCode] = useState<WalletErrorCode | null>(null);

  // ── Restore on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const stored = readStored();
    if (!stored) return;

    let cancelled = false;
    (async () => {
      try {
        const freighter = await loadFreighter();
        const [connected, allowed] = await Promise.all([
          freighter.isConnected(),
          freighter.isAllowed(),
        ]);
        if (cancelled) return;
        // Freighter reported an error: treat as transient and keep the stored address.
        if (connected.error || allowed.error) throw new Error("freighter error");

        if (!connected.isConnected || !allowed.isAllowed) {
          // Freighter explicitly says this site is not connected or not allowed.
          writeStored(null);
          setStatus("disconnected");
          return;
        }

        const result = await freighter.getAddress();
        if (cancelled) return;
        if (result.error || !result.address) throw new Error("no address");
        writeStored(result.address);
        setAddress(result.address);
        setStatus("connected");
      } catch {
        // Transient failure (extension or network glitch): keep the stored address so a reload can retry.
        if (cancelled) return;
        setStatus("disconnected");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Account switches ──────────────────────────────────────────────────────
  // Freighter has no account-change event here, so re-read the active account
  // whenever the window regains focus (the user usually switches in the extension).
  useEffect(() => {
    if (status !== "connected") return;

    let cancelled = false;
    const refresh = async () => {
      try {
        const freighter = await loadFreighter();
        const result = await freighter.getAddress();
        // Transient errors keep the current address; a real account is adopted.
        if (cancelled || result.error || !result.address) return;
        if (result.address !== address) {
          writeStored(result.address);
          setAddress(result.address);
        }
      } catch {
        // Ignore: the next focus or the signing check will re-read the account.
      }
    };

    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
  }, [status, address]);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    setError(null);
    setErrorCode(null);
    setStatus("connecting");

    try {
      const freighter = await loadFreighter();

      const installed = await freighter.isConnected();
      if (installed.error || !installed.isConnected) {
        setError(
          `Freighter wallet not found. Install the Freighter browser extension from ${FREIGHTER_INSTALL_URL}, then reload this page.`,
        );
        setErrorCode(FREIGHTER_NOT_FOUND_CODE);
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
        setErrorCode(null);
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
      setErrorCode(isFreighterNotFoundError(err) ? FREIGHTER_NOT_FOUND_CODE : null);
      setStatus("error");
    }
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    writeStored(null);
    setAddress(null);
    setStatus("disconnected");
    setError(null);
    setErrorCode(null);
  }, []);

  return { status, address, error, errorCode, connect, disconnect };
}
