async function get(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const res = await fetch(`/api${path}${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  stats: (range) => get('/summary/stats', range),
  netWorth: (range) => get('/summary/net-worth', range),
  expensesByCategory: (range) => get('/summary/expenses-by-category', range),
  expensesBySourceAccount: (range) => get('/summary/expenses-by-source-account', range),
  expensesByTargetAccount: (range) => get('/summary/expenses-by-target-account', range),
  expensesByTag: (range) => get('/summary/expenses-by-tag', range),
  transactions: (params) => get('/transactions', params),
  accounts: () => get('/accounts'),
  categories: () => get('/categories'),
  tags: () => get('/tags'),
  triggerSync: () =>
    fetch('/api/sync', { method: 'POST' }).then((r) => {
      if (!r.ok) throw new Error('sync failed');
      return r.json();
    }),
};
