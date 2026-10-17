import { useTranslation } from "react-i18next";
import "../i18n/config.js";

interface Props {
  syncedAt: Date | null;
}

/** Shown when the catalog is served from cache (offline or network failure). */
export function CatalogStaleBanner({ syncedAt }: Props) {
  const { t, i18n } = useTranslation();
  const label = syncedAt
    ? t("catalog.stale_banner_with_time", { time: syncedAt.toLocaleString(i18n.language || undefined) })
    : t("catalog.stale_banner_no_time");

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
    >
      <span className="font-medium">{t("catalog.stale_banner_title")}</span> {label}
    </div>
  );
}
