import { describe, it, expect } from 'vitest';
import { getPreviousRange, padNetWorthToMonthEnd, shiftDate, sumTotals } from '../src/lib/dateRanges';

describe('shiftDate', () => {
  it('moves a date forward and backward across month boundaries', () => {
    expect(shiftDate('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('getPreviousRange', () => {
  it('returns the equally long period just before the range', () => {
    const prev = getPreviousRange({ start: '2026-09-01', end: '2026-09-30' }, 'previousMonth');
    expect(prev).toEqual({ start: '2026-08-03', end: '2026-08-31' });
  });

  it('returns null for all time', () => {
    expect(getPreviousRange({ start: '0000-01-01', end: '2026-10-03' }, 'all')).toBeNull();
  });

  it('uses at least one day for a single-day range', () => {
    expect(getPreviousRange({ start: '2026-10-03', end: '2026-10-03' }, '30d')).toEqual({ start: '2026-10-02', end: '2026-10-02' });
  });
});

describe('padNetWorthToMonthEnd', () => {
  it('leaves other ranges untouched', () => {
    const rows = [{ date: '2026-09-01', total: 1 }];
    expect(padNetWorthToMonthEnd(rows, '30d', '2026-09-01')).toBe(rows);
  });
});

describe('sumTotals', () => {
  it('adds up totals and tolerates missing values', () => {
    expect(sumTotals([{ total: '1.5' }, { total: 2 }, {}])).toBe(3.5);
    expect(sumTotals(undefined)).toBe(0);
  });
});
