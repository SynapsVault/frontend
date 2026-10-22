import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { publishLinkResource, publishFileResource } from "../api/resources.js";
import { useDialogA11y } from "../hooks/useDialogA11y.js";

interface Props {
  apiKey: string;
  onClose: () => void;
  onPublished: () => void;
}

type PublishType = "link" | "file";
type Step = "form" | "submitting" | "success" | "error";

export function isValidHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export function PublishModal({ apiKey, onClose, onPublished }: Props) {
  const { t } = useTranslation();
  const [publishType, setPublishType] = useState<PublishType>("link");
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim() || !/^\d+(\.\d{1,7})?$/.test(price) || Number(price) <= 0) {
      setErrorMsg("Enter a title and a positive price with up to 7 decimal places.");
      setStep("error");
      return;
    }
    const idempotencyKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (publishType === "link" && !isValidHttpUrl(externalUrl)) {
      setErrorMsg(t("publish.invalid_url"));
      setStep("error");
      return;
    }

    setStep("submitting");

    try {
      if (publishType === "link") {
        await publishLinkResource(
          { title, description: description || undefined, price, externalUrl },
          apiKey,
          undefined,
          idempotencyKey,
        );
      } else {
        if (!file) throw new Error(t("publish.file_required"));
        const formData = new FormData();
        formData.append("title", title);
        if (description) formData.append("description", description);
        formData.append("price", price);
        formData.append("file", file);
        await publishFileResource(formData, apiKey, undefined, idempotencyKey);
      }
      setStep("success");
      onPublished();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : t("publish.generic_error"),
      );
      setStep("error");
    }
  }

  if (step === "success") {
    return (
      <Overlay onClose={onClose} labelledBy="publish-success-title">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft">
            <svg
              className="h-6 w-6 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 id="publish-success-title" className="text-lg font-semibold text-fg">
            {t("publish.success_title")}
          </h3>
          <p className="mt-2 text-sm text-fg-muted">
            {t("publish.success_description")}
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            {t("publish.done")}
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose} labelledBy="publish-title" canClose={() => step !== "submitting"}>
      <h2 id="publish-title" className="mb-4 text-lg font-semibold text-fg">
        {t("publish.title")}
      </h2>

      {/* Type toggle */}
      <div className="mb-4 flex gap-2">
        <TypeButton active={publishType === "link"} onClick={() => setPublishType("link")}>
          {t("publish.link")}
        </TypeButton>
        <TypeButton active={publishType === "file"} onClick={() => setPublishType("file")}>
          {t("publish.file_upload")}
        </TypeButton>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <Field label={t("publish.title_field")} required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="synapse-input"
            placeholder={t("publish.title_placeholder")}
          />
        </Field>

        <Field label={t("publish.description_field")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="synapse-input"
            placeholder={t("publish.description_placeholder")}
          />
        </Field>

        <Field label={t("publish.price_field")} required>
          <input
            type="text"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            pattern="^\d+(\.\d+)?$"
            className="synapse-input"
            placeholder={t("publish.price_placeholder")}
          />
        </Field>

        {publishType === "link" ? (
          <Field label={t("publish.external_url_field")} required>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              required
              className="synapse-input"
              placeholder={t("publish.external_url_placeholder")}
            />
          </Field>
        ) : (
          <Field label={t("publish.file_field")} required>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className="w-full text-sm text-fg-muted file:mr-4 file:rounded-lg file:border-0 file:bg-accent-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-text hover:file:bg-accent/15"
            />
          </Field>
        )}

        {step === "error" && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
            {errorMsg}{" "}
            <button
              type="button"
              onClick={() => setStep("form")}
              className="font-medium underline hover:no-underline"
            >
              {t("publish.try_again")}
            </button>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-line-strong px-4 py-3 text-sm font-medium text-fg hover:bg-surface-hover sm:w-auto sm:py-2"
          >
            {t("publish.cancel")}
          </button>
          <button
            type="submit"
            disabled={step === "submitting"}
            className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 sm:w-auto sm:py-2"
          >
            {step === "submitting" ? t("publish.submitting") : t("publish.submit")}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function Overlay({
  children,
  onClose,
  labelledBy,
  canClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
  labelledBy: string;
  canClose?: () => boolean;
}) {
  const { t } = useTranslation();
  const dialogRef = useDialogA11y<HTMLDivElement>({ onClose, canClose });

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="relative w-full max-w-none overflow-y-auto rounded-none bg-surface-raised p-4 shadow-xl outline-none sm:max-w-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => { if (!canClose || canClose()) onClose(); }}
          className="absolute right-4 top-4 text-fg-subtle hover:text-fg"
          aria-label={t("publish.close")}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "bg-surface-hover text-fg hover:bg-line"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-fg">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}
