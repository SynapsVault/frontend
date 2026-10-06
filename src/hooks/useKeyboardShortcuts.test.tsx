import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, render, screen, fireEvent } from "@testing-library/react";
import { useKeyboardShortcuts, type ShortcutMap } from "./useKeyboardShortcuts.js";
import { KeyboardShortcutsHelp } from "../components/KeyboardShortcutsHelp.js";

function press(key: string, init: KeyboardEventInit = {}, target: Element | Window = window) {
  fireEvent.keyDown(target, { key, ...init });
}

describe("useKeyboardShortcuts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("invokes the handler when the matching key is pressed", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ k: { key: "k", handler } }));

    press("k");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("matches letters case-insensitively", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ k: { key: "k", handler } }));

    press("K");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ignores non-matching keys", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ k: { key: "k", handler } }));

    press("j");

    expect(handler).not.toHaveBeenCalled();
  });

  it("requires modifiers to match exactly", () => {
    const plain = vi.fn();
    const withCtrl = vi.fn();
    const shortcuts: ShortcutMap = {
      plain: { key: "s", handler: plain },
      save: { key: "s", ctrlOrMeta: true, handler: withCtrl },
    };
    renderHook(() => useKeyboardShortcuts(shortcuts));

    press("s", { ctrlKey: true });
    expect(withCtrl).toHaveBeenCalledTimes(1);
    expect(plain).not.toHaveBeenCalled();

    press("s", { metaKey: true });
    expect(withCtrl).toHaveBeenCalledTimes(2);

    press("s");
    expect(plain).toHaveBeenCalledTimes(1);
  });

  it("does not fire while typing in an input unless allowInInput is set", () => {
    const blocked = vi.fn();
    const allowed = vi.fn();
    renderHook(() =>
      useKeyboardShortcuts({
        blocked: { key: "/", handler: blocked },
        allowed: { key: "Escape", handler: allowed, allowInInput: true },
      }),
    );
    const input = document.createElement("input");
    document.body.appendChild(input);

    press("/", {}, input);
    press("Escape", {}, input);

    expect(blocked).not.toHaveBeenCalled();
    expect(allowed).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it("calls preventDefault when requested", () => {
    renderHook(() => useKeyboardShortcuts({ s: { key: "/", handler: () => {}, preventDefault: true } }));
    const event = new KeyboardEvent("keydown", { key: "/", cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("uses the latest handler without re-registering", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ handler }) => useKeyboardShortcuts({ k: { key: "k", handler } }), {
      initialProps: { handler: first },
    });

    rerender({ handler: second });
    press("k");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ k: { key: "k", handler } }, false));

    press("k");

    expect(handler).not.toHaveBeenCalled();
  });

  it("removes its listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ k: { key: "k", handler } }));

    unmount();
    press("k");

    expect(handler).not.toHaveBeenCalled();
  });
});

describe("KeyboardShortcutsHelp", () => {
  const shortcuts = [
    { keys: "/", description: "Focus search", group: "Actions" },
    { keys: "Shift + ?", description: "Show help", group: "Help" },
  ];

  it("renders shortcuts grouped under their headings", () => {
    render(<KeyboardShortcutsHelp isOpen onClose={() => {}} shortcuts={shortcuts} />);

    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Actions" })).toBeInTheDocument();
    expect(screen.getByText("Focus search")).toBeInTheDocument();
    expect(screen.getByText("Show help")).toBeInTheDocument();
  });

  it("splits combined keys into separate <kbd> elements", () => {
    render(<KeyboardShortcutsHelp isOpen onClose={() => {}} shortcuts={shortcuts} />);

    expect(screen.getByText("Shift").tagName).toBe("KBD");
    expect(screen.getByText("?").tagName).toBe("KBD");
  });

  it("renders nothing when closed", () => {
    render(<KeyboardShortcutsHelp isOpen={false} onClose={() => {}} shortcuts={shortcuts} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose from the close button", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen onClose={onClose} shortcuts={shortcuts} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsHelp isOpen onClose={onClose} shortcuts={shortcuts} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
