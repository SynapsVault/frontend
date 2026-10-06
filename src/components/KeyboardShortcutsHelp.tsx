import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface KeyboardShortcut {
  /** Keys to display, e.g. "/" or "Shift + ?". Split on " + " into separate <kbd>s. */
  keys: string;
  description: string;
  /** Optional heading the shortcut is listed under. */
  group?: string;
}

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function groupShortcuts(shortcuts: KeyboardShortcut[]): [string, KeyboardShortcut[]][] {
  const groups = new Map<string, KeyboardShortcut[]>();
  for (const shortcut of shortcuts) {
    const key = shortcut.group ?? "";
    groups.set(key, [...(groups.get(key) ?? []), shortcut]);
  }
  return [...groups.entries()];
}

/** Modal listing the app's keyboard shortcuts. Traps focus and closes on Escape. */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="synapse-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-help-title"
        aria-describedby="keyboard-shortcuts-help-description"
        tabIndex={-1}
        className="synapse-modal outline-none"
      >
        <div className="synapse-modal__header">
          <h2 id="keyboard-shortcuts-help-title" className="synapse-modal__title">
            {t("shortcuts.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("shortcuts.close")}
            className="synapse-icon-btn"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="synapse-modal__body">
          <p id="keyboard-shortcuts-help-description" className="text-sm text-fg-muted">
            {t("shortcuts.description")}
          </p>

          {groupShortcuts(shortcuts).map(([group, items]) => (
            <section key={group || "default"} className="flex flex-col gap-1">
              {group && <h3 className="synapse-nav-label px-0">{group}</h3>}
              <ul className="flex flex-col">
                {items.map((shortcut) => (
                  <li
                    key={`${shortcut.keys}-${shortcut.description}`}
                    className="flex items-center justify-between gap-4 border-b border-line py-2 text-sm last:border-b-0"
                  >
                    <span>{shortcut.description}</span>
                    <span className="flex shrink-0 gap-1">
                      {shortcut.keys.split(" + ").map((key) => (
                        <kbd key={key} className="synapse-kbd">
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
