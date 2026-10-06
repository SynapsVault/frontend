import React from "react";

/**
 * Animated placeholder card shown while the resource catalog is loading.
 * Matches the dimensions of a real ResourceCard so the layout doesn't jump.
 */
export function ResourceCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-line bg-surface p-5 shadow-sm"
    >
      {/* Title line */}
      <div className="h-4 w-3/4 animate-pulse rounded bg-line-strong" />
      {/* Subtitle / publisher */}
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-line" />
      {/* Wallet address */}
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-line" />

      {/* Badge row */}
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-line" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-line" />
      </div>

      {/* Price + actions row */}
      <div className="mt-4 flex items-center justify-between">
        <div className="h-4 w-16 animate-pulse rounded bg-line-strong" />
        <div className="h-7 w-20 animate-pulse rounded-lg bg-line" />
      </div>
    </div>
  );
}

/** Renders `count` skeleton cards inside a matching grid. */
export function ResourceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading resources…"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ResourceCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
