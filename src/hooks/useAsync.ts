import { useCallback, useEffect, useState, useRef } from "react";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
  /** Re-run the async function manually (e.g. on a retry button). */
  retry: () => void;
}

/**
 * Runs an async function and tracks its loading / success / error state.
 *
 * @param fn   Async function to execute. Receives an AbortSignal so it can
 *             cancel in-flight requests when the component unmounts or the
 *             dependency list changes.
 * @param deps Dependency array — same semantics as useEffect.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
): AsyncState<T> {
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");
    setError(null);

    fn(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setStatus("success");
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong while loading data. Check your connection and try again.";
        setError(message);
        setStatus("error");
      });

    return () => {
      // retry() replaces the controller without rerunning the effect. Cleanup
      // must therefore cancel whichever request is current at unmount.
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
    // `deps` is the caller's dependency list, forwarded like useEffect's.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  useEffect(() => {
    return run();
  }, [run]);

  const retry = useCallback(() => {
    run();
  }, [run]);

  return { status, data, error, retry };
}
