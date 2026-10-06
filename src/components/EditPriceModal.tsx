import React, { useState } from "react";
import { useEditPrice } from "../hooks/useEditPrice.js";

interface Props {
  resourceId: string;
  currentPrice: string;
  apiKey: string;
  onClose: () => void;
  onConfirmed: (price: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  idle: "",
  preparing: "Building transaction…",
  signing: "Waiting for wallet signature…",
  submitting: "Submitting to Stellar…",
  confirmed: "Price updated!",
  error: "",
};

export function EditPriceModal({ resourceId, currentPrice, apiKey, onClose, onConfirmed }: Props) {
  const [price, setPrice] = useState(currentPrice);
  const { status, newPrice, error, networkWarning, editPrice } = useEditPrice(resourceId, apiKey);

  const busy = ["preparing", "signing", "submitting"].includes(status);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    editPrice(price);
  }

  if (status === "confirmed" && newPrice) {
    onConfirmed(newPrice);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-none overflow-y-auto rounded-none bg-white p-4 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit Price</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              New price (USDC)
            </label>
            <input
              id="price"
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              required
            />
          </div>

          {STATUS_LABELS[status] && (
            <p className="text-sm text-indigo-600">{STATUS_LABELS[status]}</p>
          )}

          {networkWarning && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ⚠️ {networkWarning}
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {status === "confirmed" && (
            <p className="text-sm font-medium text-green-600">
              Price updated to {newPrice} USDC on-chain and in the database.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full rounded-lg px-4 py-3 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50 sm:w-auto sm:py-2"
            >
              {status === "confirmed" ? "Close" : "Cancel"}
            </button>
            {status !== "confirmed" && (
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {busy ? "Working…" : "Update Price"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
