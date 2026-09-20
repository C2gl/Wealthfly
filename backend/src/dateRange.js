function normalizeDateValue(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function resolveDateRange(query = {}) {
  return {
    start: normalizeDateValue(query.start, '0000-01-01'),
    end: normalizeDateValue(query.end, '9999-12-31'),
  };
}

module.exports = { resolveDateRange };
