import { useState } from 'react';
import { applyTheme, nextTheme, readStoredTheme, storeTheme } from '../lib/theme.js';

export function useTheme() {
  const [theme, setTheme] = useState(() => readStoredTheme());

  const cycleTheme = () => {
    const next = nextTheme(theme);
    setTheme(next);
    applyTheme(next);
    storeTheme(next);
  };

  return { theme, cycleTheme };
}
