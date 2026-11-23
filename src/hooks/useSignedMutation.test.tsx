import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSignedMutation } from "./useSignedMutation.js";
import { signWithFreighter } from "../lib/freighter.js";
import { checkNetwork } from "./useNetworkCheck.js";

vi.mock("../lib/freighter.js", () => ({
  signWithFreighter: vi.fn(),
}));

vi.mock("./useNetworkCheck.js", () => ({
  checkNetwork: vi.fn(),
}));

const mockedSignWithFreighter = vi.mocked(signWithFreighter);
const mockedCheckNetwork = vi.mocked(checkNetwork);

const PREPARED = {
  unsignedXdr: "prepared-xdr",
  networkPassphrase: "testnet-pass",
};
const SIGNED_XDR = "signed-xdr";
const PARAMS = "price-param";

describe("useSignedMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCheckNetwork.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("completes a successful prepare/sign/submit flow with a shared idempotency key", async () => {
    const prepare = vi.fn().mockResolvedValue(PREPARED);
    const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
    mockedSignWithFreighter.mockResolvedValue(SIGNED_XDR);

    const { result } = renderHook(() =>
      useSignedMutation<string, { hash: string }>({ prepare, submit }),
    );

    expect(result.current.status).toBe("idle");

    await act(async () => {
      await result.current.execute(PARAMS);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("confirmed");
    });

    expect(result.current.result).toEqual({ hash: "tx-hash" });
    expect(result.current.error).toBeNull();
    expect(result.current.networkWarning).toBeNull();

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith(PARAMS, expect.any(String));
    expect(mockedCheckNetwork).toHaveBeenCalledWith("testnet-pass");
    expect(mockedSignWithFreighter).toHaveBeenCalledTimes(1);
    expect(mockedSignWithFreighter).toHaveBeenCalledWith(
      "prepared-xdr",
      "testnet-pass",
    );
    expect(submit).toHaveBeenCalledTimes(1);

    const prepareKey = prepare.mock.calls[0][1];
    const submitArgs = submit.mock.calls[0];
    expect(submitArgs[0]).toBe(PARAMS);
    expect(submitArgs[1]).toBe(SIGNED_XDR);
    expect(submitArgs[2]).toBe(prepareKey);
  });

  it("ignores concurrent execute calls while an operation is in flight and allows a subsequent execution after completion", async () => {
    let resolvePrepare!: (value: typeof PREPARED) => void;
    const prepare = vi.fn().mockImplementation(
      () =>
        new Promise<typeof PREPARED>((resolve) => {
          resolvePrepare = resolve;
        }),
    );
    const submit = vi.fn().mockResolvedValue({ hash: "tx-hash-1" });
    mockedSignWithFreighter.mockResolvedValue(SIGNED_XDR);

    const { result } = renderHook(() =>
      useSignedMutation<string, { hash: string }>({ prepare, submit }),
    );

    let firstPromise!: Promise<void>;
    let duplicatePromise!: Promise<void>;
    act(() => {
      firstPromise = result.current.execute("first-param");
      duplicatePromise = result.current.execute("duplicate-param");
    });

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith("first-param", expect.any(String));

    await act(async () => {
      resolvePrepare(PREPARED);
      await Promise.all([firstPromise, duplicatePromise]);
    });

    expect(result.current.status).toBe("confirmed");
    expect(result.current.result).toEqual({ hash: "tx-hash-1" });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(mockedSignWithFreighter).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);

    // Subsequent execution after completion succeeds normally
    prepare.mockResolvedValueOnce(PREPARED);
    submit.mockResolvedValueOnce({ hash: "tx-hash-2" });

    await act(async () => {
      await result.current.execute("second-param");
    });

    expect(result.current.status).toBe("confirmed");
    expect(result.current.result).toEqual({ hash: "tx-hash-2" });
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(prepare).toHaveBeenLastCalledWith("second-param", expect.any(String));
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("uses fallback idempotency key when crypto.randomUUID is unavailable", async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {});

    try {
      const prepare = vi.fn().mockResolvedValue(PREPARED);
      const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
      mockedSignWithFreighter.mockResolvedValue(SIGNED_XDR);

      const { result } = renderHook(() =>
        useSignedMutation<string, { hash: string }>({ prepare, submit }),
      );

      await act(async () => {
        await result.current.execute(PARAMS);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("confirmed");
      });

      const key = prepare.mock.calls[0][1];
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
      expect(submit.mock.calls[0][2]).toBe(key);
    } finally {
      vi.stubGlobal("crypto", originalCrypto);
    }
  });

  it("sets error state without calling prepare when idempotency key generation throws", async () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => {
      throw new Error("entropy source unavailable");
    });

    const prepare = vi.fn().mockResolvedValue(PREPARED);
    const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });

    const { result } = renderHook(() =>
      useSignedMutation<string, { hash: string }>({ prepare, submit }),
    );

    await act(async () => {
      await result.current.execute(PARAMS);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.error).toBe("entropy source unavailable");
    expect(result.current.result).toBeNull();
    expect(prepare).not.toHaveBeenCalled();
    expect(mockedSignWithFreighter).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("warns and skips signing on network mismatch, then completes on a corrected retry", async () => {
    const warning =
      "Network mismatch: your wallet is on a different network. Switch Freighter to Stellar Testnet before signing.";
    mockedCheckNetwork.mockResolvedValueOnce(warning);

    const prepare = vi.fn().mockResolvedValue(PREPARED);
    const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
    mockedSignWithFreighter.mockResolvedValue(SIGNED_XDR);

    const { result } = renderHook(() =>
      useSignedMutation<string, { hash: string }>({ prepare, submit }),
    );

    // First attempt: wallet on the wrong network.
    await act(async () => {
      await result.current.execute(PARAMS);
    });

    await waitFor(() => {
      expect(result.current.networkWarning).toBe(warning);
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(mockedSignWithFreighter).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();

    // Second attempt: user switched networks; warning clears and flow completes.
    await act(async () => {
      await result.current.execute(PARAMS);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("confirmed");
    });

    expect(result.current.networkWarning).toBeNull();
    expect(result.current.result).toEqual({ hash: "tx-hash" });
    expect(mockedCheckNetwork).toHaveBeenCalledTimes(2);
    expect(mockedSignWithFreighter).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  describe("rejection boundaries", () => {
    it.each([
      {
        name: "prepare rejects",
        setup: () => {
          const prepare = vi
            .fn()
            .mockRejectedValue(new Error("prepare failed"));
          const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
          return { prepare, submit };
        },
        expectedMessage: "prepare failed",
      },
      {
        name: "signing rejects",
        setup: () => {
          const prepare = vi.fn().mockResolvedValue(PREPARED);
          const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
          mockedSignWithFreighter.mockRejectedValue(
            new Error("signing failed"),
          );
          return { prepare, submit };
        },
        expectedMessage: "signing failed",
      },
      {
        name: "submit rejects",
        setup: () => {
          const prepare = vi.fn().mockResolvedValue(PREPARED);
          const submit = vi.fn().mockRejectedValue(new Error("submit failed"));
          mockedSignWithFreighter.mockResolvedValue(SIGNED_XDR);
          return { prepare, submit };
        },
        expectedMessage: "submit failed",
      },
    ])("sets error state when $name", async ({ setup, expectedMessage }) => {
      const { prepare, submit } = setup();

      const { result } = renderHook(() =>
        useSignedMutation<string, { hash: string }>({ prepare, submit }),
      );

      await act(async () => {
        await result.current.execute(PARAMS);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
      });

      expect(result.current.error).toBe(expectedMessage);
      expect(result.current.result).toBeNull();

      if (expectedMessage === "prepare failed") {
        expect(mockedCheckNetwork).not.toHaveBeenCalled();
        expect(mockedSignWithFreighter).not.toHaveBeenCalled();
        expect(submit).not.toHaveBeenCalled();
      }

      if (expectedMessage === "signing failed") {
        expect(prepare).toHaveBeenCalledTimes(1);
        expect(mockedSignWithFreighter).toHaveBeenCalledTimes(1);
        expect(submit).not.toHaveBeenCalled();
      }

      if (expectedMessage === "submit failed") {
        expect(prepare).toHaveBeenCalledTimes(1);
        expect(mockedSignWithFreighter).toHaveBeenCalledTimes(1);
        expect(submit).toHaveBeenCalledTimes(1);
      }
    });
  });

  it("uses fallback idempotency key when crypto.randomUUID is unavailable", async () => {
    const originalCrypto = globalThis.crypto;
    vi.stubGlobal("crypto", {});

    try {
      const prepare = vi.fn().mockResolvedValue(PREPARED);
      const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });
      mockedSignWithFreighter.mockResolvedValue(SIGNED_XDR);

      const { result } = renderHook(() =>
        useSignedMutation<string, { hash: string }>({ prepare, submit }),
      );

      await act(async () => {
        await result.current.execute(PARAMS);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("confirmed");
      });

      const key = prepare.mock.calls[0][1];
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
      expect(submit.mock.calls[0][2]).toBe(key);
    } finally {
      vi.stubGlobal("crypto", originalCrypto);
    }
  });

  it("sets error state without calling prepare when idempotency key generation throws", async () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => {
      throw new Error("entropy source unavailable");
    });

    const prepare = vi.fn().mockResolvedValue(PREPARED);
    const submit = vi.fn().mockResolvedValue({ hash: "tx-hash" });

    const { result } = renderHook(() =>
      useSignedMutation<string, { hash: string }>({ prepare, submit }),
    );

    await act(async () => {
      await result.current.execute(PARAMS);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.error).toBe("entropy source unavailable");
    expect(result.current.result).toBeNull();
    expect(prepare).not.toHaveBeenCalled();
    expect(mockedSignWithFreighter).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});
});
