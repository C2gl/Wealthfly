import { useEffect, useState } from 'react';
import { icon } from '@iconify/react';

function toggleName(key) {
  return key === 'light' ? 'sun' : 'moon';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      className="theme-toggle"
      aria-label="Toggle theme"
      title="Switch to "
    >
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
      {icon('material-symbols:toggle-switch')({ width: 20 })}
    </button>
  );
}