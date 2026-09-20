export function formatCurrency(value, currency) {
  const n = Number(value || 0);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  return `${sign}${currency ? currency + ' ' : ''}${formatted}`;
}

export function transactionAmountMeta(tx) {
  const amount = Number(tx.amount || 0);
  const abs = Math.abs(amount);

  if (tx.type === 'withdrawal') {
    return {
      prefix: '-',
      tone: 'stat-negative',
      value: formatCurrency(abs, tx.currency_code),
      display: `-${formatCurrency(abs, tx.currency_code)}`,
    };
  }

  if (tx.type === 'deposit') {
    return {
      prefix: '+',
      tone: 'stat-positive',
      value: formatCurrency(abs, tx.currency_code),
      display: `+${formatCurrency(abs, tx.currency_code)}`,
    };
  }

  return {
    prefix: '=',
    tone: 'stat-positive',
    value: formatCurrency(abs, tx.currency_code),
    display: `=${formatCurrency(abs, tx.currency_code)}`,
  };
}

export function formatCompact(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORY_COLORS = ['#39725a', '#bc704d', '#c4aa64', '#6f8a7b', '#5a73a1', '#8d72b2', '#9f9d93'];

export function categoryColor(category, avoidColor) {
  const value = String(category || 'Uncategorized');
  const hash = [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
  const baseIndex = hash % CATEGORY_COLORS.length;
  if (!avoidColor || CATEGORY_COLORS[baseIndex] !== avoidColor) return CATEGORY_COLORS[baseIndex];
  return CATEGORY_COLORS[(baseIndex + 1) % CATEGORY_COLORS.length];
}
