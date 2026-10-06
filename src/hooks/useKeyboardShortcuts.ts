import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutDefinition {
  /** The key to listen for (e.g. '/', 'f', 'b', 'Escape', '?'). */
  key: string;
  /** Handler invoked when the shortcut is triggered. */
  handler: (event: KeyboardEvent) => void;
  /** Require Ctrl (or Cmd on macOS) to be held. */
  ctrlOrMeta?: boolean;
  /** Require Shift to be held. */
  shift?: boolean;
  /** Require Alt to be held. */
  alt?: boolean;
  /** Allow the shortcut to fire even while typing in an input/textarea/contenteditable. */
  allowInInput?: boolean;
  /** Prevent the default browser behavior when the shortcut fires. */
  preventDefault?: boolean;
}

export type ShortcutMap = Record<string, ShortcutDefinition>;

const isEditableElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  // Check ancestors for contenteditable regions.
  let element: HTMLElement | null = target;
  while (element) {
    if (element.isContentEditable) {
      return true;
    }
    element = element.parentElement;
  }

  return false;
};

const normalizeKey = (key: string): string => {
  if (key === ' ') {
    return 'Space';
  }
  return key.length === 1 ? key.toLowerCase() : key;
};

/**
 * Registers global keyboard shortcuts.
 *
 * @param shortcuts A map of shortcut definitions keyed by an arbitrary id.
 * @param enabled Whether the shortcuts are currently active. Defaults to true.
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  enabled: boolean = true,
): void {
  // Keep the latest shortcuts in a ref so the listener doesn't need to be
  // re-registered on every render.
  const shortcutsRef = useRef<ShortcutMap>(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const definitions = Object.values(shortcutsRef.current);
    const eventKey = normalizeKey(event.key);
    const editable = isEditableElement(event.target);

    for (const definition of definitions) {
      const definitionKey = normalizeKey(definition.key);

      if (definitionKey !== eventKey) {
        continue;
      }

      const requiresCtrlOrMeta = definition.ctrlOrMeta ?? false;
      const requiresShift = definition.shift ?? false;
      const requiresAlt = definition.alt ?? false;

      const hasCtrlOrMeta = event.ctrlKey || event.metaKey;
      const hasShift = event.shiftKey;
      const hasAlt = event.altKey;

      if (requiresCtrlOrMeta !== hasCtrlOrMeta) {
        continue;
      }
      if (requiresShift !== hasShift) {
        continue;
      }
      if (requiresAlt !== hasAlt) {
        continue;
      }

      if (editable && !definition.allowInInput) {
        continue;
      }

      if (definition.preventDefault) {
        event.preventDefault();
      }

      definition.handler(event);
      return;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

export default useKeyboardShortcuts;