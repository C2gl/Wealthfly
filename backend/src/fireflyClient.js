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

// Throttle every request this client makes — accounts, categories, tags, each
// page of transactions, budgets, summary/basic — to at most one per
// FIREFLY_REQUEST_DELAY_MS. A request interceptor is the right place for
// this: it runs right before each individual HTTP call, so it naturally
// spaces out calls made from different functions (syncAccounts, syncTags,
// etc.) and not just successive pages within a single fetchAllPages() call.
// Previously the delay only lived inside fetchAllPages' page loop, so it did
// nothing for endpoints that fit on one page and nothing between different
// endpoints — the exact case where a small Firefly instance still got hit
// with several immediate back-to-back requests during a sync.
let lastRequestAt = 0;
client.interceptors.request.use(async (config) => {
  const delayMs = getRequestDelayMs();
  if (delayMs > 0) {
    const wait = lastRequestAt + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
  }
  lastRequestAt = Date.now();
  return config;
});

/**
 * Fetch every page of a paginated Firefly III v1 endpoint.
 * Firefly paginates with { meta: { pagination: { current_page, total_pages } }, data: [...] }
 */
async function fetchAllPages(path, params = {}, onPage) {
  let page = 1;
  let totalPages = 1;
  const results = [];

  do {
    const { data } = await client.get(path, { params: { ...params, page, limit: 200 } });
    results.push(...(data.data || []));
    totalPages = data.meta?.pagination?.total_pages || 1;
    if (typeof onPage === 'function') onPage({ page, totalPages });
    page += 1;
  } while (page <= totalPages);
  // Throttling between requests (including between pages here) is handled
  // once, centrally, by the request interceptor set up above.

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
