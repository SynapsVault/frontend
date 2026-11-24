import React, { useEffect, useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import "../i18n/config.js";

interface ToastProps {
  /** Unique identity for this notification; a new id restarts the dismissal window. */
  id: number | string;
  message: string;
  onDismiss: () => void;
  /** Auto-dismiss delay in milliseconds. */
  duration?: number;
  /** When set, displays a selectable URL below the message (e.g. clipboard fallback). */
  fallbackUrl?: string;
}

/**
 * A transient confirmation toast pinned to the bottom-right of the screen.
 * Auto-dismisses after `duration` ms. When a `fallbackUrl` is provided the
 * toast stays longer and renders the URL in a selectable input so the user
 * can copy it manually.
 */
export function Toast({ id, message, onDismiss, duration = 2500, fallbackUrl }: ToastProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const remainingRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  // Auto-select the fallback URL text on mount so the user can Ctrl+C immediately
  useEffect(() => {
    if (fallbackUrl && inputRef.current) {
      inputRef.current.select();
    }
  }, [fallbackUrl]);

  // Use a longer duration when showing a fallback URL so users have time to copy
  const effectiveDuration = fallbackUrl ? Math.max(duration, 8000) : duration;

  // Reset the remaining time whenever a new notification is shown
  useEffect(() => {
    remainingRef.current = null;
  }, [id]);

  // Auto-dismiss timer; paused while focus is inside the toast
  useEffect(() => {
    if (paused) return;
    const remaining = remainingRef.current ?? effectiveDuration;
    startedAtRef.current = Date.now();
    const timer = setTimeout(onDismiss, remaining);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(0, remaining - (Date.now() - startedAtRef.current));
    };
  }, [id, effectiveDuration, onDismiss, paused]);

  const handleFocus = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
  }, []);

  const handleSelectAll = useCallback(() => {
    inputRef.current?.select();
  }, []);

  return (
    <div
      ref={containerRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="fixed bottom-4 left-4 right-4 z-50 flex max-w-none flex-col gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm dark:bg-gray-100 dark:text-gray-900"
    >
      <span role="status" aria-live="polite">
        {message}
      </span>
      {fallbackUrl && (
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={fallbackUrl}
          onClick={handleSelectAll}
          aria-label={t("toast.resource_url_label")}
          className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-200 outline-none focus:border-accent focus:ring-1 focus:ring-accent dark:border-gray-300 dark:bg-gray-200 dark:text-gray-800"
        />
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("toast.dismiss")}
        className="self-end rounded px-2 py-1 text-xs font-semibold text-gray-300 underline outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-accent dark:text-gray-700 dark:hover:text-gray-900"
      >
        {t("toast.dismiss")}
      </button>
    </div>
  );
}
