/**
 * Helpers shared by all provider adapters.
 */
import crypto from 'node:crypto';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { upstream } from '../shared/errors.js';
/** What every adapter receives: database (for the mock outbox), config (credentials) and a logger. */
export interface Ctx { db: Db; cfg: Config; log: { info: (o: any, m?: string) => void; warn: (o: any, m?: string) => void } }

/** Mock helper: record what WOULD have been sent in `mock_outbox` and return a fake message id. */
export async function outbox(ctx: Ctx, provider: string, channel: string, recipient: string, body: string, subject?: string, meta?: unknown) {
  const r = await ctx.db.query('INSERT INTO mock_outbox (provider, channel, recipient, subject, body, meta) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [provider, channel, recipient, subject ?? null, body, meta ? JSON.stringify(meta) : null]);
  return `mock_${channel}_${r.rows[0].id}`;
}
/** fetch() with a timeout (default 15 s); non-2xx responses become a 502 "provider_error". */
export async function http(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), init.timeoutMs ?? 15000);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
    if (!res.ok) throw upstream(`${new URL(url).host} responded ${res.status}: ${text.slice(0, 200)}`);
    return { json, text };
  } finally { clearTimeout(t); }
}
/** Hex HMAC-SHA256 (webhook and checkout signatures). */
export const hmac = (secret: string, body: string | Buffer) => crypto.createHmac('sha256', secret).update(body).digest('hex');
/** Constant-time string comparison for signatures. */
export const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
