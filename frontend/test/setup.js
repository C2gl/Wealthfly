import '@testing-library/jest-dom/vitest';

// Pin the timezone for every test run. formatDate() in utils.js parses
// date-only strings (e.g. "2026-03-05") as UTC midnight and then renders in
// the LOCAL timezone, so the displayed day can shift by one depending on
// where the test runs (see utils.test.js for a demonstration, and the
// "Timezone-safe Date Formatting" item on the project backlog for the real
// fix). Pinning TZ here keeps these tests deterministic across machines and
// CI in the meantime, matching GitHub Actions runners (which default to UTC).
process.env.TZ = 'UTC';
