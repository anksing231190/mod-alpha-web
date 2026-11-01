/**
 * Builds the Fastify application (used by server.ts and by the tests).
 *
 * Order of things on every request:
 *   1. security headers (helmet), CORS for the website origin, cookies, multipart uploads, rate limit (300/min/IP)
 *   2. authenticate()  → attaches req.user when the session is valid (modules/auth/session.ts)
 *   3. the matching route from one of the feature modules (modules/<feature>/routes.ts), all under /api/v1
 *   4. errors are turned into { error: { code, message, details } } JSON
 * API responses are sent with Cache-Control: no-store (personal data must never be cached).
 */
import Fastify, { FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { HttpError } from './shared/errors.js';
import { authenticate } from './modules/auth/session.js';
import { createProviders, Providers } from './providers/index.js';
import { registerModules } from './modules/index.js';

// Shared dependencies every module reads from app.deps: configuration, database pool and the external providers.
export interface Deps { cfg: Config; db: Db; providers: Providers }
declare module 'fastify' { interface FastifyInstance { deps: Deps } interface FastifyRequest { rawBody?: string } }

// `overrides` lets tests swap individual providers (for example a failing payment gateway).
export async function buildApp(cfg: Config, db: Db, overrides: Partial<Providers> = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: cfg.APP_ENV === 'test' ? false : { level: cfg.LOG_LEVEL, redact: ['req.headers.authorization', 'req.headers.cookie'] }, trustProxy: true, bodyLimit: 2 * 1024 * 1024 });
  const providers = { ...createProviders({ db, cfg, log: app.log }), ...overrides };
  app.decorate('deps', { cfg, db, providers });

  // keep the raw body for webhook signature verification
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    req.rawBody = body as string;
    if (!body) return done(null, {});
    try { done(null, JSON.parse(body as string)); } catch (e: any) { e.statusCode = 400; done(e); }
  });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: cfg.CORS_ORIGINS.split(',').map((s) => s.trim()), credentials: true });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: cfg.MAX_UPLOAD_MB * 1024 * 1024, files: 1 } });
  await app.register(rateLimit, { global: true, max: cfg.APP_ENV === 'test' ? 10000 : 300, timeWindow: '1 minute' });
  app.addHook('onRequest', authenticate(cfg, db));
  // API responses carry personal data: never store them in browser or proxy caches (no stale pages after logout)
  app.addHook('onSend', async (req, reply) => { if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store'); });

  // One error format for the whole API. HttpError = expected errors thrown by routes; anything else is logged and
  // returned as a generic 500.
  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: { code: err.code, message: err.message, details: err.details } });
    if (err.statusCode === 429) return reply.status(429).send({ error: { code: 'rate_limited', message: 'Too many requests, slow down.' } });
    if (err.code === 'FST_REQ_FILE_TOO_LARGE') return reply.status(413).send({ error: { code: 'too_large', message: `File exceeds ${cfg.MAX_UPLOAD_MB}MB` } });
    if (err.statusCode && err.statusCode < 500) return reply.status(err.statusCode).send({ error: { code: 'bad_request', message: err.message } });
    req.log.error(err);
    return reply.status(500).send({ error: { code: 'internal', message: 'Something went wrong' } });
  });
  app.setNotFoundHandler((req, reply) => reply.status(404).send({ error: { code: 'not_found', message: `No route ${req.method} ${req.url}` } }));

  // Liveness / readiness probes for the hosting platform (no authentication).
  app.get('/health', async () => ({ ok: true, env: cfg.APP_ENV }));
  app.get('/ready', async () => { await db.query('SELECT 1'); return { ok: true }; });
  // Every feature module is mounted under /api/v1 (see modules/index.ts).
  await app.register(async (api) => registerModules(api), { prefix: '/api/v1' });
  return app;
}
