import { describe, it, expect } from 'vitest';
import { THEME_KEY, applyTheme, nextTheme, normalizeTheme, readStoredTheme, storeTheme } from '../src/lib/theme';

function fakeRoot() {
  const attrs = {};
  return {
    attrs,
    setAttribute: (name, value) => { attrs[name] = value; },
    removeAttribute: (name) => { delete attrs[name]; },
  };
}

describe('normalizeTheme', () => {
  it('keeps the three known choices and falls back to auto', () => {
    expect(normalizeTheme('light')).toBe('light');
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('auto')).toBe('auto');
    expect(normalizeTheme('purple')).toBe('auto');
    expect(normalizeTheme(null)).toBe('auto');
  });
});

describe('nextTheme', () => {
  it('cycles auto, light, dark and back to auto', () => {
    expect(nextTheme('auto')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('auto');
    expect(nextTheme('nonsense')).toBe('light');
  });
});

describe('applyTheme', () => {
  it('sets data-theme for light and dark, and removes it for auto', () => {
    const root = fakeRoot();
    applyTheme('dark', root);
    expect(root.attrs['data-theme']).toBe('dark');
    applyTheme('light', root);
    expect(root.attrs['data-theme']).toBe('light');
    applyTheme('auto', root);
    expect('data-theme' in root.attrs).toBe(false);
  });
});

describe('stored theme', () => {
  it('round-trips through storage', () => {
    const data = {};
    const storage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
    storeTheme('dark', storage);
    expect(data[THEME_KEY]).toBe('dark');
    expect(readStoredTheme(storage)).toBe('dark');
  });

  it('falls back to auto when storage throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readStoredTheme(broken)).toBe('auto');
    expect(() => storeTheme('dark', broken)).not.toThrow();
  });
});
