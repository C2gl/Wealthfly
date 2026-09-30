import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../src/api';

function jsonResponse(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

describe('api.triggerSync', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('reports an in-progress sync (409) as data, not as a thrown error', async () => {
    // A sync already running is an expected, recoverable state (the UI
    // just keeps polling /sync/status) — it must not land in a .catch()
    // as if something actually failed.
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(409, { error: 'already running' }));

    const result = await api.triggerSync({ full: true });

    expect(result).toEqual({ ok: false, inProgress: true, code: 'SYNC_IN_PROGRESS', error: 'already running' });
  });

  it('dispatches wealthfly:unauthorized and throws on a 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(401, { error: 'not logged in' }));

    await expect(api.triggerSync({})).rejects.toThrow('not logged in');

    expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'wealthfly:unauthorized' }));
  });

  it('resolves with the sync result on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true, accounts: 3, transactions: 120 }));

    const result = await api.triggerSync({});

    expect(result).toEqual({ ok: true, accounts: 3, transactions: 120 });
  });
});
