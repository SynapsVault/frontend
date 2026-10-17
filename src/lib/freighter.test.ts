import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FREIGHTER_INSTALL_URL,
  freighterErrorMessage,
  isFreighterInstalled,
  signWithFreighter,
} from './freighter';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  signTransaction: vi.fn(),
}));

describe('freighter.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('FREIGHTER_INSTALL_URL', () => {
    it('points to https://freighter.app', () => {
      expect(FREIGHTER_INSTALL_URL).toBe('https://freighter.app');
    });
  });

  describe('freighterErrorMessage', () => {
    it('returns trimmed string error if provided', () => {
      expect(freighterErrorMessage('  User denied transaction  ', 'Fallback')).toBe('User denied transaction');
    });

    it('returns error.message if present and non-empty', () => {
      expect(freighterErrorMessage({ message: '  Wallet locked  ' }, 'Fallback')).toBe('Wallet locked');
    });

    it('falls back if message is empty string or whitespace', () => {
      expect(freighterErrorMessage({ message: '   ' }, 'Fallback message')).toBe('Fallback message');
    });

    it('falls back if error is null or undefined', () => {
      expect(freighterErrorMessage(null, 'Fallback message')).toBe('Fallback message');
      expect(freighterErrorMessage(undefined, 'Fallback message')).toBe('Fallback message');
    });

    it('falls back if error is an object without message property', () => {
      expect(freighterErrorMessage({ code: 4001 }, 'Fallback message')).toBe('Fallback message');
    });
  });

  describe('isFreighterInstalled', () => {
    it('returns true when isConnected returns isConnected: true without error', async () => {
      const api = await import('@stellar/freighter-api');
      vi.mocked(api.isConnected).mockResolvedValue({ isConnected: true } as any);

      const installed = await isFreighterInstalled();
      expect(installed).toBe(true);
    });

    it('returns false when isConnected returns isConnected: false', async () => {
      const api = await import('@stellar/freighter-api');
      vi.mocked(api.isConnected).mockResolvedValue({ isConnected: false } as any);

      const installed = await isFreighterInstalled();
      expect(installed).toBe(false);
    });

    it('returns false when isConnected returns an error', async () => {
      const api = await import('@stellar/freighter-api');
      vi.mocked(api.isConnected).mockResolvedValue({ error: 'Extension not found', isConnected: true } as any);

      const installed = await isFreighterInstalled();
      expect(installed).toBe(false);
    });

    it('returns false when loadFreighter or isConnected throws', async () => {
      const api = await import('@stellar/freighter-api');
      vi.mocked(api.isConnected).mockRejectedValue(new Error('Connection error'));

      const installed = await isFreighterInstalled();
      expect(installed).toBe(false);
    });
  });

  describe('signWithFreighter', () => {
    it('throws helpful error if Freighter is not installed', async () => {
      const api = await import('@stellar/freighter-api');
      vi.mocked(api.isConnected).mockResolvedValue({ isConnected: false } as any);

      await expect(signWithFreighter('dummy_xdr', 'Test SDF Network ; September 2015')).rejects.toThrow(
        /Freighter wallet not found/i,
      );
    });

    it('throws error when signTransaction returns an error', async () => {
      const api = await import('@stellar/freighter-api');
      vi.mocked(api.isConnected).mockResolvedValue({ isConnected: true } as any);
      vi.mocked(api.signTransaction).mockResolvedValue({ error: { message: 'User rejected' } } as any);

      await expect(signWithFreighter('dummy_xdr', 'Test SDF Network')).rejects.toThrow('User rejected');
    });

    it('throws error when signTransaction returns no signedTxXdr', async () => {
      const api = await import('@stellar/freighter-api');
      vi.mocked(api.isConnected).mockResolvedValue({ isConnected: true } as any);
      vi.mocked(api.signTransaction).mockResolvedValue({ signedTxXdr: '' } as any);

      await expect(signWithFreighter('dummy_xdr', 'Test SDF Network')).rejects.toThrow(
        /No signed transaction returned/i,
      );
    });

    it('returns signedTxXdr on successful signing', async () => {
      const api = await import('@stellar/freighter-api');
      vi.mocked(api.isConnected).mockResolvedValue({ isConnected: true } as any);
      vi.mocked(api.signTransaction).mockResolvedValue({ signedTxXdr: 'AAAA_SIGNED_XDR' } as any);

      const res = await signWithFreighter('dummy_xdr', 'Test SDF Network ; September 2015');
      expect(res).toBe('AAAA_SIGNED_XDR');
      expect(api.signTransaction).toHaveBeenCalledWith('dummy_xdr', {
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
    });
  });
});
