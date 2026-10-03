const BUDGET_COLORS = ['var(--chart-4)', 'var(--gold)', 'var(--chart-8)'];

export function budgetAmount(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + budgetAmount(item), 0);
  const raw = value && typeof value === 'object' ? value.amount ?? value.sum ?? value.value : value;
  if (raw !== value) return budgetAmount(raw);
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? Math.abs(numeric) : 0;
}

// Turns Firefly budgets into display rows for the period ending at `range.end`.
export function buildBudgetRows(budgets, range) {
  return (budgets || [])
    .filter((budget) => budget.active !== false)
    .map((budget, index) => {
      const currentLimit = (budget.limits || []).find((limit) => {
        const start = String(limit.start || '').slice(0, 10);
        const end = String(limit.end || '').slice(0, 10);
        return start <= range.end && end >= range.end;
      }) || [...(budget.limits || [])].sort((a, b) => String(b.end || '').localeCompare(String(a.end || '')))[0];
      const spent = currentLimit
        ? budgetAmount(currentLimit.spent)
        : (budget.spent || []).reduce((sum, item) => sum + budgetAmount(item), 0);
      const target = currentLimit
        ? budgetAmount(currentLimit.amount)
        : budgetAmount(budget.auto_budget_amount);
      const currency = currentLimit?.currency_code || budget.spent?.[0]?.currency_code;
      return {
        id: budget.id,
        name: budget.name,
        spent,
        target,
        remaining: target - spent,
        percent: target > 0 ? (spent / target) * 100 : 0,
        currency,
        color: BUDGET_COLORS[index % BUDGET_COLORS.length],
      };
    });
}
