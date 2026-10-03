// Shared Recharts styling. Every value is a CSS variable from tokens.css, so charts
// follow the active theme (including dark mode) without any JavaScript theme logic.

export const CHART = {
  primary: 'var(--accent)',
  compare: 'var(--gold)',
  grid: 'var(--border)',
  axis: 'var(--text-muted)',
};

export function axisTick(fontSize = 10) {
  return { fill: CHART.axis, fontSize, fontFamily: 'var(--font-mono)' };
}

export function tooltipStyle(fontSize = 11) {
  return {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize,
  };
}
