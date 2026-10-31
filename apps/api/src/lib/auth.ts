import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { forbidden, unauthorized } from './errors.js';

export type Role = 'user' | 'admin' | 'superadmin';
export interface AuthUser { id: string; role: Role; name: string; email: string | null }
declare module 'fastify' { interface FastifyRequest { user?: AuthUser } }

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

export function signAccess(cfg: Config, u: AuthUser) {
  return jwt.sign({ sub: u.id, role: u.role, name: u.name, email: u.email }, cfg.JWT_SECRET, { expiresIn: `${cfg.ACCESS_TOKEN_TTL_MIN}m`, issuer: 'mod-alpha', audience: cfg.APP_ENV });
}
export function readAccess(cfg: Config, token: string): AuthUser | null {
  try {
    const p = jwt.verify(token, cfg.JWT_SECRET, { issuer: 'mod-alpha', audience: cfg.APP_ENV }) as any;
    return { id: p.sub, role: p.role, name: p.name, email: p.email };
  } catch { return null; }
}
const cookieBase = (cfg: Config) => ({ httpOnly: true, secure: cfg.APP_ENV !== 'test' && cfg.API_PUBLIC_URL.startsWith('https'), sameSite: 'lax' as const, path: '/', domain: cfg.COOKIE_DOMAIN || undefined });

export async function issueSession(db: Db, cfg: Config, reply: FastifyReply, req: FastifyRequest, u: AuthUser, remember = true) {
  const refresh = randomToken();
  const days = remember ? cfg.REFRESH_TOKEN_TTL_DAYS : 1;
  await db.query('INSERT INTO sessions (user_id, refresh_hash, expires_at, user_agent, ip) VALUES ($1,$2, now() + ($3 || \' days\')::interval, $4, $5)', [u.id, sha256(refresh), String(days), req.headers['user-agent'] ?? null, req.ip]);
  const access = signAccess(cfg, u);
  reply.setCookie('ma_at', access, { ...cookieBase(cfg), maxAge: cfg.ACCESS_TOKEN_TTL_MIN * 60 });
  reply.setCookie('ma_rt', refresh, { ...cookieBase(cfg), path: '/api/v1/auth', maxAge: days * 86400 });
  return { accessToken: access, expiresIn: cfg.ACCESS_TOKEN_TTL_MIN * 60 };
}
export function clearSession(cfg: Config, reply: FastifyReply) {
  reply.clearCookie('ma_at', cookieBase(cfg));
  reply.clearCookie('ma_rt', { ...cookieBase(cfg), path: '/api/v1/auth' });
}
export function authenticate(cfg: Config) {
  return async (req: FastifyRequest) => {
    const h = req.headers.authorization;
    const token = h?.startsWith('Bearer ') ? h.slice(7) : (req.cookies as any)?.ma_at;
    if (token) { const u = readAccess(cfg, token); if (u) req.user = u; }
  };
}
export function requireUser(req: FastifyRequest): AuthUser { if (!req.user) throw unauthorized(); return req.user; }
export function requireAdmin(req: FastifyRequest, superOnly = false): AuthUser {
  const u = requireUser(req);
  if (superOnly ? u.role !== 'superadmin' : u.role === 'user') throw forbidden('Admin access required');
  return u;
}
