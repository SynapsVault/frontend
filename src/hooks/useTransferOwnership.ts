import { useState } from "react";
import { prepareTransferOwnership, submitTransferOwnership } from "../api/resources.js";
import { checkNetwork } from "./useNetworkCheck.js";

/** Older Freighter versions nest the signed XDR under `result`. */
type LegacyFreighterResult = { result?: { signedTxXdr?: string } };

type Status = "idle" | "preparing" | "signing" | "submitting" | "confirmed" | "error";

export function useTransferOwnership(resourceId: string, apiKey: string) {
  const [status, setStatus] = useState<Status>("idle");
  const [newOwner, setNewOwner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkWarning, setNetworkWarning] = useState<string | null>(null);

  async function transferOwnership(newCreator: string) {
    setError(null);
    setNetworkWarning(null);
    try {
      // Step 1 — fetch unsigned XDR from the server
      setStatus("preparing");
      const { unsignedXdr, networkPassphrase } = await prepareTransferOwnership(
        resourceId,
        newCreator,
        apiKey,
      );

      // Step 1b — warn if wallet is on the wrong network (non-blocking)
      const warning = await checkNetwork(networkPassphrase);
      if (warning) {
        setNetworkWarning(warning);
        setStatus("idle");
        return;
      }

      // Step 2 — ask Freighter (or any SEP-43 wallet) to sign
      setStatus("signing");
      const freighter = await import("@stellar/freighter-api");
      const result = await freighter.signTransaction(unsignedXdr, {
        networkPassphrase,
      });

      if ("error" in result && result.error) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Wallet rejected signing. Please approve the transaction in your wallet and try again.",
        );
      }

      const signedXdr =
        "signedTxXdr" in result
          ? result.signedTxXdr
          : (result as LegacyFreighterResult).result?.signedTxXdr;
      if (!signedXdr)
        throw new Error(
          "No signed transaction returned by wallet. Ensure your wallet is unlocked, connected, and on the correct network, then try again.",
        );

      // Step 3 — submit signed XDR and sync DB owner
      setStatus("submitting");
      const updated = await submitTransferOwnership(resourceId, signedXdr, newCreator, apiKey);
      setNewOwner(updated.newCreator);
      setStatus("confirmed");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while transferring ownership. Please check your wallet connection and try again.",
      );
      setStatus("error");
    }
  }

  return { status, newOwner, error, networkWarning, transferOwnership };
}
