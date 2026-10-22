import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchReceipt, receiptUrl } from './payments';

describe('receiptUrl', () => {
  it('constructs a URL for a simple receipt id', () => {
    expect(receiptUrl('abc123')).toBe('/payments/abc123/receipt');
  });

  it('encodes a forward slash in the receipt id', () => {
    expect(receiptUrl('a/b')).toBe('/payments/a%2Fb/receipt');
  });

  it('encodes a question mark in the receipt id', () => {
    expect(receiptUrl('a?b')).toBe('/payments/a%3Fb/receipt');
  });

  it('encodes a hash in the receipt id', () => {
    expect(receiptUrl('a#b')).toBe('/payments/a%23b/receipt');
  });

  it('encodes spaces in the receipt id', () => {
    expect(receiptUrl('a b')).toBe('/payments/a%20b/receipt');
  });

  it('encodes multiple reserved characters in the receipt id', () => {
    expect(receiptUrl('a/b?c#d e')).toBe(
      '/payments/a%2Fb%3Fc%23d%20e/receipt',
    );
  });
});

describe('fetchReceipt', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('requests the encoded URL for a simple receipt id', async () => {
    const mockResponse = new Response(JSON.stringify({ id: 'abc123' }), { headers: { 'content-type': 'application/json' } });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse,
    );

    await fetchReceipt('abc123');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/payments/abc123/receipt', expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('encodes a forward slash in the receipt id', async () => {
    const mockResponse = new Response(JSON.stringify({ id: 'a/b' }), { headers: { 'content-type': 'application/json' } });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse,
    );

    await fetchReceipt('a/b');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/payments/a%2Fb/receipt', expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('encodes a question mark in the receipt id', async () => {
    const mockResponse = new Response(JSON.stringify({ id: 'a?b' }), { headers: { 'content-type': 'application/json' } });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse,
    );

    await fetchReceipt('a?b');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/payments/a%3Fb/receipt', expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('encodes a hash in the receipt id', async () => {
    const mockResponse = new Response(JSON.stringify({ id: 'a#b' }), { headers: { 'content-type': 'application/json' } });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse,
    );

    await fetchReceipt('a#b');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/payments/a%23b/receipt', expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('encodes spaces in the receipt id', async () => {
    const mockResponse = new Response(JSON.stringify({ id: 'a b' }), { headers: { 'content-type': 'application/json' } });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse,
    );

    await fetchReceipt('a b');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/payments/a%20b/receipt', expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('encodes multiple reserved characters in the receipt id', async () => {
    const mockResponse = new Response(JSON.stringify({ id: 'a/b?c#d e' }), { headers: { 'content-type': 'application/json' } });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse,
    );

    await fetchReceipt('a/b?c#d e');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/payments/a%2Fb%3Fc%23d%20e/receipt', expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});