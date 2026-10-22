import { AUTH_PROXY_URL } from "../lib/config.js";
import { networkFetch, readJson, hasKeys } from "./http.js";
import type { SessionApi, ChallengeResponse, SessionExchangeResponse } from "../lib/session.js";

async function post<T>(path: string, body: unknown, keys: string[]): Promise<T> {
  if (!AUTH_PROXY_URL) throw new Error("Wallet sign-in is not configured for this site.");
  return readJson<T>(await networkFetch(`${AUTH_PROXY_URL}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), "Sign-in failed", hasKeys(...keys));
}
/** Optional authentication service contract; the marketplace API itself does not issue sessions. */
export const sessionApi: SessionApi = {
  requestChallenge: (address) => post<ChallengeResponse>("/challenge", { address }, ["challenge", "expiresAt"]),
  exchangeSignature: (request) => post<SessionExchangeResponse>("/session", request, ["token", "expiresAt"]),
};
