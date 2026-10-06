interface Props {
  syncedAt: Date | null;
}

/** Shown when the catalog is served from cache (offline or network failure). */
export function CatalogStaleBanner({ syncedAt }: Props) {
  const label = syncedAt
    ? `Showing cached catalog from ${syncedAt.toLocaleString()}. Connect to refresh.`
    : "Showing cached catalog. Connect to refresh.";

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
    >
      <span className="font-medium">Offline — catalog may be outdated.</span> {label}
    </div>
  );
}
