const test = require('node:test');
const assert = require('node:assert/strict');

// fireflyClient only reads FIREFLY_URL/FIREFLY_TOKEN at module load to build
// its axios client — it never makes a network call just by being required,
// so it's safe to require directly in a unit test.
const { getRequestDelayMs } = require('../src/fireflyClient');

const ORIGINAL = process.env.FIREFLY_REQUEST_DELAY_MS;

test.afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FIREFLY_REQUEST_DELAY_MS;
  else process.env.FIREFLY_REQUEST_DELAY_MS = ORIGINAL;
});

test('defaults to 0 (no delay) when unset', () => {
  delete process.env.FIREFLY_REQUEST_DELAY_MS;
  assert.equal(getRequestDelayMs(), 0);
});

test('parses a positive integer value', () => {
  process.env.FIREFLY_REQUEST_DELAY_MS = '250';
  assert.equal(getRequestDelayMs(), 250);
});

test('floors a fractional value', () => {
  process.env.FIREFLY_REQUEST_DELAY_MS = '150.9';
  assert.equal(getRequestDelayMs(), 150);
});

test('treats 0 as no delay', () => {
  process.env.FIREFLY_REQUEST_DELAY_MS = '0';
  assert.equal(getRequestDelayMs(), 0);
});

test('treats a negative value as no delay', () => {
  process.env.FIREFLY_REQUEST_DELAY_MS = '-100';
  assert.equal(getRequestDelayMs(), 0);
});

test('treats a non-numeric value as no delay', () => {
  process.env.FIREFLY_REQUEST_DELAY_MS = 'not-a-number';
  assert.equal(getRequestDelayMs(), 0);
});
