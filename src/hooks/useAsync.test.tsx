import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAsync } from "./useAsync.js";

describe("useAsync", () => {
  it("aborts the previous request before retrying", () => {
    const signals: AbortSignal[] = [];
    const fn = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string>(() => {});
    });

    const { result } = renderHook(() => useAsync(fn, []));
    expect(fn).toHaveBeenCalledTimes(1);

    act(() => result.current.retry());

    expect(fn).toHaveBeenCalledTimes(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it("aborts a retried request when the component unmounts", () => {
    const signals: AbortSignal[] = [];
    const fn = vi.fn((signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string>(() => {});
    });

    const { result, unmount } = renderHook(() => useAsync(fn, []));
    act(() => result.current.retry());
    const activeSignal = signals[1];

    unmount();

    expect(activeSignal.aborted).toBe(true);
  });
});
