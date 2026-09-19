const axios = require('axios');

const BASE_URL = (process.env.FIREFLY_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.FIREFLY_TOKEN || '';

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
async function fetchAllPages(path, params = {}) {
  let page = 1;
  let totalPages = 1;
  const results = [];

  do {
    const { data } = await client.get(path, { params: { ...params, page, limit: 200 } });
    results.push(...(data.data || []));
    totalPages = data.meta?.pagination?.total_pages || 1;
    page += 1;
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

async function getTransactions({ start, end } = {}) {
  const params = {};
  if (start) params.start = start;
  if (end) params.end = end;
  return fetchAllPages('/transactions', params);
}

async function testConnection() {
  const { data } = await client.get('/about');
  return data;
}

module.exports = {
  getAccounts,
  getCategories,
  getTags,
  getTransactions,
  testConnection,
};
