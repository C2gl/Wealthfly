export const THEME_KEY = 'wealthfly-theme';
export const THEME_CHOICES = ['auto', 'light', 'dark'];

export function normalizeTheme(value) {
  return THEME_CHOICES.includes(value) ? value : 'auto';
}

// The next choice when the toggle is pressed: auto → light → dark → auto.
export function nextTheme(current) {
  return THEME_CHOICES[(THEME_CHOICES.indexOf(normalizeTheme(current)) + 1) % THEME_CHOICES.length];
}

export function readStoredTheme(storage = globalThis.localStorage) {
  try {
    return normalizeTheme(storage?.getItem(THEME_KEY));
  } catch {
    return 'auto';
  }
}

// "auto" removes the attribute so tokens.css falls back to the OS setting.
export function applyTheme(theme, root = globalThis.document?.documentElement) {
  if (!root) return;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}

export function storeTheme(theme, storage = globalThis.localStorage) {
  try {
    storage?.setItem(THEME_KEY, theme);
  } catch {
    // Private mode or blocked storage: the choice just won't persist.
  }
}
