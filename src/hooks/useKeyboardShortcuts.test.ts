import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp';

describe('useKeyboardShortcuts', () => {
  const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
  const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

  beforeEach(() => {
    addEventListenerSpy.mockClear();
    removeEventListenerSpy.mockClear();
  });

  afterAll(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('registers a keydown listener on mount', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'k', handler }])
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });

  it('unregisters the keydown listener on unmount', () => {
    const handler = jest.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([{ key: 'k', handler }])
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });

  it('invokes the handler when the matching key is pressed', () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'k', handler }]));

    act(() => {
      fireEvent.keyDown(document, { key: 'k' });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not invoke the handler for non-matching keys', () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'k', handler }]));

    act(() => {
      fireEvent.keyDown(document, { key: 'j' });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores key presses originating from input fields', () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'k', handler }]));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      fireEvent.keyDown(input, { key: 'k' });
    });

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('ignores key presses originating from textarea fields', () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'k', handler }]));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    act(() => {
      fireEvent.keyDown(textarea, { key: 'k' });
    });

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('supports modifier keys', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'k', ctrlKey: true, handler }])
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not invoke handler when modifier does not match', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'k', ctrlKey: true, handler }])
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'k' });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('handles multiple shortcuts', () => {
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([
        { key: 'a', handler: handlerA },
        { key: 'b', handler: handlerB },
      ])
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'a' });
      fireEvent.keyDown(document, { key: 'b' });
    });

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it('prevents default when preventDefault option is set', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'k', handler, preventDefault: true }])
    );

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      cancelable: true,
      bubbles: true,
    });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      document.dispatchEvent(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('does not invoke handler when disabled', () => {
    const handler = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts([{ key: 'k', handler }], { enabled: false })
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'k' });
    });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('KeyboardShortcutsHelp', () => {
  const shortcuts = [
    { key: 'k', description: 'Open command palette' },
    { key: 's', description: 'Save document' },
  ];

  it('renders the help dialog when open', () => {
    render(
      <KeyboardShortcutsHelp shortcuts={shortcuts} open={true} onClose={() => {}} />
    );

    expect(screen.getByText('Open command palette')).toBeInTheDocument();
    expect(screen.getByText('Save document')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(
      <KeyboardShortcutsHelp shortcuts={shortcuts} open={false} onClose={() => {}} />
    );

    expect(screen.queryByText('Open command palette')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <KeyboardShortcutsHelp shortcuts={shortcuts} open={true} onClose={onClose} />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(
      <KeyboardShortcutsHelp shortcuts={shortcuts} open={true} onClose={onClose} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders each shortcut key and description', () => {
    render(
      <KeyboardShortcutsHelp shortcuts={shortcuts} open={true} onClose={() => {}} />
    );

    expect(screen.getByText('k')).toBeInTheDocument();
    expect(screen.getByText('s')).toBeInTheDocument();
  });
});