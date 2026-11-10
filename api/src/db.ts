/**
 * PostgreSQL connection pool and the transaction helper.
 * Type parsers: DATE stays a 'YYYY-MM-DD' string, NUMERIC and BIGINT become JavaScript numbers.
 */
import pg from 'pg';
import type { Config } from './config.js';

export type Db = pg.Pool;
// Q = anything that can run a query: the pool, or a client inside a transaction.
export type Q = pg.Pool | pg.PoolClient;

pg.types.setTypeParser(1082, (v) => v); // DATE as 'YYYY-MM-DD'
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // NUMERIC as number
pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT counts as number

// Up to 10 connections; TLS with certificate verification when DATABASE_SSL=true (managed databases).
export function createDb(cfg: Pick<Config, 'DATABASE_URL' | 'DATABASE_SSL'>): Db {
  return new pg.Pool({ connectionString: cfg.DATABASE_URL, ssl: cfg.DATABASE_SSL ? { rejectUnauthorized: true } : undefined, max: 10 });
}

// Run `fn` inside BEGIN … COMMIT; any error rolls everything back.
export async function tx<T>(db: Db, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}
