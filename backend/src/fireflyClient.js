const axios = require('axios');

const BASE_URL = (process.env.FIREFLY_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.FIREFLY_TOKEN || '';

// Delay (ms) inserted between successive paginated requests to Firefly, so a
// big sync doesn't hammer a small/self-hosted Firefly instance with a burst
// of back-to-back requests. Configurable via FIREFLY_REQUEST_DELAY_MS in
// .env; 0 (the default) disables the delay entirely.
function getRequestDelayMs() {
  const raw = Number(process.env.FIREFLY_REQUEST_DELAY_MS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (!BASE_URL || !TOKEN) {
  console.warn(
    '[firefly] FIREFLY_URL and/or FIREFLY_TOKEN are not set. Set them in your .env file before syncing.'
  );
}

const client = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.api+json',
  },
  timeout: 30000,
});

/**
 * Fetch every page of a paginated Firefly III v1 endpoint.
 * Firefly paginates with { meta: { pagination: { current_page, total_pages } }, data: [...] }
 */
async function fetchAllPages(path, params = {}, onPage) {
  let page = 1;
  let totalPages = 1;
  const results = [];
  const delayMs = getRequestDelayMs();

  do {
    const { data } = await client.get(path, { params: { ...params, page, limit: 200 } });
    results.push(...(data.data || []));
    totalPages = data.meta?.pagination?.total_pages || 1;
    if (typeof onPage === 'function') onPage({ page, totalPages });
    page += 1;
    // Only wait when another page is actually coming up — no point delaying
    // after the last page, or on single-page endpoints (accounts/categories/
    // tags on a normal-sized instance).
    if (delayMs > 0 && page <= totalPages) {
      await sleep(delayMs);
    }
  } while (page <= totalPages);

  return results;
}

async function getAccounts(type) {
  // type: asset | expense | revenue | liability | cash (Firefly III account type filter)
  return fetchAllPages('/accounts', type ? { type } : {});
}

async function getCategories() {
  return fetchAllPages('/categories');
}

async function getTags() {
  return fetchAllPages('/tags');
}

async function getBudgets({ start, end } = {}) {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  return fetchAllPages('/budgets', params);
}

async function getBudgetLimits(id, { start, end } = {}) {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  return fetchAllPages(`/budgets/${id}/limits`, params);
}

async function getTransactions({ start, end, onPage } = {}) {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  return fetchAllPages('/transactions', params, onPage);
}

async function testConnection() {
  const { data } = await client.get('/about');
  return data;
}

// Firefly's own computed totals for a period — not paginated, flat keyed object
// like { "spent-in-EUR": { key, monetary_value, ... }, "earned-in-EUR": {...}, ... }.
// Used to cross-check Wealthfly's own totals for the same period.
async function getSummaryBasic({ start, end } = {}) {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  const { data } = await client.get('/summary/basic', { params });
  return data;
}

module.exports = {
  getAccounts,
  getCategories,
  getTags,
  getBudgets,
  getBudgetLimits,
  getTransactions,
  getSummaryBasic,
  testConnection,
  getRequestDelayMs,
};
