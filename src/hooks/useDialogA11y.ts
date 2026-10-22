import { useEffect, useRef, type RefObject } from "react";

/** Elements that can receive keyboard focus inside a dialog. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseDialogA11yOptions {
  /** Close callback fired on Escape or backdrop dismissal. */
  onClose: () => void;
  /**
   * Return false to block Escape (e.g. while a payment/submit is in flight).
   * Defaults to always allowing dismissal.
   */
  canClose?: () => boolean;
  /** When false the trap is disabled. Defaults to true. */
  isOpen?: boolean;
}

/**
 * Shared dialog accessibility behaviour, extracted from KeyboardShortcutsHelp.
 *
 * Moves focus into the dialog on open, keeps Tab focus inside it, closes on
 * Escape and restores focus to the previously focused element on unmount.
 * Consumers should spread the returned ref onto the element that carries
 * `role="dialog" aria-modal="true"` and `tabIndex={-1}`.
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>({
  onClose,
  canClose,
  isOpen = true,
}: UseDialogA11yOptions): RefObject<T> {
  const dialogRef = useRef<T>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);

  useEffect(() => {
    onCloseRef.current = onClose;
    canCloseRef.current = canClose;
  }, [onClose, canClose]);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (canCloseRef.current && !canCloseRef.current()) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === "Tab" && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === dialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen]);

  return dialogRef;
}
