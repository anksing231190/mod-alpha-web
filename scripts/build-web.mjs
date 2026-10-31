#!/usr/bin/env node
/**
 * Build the static website for one environment.
 *   node scripts/build-web.mjs stage   → dist/web-stage
 *   node scripts/build-web.mjs prod    → dist/web-prod
 * config/env.<env>.json provides defaults; WEB_API_BASE_URL, WEB_RAZORPAY_KEY_ID and WEB_GOOGLE_CLIENT_ID
 * env vars override them (CI injects these). Prod builds exclude the bundled test workbook.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.argv[2] || 'stage';
if (!['local', 'stage', 'prod'].includes(env)) { console.error('usage: build-web.mjs <local|stage|prod>'); process.exit(1); }
const src = path.join(root, 'apps/web'), out = path.join(root, 'dist', `web-${env}`);
const cfg = JSON.parse(fs.readFileSync(path.join(src, 'config', `env.${env}.json`), 'utf8'));
if (process.env.WEB_API_BASE_URL) cfg.API_BASE_URL = process.env.WEB_API_BASE_URL;
if (process.env.WEB_RAZORPAY_KEY_ID) cfg.RAZORPAY_KEY_ID = process.env.WEB_RAZORPAY_KEY_ID;
if (process.env.WEB_GOOGLE_CLIENT_ID) cfg.GOOGLE_CLIENT_ID = process.env.WEB_GOOGLE_CLIENT_ID;
if (env === 'prod' && !/^https:\/\//.test(cfg.API_BASE_URL)) { console.error('prod API_BASE_URL must be https'); process.exit(1); }

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const skip = new Set(['Dockerfile', 'config/env.local.json', 'config/env.stage.json', 'config/env.prod.json', 'README.md', 'SCREEN_COVERAGE.md', ...(env === 'prod' ? ['data/mod-alpha-test-data.xlsx', 'data/_fund_seed.json'] : [])]);
(function copy(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name), rel = path.relative(src, abs).split(path.sep).join('/');
    if (skip.has(rel)) continue;
    const dest = path.join(out, rel);
    if (e.isDirectory()) { fs.mkdirSync(dest, { recursive: true }); copy(abs); } else fs.copyFileSync(abs, dest);
  }
})(src);
fs.writeFileSync(path.join(out, 'config/env.js'), `/* generated for ${env} — do not edit */\nwindow.MA_ENV = ${JSON.stringify({ ...cfg, APP_ENV: env })};\n`);
// cache-bust local scripts/styles
const version = crypto.createHash('sha1').update(fs.readdirSync(out).join() + Date.now()).digest('hex').slice(0, 8);
const idx = path.join(out, 'index.html');
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace(/(src|href)="((?!https?:)[^"]+\.(?:js|css))"/g, `$1="$2?v=${version}"`));
console.log(`built ${env} → ${path.relative(root, out)} (API ${cfg.API_BASE_URL || 'none — demo mode'})`);
