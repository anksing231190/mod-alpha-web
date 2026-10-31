#!/usr/bin/env node
/**
 * Helper for start-local.sh.
 *   node scripts/local/db.mjs check    → exit 0 if the server in DATABASE_URL is reachable
 *   node scripts/local/db.mjs ensure   → create the database if it does not exist
 *   node scripts/local/db.mjs reset    → drop and recreate the database
 *   node scripts/local/db.mjs seeded   → exit 0 if fund data is already loaded
 */
import pg from 'pg';
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set'); process.exit(2); }
const u = new URL(url), dbName = decodeURIComponent(u.pathname.slice(1)) || 'modalpha';
const admin = new URL(url); admin.pathname = '/postgres';
const q = async (conn, sql, params) => { const c = new pg.Client({ connectionString: conn.toString() }); await c.connect(); try { return await c.query(sql, params); } finally { await c.end(); } };
const cmd = process.argv[2];
try {
  if (cmd === 'check') { await q(admin, 'SELECT 1'); process.exit(0); }
  if (cmd === 'ensure' || cmd === 'reset') {
    if (cmd === 'reset') { await q(admin, `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()`, [dbName]); await q(admin, `DROP DATABASE IF EXISTS "${dbName.replace(/"/g, '')}"`); console.log(`dropped database ${dbName}`); }
    const r = await q(admin, 'SELECT 1 FROM pg_database WHERE datname=$1', [dbName]);
    if (!r.rows[0]) { await q(admin, `CREATE DATABASE "${dbName.replace(/"/g, '')}"`); console.log(`created database ${dbName}`); }
    process.exit(0);
  }
  if (cmd === 'seeded') { const r = await q(u, `SELECT to_regclass('public.funds') IS NOT NULL AS t`); if (!r.rows[0].t) process.exit(1); const n = await q(u, 'SELECT count(*)::int n FROM funds'); process.exit(n.rows[0].n > 0 ? 0 : 1); }
  console.error('unknown command'); process.exit(2);
} catch (e) { if (cmd !== 'check' && cmd !== 'seeded') console.error(e.message); process.exit(1); }
