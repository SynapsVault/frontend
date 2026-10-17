import { useMemo } from "react";
import { prepareTransferOwnership, submitTransferOwnership } from "../api/resources.js";
import { useSignedMutation } from "./useSignedMutation.js";

export function useTransferOwnership(resourceId: string, apiKey: string) {
  const callbacks = useMemo(
    () => ({
      prepare: (newCreator: string, idempotencyKey: string) =>
        prepareTransferOwnership(resourceId, newCreator, apiKey, idempotencyKey),
      submit: (newCreator: string, signedXdr: string, idempotencyKey: string) =>
        submitTransferOwnership(resourceId, signedXdr, newCreator, apiKey, idempotencyKey),
    }),
    [resourceId, apiKey],
  );

  const { status, result, error, networkWarning, execute } =
    useSignedMutation<string, { newCreator: string }>(callbacks);

  async function transferOwnership(newCreator: string) {
    await execute(newCreator);
  }

  return {
    status,
    newOwner: result?.newCreator ?? null,
    error,
    networkWarning,
    transferOwnership,
  };
}
