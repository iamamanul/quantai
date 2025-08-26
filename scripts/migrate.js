/* eslint-disable no-console */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Load env vars for local builds: prefer .env.local, then .env
try {
  const dotenv = require('dotenv');
  const envLocal = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocal)) {
    dotenv.config({ path: envLocal });
  } else {
    dotenv.config();
  }
} catch {}

function sanitizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  // Trim and remove surrounding quotes if any
  return raw.trim().replace(/^['\"]+|['\"]+$/g, '');
}

function isValidPostgresUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = sanitizeUrl(url);
  return /^postgres(ql)?:\/\//i.test(trimmed);
}

const databaseUrl = sanitizeUrl(process.env.DATABASE_URL || '');

if (!databaseUrl) {
  console.warn('[build] Skipping prisma migrate deploy: DATABASE_URL is missing');
  process.exit(0);
}

const looksPostgres = isValidPostgresUrl(databaseUrl);
console.log(`[build] DATABASE_URL protocol ok: ${looksPostgres}`);

if (!looksPostgres) {
  console.warn('[build] Skipping prisma migrate deploy: DATABASE_URL is not a postgres URL');
  process.exit(0);
}

try {
  console.log('[build] Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('[build] Prisma migrations applied.');
} catch (err) {
  console.error('[build] Prisma migrate deploy failed:', err?.message || err);
  process.exit(1);
}


