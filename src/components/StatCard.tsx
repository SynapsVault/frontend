import React from "react";
import i18n from "../i18n/config.js";

export type StatTone = "default" | "accent" | "success" | "danger" | "warning";

// Full class names so Tailwind's content scan keeps them (see DESIGN_SYSTEM.md).
const VALUE_CLASS: Record<StatTone, string> = {
  default: "text-fg",
  accent: "text-accent-text",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

const BAR_CLASS: Record<StatTone, string> = {
  default: "bg-fg-muted",
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
};

interface Props {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  tone?: StatTone;
  /** 0–1. Renders a thin progress bar in the tone color. */
  progress?: number;
}

/** Summary metric card: label, large value, optional unit, note and progress bar. */
export function StatCard({ label, value, unit, note, tone = "default", progress }: Props) {
  const pct = progress === undefined ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`font-display text-2xl font-semibold tabular-nums ${VALUE_CLASS[tone]}`}>{value}</span>
        {unit && <span className="text-xs font-medium text-fg-subtle">{unit}</span>}
      </p>
      {pct !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
          <div className={`h-full rounded-full ${BAR_CLASS[tone]}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {note && <p className="mt-2 text-xs text-fg-subtle">{note}</p>}
    </div>
  );
}

/** 1832 → "1,832" (in en) or locale-formatted equivalent. */
export function formatCount(n: number, locale: string = i18n.language || "en-US"): string {
  return n.toLocaleString(locale);
}

/** Relative time localized via i18n, then a locale-formatted date after a week. */
export function timeAgo(iso: string, now: number = Date.now(), locale: string = i18n.language || "en"): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return i18n.t("time.just_now", { lng: locale });
  if (minutes < 60) return i18n.t("time.minutes_ago", { count: minutes, lng: locale });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t("time.hours_ago", { count: hours, lng: locale });
  const days = Math.floor(hours / 24);
  if (days < 7) return i18n.t("time.days_ago", { count: days, lng: locale });
  return new Date(then).toLocaleDateString(locale);
}

/**
 * Sums USDC amount strings without float drift (Stellar uses 7 decimals) and
 * pads to two places: ["1.5", "0.25"] → "1.75".
 */
export function sumUsdc(amounts: string[]): string {
  const STROOPS = 10_000_000;
  const total = amounts.reduce((sum, a) => {
    const n = Number.parseFloat(a);
    return Number.isFinite(n) ? sum + Math.round(n * STROOPS) : sum;
  }, 0);
  const [whole, frac] = (total / STROOPS).toFixed(7).split(".");
  return `${whole}.${frac.replace(/0+$/, "").padEnd(2, "0")}`;
}
