import { describe, it, expect } from 'vitest';
import en from '../src/locales/en.json';
import fr from '../src/locales/fr.json';

// Recursively lists every leaf key as a dotted path, e.g. "sync.steps.initializing".
function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flattenKeys(value, path) : [path];
  });
}

describe('locale catalogs', () => {
  it('en and fr expose exactly the same set of translation keys', () => {
    // This is the test that would have caught adding sync.steps.* to only
    // one of the two locale files — a real mistake that's easy to make by
    // hand and easy to miss in review, since both files are large and the
    // diff for "added a few keys to one file" looks completely normal on
    // its own.
    const enKeys = new Set(flattenKeys(en));
    const frKeys = new Set(flattenKeys(fr));

    const onlyInEn = [...enKeys].filter((key) => !frKeys.has(key));
    const onlyInFr = [...frKeys].filter((key) => !enKeys.has(key));

    expect(onlyInEn, `keys present in en.json but missing from fr.json: ${onlyInEn.join(', ')}`).toEqual([]);
    expect(onlyInFr, `keys present in fr.json but missing from en.json: ${onlyInFr.join(', ')}`).toEqual([]);
  });

  it('has no empty translation values in either catalog', () => {
    const blankIn = (catalog) => flattenKeys(catalog).filter((key) => {
      const value = key.split('.').reduce((v, part) => v?.[part], catalog);
      return typeof value !== 'string' || value.trim() === '';
    });

    expect(blankIn(en)).toEqual([]);
    expect(blankIn(fr)).toEqual([]);
  });
});
