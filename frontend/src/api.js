async function get(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const res = await fetch(`/api${path}${query ? `?${query}` : ''}`);
  if (res.status === 401) {
    window.dispatchEvent(new Event('wealthfly:unauthorized'));
  }
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  config: () => get('/config'),
  session: () => get('/session'),
  stats: (range) => get('/summary/stats', range),
  reconciliation: () => get('/summary/reconciliation'),
  netWorth: (range) => get('/summary/net-worth', range),
  expensesByCategory: (range) => get('/summary/expenses-by-category', range),
  expensesByCategoryByDay: (range) => get('/summary/expenses-by-category-by-day', range),
  expensesByDay: (range) => get('/summary/expenses-by-day', range),
  expensesBySourceAccount: (range) => get('/summary/expenses-by-source-account', range),
  accountFlows: (range) => get('/summary/account-flows', range),
  expensesByTargetAccount: (range) => get('/summary/expenses-by-target-account', range),
  expensesByTag: (range) => get('/summary/expenses-by-tag', range),
  transactions: (params) => get('/transactions', params),
  accounts: () => get('/accounts'),
  budgets: (range) => get('/budgets', range),
  categories: () => get('/categories'),
  tags: () => get('/tags'),
  triggerSync: () =>
    fetch('/api/sync', { method: 'POST' }).then(async (r) => {
      if (r.status === 401) window.dispatchEvent(new Event('wealthfly:unauthorized'));
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `sync failed: ${r.status}`);
      return body;
    }),
};
