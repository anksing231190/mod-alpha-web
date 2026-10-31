/** Loads KEY=VALUE pairs from ENV_FILE or <repo>/.env.local (without overriding real env vars). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const file = process.env.ENV_FILE ? path.resolve(process.env.ENV_FILE) : path.join(repo, '.env.local');
if (process.env.APP_ENV !== 'test' && fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
