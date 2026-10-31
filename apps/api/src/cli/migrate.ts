import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from '../db.js';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');
export async function migrate(db: Db, log = (m: string) => console.log(m)) {
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  await db.query('SELECT pg_advisory_lock(42424242)');
  try {
    const done = new Set((await db.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      const c = await db.connect();
      try { await c.query('BEGIN'); await c.query(fs.readFileSync(path.join(DIR, f), 'utf8')); await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]); await c.query('COMMIT'); log(`applied ${f}`); }
      catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
    }
  } finally { await db.query('SELECT pg_advisory_unlock(42424242)'); }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  await import('../load-env.js');
  const { loadConfig } = await import('../config.js'); const { createDb } = await import('../db.js');
  const db = createDb(loadConfig()); await migrate(db); await db.end();
}
