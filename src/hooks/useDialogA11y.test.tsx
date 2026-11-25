import { useRef, useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useDialogA11y } from './useDialogA11y';

afterEach(() => {
  cleanup();
});

interface FixtureProps {
  initialOpen?: boolean;
  canClose?: boolean;
  onClose?: () => void;
  withControls?: boolean;
  withHiddenAndInertControls?: boolean;
  onlyHiddenAndInertControls?: boolean;
}

function DialogFixture({
  initialOpen = false,
  canClose = true,
  onClose,
  withControls = true,
  withHiddenAndInertControls = false,
  onlyHiddenAndInertControls = false,
}: FixtureProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const dialogRef = useDialogA11y<HTMLDivElement>({
    isOpen,
    onClose: () => {
      onClose?.();
      setIsOpen(false);
    },
    canClose: () => canClose,
  });

  return (
    <div>
      <button ref={triggerRef} onClick={() => setIsOpen(true)}>
        Open dialog
      </button>
      {isOpen && (
        <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}>
          <h2>Dialog title</h2>
          {onlyHiddenAndInertControls ? (
            <>
              <input type="hidden" name="secret" value="1" />
              <div hidden>
                <button>Hidden control</button>
              </div>
              <div ref={(element) => element?.setAttribute("inert", "")}>
                <button>Inert control</button>
              </div>
            </>
          ) : (
            withControls && (
              <>
                {withHiddenAndInertControls && (
                  <>
                    <input type="hidden" name="leading-hidden" value="a" />
                    <div hidden>
                      <button>Hidden before</button>
                    </div>
                  </>
                )}
                <button>First action</button>
                <input aria-label="Text field" />
                <button>Last action</button>
                {withHiddenAndInertControls && (
                  <>
                    <div ref={(element) => element?.setAttribute("inert", "")}>
                      <button>Inert after</button>
                    </div>
                    <input type="hidden" name="trailing-hidden" value="b" />
                  </>
                )}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}

describe('useDialogA11y', () => {
  describe('focus management', () => {
    it('moves focus into the dialog on open', () => {
      render(<DialogFixture />);

      const trigger = screen.getByRole('button', { name: 'Open dialog' });
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      fireEvent.click(trigger);

      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    it('wraps Tab from the last focusable to the first', () => {
      render(<DialogFixture initialOpen />);

      const dialog = screen.getByRole('dialog');
      const last = screen.getByRole('button', { name: 'Last action' });
      last.focus();
      expect(document.activeElement).toBe(last);

      fireEvent.keyDown(dialog, { key: 'Tab' });

      const first = screen.getByRole('button', { name: 'First action' });
      expect(document.activeElement).toBe(first);
    });

    it('wraps Shift+Tab from the first focusable to the last', () => {
      render(<DialogFixture initialOpen />);

      const dialog = screen.getByRole('dialog');
      const first = screen.getByRole('button', { name: 'First action' });
      first.focus();
      expect(document.activeElement).toBe(first);

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

      const last = screen.getByRole('button', { name: 'Last action' });
      expect(document.activeElement).toBe(last);
    });

    it('wraps Shift+Tab from the dialog itself to the last focusable', () => {
      render(<DialogFixture initialOpen />);

      const dialog = screen.getByRole('dialog');
      dialog.focus();
      expect(document.activeElement).toBe(dialog);

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

      const last = screen.getByRole('button', { name: 'Last action' });
      expect(document.activeElement).toBe(last);
    });

    it('keeps focus on the dialog when there are no focusable controls', () => {
      render(<DialogFixture initialOpen withControls={false} />);

      const dialog = screen.getByRole('dialog');
      dialog.focus();
      expect(document.activeElement).toBe(dialog);

      fireEvent.keyDown(dialog, { key: 'Tab' });
      expect(document.activeElement).toBe(dialog);

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(dialog);
    });

    it('excludes hidden inputs and hidden or inert descendants when cycling focus', () => {
      render(<DialogFixture initialOpen withHiddenAndInertControls />);

      const dialog = screen.getByRole('dialog');
      const first = screen.getByRole('button', { name: 'First action' });
      const last = screen.getByRole('button', { name: 'Last action' });

      last.focus();
      fireEvent.keyDown(dialog, { key: 'Tab' });
      expect(document.activeElement).toBe(first);

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(last);
    });

    it('preserves the no-controls fallback when all controls are hidden or inert', () => {
      render(<DialogFixture initialOpen onlyHiddenAndInertControls />);

      const dialog = screen.getByRole('dialog');
      dialog.focus();
      expect(document.activeElement).toBe(dialog);

      fireEvent.keyDown(dialog, { key: 'Tab' });
      expect(document.activeElement).toBe(dialog);

      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(dialog);
    });

    it('restores focus to the trigger after close', () => {
      render(<DialogFixture />);

      const trigger = screen.getByRole('button', { name: 'Open dialog' });
      trigger.focus();
      fireEvent.click(trigger);

      expect(screen.getByRole('dialog')).toBeTruthy();

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  describe('dismissal gating', () => {
    it('blocks Escape when canClose is false', () => {
      const onClose = vi.fn();
      render(<DialogFixture initialOpen canClose={false} onClose={onClose} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('allows Escape to dismiss once canClose becomes true', () => {
      const onClose = vi.fn();
      const { rerender } = render(
        <DialogFixture initialOpen canClose={false} onClose={onClose} />,
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();

      rerender(<DialogFixture initialOpen canClose onClose={onClose} />);

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('uses the latest onClose callback after a rerender', () => {
      const firstOnClose = vi.fn();
      const secondOnClose = vi.fn();

      const { rerender } = render(
        <DialogFixture initialOpen onClose={firstOnClose} />,
      );

      rerender(<DialogFixture initialOpen onClose={secondOnClose} />);

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(firstOnClose).not.toHaveBeenCalled();
      expect(secondOnClose).toHaveBeenCalledTimes(1);
    });

    it('installs no active trap when isOpen is false', () => {
      const onClose = vi.fn();
      render(<DialogFixture initialOpen={false} onClose={onClose} />);

      expect(screen.queryByRole('dialog')).toBeNull();

      fireEvent.keyDown(document, { key: 'Escape' });
      fireEvent.keyDown(document.body, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});