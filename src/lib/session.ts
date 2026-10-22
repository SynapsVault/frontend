import { setTokenProvider } from '../api/http.js';

type Subscriber<T> = (value: T) => void;
interface Readable<T> { subscribe: (subscriber: Subscriber<T>) => () => void }
function writable<T>(initial: T) {
  let value = initial;
  const subscribers = new Set<Subscriber<T>>();
  return {
    set(next: T) { value = next; subscribers.forEach((subscriber) => subscriber(value)); },
    subscribe(subscriber: Subscriber<T>) {
      subscribers.add(subscriber);
      subscriber(value);
      return () => { subscribers.delete(subscriber); };
    },
  };
}

const SESSION_STORAGE_KEY = 'session_token';

export interface SessionToken {
  token: string;
  expiresAt: number;
}

export interface AuthState {
  authenticated: boolean;
  token: string | null;
  expiresAt: number | null;
}

let currentSession: SessionToken | null = null;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

const authStore = writable<AuthState>({
  authenticated: false,
  token: null,
  expiresAt: null,
});

function isExpired(session: SessionToken): boolean {
  return !Number.isFinite(session.expiresAt) || Date.now() >= session.expiresAt;
}

function persistSession(session: SessionToken | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (e.g. quota, privacy mode).
  }
}

function loadPersistedSession(): SessionToken | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionToken;
    if (
      !parsed ||
      typeof parsed.token !== 'string' ||
      !parsed.token.trim() ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    if (isExpired(parsed)) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function syncStore(): void {
  if (currentSession && !isExpired(currentSession)) {
    authStore.set({
      authenticated: true,
      token: currentSession.token,
      expiresAt: currentSession.expiresAt,
    });
  } else {
    authStore.set({
      authenticated: false,
      token: null,
      expiresAt: null,
    });
  }
}

export function getSessionToken(): string | null {
  if (!currentSession) return null;
  if (isExpired(currentSession)) {
    clearSession();
    return null;
  }
  return currentSession.token;
}

export function setSession(session: SessionToken): void {
  if (!session.token.trim() || isExpired(session)) throw new SessionAuthError("Invalid or expired session");
  if (expiryTimer) clearTimeout(expiryTimer);
  currentSession = session;
  persistSession(session);
  syncStore();
  expiryTimer = setTimeout(clearSession, Math.min(session.expiresAt - Date.now(), 2_147_483_647));
}

export function clearSession(): void {
  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = undefined;
  currentSession = null;
  persistSession(null);
  syncStore();
}

export function isAuthenticated(): boolean {
  return getSessionToken() !== null;
}

export const authState: Readable<AuthState> = {
  subscribe: authStore.subscribe,
};

export interface ChallengeResponse {
  challenge: string;
  expiresAt: number;
}

export interface SessionExchangeRequest {
  address: string;
  challenge: string;
  signature: string;
}

export interface SessionExchangeResponse {
  token: string;
  expiresAt: number;
}

export interface SessionApi {
  requestChallenge(address: string): Promise<ChallengeResponse>;
  exchangeSignature(
    request: SessionExchangeRequest
  ): Promise<SessionExchangeResponse>;
}

export class SessionAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionAuthError';
  }
}

export async function authenticateWithWallet(
  address: string,
  signChallenge: (challenge: string) => Promise<string>,
  api: SessionApi
): Promise<SessionToken> {
  const challengeResponse = await api.requestChallenge(address);
  if (!challengeResponse?.challenge || !Number.isFinite(challengeResponse.expiresAt) || challengeResponse.expiresAt <= Date.now()) {
    throw new SessionAuthError('Failed to obtain authentication challenge');
  }

  const signature = await signChallenge(challengeResponse.challenge);
  if (!signature) {
    throw new SessionAuthError('Wallet signature was rejected');
  }

  const exchangeResponse = await api.exchangeSignature({
    address,
    challenge: challengeResponse.challenge,
    signature,
  });

  if (
    !exchangeResponse ||
    typeof exchangeResponse.token !== 'string' ||
    typeof exchangeResponse.expiresAt !== 'number'
  ) {
    throw new SessionAuthError('Invalid session response from server');
  }

  const session: SessionToken = {
    token: exchangeResponse.token,
    expiresAt: exchangeResponse.expiresAt,
  };

  setSession(session);
  return session;
}

// Restore any persisted session on module load.
currentSession = loadPersistedSession();
if (currentSession) setSession(currentSession);
else syncStore();

setTokenProvider(getSessionToken);
