// Direction and tone of a change between two periods.
//   goodWhen: 'down' for spending (less is good), 'up' for income or savings.
// Returns { direction: 'up' | 'down' | 'flat' | 'none', tone: 'good' | 'bad' | 'neutral' }.
export function deltaInfo(value, goodWhen = 'down', epsilon = 0.005) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return { direction: 'none', tone: 'neutral' };
  }
  const numeric = Number(value);
  if (Math.abs(numeric) < epsilon) return { direction: 'flat', tone: 'neutral' };
  const direction = numeric > 0 ? 'up' : 'down';
  return { direction, tone: direction === goodWhen ? 'good' : 'bad' };
}

export function formatSignedPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(digits)}%`;
}
