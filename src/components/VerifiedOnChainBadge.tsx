import React from "react";

interface Props {
  onchainStatus: "none" | "pending" | "registered" | "failed";
  className?: string;
}

const STATUS_CONFIG = {
  none: {
    label: "Not on-chain",
    className: "bg-surface-hover text-fg-muted border-line",
    icon: "○",
  },
  pending: {
    label: "Registration pending",
    className: "bg-warning-soft text-warning border-warning/30",
    icon: "⏳",
  },
  registered: {
    label: "Verified on-chain",
    className: "bg-success-soft text-success border-success/30",
    icon: "✓",
  },
  failed: {
    label: "Registration failed",
    className: "bg-danger-soft text-danger border-danger/30",
    icon: "✗",
  },
} as const;

export function VerifiedOnChainBadge({ onchainStatus, className = "" }: Props) {
  const config = STATUS_CONFIG[onchainStatus];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${config.className} ${className}`}
      title={config.label}
    >
      <span className="text-sm">{config.icon}</span>
      {config.label}
    </span>
  );
}
