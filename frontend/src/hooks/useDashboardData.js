import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const EMPTY_DATA = {
  stats: null,
  netWorth: [],
  spendingByDay: [],
  previousSpendingByDay: [],
  byCategory: [],
  previousByCategory: [],
  categoryTrends: [],
  previousCategoryTrends: [],
  accountFlows: [],
  transactions: [],
  accounts: [],
  budgets: [],
};

// Loads everything the dashboard shows for `range` (and `previousRange` for comparisons).
// `load` is re-created when `rangeKey` changes, so effects depending on it refetch.
export function useDashboardData({ range, previousRange, rangeKey }) {
  const [data, setData] = useState(EMPTY_DATA);
  const [reconciliation, setReconciliation] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [stats, netWorth, spendingByDay, previousSpendingByDay, byCategory, previousByCategory, categoryTrends, previousCategoryTrends, accountFlows, transactions, accounts, budgets] = await Promise.all([
        api.stats(range),
        api.netWorth(range),
        api.expensesByDay(range),
        previousRange ? api.expensesByDay(previousRange) : Promise.resolve([]),
        api.expensesByCategory(range),
        previousRange ? api.expensesByCategory(previousRange) : Promise.resolve([]),
        api.expensesByCategoryByDay(range),
        previousRange ? api.expensesByCategoryByDay(previousRange) : Promise.resolve([]),
        api.accountFlows(range),
        api.transactions({ ...range, limit: 200 }),
        api.accounts(),
        api.budgets(range),
      ]);
      setData({
        stats,
        netWorth,
        spendingByDay,
        previousSpendingByDay,
        byCategory,
        previousByCategory,
        categoryTrends,
        previousCategoryTrends,
        accountFlows,
        transactions,
        accounts,
        budgets,
      });
    } catch (e) {
      setError(e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey]);

  const loadReconciliation = useCallback(() => {
    api.reconciliation()
      .then((result) => setReconciliation(result))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadReconciliation();
  }, [loadReconciliation]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, setError, load, reconciliation, loadReconciliation };
}
