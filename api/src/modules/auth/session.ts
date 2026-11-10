/**
 * Authentication & session core (shared by every feature).
 *
 * How a sign-in works
 *  1. A successful login calls `issueSession()`. It stores a row in `sessions` and sets two httpOnly cookies:
 *       ma_at  — short-lived access token (JWT, ACCESS_TOKEN_TTL_MIN, default 15 min) carrying the session id
 *       ma_rt  — refresh token (random, only its SHA-256 hash is stored) used by POST /auth/refresh
 *  2. Every request runs `authenticate()` (registered as an onRequest hook in app.ts). It verifies the JWT and
 *     then re-checks the session row, so logout / "sign out everywhere" / suspension take effect immediately.
 *  3. Session rules enforced on the server (the browser only shows warnings):
 *       • inactivity — no activity for SESSION_IDLE_MINUTES (default 15) ends the session;
 *       • absolute   — SESSION_MAX_HOURS_USER (12) / SESSION_MAX_HOURS_ADMIN (8) after sign-in, whatever happens.
 *     "Activity" = any request the user triggers, plus the browser's heartbeat (POST /auth/activity) while the
 *     person is moving the mouse / typing. Requests sent with header `x-ma-background: 1` do not count.
 */
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../../config.js';
import type { Db, Q } from '../../db.js';
import { forbidden, HttpError, unauthorized } from '../../shared/errors.js';
import { audit } from '../../shared/audit.js';

export type Role = 'user' | 'admin' | 'superadmin';
/** The signed-in person attached to a request (`req.user`). `sid` = the session row id. */
export interface AuthUser { id: string; role: Role; name: string; email: string | null; sid?: string }
/** Why a session ended on its own (sent to the browser so it can explain the sign-out). */
export type EndReason = 'idle' | 'absolute';
declare module 'fastify' { interface FastifyRequest { user?: AuthUser; sessionEnded?: EndReason } }

/** Hex SHA-256 — used to store refresh tokens, reset tokens and OTPs without keeping the secret itself. */
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
/** URL-safe random secret (refresh tokens, reset links). */
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/** Sign the short-lived access token. */
export function signAccess(cfg: Config, u: AuthUser) {
  return jwt.sign({ sub: u.id, role: u.role, name: u.name, email: u.email, sid: u.sid }, cfg.JWT_SECRET, { expiresIn: `${cfg.ACCESS_TOKEN_TTL_MIN}m`, issuer: 'mod-alpha', audience: cfg.APP_ENV });
}
/** Verify an access token; returns null when it is invalid or expired. */
export function readAccess(cfg: Config, token: string): AuthUser | null {
  try {
    const p = jwt.verify(token, cfg.JWT_SECRET, { issuer: 'mod-alpha', audience: cfg.APP_ENV }) as any;
    return { id: p.sub, role: p.role, name: p.name, email: p.email, sid: p.sid };
  } catch { return null; }
}
/** Cookie flags shared by both session cookies (Secure only when the API is served over https). */
// COOKIE_DOMAIN only if it matches the API's own address: a cookie for another domain (e.g. ".stage.modalpha.in"
// while the API runs on a temporary sslip.io address) would be rejected by the browser and sign-in would fail.
export function cookieDomain(cfg: Pick<Config, 'COOKIE_DOMAIN' | 'API_PUBLIC_URL'>) {
  const d = (cfg.COOKIE_DOMAIN || '').trim();
  if (!d) return undefined;
  let host = ''; try { host = new URL(cfg.API_PUBLIC_URL).hostname; } catch { return undefined; }
  const bare = d.replace(/^\./, '');
  return host === bare || host.endsWith('.' + bare) ? d : undefined;
}
const cookieBase = (cfg: Config) => ({ httpOnly: true, secure: cfg.APP_ENV !== 'test' && cfg.API_PUBLIC_URL.startsWith('https'), sameSite: 'lax' as const, path: '/', domain: cookieDomain(cfg) });

/** Maximum length of one sign-in for this role, in hours. */
export const maxSessionHours = (cfg: Config, role: Role) => (role === 'user' ? cfg.SESSION_MAX_HOURS_USER : cfg.SESSION_MAX_HOURS_ADMIN);
/** Inactivity limit in seconds. */
export const idleSeconds = (cfg: Config) => Math.round(cfg.SESSION_IDLE_MINUTES * 60);

/** What the browser needs to run its warning timers (returned by login, refresh, /auth/session, /auth/activity). */
export function sessionInfo(cfg: Config, s: { absolute_expires_at: Date | string; last_seen_at: Date | string }) {
  return { idleTimeoutSec: idleSeconds(cfg), absoluteExpiresAt: new Date(s.absolute_expires_at).toISOString(), lastSeenAt: new Date(s.last_seen_at).toISOString(), warnBeforeSec: 60 };
}

/**
 * Start a session (or continue one after a refresh-token rotation).
 * `carry` keeps the original absolute end time and last activity, so refreshing never extends a sign-in.
 * `remember` no longer lengthens the session (the browser uses it only to pre-fill the email address).
 */
export async function issueSession(db: Db, cfg: Config, reply: FastifyReply, req: FastifyRequest, u: AuthUser, _remember = true, carry?: { absoluteExpiresAt: Date; lastSeenAt: Date }) {
  const refresh = randomToken();
  const absolute = carry?.absoluteExpiresAt ?? new Date(Date.now() + maxSessionHours(cfg, u.role) * 3600_000);
  const lastSeen = carry?.lastSeenAt ?? new Date();
  const row = (await db.query(
    `INSERT INTO sessions (user_id, refresh_hash, expires_at, absolute_expires_at, last_seen_at, user_agent, ip)
     VALUES ($1,$2,$3,$3,$4,$5,$6) RETURNING id, absolute_expires_at, last_seen_at`,
    [u.id, sha256(refresh), absolute, lastSeen, req.headers['user-agent'] ?? null, req.ip])).rows[0];
  const access = signAccess(cfg, { ...u, sid: row.id });
  const refreshMaxAge = Math.max(60, Math.round((absolute.getTime() - Date.now()) / 1000));
  reply.setCookie('ma_at', access, { ...cookieBase(cfg), maxAge: cfg.ACCESS_TOKEN_TTL_MIN * 60 });
  reply.setCookie('ma_rt', refresh, { ...cookieBase(cfg), path: '/api/v1/auth', maxAge: refreshMaxAge });
  return { accessToken: access, expiresIn: cfg.ACCESS_TOKEN_TTL_MIN * 60, session: sessionInfo(cfg, row) };
}
/** Remove both session cookies from the browser. */
export function clearSession(cfg: Config, reply: FastifyReply) {
  reply.clearCookie('ma_at', cookieBase(cfg));
  reply.clearCookie('ma_rt', { ...cookieBase(cfg), path: '/api/v1/auth' });
}

/** Which rule (if any) has ended this session row. */
export function expiredBy(cfg: Config, s: { last_seen_at: Date | string; absolute_expires_at: Date | string }, now = Date.now()): EndReason | null {
  if (new Date(s.absolute_expires_at).getTime() <= now) return 'absolute';
  if (new Date(s.last_seen_at).getTime() + idleSeconds(cfg) * 1000 <= now) return 'idle';
  return null;
}
/** End a session because of a timeout and record it in the audit log (once). */
export async function endForTimeout(db: Q, req: FastifyRequest, s: { id: string; user_id: string }, reason: EndReason) {
  const r = await db.query(`UPDATE sessions SET revoked_at=now(), end_reason=$2 WHERE id=$1 AND revoked_at IS NULL RETURNING id`, [s.id, reason]);
  if (r.rowCount) await audit(db, req, { action: reason === 'idle' ? 'SESSION_TIMEOUT_IDLE' : 'SESSION_TIMEOUT_ABSOLUTE', category: 'Access', resource: s.user_id, actorLabel: 'system' });
}
/** The 401 sent when a session ended on its own; the browser shows a matching message. */
export const sessionExpired = (reason: EndReason) => new HttpError(401, 'session_expired',
  reason === 'idle' ? 'You were signed out after a period of inactivity. Please sign in again.' : 'Your session reached its time limit. Please sign in again.', { reason });

/**
 * onRequest hook: attach `req.user` when the request carries a valid access token AND its session is still
 * open (not revoked, not idle too long, before its absolute end, account active). Also records activity.
 * One indexed lookup per authenticated request; the activity write happens at most every 30 seconds.
 */
export function authenticate(cfg: Config, db: Db) {
  return async (req: FastifyRequest) => {
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : (req.cookies as any)?.ma_at;
    if (!token) return;
    const u = readAccess(cfg, token);
    if (!u || !u.sid) return;
    const s = (await db.query(`SELECT s.id, s.user_id, s.last_seen_at, s.absolute_expires_at FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND u.account_status='Active' AND u.deleted_at IS NULL`, [u.sid, u.id])).rows[0];
    if (!s) return;
    const ended = expiredBy(cfg, s);
    if (ended) { await endForTimeout(db, req, s, ended); req.sessionEnded = ended; return; }
    req.user = u;
    // Activity: every user-triggered request counts; background polling (header x-ma-background) does not.
    const background = req.headers['x-ma-background'] === '1' || req.url.startsWith('/api/v1/auth/session');
    if (!background && Date.now() - new Date(s.last_seen_at).getTime() > 30_000) await db.query('UPDATE sessions SET last_seen_at=now() WHERE id=$1', [s.id]);
  };
}
/** Use in a route: returns the signed-in user or answers 401 (with the timeout reason when there is one). */
export function requireUser(req: FastifyRequest): AuthUser { if (!req.user) throw req.sessionEnded ? sessionExpired(req.sessionEnded) : unauthorized(); return req.user; }
/** Use in an admin route: 403 for normal users; `superOnly` limits it to super admins. */
export function requireAdmin(req: FastifyRequest, superOnly = false): AuthUser {
  const u = requireUser(req);
  if (superOnly ? u.role !== 'superadmin' : u.role === 'user') throw forbidden('Admin access required');
  return u;
}
