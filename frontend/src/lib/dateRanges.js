import { daysAgo, endOfMonth, startOfMonth, today } from '../utils.js';

export const RANGES = [
  { key: 'thisMonth', start: () => startOfMonth(0), end: () => today() },
  { key: 'previousMonth', start: () => startOfMonth(1), end: () => endOfMonth(1) },
  { key: '30d', start: () => daysAgo(30), end: () => today() },
  { key: '90d', start: () => daysAgo(90), end: () => today() },
  { key: 'ytd', start: () => `${new Date().getFullYear()}-01-01`, end: () => today() },
  { key: 'all', start: () => '0000-01-01', end: () => today() },
];

export function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// The period of the same length immediately before `range`; null for "all time".
export function getPreviousRange(range, rangeKey) {
  if (rangeKey === 'all') return null;
  const length = Math.max(
    1,
    Math.round((new Date(`${range.end}T00:00:00Z`) - new Date(`${range.start}T00:00:00Z`)) / 86400000),
  );
  return { start: shiftDate(range.start, -length), end: shiftDate(range.start, -1) };
}

// For "this month", extend the chart's x-axis to the full calendar month by padding
// the remaining (future) days with null values — Recharts stops the line there
// instead of drawing through days that haven't happened yet.
export function padNetWorthToMonthEnd(netWorth, rangeKey, rangeStart) {
  if (rangeKey !== 'thisMonth') return netWorth;
  const monthEnd = endOfMonth(0);
  const padded = [...netWorth];
  let cursor = padded.length ? shiftDate(padded[padded.length - 1].date, 1) : rangeStart;
  while (cursor <= monthEnd) {
    padded.push({ date: cursor, total: null });
    cursor = shiftDate(cursor, 1);
  }
  return padded;
}

export function sumTotals(rows) {
  return (rows || []).reduce((sum, row) => sum + Number(row.total || 0), 0);
}
