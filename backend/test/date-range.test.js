const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveDateRange } = require('../src/dateRange');

test('resolveDateRange uses safe defaults when no range is supplied', () => {
  const range = resolveDateRange({});

  assert.equal(range.start, '0000-01-01');
  assert.equal(range.end, '9999-12-31');
});

test('resolveDateRange preserves custom boundaries', () => {
  const range = resolveDateRange({ start: '2024-01-01', end: '2024-12-31' });

  assert.equal(range.start, '2024-01-01');
  assert.equal(range.end, '2024-12-31');
});

test('resolveDateRange falls back when values are blank', () => {
  const range = resolveDateRange({ start: '', end: '   ' });

  assert.equal(range.start, '0000-01-01');
  assert.equal(range.end, '9999-12-31');
});
