import React from "react";
import { useTranslation } from "react-i18next";
import "../i18n/config.js";
import { explorerTxUrl, explorerAccountUrl, explorerContractUrl } from "../lib/stellarExplorer.js";

interface Props {
  type: "tx" | "account" | "contract";
  value: string;
  children?: React.ReactNode;
  className?: string;
}

const URL_BUILDERS = {
  tx: explorerTxUrl,
  account: explorerAccountUrl,
  contract: explorerContractUrl,
} as const;

/** Opens the given tx/account/contract on Stellar Explorer in a new tab. */
export function ExplorerLink({ type, value, children, className = "" }: Props) {
  const { t } = useTranslation();
  const href = URL_BUILDERS[type](value);
  const defaultLabel = t("explorer.view_on_explorer");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-accent-text hover:underline ${className}`}
      title={defaultLabel}
    >
      {children ?? defaultLabel}
    </a>
  );
}
