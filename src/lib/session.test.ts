import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateWithWallet, clearSession, getSessionToken, setSession } from "./session.js";

afterEach(() => { clearSession(); vi.useRealTimers(); });

describe("wallet sessions", () => {
  it("expires credentials and clears persisted state", () => {
    vi.useFakeTimers();
    setSession({ token: "session", expiresAt: Date.now() + 1000 });
    expect(getSessionToken()).toBe("session");
    vi.advanceTimersByTime(1000);
    expect(getSessionToken()).toBeNull();
    expect(sessionStorage.getItem("session_token")).toBeNull();
  });

  it("does not sign expired server challenges", async () => {
    const sign = vi.fn();
    const exchangeSignature = vi.fn();
    await expect(authenticateWithWallet("wallet", sign, {
      requestChallenge: async () => ({ challenge: "expired", expiresAt: Date.now() - 1 }),
      exchangeSignature,
    })).rejects.toThrow("challenge");
    expect(sign).not.toHaveBeenCalled();
    expect(exchangeSignature).not.toHaveBeenCalled();
  });

  it("stores the server-issued token after challenge verification", async () => {
    const exchangeSignature = vi.fn().mockResolvedValue({ token: "server-token", expiresAt: Date.now() + 60_000 });
    await authenticateWithWallet("wallet", async () => "wallet-signature", {
      requestChallenge: async () => ({ challenge: "one-use-challenge", expiresAt: Date.now() + 1000 }),
      exchangeSignature,
    });
    expect(exchangeSignature).toHaveBeenCalledWith({ address: "wallet", challenge: "one-use-challenge", signature: "wallet-signature" });
    expect(getSessionToken()).toBe("server-token");
  });

  it("rejects invalid session expiration values", () => {
    expect(() => setSession({ token: "token", expiresAt: NaN })).toThrow("Invalid or expired");
  });
});
