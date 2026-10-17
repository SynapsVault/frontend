import { useState } from "react";
import { checkNetwork } from "./useNetworkCheck.js";
import { signWithFreighter } from "../lib/freighter.js";

type Status = "idle" | "preparing" | "signing" | "submitting" | "confirmed" | "error";

interface PrepareResult {
  unsignedXdr: string;
  networkPassphrase: string;
}

interface SignedMutationCallbacks<TParams, TResult> {
  prepare: (params: TParams, idempotencyKey: string) => Promise<PrepareResult>;
  submit: (params: TParams, signedXdr: string, idempotencyKey: string) => Promise<TResult>;
}

/**
 * Shared hook for blockchain mutations that follow the prepare → sign → submit pattern.
 * 
 * This hook encapsulates the common state machine used by operations like
 * editPrice and transferOwnership:
 * 1. Prepare: fetch unsigned XDR from the server
 * 2. Check network: warn if wallet is on wrong network
 * 3. Sign: request signature from wallet (Freighter)
 * 4. Submit: send signed XDR back to server
 * 
 * @param callbacks - Object with prepare and submit functions that accept operation-specific parameters
 * @returns State and execute function that accepts parameters for the mutation
 */
export function useSignedMutation<TParams, TResult>(
  callbacks: SignedMutationCallbacks<TParams, TResult>,
) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [networkWarning, setNetworkWarning] = useState<string | null>(null);

  async function execute(params: TParams) {
    setError(null);
    setNetworkWarning(null);
    // One idempotency key per logical operation, reused across prepare/submit retries
    const idempotencyKey = crypto.randomUUID();

    try {
      // Step 1 — fetch unsigned XDR from the server
      setStatus("preparing");
      const { unsignedXdr, networkPassphrase } = await callbacks.prepare(params, idempotencyKey);

      // Step 1b — warn if wallet is on the wrong network (non-blocking)
      const warning = await checkNetwork(networkPassphrase);
      if (warning) {
        setNetworkWarning(warning);
        setStatus("idle");
        return;
      }

      // Step 2 — ask Freighter (or any SEP-43 wallet) to sign
      setStatus("signing");
      const signedXdr = await signWithFreighter(unsignedXdr, networkPassphrase);

      // Step 3 — submit signed XDR and sync DB
      setStatus("submitting");
      const updated = await callbacks.submit(params, signedXdr, idempotencyKey);
      setResult(updated);
      setStatus("confirmed");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not complete the operation. Check your wallet connection and try again.",
      );
      setStatus("error");
    }
  }

  return { status, result, error, networkWarning, execute };
}
