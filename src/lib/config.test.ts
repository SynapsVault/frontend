import { describe, it, expect } from 'vitest';
import {
  API_BASE,
  STELLAR_NETWORK,
  AUTH_PROXY_URL,
  HAS_AUTH_PROXY,
  describeApiTarget,
  describeAuthTarget,
} from './config';

describe('config.ts', () => {
  it('defines API_BASE without trailing slash', () => {
    expect(API_BASE.endsWith('/')).toBe(false);
  });

  it('resolves STELLAR_NETWORK to either testnet or mainnet', () => {
    expect(['testnet', 'mainnet']).toContain(STELLAR_NETWORK);
  });

  it('defines AUTH_PROXY_URL without trailing slash', () => {
    expect(AUTH_PROXY_URL.endsWith('/')).toBe(false);
  });

  it('sets HAS_AUTH_PROXY consistently with AUTH_PROXY_URL', () => {
    expect(HAS_AUTH_PROXY).toBe(AUTH_PROXY_URL.length > 0);
  });

  it('describes API target accurately', () => {
    const desc = describeApiTarget();
    if (API_BASE) {
      expect(desc).toBe(API_BASE);
    } else {
      expect(desc).toBe('this site (no VITE_API_URL set)');
    }
  });

  it('describes Auth target accurately', () => {
    const desc = describeAuthTarget();
    if (AUTH_PROXY_URL) {
      expect(desc).toBe(AUTH_PROXY_URL);
    } else {
      expect(desc).toBe('this site (no VITE_AUTH_PROXY_URL set)');
    }
  });
});
