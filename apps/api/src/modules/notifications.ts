import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { badRequest, notFound } from '../lib/errors.js';
import { requireAdmin } from '../lib/auth.js';
import { audit } from '../lib/audit.js';
import type { Deps } from '../app.js';

const CH = z.enum(['email', 'sms', 'push', 'inapp', 'whatsapp']);
export const render = (t: string, vars: Record<string, string>) => t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');
const AUDIENCE: Record<string, string> = {
  active_subscribers: `SELECT DISTINCT u.id, u.full_name, u.email, u.mobile, coalesce(p.data,'{}') prefs FROM users u JOIN subscriptions s ON s.user_id=u.id AND s.status='Active' LEFT JOIN preferences p ON p.user_id=u.id WHERE u.account_status='Active' AND u.deleted_at IS NULL`,
  all_users: `SELECT u.id, u.full_name, u.email, u.mobile, coalesce(p.data,'{}') prefs FROM users u LEFT JOIN preferences p ON p.user_id=u.id WHERE u.role='user' AND u.account_status='Active' AND u.deleted_at IS NULL`,
  marketing_opt_in: `SELECT u.id, u.full_name, u.email, u.mobile, coalesce(p.data,'{}') prefs FROM users u LEFT JOIN preferences p ON p.user_id=u.id WHERE u.role='user' AND u.marketing_consent AND u.account_status='Active' AND u.deleted_at IS NULL`,
};

/** Send a campaign now: consent-aware, one delivery row per user/channel. Used by the jobs worker. */
export async function dispatchCampaign(deps: Deps, campaignId: string) {
  const { db, providers } = deps;
  const c = (await db.query(`UPDATE campaigns SET status='Sending' WHERE id=$1 AND status='Scheduled' RETURNING *`, [campaignId])).rows[0];
  if (!c) return null;
  const t = (await db.query('SELECT * FROM notification_templates WHERE id=$1', [c.template_id])).rows[0];
  const sip = (await db.query(`SELECT month, recommended_day FROM sip_dates WHERE status='Published' ORDER BY month DESC LIMIT 1`)).rows[0];
  const users = (await db.query(AUDIENCE[c.audience] ?? AUDIENCE.active_subscribers)).rows;
  const stats: Record<string, number> = { scheduled: 0, delivered: 0, failed: 0, skipped: 0 };
  for (const u of users) {
    const vars = { name: u.full_name, date: sip ? `${sip.recommended_day} ${new Date(sip.month + '-01').toLocaleString('en-GB', { month: 'long' })}` : '', month: sip?.month ?? '' };
    for (const ch of c.channels as string[]) {
      if (ch !== 'inapp' && u.prefs?.channels && u.prefs.channels[ch] === false) { stats.skipped++; continue; }
      stats.scheduled++;
      try {
        let ref = '';
        if (ch === 'email') { if (!u.email) { stats.skipped++; continue; } ref = await providers.email.send({ to: u.email, subject: render(t.subject, vars), text: render(t.body, vars) + '\n\nUnsubscribe: Settings → Notifications' }); }
        else if (ch === 'sms') { if (!u.mobile) { stats.skipped++; continue; } ref = await providers.sms.send({ to: u.mobile, text: render(t.sms_text ?? t.subject, vars), vars }); }
        else if (ch === 'push') ref = await providers.push.send({ token: `user:${u.id}`, title: render(t.subject, vars), body: render(t.sms_text ?? t.body, vars) });
        else if (ch === 'whatsapp') { if (!u.mobile) { stats.skipped++; continue; } ref = await providers.whatsapp.sendTemplate({ to: u.mobile, template: t.key, vars: [vars.name, vars.date] }); }
        else if (ch === 'inapp') { await db.query(`INSERT INTO notifications (user_id, kind, title, body, link) VALUES ($1,'campaign',$2,$3,'#/user/overview')`, [u.id, render(t.subject, vars), render(t.sms_text ?? t.body, vars)]); ref = 'inapp'; }
        await db.query('INSERT INTO deliveries (campaign_id, user_id, channel, status, provider, provider_ref) VALUES ($1,$2,$3,$4,$5,$6)', [c.id, u.id, ch, 'sent', ch === 'inapp' ? 'inapp' : (providers as any)[ch]?.name ?? 'mock', ref]);
        stats.delivered++;
      } catch (e: any) {
        stats.failed++;
        await db.query('INSERT INTO deliveries (campaign_id, user_id, channel, status, provider, error) VALUES ($1,$2,$3,$4,$5,$6)', [c.id, u.id, ch, 'failed', 'n/a', String(e.message).slice(0, 300)]);
      }
    }
  }
  await db.query(`UPDATE campaigns SET status='Completed', stats=$2 WHERE id=$1`, [c.id, JSON.stringify(stats)]);
  return stats;
}

export default async function notifications(app: FastifyInstance) {
  const deps = app.deps, { db } = deps;
  app.get('/admin/notification-templates', async (req) => { requireAdmin(req); return { items: (await db.query('SELECT * FROM notification_templates ORDER BY name')).rows }; });
  const tplBody = z.object({ name: z.string().min(3), channels: z.array(CH).min(1), subject: z.string().min(3), body: z.string().min(10), smsText: z.string().max(160).optional(), status: z.enum(['Draft', 'Active', 'Archived']).default('Draft') });
  app.put('/admin/notification-templates/:key', async (req) => {
    requireAdmin(req);
    const b = parse(tplBody, req.body), key = (req.params as any).key;
    if (!/^[a-z0-9_]{3,40}$/.test(key)) throw badRequest('Template key must be lower_snake_case');
    const r = await db.query(`INSERT INTO notification_templates (key, name, channels, subject, body, sms_text, status) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (key) DO UPDATE SET name=$2, channels=$3, subject=$4, body=$5, sms_text=$6, status=$7, updated_at=now() RETURNING *`, [key, b.name, b.channels, b.subject, b.body, b.smsText ?? null, b.status]);
    await audit(db, req, { action: 'NOTIFICATION_TEMPLATE_EDITED', category: 'Notification', resource: key });
    return { template: r.rows[0] };
  });
  app.post('/admin/notification-templates/:key/preview', async (req) => {
    requireAdmin(req);
    const t = (await db.query('SELECT * FROM notification_templates WHERE key=$1', [(req.params as any).key])).rows[0]; if (!t) throw notFound();
    const sip = (await db.query(`SELECT month, recommended_day FROM sip_dates WHERE status='Published' ORDER BY month DESC LIMIT 1`)).rows[0];
    const vars = { name: 'Ankit', date: sip ? `${sip.recommended_day} ${new Date(sip.month + '-01').toLocaleString('en-GB', { month: 'long' })}` : '12 November', month: sip?.month ?? '' };
    return { email: { subject: render(t.subject, vars), body: render(t.body, vars) }, sms: render(t.sms_text ?? t.subject, vars), push: { title: render(t.subject, vars), body: render(t.sms_text ?? t.body, vars) } };
  });
  app.get('/admin/campaigns', async (req) => {
    requireAdmin(req);
    const items = (await db.query(`SELECT c.*, t.name template_name, (SELECT count(*)::int FROM deliveries d WHERE d.campaign_id=c.id) deliveries FROM campaigns c JOIN notification_templates t ON t.id=c.template_id ORDER BY c.scheduled_for DESC LIMIT 50`)).rows;
    const k = (await db.query(`SELECT count(*) FILTER (WHERE status='sent')::int sent, count(*) FILTER (WHERE status='failed')::int failed FROM deliveries WHERE created_at > now() - interval '30 days'`)).rows[0];
    const optIn = (await db.query(`SELECT round(100.0 * count(*) FILTER (WHERE marketing_consent) / greatest(count(*),1), 1) pct FROM users WHERE role='user'`)).rows[0].pct;
    const next = (await db.query(`SELECT name, scheduled_for FROM campaigns WHERE status='Scheduled' ORDER BY scheduled_for LIMIT 1`)).rows[0];
    const recipients = (await db.query(`SELECT count(*)::int n FROM (${AUDIENCE.active_subscribers}) a`)).rows[0].n;
    return { items, kpis: { ...k, successRate: k.sent + k.failed ? +(100 * k.sent / (k.sent + k.failed)).toFixed(1) : null, optInPct: optIn, next, scheduledRecipients: recipients } };
  });
  app.post('/admin/campaigns', async (req) => {
    const admin = requireAdmin(req);
    const b = parse(z.object({ name: z.string().min(3), templateKey: z.string(), channels: z.array(CH).min(1), audience: z.enum(['active_subscribers', 'all_users', 'marketing_opt_in']), scheduledFor: z.string().datetime({ offset: true }).optional(), sendNow: z.boolean().default(false) }), req.body);
    const t = (await db.query(`SELECT id, status FROM notification_templates WHERE key=$1`, [b.templateKey])).rows[0];
    if (!t) throw notFound('Template not found'); if (t.status !== 'Active') throw badRequest('Activate the template before scheduling a campaign');
    const r = await db.query(`INSERT INTO campaigns (name, template_id, channels, audience, scheduled_for, status, created_by) VALUES ($1,$2,$3,$4,$5,'Scheduled',$6) RETURNING *`, [b.name, t.id, b.channels, b.audience, b.scheduledFor ?? new Date().toISOString(), admin.id]);
    await audit(db, req, { action: 'CAMPAIGN_SCHEDULED', category: 'Notification', resource: b.name, meta: { audience: b.audience, channels: b.channels } });
    if (b.sendNow) setImmediate(() => dispatchCampaign(deps, r.rows[0].id).catch((e) => app.log.error(e, 'campaign dispatch failed')));
    return { campaign: r.rows[0], sending: b.sendNow };
  });
  app.post('/admin/campaigns/:id/cancel', async (req) => {
    requireAdmin(req);
    const r = await db.query(`UPDATE campaigns SET status='Cancelled' WHERE id=$1 AND status='Scheduled' RETURNING id`, [(req.params as any).id]);
    if (!r.rows[0]) throw badRequest('Only scheduled campaigns can be cancelled');
    return { ok: true };
  });
}
