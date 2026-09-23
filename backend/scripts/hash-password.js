#!/usr/bin/env node
// Usage: node scripts/hash-password.js "your-password"
// Prints a bcrypt hash to paste into .env as WEALTHFLY_PASSWORD_HASH.
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/hash-password.js "your-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nAdd this to your .env:\n');
console.log(`WEALTHFLY_PASSWORD_HASH=${hash}`);
console.log('\nAlso set a random WEALTHFLY_SESSION_SECRET (any long random string).\n');
