import React, { useState, useEffect } from "react";
import { useTransferOwnership } from "../hooks/useTransferOwnership.js";
import { StrKey } from "@stellar/stellar-sdk";
import { useDialogA11y } from "../hooks/useDialogA11y.js";
import { useTranslation } from "react-i18next";

interface Props {
  resourceId: string;
  resourceTitle: string;
  apiKey: string;
  onClose: () => void;
  onConfirmed: (newCreator: string) => void;
}

const STATUS_KEYS: Record<string, string> = {
  idle: "",
  preparing: "transferOwnership.status.preparing",
  signing: "transferOwnership.status.signing",
  submitting: "transferOwnership.status.submitting",
  confirmed: "transferOwnership.status.confirmed",
  error: "",
};

export function TransferOwnershipModal({ resourceId, resourceTitle, apiKey, onClose, onConfirmed }: Props) {
  const { t } = useTranslation();
  const [newCreator, setNewCreator] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { status, newOwner, error, networkWarning, transferOwnership } = useTransferOwnership(
    resourceId,
    apiKey,
  );

  const busy = ["preparing", "signing", "submitting"].includes(status);
  const recipient = newCreator.trim();
  const recipientValid = StrKey.isValidEd25519PublicKey(recipient);
  const dialogRef = useDialogA11y<HTMLDivElement>({ onClose, canClose: () => !busy });

  useEffect(() => {
    if (status === "confirmed" && newOwner) {
      onConfirmed(newOwner);
    }
  }, [status, newOwner, onConfirmed]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientValid) return;
    // Transfer is irreversible: require a second, explicit confirmation of the recipient.
    if (!confirming) {
      setConfirming(true);
      return;
    }
    transferOwnership(recipient);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-ownership-title"
        tabIndex={-1}
        className="w-full max-w-none overflow-y-auto rounded-none bg-surface-raised p-4 shadow-xl outline-none sm:max-w-sm sm:rounded-2xl sm:p-6"
      >
        <h2 id="transfer-ownership-title" className="mb-4 text-lg font-semibold text-fg">
          {t("transferOwnership.title")}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-creator" className="block text-sm font-medium text-fg">
              {t("transferOwnership.newOwnerLabel")}
            </label>
            <input
              id="new-creator"
              type="text"
              placeholder="G…"
              value={newCreator}
              onChange={(e) => setNewCreator(e.target.value)}
              disabled={busy || confirming}
              aria-invalid={recipient.length > 0 && !recipientValid}
              className="mt-1 w-full rounded-lg border border-line-strong px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
              required
            />
            {recipient.length > 0 && !recipientValid && (
              <p className="mt-1 text-sm text-danger">
                {t("transferOwnership.invalidKey")}
              </p>
            )}
          </div>

          {confirming && status === "idle" && (
            <div className="space-y-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              <p>
                {t("transferOwnership.confirmPrompt", { title: resourceTitle })}
              </p>
              <p className="break-all font-mono">{recipient}</p>
            </div>
          )}

          {STATUS_KEYS[status] && (
            <p className="text-sm text-accent-text">{t(STATUS_KEYS[status])}</p>
          )}

          {networkWarning && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              {t("transferOwnership.networkWarning", { warning: networkWarning })}
            </p>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          {status === "confirmed" && newOwner && (
            <p className="break-all text-sm font-medium text-success">
              {t("transferOwnership.success", { newOwner })}
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
            {confirming && status !== "confirmed" && !busy && (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="w-full rounded-lg px-4 py-3 text-sm text-fg-muted hover:bg-surface-hover sm:w-auto sm:py-2"
              >
                {t("common.back")}
              </button>
            )}
            {status !== "confirmed" && (
              <button
                type="submit"
                disabled={busy || !recipientValid}
                className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
              >
                {busy
                  ? t("common.working")
                  : confirming
                    ? t("transferOwnership.confirmTransfer")
                    : t("transferOwnership.reviewTransfer")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
