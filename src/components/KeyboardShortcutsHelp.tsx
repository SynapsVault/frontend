import React, { useEffect, useRef } from 'react';

export interface KeyboardShortcut {
  keys: string;
  description: string;
}

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: KeyboardShortcut[];
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { keys: '?', description: 'Show this help dialog' },
  { keys: 'Esc', description: 'Close dialog or cancel current action' },
  { keys: '/', description: 'Focus the search field' },
  { keys: 'Ctrl/Cmd + K', description: 'Open the command palette' },
  { keys: 'Ctrl/Cmd + S', description: 'Save the current item' },
  { keys: 'Ctrl/Cmd + Enter', description: 'Submit the current form' },
  { keys: 'Ctrl/Cmd + Z', description: 'Undo the last action' },
  { keys: 'Ctrl/Cmd + Shift + Z', description: 'Redo the last undone action' },
  { keys: 'Arrow Up / Arrow Down', description: 'Navigate through a list' },
  { keys: 'Enter', description: 'Confirm the selected item' },
];

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts = DEFAULT_SHORTCUTS,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    if (dialog) {
      dialog.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'Tab' && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey) {
          if (active === first || active === dialog) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="keyboard-shortcuts-help__backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-shortcuts-help-title"
        aria-describedby="keyboard-shortcuts-help-description"
        tabIndex={-1}
        className="keyboard-shortcuts-help"
        style={{
          backgroundColor: '#fff',
          color: '#111',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
          outline: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <h2
            id="keyboard-shortcuts-help-title"
            style={{ margin: 0, fontSize: '1.25rem' }}
          >
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
            className="keyboard-shortcuts-help__close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: '4px 8px',
              color: 'inherit',
            }}
          >
            ×
          </button>
        </div>

        <p
          id="keyboard-shortcuts-help-description"
          style={{ marginTop: 0, marginBottom: '16px', fontSize: '0.875rem', color: '#555' }}
        >
          Use these shortcuts to work faster. Press Escape to close this dialog.
        </p>

        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {shortcuts.map((shortcut) => (
            <li
              key={`${shortcut.keys}-${shortcut.description}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <span style={{ fontSize: '0.9375rem' }}>{shortcut.description}</span>
              <kbd
                style={{
                  fontFamily: 'inherit',
                  fontSize: '0.8125rem',
                  backgroundColor: '#f2f2f2',
                  border: '1px solid #ccc',
                  borderBottomWidth: '2px',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {shortcut.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;