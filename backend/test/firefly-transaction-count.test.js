const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Two-page Firefly stand-in. Page 1 has two groups (2 + 1 splits), page 2 has
// one group (2 splits) — so groups and splits differ at every step.
function group(id, splitCount) {
  return {
    id,
    attributes: { transactions: Array.from({ length: splitCount }, () => ({ amount: '1.00' })) },
  };
}

const PAGES = {
  1: [group('a', 2), group('b', 1)],
  2: [group('c', 2)],
};

function startMockFirefly() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const page = Number(new URL(req.url, 'http://x').searchParams.get('page')) || 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: PAGES[page] || [],
        meta: { pagination: { current_page: page, total_pages: 2 } },
      }));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('getTransactions reports splits fetched so far (not groups) to onPage', async (t) => {
  const server = await startMockFirefly();
  const { port } = server.address();
  const saved = {
    url: process.env.FIREFLY_URL,
    token: process.env.FIREFLY_TOKEN,
    delay: process.env.FIREFLY_REQUEST_DELAY_MS,
  };
  process.env.FIREFLY_URL = `http://127.0.0.1:${port}`;
  process.env.FIREFLY_TOKEN = 'test-token';
  process.env.FIREFLY_REQUEST_DELAY_MS = '0';

  // fireflyClient reads its env at module load, so require it fresh.
  delete require.cache[require.resolve('../src/fireflyClient')];
  const firefly = require('../src/fireflyClient');

  t.after(() => {
    server.close();
    delete require.cache[require.resolve('../src/fireflyClient')];
    for (const [key, value] of [
      ['FIREFLY_URL', saved.url],
      ['FIREFLY_TOKEN', saved.token],
      ['FIREFLY_REQUEST_DELAY_MS', saved.delay],
    ]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  const reports = [];
  const groups = await firefly.getTransactions({ onPage: (info) => reports.push(info) });

  assert.equal(groups.length, 3);
  assert.deepEqual(reports, [
    { page: 1, totalPages: 2, fetched: 3 },
    { page: 2, totalPages: 2, fetched: 5 },
  ]);
});
