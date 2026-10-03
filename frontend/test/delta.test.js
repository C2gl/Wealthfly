import { describe, it, expect } from 'vitest';
import { deltaInfo, formatSignedPercent } from '../src/lib/delta';

describe('deltaInfo', () => {
  it('treats less spending as good and more as bad by default', () => {
    expect(deltaInfo(-12)).toEqual({ direction: 'down', tone: 'good' });
    expect(deltaInfo(12)).toEqual({ direction: 'up', tone: 'bad' });
  });

  it('flips the meaning for income and savings', () => {
    expect(deltaInfo(5, 'up')).toEqual({ direction: 'up', tone: 'good' });
    expect(deltaInfo(-5, 'up')).toEqual({ direction: 'down', tone: 'bad' });
  });

  it('is neutral for no change or tiny rounding noise', () => {
    expect(deltaInfo(0)).toEqual({ direction: 'flat', tone: 'neutral' });
    expect(deltaInfo(0.001)).toEqual({ direction: 'flat', tone: 'neutral' });
  });

  it('is neutral with no arrow when there is nothing to compare', () => {
    expect(deltaInfo(null)).toEqual({ direction: 'none', tone: 'neutral' });
    expect(deltaInfo(undefined)).toEqual({ direction: 'none', tone: 'neutral' });
    expect(deltaInfo(Number.NaN)).toEqual({ direction: 'none', tone: 'neutral' });
  });
});

describe('formatSignedPercent', () => {
  it('adds a plus sign only for increases', () => {
    expect(formatSignedPercent(12.34)).toBe('+12.3%');
    expect(formatSignedPercent(-4)).toBe('-4.0%');
    expect(formatSignedPercent(0)).toBe('0.0%');
  });

  it('returns an empty string without a value', () => {
    expect(formatSignedPercent(null)).toBe('');
  });
});
