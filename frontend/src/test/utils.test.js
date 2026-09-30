import { describe, it, expect } from 'vitest';
import { formatCurrency, transactionAmountMeta, formatCompact, formatDate } from '../src/utils';

describe('formatCurrency', () => {
  it('formats a positive amount with the currency code', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('USD 1,234.50');
  });

  it('formats a negative amount with a leading minus before the currency', () => {
    expect(formatCurrency(-42, 'EUR')).toBe('-EUR 42.00');
  });

  it('treats a missing value as zero', () => {
    expect(formatCurrency(undefined, 'USD')).toBe('USD 0.00');
  });

  it('omits the currency segment entirely when no currency is given', () => {
    expect(formatCurrency(10, undefined)).toBe('10.00');
  });
});

describe('transactionAmountMeta', () => {
  it('marks a withdrawal as negative', () => {
    const meta = transactionAmountMeta({ type: 'withdrawal', amount: '50', currency_code: 'USD' });
    expect(meta.tone).toBe('stat-negative');
    expect(meta.display).toBe('-USD 50.00');
  });

  it('marks a deposit as positive', () => {
    const meta = transactionAmountMeta({ type: 'deposit', amount: '50', currency_code: 'USD' });
    expect(meta.tone).toBe('stat-positive');
    expect(meta.display).toBe('+USD 50.00');
  });

  it('falls back to an "=" prefix for any other type (e.g. a transfer)', () => {
    const meta = transactionAmountMeta({ type: 'transfer', amount: '50', currency_code: 'USD' });
    expect(meta.display).toBe('=USD 50.00');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    // TZ is pinned to UTC in src/test/setup.js specifically so this line is
    // deterministic — see the comment there for why that matters here.
    expect(formatDate('2026-03-05')).toBe('Mar 05, 2026');
  });

  it('returns an empty string for a falsy input, rather than "Invalid Date"', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
  });

  it('returns the original value unchanged when it cannot be parsed as a date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatCompact', () => {
  it('compacts large numbers with a magnitude suffix', () => {
    expect(formatCompact(1500)).toBe('1.5K');
  });

  it('treats a missing value as zero', () => {
    expect(formatCompact(undefined)).toBe('0');
  });
});
