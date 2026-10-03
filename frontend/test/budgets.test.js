import { describe, it, expect } from 'vitest';
import { budgetAmount, buildBudgetRows } from '../src/lib/budgets';

describe('budgetAmount', () => {
  it('reads plain numbers, strings, nested objects and arrays as absolute values', () => {
    expect(budgetAmount('-12.5')).toBe(12.5);
    expect(budgetAmount({ sum: '-4' })).toBe(4);
    expect(budgetAmount([{ amount: 1 }, { amount: '2' }])).toBe(3);
    expect(budgetAmount(undefined)).toBe(0);
  });
});

describe('buildBudgetRows', () => {
  const range = { start: '2026-10-01', end: '2026-10-03' };

  it('uses the limit covering the end of the range and skips inactive budgets', () => {
    const rows = buildBudgetRows([
      { id: 1, name: 'Food', active: true, limits: [{ start: '2026-10-01', end: '2026-10-31', amount: '200', spent: '-50', currency_code: 'EUR' }] },
      { id: 2, name: 'Old', active: false, limits: [] },
    ], range);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, spent: 50, target: 200, remaining: 150, percent: 25, currency: 'EUR' });
  });

  it('falls back to the most recent limit when none covers the range', () => {
    const rows = buildBudgetRows([
      { id: 3, name: 'Fun', limits: [{ start: '2026-08-01', end: '2026-08-31', amount: '100', spent: '-10' }, { start: '2026-09-01', end: '2026-09-30', amount: '300', spent: '-30' }] },
    ], range);
    expect(rows[0].target).toBe(300);
  });
});
