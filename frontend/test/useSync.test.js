import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// useSync talks to the backend only through `api`, so mock that one module.
vi.mock('../src/api.js', () => ({
  api: {
    syncStatus: vi.fn(),
    triggerSync: vi.fn(),
    purge: vi.fn(),
  },
}));

import { api } from '../src/api.js';
import { useSync } from '../src/hooks/useSync.js';

function setup() {
  const load = vi.fn().mockResolvedValue(undefined);
  const loadReconciliation = vi.fn();
  const setError = vi.fn();
  const hook = renderHook(() => useSync({ load, loadReconciliation, setError }));
  return { ...hook, load, loadReconciliation, setError };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Idle by default; polling tests override this.
  api.syncStatus.mockResolvedValue({ inProgress: false });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSync › handleSync summary message', () => {
  it('summarises a full resync without repeating the nouns or using markdown', async () => {
    api.triggerSync.mockResolvedValue({
      accounts: 12, categories: 5, tags: 3, transactions: 100, incremental: false,
    });
    const { result, load, loadReconciliation } = setup();

    await act(async () => {
      await result.current.handleSync(true);
    });

    expect(api.triggerSync).toHaveBeenCalledWith({ full: true });
    const note = result.current.syncNotification;
    expect(note.level).toBe('success');
    expect(note.title).toBe('Sync completed');
    expect(note.message).toBe(
      'Synced 12 accounts, 5 categories, 3 tags, and 100 transactions (full resync).'
    );
    expect(note.message).not.toMatch(/accounts accounts|transactions transactions|\*\*/);
    // The dashboard refreshes after a manual sync.
    expect(load).toHaveBeenCalledTimes(1);
    expect(loadReconciliation).toHaveBeenCalledTimes(1);
    expect(result.current.syncing).toBe(false);
  });

  it('describes the lookback window for an incremental sync', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    api.triggerSync.mockResolvedValue({
      accounts: 2, categories: 4, tags: 1, transactions: 7,
      incremental: true, lookbackStart: '2026-09-23',
    });
    const { result } = setup();

    await act(async () => {
      await result.current.handleSync();
    });

    const { message } = result.current.syncNotification;
    expect(message).toMatch(
      /^Synced 2 accounts, 4 categories, 1 tag, and 7 transactions from the last 14 days \(since [A-Za-z]{3} \d{1,2}\)\.$/
    );
  });

  it('falls back to the full-resync wording if the backend sends no lookbackStart', async () => {
    api.triggerSync.mockResolvedValue({
      accounts: 1, categories: 1, tags: 1, transactions: 1, incremental: true,
    });
    const { result } = setup();

    await act(async () => {
      await result.current.handleSync();
    });

    expect(result.current.syncNotification.message).not.toMatch(/NaN|Invalid/);
  });

  it('pluralises correctly for 0 and 1', async () => {
    api.triggerSync.mockResolvedValue({
      accounts: 1, categories: 1, tags: 0, transactions: 1, incremental: false,
    });
    const { result } = setup();

    await act(async () => {
      await result.current.handleSync();
    });

    expect(result.current.syncNotification.message).toBe(
      'Synced 1 account, 1 category, 0 tags, and 1 transaction (full resync).'
    );
  });
});

describe('useSync › handleSync edge cases', () => {
  it('shows an info notice and does not refresh when a sync is already running', async () => {
    api.triggerSync.mockResolvedValue({ inProgress: true });
    const { result, load } = setup();

    await act(async () => {
      await result.current.handleSync();
    });

    expect(result.current.syncNotification.level).toBe('info');
    expect(load).not.toHaveBeenCalled();
    expect(result.current.syncing).toBe(false);
  });

  it('reports failures as a critical notice and passes a string to setError', async () => {
    api.triggerSync.mockRejectedValue(new Error('Firefly is down'));
    const { result, setError } = setup();

    await act(async () => {
      await result.current.handleSync();
    });

    expect(result.current.syncNotification).toMatchObject({
      level: 'critical',
      title: 'Sync failed',
      message: 'Firefly is down',
    });
    expect(result.current.syncNotification.id).toMatch(/^sync-failure-/);
    expect(setError).toHaveBeenCalledWith('Firefly is down');
    expect(result.current.syncing).toBe(false);
  });
});

describe('useSync › handlePurge', () => {
  it('purges, confirms, and refreshes the dashboard', async () => {
    api.purge.mockResolvedValue({ ok: true });
    const { result, load, loadReconciliation } = setup();

    await act(async () => {
      await result.current.handlePurge();
    });

    expect(api.purge).toHaveBeenCalledTimes(1);
    expect(result.current.syncNotification).toMatchObject({ level: 'success', title: 'Data purged' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(loadReconciliation).toHaveBeenCalledTimes(1);
    expect(result.current.purging).toBe(false);
  });

  it('refuses politely while a sync is running', async () => {
    api.purge.mockResolvedValue({ inProgress: true });
    const { result, load } = setup();

    await act(async () => {
      await result.current.handlePurge();
    });

    expect(result.current.syncNotification.level).toBe('info');
    expect(load).not.toHaveBeenCalled();
    expect(result.current.purging).toBe(false);
  });

  it('reports a failed purge and passes a string to setError', async () => {
    api.purge.mockRejectedValue(new Error('disk is read-only'));
    const { result, setError } = setup();

    await act(async () => {
      await result.current.handlePurge();
    });

    expect(result.current.syncNotification).toMatchObject({
      level: 'critical',
      title: 'Purge failed',
      message: 'disk is read-only',
    });
    expect(setError).toHaveBeenCalledWith('disk is read-only');
    expect(result.current.purging).toBe(false);
  });
});

describe('useSync › status polling', () => {
  it('picks up a sync running elsewhere and forwards the live transaction count', async () => {
    vi.useFakeTimers();
    api.syncStatus
      .mockResolvedValueOnce({ inProgress: false }) // initial check on mount
      .mockResolvedValue({
        inProgress: true,
        currentStep: 'syncing_transactions',
        progress: 60,
        transactionsProcessed: 42,
      });
    const { result } = setup();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000); // idle poll interval
    });

    expect(result.current.syncing).toBe(true);
    expect(result.current.syncProgress).toEqual({
      currentStep: 'syncing_transactions',
      progress: 60,
      transactionsProcessed: 42,
    });
  });

  it('defaults the count to null when the backend does not send one', async () => {
    vi.useFakeTimers();
    api.syncStatus
      .mockResolvedValueOnce({ inProgress: false })
      .mockResolvedValue({ inProgress: true, currentStep: 'syncing_accounts', progress: 10 });
    const { result } = setup();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(result.current.syncProgress.transactionsProcessed).toBeNull();
  });

  it('clears progress and refreshes the dashboard once the sync finishes', async () => {
    vi.useFakeTimers();
    api.syncStatus
      .mockResolvedValueOnce({ inProgress: false }) // mount
      .mockResolvedValueOnce({ inProgress: true, currentStep: 'syncing_transactions', progress: 80 })
      .mockResolvedValue({ inProgress: false });
    const { result, load, loadReconciliation } = setup();

    // First poll: sync visible. Second poll (now every 1s): sync finished.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(result.current.syncing).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.syncing).toBe(false);
    expect(result.current.syncProgress).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    expect(loadReconciliation).toHaveBeenCalledTimes(1);
  });
});
