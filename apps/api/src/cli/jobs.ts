import '../load-env.js';
/**
 * Background worker. `npm run jobs -- --once <job>` runs one job (used by schedulers/cron),
 * `npm run jobs` runs the loop: campaigns every minute, lifecycle + data requests hourly, NAV at 23:30 IST.
 */
import { loadConfig } from '../config.js';
import { createDb } from '../db.js';
import { createProviders } from '../providers/index.js';
import { JOBS } from '../jobs/index.js';

const cfg = loadConfig(); const db = createDb(cfg);
const log = { info: (o: any, m?: string) => console.log(m ?? '', JSON.stringify(o)), warn: (o: any, m?: string) => console.warn(m ?? '', JSON.stringify(o)) };
const deps = { cfg, db, providers: createProviders({ cfg, db, log }) };
const run = async (name: keyof typeof JOBS) => { try { log.info({ job: name, result: await JOBS[name](deps) }, 'job done'); } catch (e: any) { console.error(`job ${name} failed:`, e.message); } };
const once = process.argv.indexOf('--once');
if (once >= 0) { await run(process.argv[once + 1] as keyof typeof JOBS); await db.end(); process.exit(0); }
let lastHour = -1, lastNavDay = '', lastCustomDay = '';
setInterval(async () => {
  await run('dispatchDueCampaigns');
  const now = new Date(Date.now() + 5.5 * 3600e3), h = now.getUTCHours(), day = now.toISOString().slice(0, 10);
  if (h !== lastHour) { lastHour = h; await run('subscriptionLifecycle'); await run('processDataRequests'); }
  if (h >= 9 && lastCustomDay !== day) { lastCustomDay = day; await run('customSipReminders'); }
  if (h === 23 && now.getUTCMinutes() >= 30 && lastNavDay !== day) { lastNavDay = day; await run('importNav'); }
}, 60_000);
console.log('jobs worker started');
