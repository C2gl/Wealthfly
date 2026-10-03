import { describe, it, expect } from 'vitest';
import { buildNotifications } from '../src/lib/notifications';

const base = { error: null, stats: { lastSync: new Date().toISOString() }, budgetRows: [], transactions: [{ id: 1 }], rangeLabel: 'This month', syncNotification: null, authStatus: { authRequired: true }, reconciliation: null };

describe('buildNotifications', () => {
  it('is empty when everything is healthy', () => {
    expect(buildNotifications(base)).toEqual([]);
  });

  it('warns about an over-budget row without needing a formatter passed in', () => {
    const result = buildNotifications({ ...base, budgetRows: [{ id: 9, name: 'Food', spent: 120, target: 100, currency: 'EUR' }] });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('budget-9');
    expect(result[0].message).toBe('EUR 120.00 spent against a EUR 100.00 target.');
  });

  it('flags a missing password, stale data and empty periods', () => {
    const ids = buildNotifications({ ...base, authStatus: { authRequired: false }, stats: { lastSync: null }, transactions: [] }).map((n) => n.id);
    expect(ids).toEqual(['no-auth', 'stale-sync', 'empty-period']);
  });

  it('hides the generic API error when a critical sync notification is already shown', () => {
    const syncNotification = { id: 's', level: 'critical' };
    const ids = buildNotifications({ ...base, error: 'boom', syncNotification }).map((n) => n.id);
    expect(ids).toEqual(['s']);
  });
});
