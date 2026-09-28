const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Tiny single-page Firefly stand-in: every path returns one page of zero
// items, so pagination itself is a non-factor — this isolates the bug that
// slipped through before (delay only applied between pages of the SAME
// endpoint, so a sync where every endpoint fit on one page ran with zero
// delay no matter how high FIREFLY_REQUEST_DELAY_MS was set).
function startMockFirefly() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [], meta: { pagination: { current_page: 1, total_pages: 1 } } }));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('spaces out requests across different endpoints, not just pages of one endpoint', async (t) => {
  const server = await startMockFirefly();
  const { port } = server.address();
  const originalUrl = process.env.FIREFLY_URL;
  const originalToken = process.env.FIREFLY_TOKEN;
  const originalDelay = process.env.FIREFLY_REQUEST_DELAY_MS;

  process.env.FIREFLY_URL = `http://127.0.0.1:${port}`;
  process.env.FIREFLY_TOKEN = 'test-token';
  process.env.FIREFLY_REQUEST_DELAY_MS = '200';

  // fireflyClient reads FIREFLY_URL/FIREFLY_TOKEN at module load time, so it
  // must be required fresh, after the env vars above are set.
  delete require.cache[require.resolve('../src/fireflyClient')];
  const firefly = require('../src/fireflyClient');

  t.after(() => {
    server.close();
    delete require.cache[require.resolve('../src/fireflyClient')];
    if (originalUrl === undefined) delete process.env.FIREFLY_URL; else process.env.FIREFLY_URL = originalUrl;
    if (originalToken === undefined) delete process.env.FIREFLY_TOKEN; else process.env.FIREFLY_TOKEN = originalToken;
    if (originalDelay === undefined) delete process.env.FIREFLY_REQUEST_DELAY_MS; else process.env.FIREFLY_REQUEST_DELAY_MS = originalDelay;
  });

  const started = Date.now();
  // Three different single-page endpoints — the exact shape of a sync's
  // accounts/categories/tags calls. Before the fix, this took ~0ms because
  // the delay only ever fired between pages of one fetchAllPages() call.
  await firefly.getAccounts();
  await firefly.getCategories();
  await firefly.getTags();
  const elapsed = Date.now() - started;

  // Two gaps (accounts->categories, categories->tags) at 200ms each. Allow
  // slack for scheduling jitter, but this must be well above a few ms.
  assert.ok(elapsed >= 350, `expected at least ~400ms across 2 gaps, got ${elapsed}ms`);
});

test('does not add any delay when FIREFLY_REQUEST_DELAY_MS is unset', async (t) => {
  const server = await startMockFirefly();
  const { port } = server.address();
  const originalUrl = process.env.FIREFLY_URL;
  const originalToken = process.env.FIREFLY_TOKEN;
  const originalDelay = process.env.FIREFLY_REQUEST_DELAY_MS;

  process.env.FIREFLY_URL = `http://127.0.0.1:${port}`;
  process.env.FIREFLY_TOKEN = 'test-token';
  delete process.env.FIREFLY_REQUEST_DELAY_MS;

  delete require.cache[require.resolve('../src/fireflyClient')];
  const firefly = require('../src/fireflyClient');

  t.after(() => {
    server.close();
    delete require.cache[require.resolve('../src/fireflyClient')];
    if (originalUrl === undefined) delete process.env.FIREFLY_URL; else process.env.FIREFLY_URL = originalUrl;
    if (originalToken === undefined) delete process.env.FIREFLY_TOKEN; else process.env.FIREFLY_TOKEN = originalToken;
    if (originalDelay === undefined) delete process.env.FIREFLY_REQUEST_DELAY_MS; else process.env.FIREFLY_REQUEST_DELAY_MS = originalDelay;
  });

  const started = Date.now();
  await firefly.getAccounts();
  await firefly.getCategories();
  await firefly.getTags();
  const elapsed = Date.now() - started;

  assert.ok(elapsed < 300, `expected near-instant calls with no delay set, got ${elapsed}ms`);
});
