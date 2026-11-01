import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../src/config.js';
import { createDb, Db } from '../src/db.js';
import { buildApp } from '../src/app.js';
import { migrate } from '../src/cli/migrate.js';
import { bootstrapAdmin, importWorkbookFile, seedReference } from '../src/cli/seed.js';

export const WORKBOOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/data/mod-alpha-test-data.xlsx');
let shared: { app: FastifyInstance; db: Db } | null = null;

/** Fresh schema + reference data + the bundled test workbook, built once per test run. */
export async function setupApp() {
  if (shared) return shared;
  const cfg = loadConfig();
  const db = createDb(cfg);
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(db, () => {});
  await seedReference(db);
  await bootstrapAdmin(db, cfg);
  await importWorkbookFile(db, WORKBOOK, true);
  const app = await buildApp(cfg, db);
  shared = { app, db };
  return shared;
}
/** Minimal cookie-jar client around app.inject. */
export function client(app: FastifyInstance) {
  const jar: Record<string, string> = {};
  const call = async (method: string, url: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await app.inject({ method: method as any, url: `/api/v1${url}`, payload: body as any, headers: { ...headers, cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') } });
    for (const c of res.cookies) { if (c.value === '' || (c as any).maxAge === 0) delete jar[c.name]; else jar[c.name] = c.value; }
    return res;
  };
  return { jar, get: (u: string) => call('GET', u), post: (u: string, b?: unknown, h?: Record<string, string>) => call('POST', u, b ?? {}, h), put: (u: string, b: unknown) => call('PUT', u, b), patch: (u: string, b: unknown) => call('PATCH', u, b), del: (u: string) => call('DELETE', u), raw: call };
}
export async function adminClient(app: FastifyInstance) {
  const c = client(app);
  // admins: password, then the email code AND the SMS code (mock providers return them on non-prod)
  const r = await c.post('/auth/login', { email: 'admin@modalpha.test', password: 'Admin-password-123' });
  const ch = r.json();
  if (r.statusCode !== 200 || !ch.mfaRequired) throw new Error('admin login failed ' + r.body);
  const v = await c.post('/auth/login/verify', { challengeId: ch.challengeId, emailCode: ch.devCodes.email, smsCode: ch.devCodes.sms });
  if (v.statusCode !== 200) throw new Error('admin MFA failed ' + v.body);
  return c;
}
