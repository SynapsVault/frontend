import { useMemo } from "react";
import { prepareSetPrice, submitSetPrice } from "../api/resources.js";
import { useSignedMutation } from "./useSignedMutation.js";

export function useEditPrice(resourceId: string, apiKey: string) {
  const callbacks = useMemo(
    () => ({
      prepare: (price: string, idempotencyKey: string) =>
        prepareSetPrice(resourceId, price, apiKey, idempotencyKey),
      submit: (price: string, signedXdr: string, idempotencyKey: string) =>
        submitSetPrice(resourceId, signedXdr, price, apiKey, idempotencyKey),
    }),
    [resourceId, apiKey],
  );

  const { status, result, error, networkWarning, execute } =
    useSignedMutation<string, { price: string }>(callbacks);

  async function editPrice(price: string) {
    await execute(price);
  }

  return {
    status,
    newPrice: result?.price ?? null,
    error,
    networkWarning,
    editPrice,
  };
}
