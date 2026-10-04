import { describe, it, expect } from 'vitest';
import { aggregateTrendRows, categoryEntryNames, groupCategoryRows, groupRowsForSummary, splitCategory } from '../src/lib/categoryGroups';

const row = (category, total, count = 1) => ({ category, total, count });

describe('splitCategory', () => {
  it('splits on the first " - " only', () => {
    expect(splitCategory('FOOD - Bakery')).toEqual({ group: 'FOOD', label: 'Bakery' });
    expect(splitCategory('Home - Rent - Garage')).toEqual({ group: 'Home', label: 'Rent - Garage' });
  });

  it('keeps emoji and accents in the label', () => {
    expect(splitCategory('FOOD - 🥐 Bakery')).toEqual({ group: 'FOOD', label: '🥐 Bakery' });
  });

  it('does not split names without a spaced dash or with an empty side', () => {
    expect(splitCategory('Self-care')).toEqual({ group: null, label: 'Self-care' });
    expect(splitCategory('Uncategorized')).toEqual({ group: null, label: 'Uncategorized' });
    expect(splitCategory(' - Orphan')).toEqual({ group: null, label: ' - Orphan' });
    expect(splitCategory('Trailing - ')).toEqual({ group: null, label: 'Trailing - ' });
  });
});

describe('groupCategoryRows', () => {
  const current = [row('FOOD - Bakery', 8.4), row('FOOD - Groceries', 120, 6), row('Rent', 600), row('FUN - Cinema', 12)];
  const previous = [row('FOOD - Bakery', 5), row('FOOD - Groceries', 100, 5), row('Rent', 600), row('FOOD - Takeaway', 30, 2)];

  it('merges categories sharing a prefix and sums amounts, counts and the previous period', () => {
    const entries = groupCategoryRows(current, previous);
    const food = entries.find((entry) => entry.name === 'FOOD');
    expect(food.kind).toBe('group');
    expect(food.amount).toBeCloseTo(128.4);
    expect(food.count).toBe(7);
    expect(food.previousAmount).toBe(135);
    expect(food.children.map((child) => child.label)).toEqual(['Groceries', 'Bakery', 'Takeaway']);
  });

  it('keeps previous-only categories as children with a current amount of 0', () => {
    const food = groupCategoryRows(current, previous).find((entry) => entry.name === 'FOOD');
    const takeaway = food.children.find((child) => child.label === 'Takeaway');
    expect(takeaway).toMatchObject({ amount: 0, count: 0, previousAmount: 30 });
  });

  it('leaves a prefix used by a single category flat, with its full name', () => {
    const entries = groupCategoryRows(current, previous);
    const cinema = entries.find((entry) => entry.name === 'FUN - Cinema');
    expect(cinema.kind).toBe('single');
    expect(cinema.children).toEqual([]);
    expect(entries.find((entry) => entry.name === 'Rent').kind).toBe('single');
  });

  it('orders entries by current amount, biggest first', () => {
    expect(groupCategoryRows(current, previous).map((entry) => entry.name)).toEqual(['Rent', 'FOOD', 'FUN - Cinema']);
  });

  it('treats prefixes that differ only by case as one group', () => {
    const entries = groupCategoryRows([row('Food - A', 1), row('FOOD - B', 2)], []);
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(3);
  });

  it('copes with no previous period and with empty input', () => {
    expect(groupCategoryRows(current, null).find((entry) => entry.name === 'FOOD').previousAmount).toBe(0);
    expect(groupCategoryRows(undefined, undefined)).toEqual([]);
  });
});

describe('categoryEntryNames and aggregateTrendRows', () => {
  it('sums the daily rows of a group together', () => {
    const entries = groupCategoryRows([row('FOOD - A', 1), row('FOOD - B', 2), row('Rent', 5)], []);
    const names = categoryEntryNames(entries);
    expect(names.get('FOOD - A')).toBe('FOOD');
    expect(names.get('Rent')).toBe('Rent');
    const rows = aggregateTrendRows([
      { category: 'FOOD - A', day: 0, total: 1 },
      { category: 'FOOD - B', day: 0, total: 2 },
      { category: 'FOOD - B', day: 1, total: 4 },
      { category: 'Rent', day: 0, total: 5 },
    ], names);
    expect(rows.find((r) => r.category === 'FOOD' && r.day === 0).total).toBe(3);
    expect(rows.find((r) => r.category === 'FOOD' && r.day === 1).total).toBe(4);
    expect(rows).toHaveLength(3);
  });
});

describe('groupRowsForSummary', () => {
  it('returns grouped rows in the shape the bar charts expect', () => {
    const rows = groupRowsForSummary([row('FOOD - A', 1, 2), row('FOOD - B', 2, 3), row('Rent', 5)]);
    expect(rows).toEqual([
      { category: 'Rent', total: 5, count: 1 },
      { category: 'FOOD', total: 3, count: 5 },
    ]);
  });
});
