import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(process.cwd(), 'src');
const css = fs.readFileSync(path.join(SRC, 'tokens.css'), 'utf8');

// Returns the {name: value} declarations of the first block that follows `selector`.
function declarations(selector) {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const out = {};
  for (const match of css.slice(open + 1, close).matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

const light = declarations(':root {');
const darkAuto = declarations(":root:not([data-theme='light'])");
const darkManual = declarations(":root[data-theme='dark']");

const colourNames = Object.keys(light).filter((name) => /^#[0-9a-f]{6}$/i.test(light[name]));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('dark theme', () => {
  it('is identical whether it comes from the OS setting or the manual toggle', () => {
    expect(darkAuto).toEqual(darkManual);
  });

  it('overrides every colour token except the ones that stay the same in both themes', () => {
    const sameInBoth = ['wash', 'shadow-ink'].filter((name) => !(name in darkManual));
    const missing = colourNames.filter((name) => !(name in darkManual) && !sameInBoth.includes(name));
    expect(missing).toEqual([]);
  });
});

describe('token usage', () => {
  function sourceFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.(css|jsx?|)$/.test(entry.name) && entry.name !== 'tokens.css' ? [full] : [];
    });
  }

  it('every var(--token) used in the app is defined in tokens.css or set inline', () => {
    const defined = new Set(Object.keys(light));
    const allowed = new Set(['category-color']);
    const used = new Set();
    for (const file of sourceFiles(SRC)) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(/var\(--([a-z0-9-]+)/g)) used.add(match[1]);
    }
    const undefinedTokens = [...used].filter((name) => !defined.has(name) && !allowed.has(name) && name !== 'chart-');
    expect(undefinedTokens).toEqual([]);
  });

  it('defines the eight chart colours the category palette expects', () => {
    for (let i = 1; i <= 8; i += 1) expect(`chart-${i}` in light).toBe(true);
  });
});

describe('contrast', () => {
  const themes = { light, dark: { ...light, ...darkManual } };

  for (const [name, tokens] of Object.entries(themes)) {
    it(`keeps text readable on the page and cards in the ${name} theme`, () => {
      const failures = [];
      for (const fg of ['text', 'text-muted', 'accent', 'positive', 'negative', 'info']) {
        for (const bg of ['bg', 'panel']) {
          const ratio = contrast(tokens[fg], tokens[bg]);
          if (ratio < 4.5) failures.push(`${fg} on ${bg}: ${ratio.toFixed(2)}`);
        }
      }
      expect(failures).toEqual([]);
    });

    it(`keeps trend pill text readable on its tinted background in the ${name} theme`, () => {
      expect(contrast(tokens.positive, tokens['positive-soft'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens.negative, tokens['negative-soft'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['text-muted'], tokens['neutral-soft'])).toBeGreaterThanOrEqual(4.5);
    });

    it(`keeps text on filled buttons and the inverse bar readable in the ${name} theme`, () => {
      expect(contrast(tokens['on-accent'], tokens.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['on-gold'], tokens.gold)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['inverse-text'], tokens['inverse-bg'])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
