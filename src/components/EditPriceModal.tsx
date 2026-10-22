import React, { useState, useEffect } from "react";
import { useEditPrice } from "../hooks/useEditPrice.js";
import { useDialogA11y } from "../hooks/useDialogA11y.js";
import { useTranslation } from "react-i18next";

interface Props {
  resourceId: string;
  currentPrice: string;
  apiKey: string;
  onClose: () => void;
  onConfirmed: (price: string) => void;
}

const PRICE_PATTERN = /^\d+(\.\d{1,7})?$/;
// Stellar amounts are int64 stroops with 7 decimals (USDC included).
const MAX_STROOPS = 9223372036854775807n;
const STROOPS_PER_UNIT = BigInt(10000000);

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function validatePrice(value: string, t: Translate): string | null {
  const v = value.trim();
  if (!PRICE_PATTERN.test(v)) return t("editPrice.errors.invalidFormat");
  const [whole, frac = ""] = v.split(".");
  const stroops = BigInt(whole) * STROOPS_PER_UNIT + BigInt((frac + "0000000").slice(0, 7));
  if (stroops <= BigInt(0)) return t("editPrice.errors.notPositive");
  if (stroops > MAX_STROOPS) return t("editPrice.errors.tooLarge");
  return null;
}

const STATUS_KEYS: Record<string, string> = {
  idle: "",
  preparing: "editPrice.status.preparing",
  signing: "editPrice.status.signing",
  submitting: "editPrice.status.submitting",
  confirmed: "editPrice.status.confirmed",
  error: "",
};

export function EditPriceModal({ resourceId, currentPrice, apiKey, onClose, onConfirmed }: Props) {
  const { t } = useTranslation();
  const [price, setPrice] = useState(currentPrice);
  const [priceError, setPriceError] = useState<string | null>(null);
  const { status, newPrice, error, networkWarning, editPrice } = useEditPrice(resourceId, apiKey);

  const busy = ["preparing", "signing", "submitting"].includes(status);
  const dialogRef = useDialogA11y<HTMLDivElement>({ onClose, canClose: () => !busy });

  useEffect(() => {
    if (status === "confirmed" && newPrice) {
      onConfirmed(newPrice);
    }
  }, [status, newPrice, onConfirmed]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validatePrice(price, t);
    setPriceError(problem);
    if (problem) return;
    editPrice(price.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-price-title"
        tabIndex={-1}
        className="w-full max-w-none overflow-y-auto rounded-none bg-surface-raised p-4 shadow-xl outline-none sm:max-w-sm sm:rounded-2xl sm:p-6"
      >
        <h2 id="edit-price-title" className="mb-4 text-lg font-semibold text-fg">
          {t("editPrice.title")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-fg">
              {t("editPrice.newPriceLabel")}
            </label>
            <input
              id="price"
              type="number"
              min="0.0000001"
              step="0.0000001"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceError(null);
              }}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
              required
            />
          </div>

          {STATUS_KEYS[status] && (
            <p className="text-sm text-accent-text">{t(STATUS_KEYS[status])}</p>
          )}

          {networkWarning && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              {t("editPrice.networkWarning", { warning: networkWarning })}
            </p>
          )}

          {priceError && <p className="text-sm text-danger">{priceError}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}

          {status === "confirmed" && (
            <p className="text-sm font-medium text-success">
              {t("editPrice.success", { price: newPrice ?? "" })}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full rounded-lg px-4 py-3 text-sm text-fg-muted hover:bg-surface-hover disabled:opacity-50 sm:w-auto sm:py-2"
            >
              {status === "confirmed" ? t("common.close") : t("common.cancel")}
            </button>
            {status !== "confirmed" && (
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {busy ? t("common.working") : t("editPrice.updatePrice")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
