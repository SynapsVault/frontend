import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const freighter = vi.hoisted(() => ({
  isConnected: vi.fn(),
  isAllowed: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
}));
vi.mock("@stellar/freighter-api", () => freighter);

import { useWalletConnection } from "./useWalletConnection.js";

const ADDRESS = "GBUYER7Q3XYZ";

describe("useWalletConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.isAllowed.mockResolvedValue({ isAllowed: true });
    freighter.requestAccess.mockResolvedValue({ address: ADDRESS });
    freighter.getAddress.mockResolvedValue({ address: ADDRESS });
  });

  it("starts disconnected when nothing is stored", () => {
    const { result } = renderHook(() => useWalletConnection());
    expect(result.current.status).toBe("disconnected");
  });

  it("connects through requestAccess and remembers the address", async () => {
    const { result } = renderHook(() => useWalletConnection());

    await act(() => result.current.connect());

    expect(freighter.requestAccess).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ status: "connected", address: ADDRESS, error: null });
    expect(localStorage.getItem("synapsvault-wallet")).toBe(ADDRESS);
  });

  it("reports a missing extension instead of silently doing nothing", async () => {
    freighter.isConnected.mockResolvedValue({ isConnected: false });
    const { result } = renderHook(() => useWalletConnection());

    await act(() => result.current.connect());

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/Freighter wallet not found/);
    expect(freighter.requestAccess).not.toHaveBeenCalled();
  });

  it("shows Freighter's own message when the user declines", async () => {
    freighter.requestAccess.mockResolvedValue({ address: "", error: { code: -4, message: "The user rejected this request." } });
    const { result } = renderHook(() => useWalletConnection());

    await act(() => result.current.connect());

    expect(result.current).toMatchObject({ status: "error", error: "The user rejected this request." });
  });

  it("restores a stored session silently when the site is still allowed", async () => {
    localStorage.setItem("synapsvault-wallet", ADDRESS);
    const { result } = renderHook(() => useWalletConnection());

    expect(result.current.status).toBe("restoring");
    await waitFor(() => expect(result.current.status).toBe("connected"));
    expect(result.current.address).toBe(ADDRESS);
    expect(freighter.requestAccess).not.toHaveBeenCalled();
  });

  it("drops a stored session the user has revoked in Freighter", async () => {
    localStorage.setItem("synapsvault-wallet", ADDRESS);
    freighter.isAllowed.mockResolvedValue({ isAllowed: false });
    const { result } = renderHook(() => useWalletConnection());

    await waitFor(() => expect(result.current.status).toBe("disconnected"));
    expect(localStorage.getItem("synapsvault-wallet")).toBeNull();
  });

  it("disconnect forgets the address", async () => {
    const { result } = renderHook(() => useWalletConnection());
    await act(() => result.current.connect());

    act(() => result.current.disconnect());

    expect(result.current).toMatchObject({ status: "disconnected", address: null });
    expect(localStorage.getItem("synapsvault-wallet")).toBeNull();
  });
});
