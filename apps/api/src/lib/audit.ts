import type { FastifyRequest } from 'fastify';
import type { Q } from '../db.js';
export async function audit(q: Q, req: FastifyRequest | null, a: { action: string; category: 'Configuration' | 'Data' | 'Access' | 'Subscription' | 'Notification' | 'Account'; resource?: string; outcome?: 'Success' | 'Blocked' | 'Failed'; meta?: unknown; actorLabel?: string }) {
  const u = req?.user;
  await q.query('INSERT INTO audit_log (actor_id, actor_label, action, category, resource, outcome, ip, meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [u?.id ?? null, a.actorLabel ?? u?.email ?? u?.name ?? 'system', a.action, a.category, a.resource ?? null, a.outcome ?? 'Success', req?.ip ?? null, a.meta ? JSON.stringify(a.meta) : null]);
}
