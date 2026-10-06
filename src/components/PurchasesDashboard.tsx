import React, { useState, useEffect } from "react";
import { fetchBuyerPayments, PaymentReceipt } from "../api/payments.js";

interface Props {
  initialWallet?: string;
}

export function PurchasesDashboard({ initialWallet = "" }: Props) {
  const [address, setAddress] = useState(initialWallet);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialWallet) {
      handleSearch(initialWallet);
    }
  }, [initialWallet]);

  const handleSearch = async (searchAddress: string) => {
    if (!searchAddress) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBuyerPayments(searchAddress);
      setPayments(data);
      setHasSearched(true);
    } catch (err) {
      setError((err instanceof Error && err.message) || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(address);
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
      <h2 className="text-xl font-bold text-fg">My Purchases</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Enter your wallet address to view your purchase history and receipts.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:max-w-md">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="G..."
          className="synapse-input"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {hasSearched && !loading && payments.length === 0 && (
        <p className="mt-8 text-sm text-fg-muted">
          No purchases found for this address.
        </p>
      )}

      {payments.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-lg border border-line">
          <table className="min-w-full divide-y divide-line">
            <thead className="bg-surface-sunken">
              <tr>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-fg-muted sm:px-6"
                >
                  Resource ID
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-fg-muted sm:px-6"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-fg-muted sm:px-6"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-fg-muted sm:px-6"
                >
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-fg sm:px-6 sm:py-4">
                    {p.resourceId.slice(0, 8)}...
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-fg-muted sm:px-6 sm:py-4">
                    {new Date(p.paidAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-fg-muted sm:px-6 sm:py-4">
                    {p.amount} USDC
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium sm:px-6 sm:py-4">
                    <a
                      href={`${import.meta.env.VITE_API_URL || ""}/payments/${p.id}/receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-text hover:text-accent-hover"
                    >
                      View Receipt ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
