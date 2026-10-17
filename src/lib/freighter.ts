/**
 * Thin helpers around @stellar/freighter-api (v6).
 *
 * Freighter no longer injects a `window.freighterApi` global; pages talk to the
 * extension through this package. It is imported lazily so the wallet code
 * stays out of the initial bundle.
 */

export const FREIGHTER_INSTALL_URL = "https://freighter.app";

export const FREIGHTER_NOT_FOUND_CODE = "FREIGHTER_NOT_FOUND" as const;
export type WalletErrorCode = typeof FREIGHTER_NOT_FOUND_CODE;

export const FREIGHTER_NOT_FOUND =
  `Freighter wallet not found. Install the Freighter browser extension from ${FREIGHTER_INSTALL_URL}, then reload this page and try again.`;

export class FreighterError extends Error {
  readonly code?: WalletErrorCode;
  constructor(message: string, code?: WalletErrorCode) {
    super(message);
    this.name = "FreighterError";
    this.code = code;
  }
}

export function isFreighterNotFoundError(err: unknown): boolean {
  return (
    Boolean(err) &&
    typeof err === "object" &&
    "code" in (err as Record<string, unknown>) &&
    (err as { code?: unknown }).code === FREIGHTER_NOT_FOUND_CODE
  );
}

import { TransactionBuilder } from "@stellar/stellar-sdk";

export const loadFreighter = () => import("@stellar/freighter-api");

/** Freighter v6 reports failures as `{ code, message }` objects. */
export function freighterErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message ?? "").trim();
    if (message) return message;
  }
  return fallback;
}

/** True when the Freighter extension is installed in this browser. */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const freighter = await loadFreighter();
    const result = await freighter.isConnected();
    return !result.error && result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Sign a transaction XDR with Freighter and return the signed XDR.
 * Throws with Freighter's own message on rejection or a locked wallet.
 *
 * The account that must sign is the transaction's source account. Freighter signs
 * with whichever account is active, so check that first and fail before signing
 * instead of producing a signature the network will reject.
 */
export async function signWithFreighter(xdr: string, networkPassphrase: string): Promise<string> {
  if (!(await isFreighterInstalled())) {
    throw new FreighterError(FREIGHTER_NOT_FOUND, FREIGHTER_NOT_FOUND_CODE);
  }
  const parsed = TransactionBuilder.fromXDR(xdr, networkPassphrase);
  const expected = "innerTransaction" in parsed ? parsed.innerTransaction.source : parsed.source;

  const freighter = await loadFreighter();
  const active = await freighter.getAddress();
  if (active.error || !active.address) {
    throw new Error(
      freighterErrorMessage(active.error, "Could not read the active Freighter account. Unlock Freighter and try again."),
    );
  }
  if (active.address !== expected) {
    throw new Error(
      `Freighter's active account (${active.address}) is not the account that must sign this transaction (${expected}). Switch to ${expected} in Freighter and try again.`,
    );
  }

  const result = await freighter.signTransaction(xdr, { networkPassphrase, address: expected });
  if (result.error) {
    throw new Error(
      freighterErrorMessage(
        result.error,
        "Wallet rejected signing. Approve the transaction in Freighter and try again.",
      ),
    );
  }
  if (!result.signedTxXdr) {
    throw new Error("No signed transaction returned by Freighter. Unlock your wallet and try again.");
  }
  return result.signedTxXdr;
}
