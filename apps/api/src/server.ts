/**
 * Production entry point: load config, connect to PostgreSQL, run migrations (MIGRATE_ON_START=true),
 * make sure the first super admin exists, then start listening. SIGTERM/SIGINT close cleanly.
 */
import './load-env.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { buildApp } from './app.js';
import { migrate } from './cli/migrate.js';
import { bootstrapAdmin } from './cli/seed.js';
import { cookieDomain } from './modules/auth/session.js';

const cfg = loadConfig();
const db = createDb(cfg);
if (cfg.COOKIE_DOMAIN && !cookieDomain(cfg)) console.warn(`COOKIE_DOMAIN=${cfg.COOKIE_DOMAIN} does not match API_PUBLIC_URL (${cfg.API_PUBLIC_URL}) — ignored; sign-in cookies use the API host.`);
if (process.env.MIGRATE_ON_START === 'true') await migrate(db);
// idempotent: creates the first super admin, or fills in its mobile number (needed for the SMS sign-in code)
if (cfg.ADMIN_BOOTSTRAP_EMAIL && cfg.ADMIN_BOOTSTRAP_PASSWORD) await bootstrapAdmin(db, cfg).catch((e) => console.error('admin bootstrap skipped:', e.message));
const app = await buildApp(cfg, db);
await app.listen({ port: cfg.PORT, host: cfg.HOST });
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, async () => { await app.close(); await db.end(); process.exit(0); });
