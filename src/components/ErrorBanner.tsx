import React from "react";

interface Props {
  message: string;
  hint?: string;
  onRetry?: () => void;
}

/**
 * Full-width error banner with an optional retry button.
 * Used wherever an async fetch fails.
 */
export function ErrorBanner({ message, hint, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-6 py-10 text-center"
    >
      {/* Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 text-danger"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>

      <p className="text-sm font-medium text-danger">{message}</p>

      {hint && (
        <p className="text-xs text-danger">{hint}</p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="synapse-btn synapse-btn--danger synapse-btn--sm mt-1"
        >
          Try again
        </button>
      )}
    </div>
  );
}