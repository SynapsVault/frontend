import { describe, it, expect } from 'vitest';
import {
  explorerTxUrl,
  explorerAccountUrl,
  explorerContractUrl,
} from './stellarExplorer';

describe('stellarExplorer.ts', () => {
  it('formats transaction URL correctly', () => {
    const txHash = 'abcdef1234567890';
    const url = explorerTxUrl(txHash);
    expect(url).toMatch(/^https:\/\/stellar\.expert\/explorer\/(testnet|public)\/tx\/abcdef1234567890$/);
  });

  it('formats account URL correctly', () => {
    const address = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    const url = explorerAccountUrl(address);
    expect(url).toMatch(/^https:\/\/stellar\.expert\/explorer\/(testnet|public)\/account\/GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5$/);
  });

  it('formats contract URL correctly', () => {
    const contractId = 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75';
    const url = explorerContractUrl(contractId);
    expect(url).toMatch(/^https:\/\/stellar\.expert\/explorer\/(testnet|public)\/contract\/CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75$/);
  });
});
