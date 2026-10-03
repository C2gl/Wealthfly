// Groups categories that share a prefix, e.g. "FOOD - Bakery" and "FOOD - Groceries"
// become one "FOOD" group with two children. Only the first " - " counts, so
// "Home - Rent - Garage" is the group "Home" with the child "Rent - Garage".
// A prefix used by a single category is not worth a group: that category stays flat
// and keeps its full name.

const SEPARATOR = ' - ';

export function splitCategory(name) {
  const value = String(name || '');
  const index = value.indexOf(SEPARATOR);
  if (index < 0) return { group: null, label: value };
  const group = value.slice(0, index).trim();
  const label = value.slice(index + SEPARATOR.length).trim();
  if (!group || !label) return { group: null, label: value };
  return { group, label };
}

const groupKey = (group) => group.toLocaleLowerCase();

function byAmountThenPrevious(a, b) {
  return (b.amount - a.amount) || (b.previousAmount - a.previousAmount) || a.name.localeCompare(b.name);
}

// Builds the entries shown on the categories page.
//   currentRows / previousRows: [{ category, total, count }] for the two periods.
// Pass { grouped: false } for the flat list (every category its own entry).
// Categories that only exist in the previous period are kept (with an amount of 0) so
// they can still show as "down to nothing".
// Each entry: { key, kind: 'group' | 'single', name, amount, count, previousAmount,
//               children: [{ category, label, amount, count, previousAmount }] }
export function groupCategoryRows(currentRows, previousRows, { grouped = true } = {}) {
  const current = new Map((currentRows || []).filter((row) => row.category).map((row) => [row.category, row]));
  const previous = new Map((previousRows || []).filter((row) => row.category).map((row) => [row.category, row]));
  const names = [...new Set([...current.keys(), ...previous.keys()])];

  const items = names.map((category) => {
    const { group, label } = splitCategory(category);
    return {
      category,
      group,
      label,
      amount: Number(current.get(category)?.total || 0),
      count: Number(current.get(category)?.count || 0),
      previousAmount: Number(previous.get(category)?.total || 0),
    };
  });

  const byGroup = new Map();
  for (const item of items) {
    if (!item.group || !grouped) continue;
    const key = groupKey(item.group);
    if (!byGroup.has(key)) byGroup.set(key, { displayName: item.group, items: [] });
    byGroup.get(key).items.push(item);
  }

  const entries = [];
  const placed = new Set();
  for (const [key, { displayName, items: children }] of byGroup) {
    if (children.length < 2) continue;
    children.forEach((child) => placed.add(child.category));
    entries.push({
      key: `group:${key}`,
      kind: 'group',
      name: displayName,
      amount: children.reduce((sum, child) => sum + child.amount, 0),
      count: children.reduce((sum, child) => sum + child.count, 0),
      previousAmount: children.reduce((sum, child) => sum + child.previousAmount, 0),
      children: children
        .map((child) => ({ ...child, name: child.label }))
        .sort(byAmountThenPrevious)
        .map(({ name, group: _group, ...child }) => child),
    });
  }

  for (const item of items) {
    if (placed.has(item.category)) continue;
    entries.push({
      key: `single:${item.category}`,
      kind: 'single',
      name: item.category,
      amount: item.amount,
      count: item.count,
      previousAmount: item.previousAmount,
      children: [],
    });
  }

  return entries.sort(byAmountThenPrevious);
}

// Maps every raw category name to the name of the entry it belongs to.
export function categoryEntryNames(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (entry.kind === 'group') entry.children.forEach((child) => map.set(child.category, entry.name));
    else map.set(entry.name, entry.name);
  }
  return map;
}

// Sums daily trend rows ({ category, day, total }) under their entry's name.
export function aggregateTrendRows(rows, nameByCategory) {
  const totals = new Map();
  for (const row of rows || []) {
    const name = nameByCategory.get(row.category) ?? row.category;
    const key = `${name}\u0000${row.day}`;
    const existing = totals.get(key);
    if (existing) existing.total += Number(row.total || 0);
    else totals.set(key, { category: name, day: row.day, total: Number(row.total || 0) });
  }
  return [...totals.values()];
}

// For summary charts that take [{ category, total, count }]: grouped rows, biggest first.
export function groupRowsForSummary(rows) {
  return groupCategoryRows(rows, []).map((entry) => ({ category: entry.name, total: entry.amount, count: entry.count }));
}
