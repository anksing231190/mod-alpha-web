/**
 * Content module — public content and help.
 *   GET /faqs · GET /insights · GET /public/activity (anonymous counts for the landing page)
 *   POST /assistant/messages (AI assistant; daily limit per plan) · POST /support/tickets
 */
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { tooMany } from '../../shared/errors.js';
import { requireUser } from '../auth/session.js';
import { entitlements } from '../billing/routes.js';

// Instructions for the AI assistant: explain data, never give personal advice or place orders.
const SYSTEM = `You are the Mod Alpha assistant for Indian mutual fund investors. Explain fund data, returns (CAGR, volatility, Sharpe) and SIP concepts in plain language.
Rules: use only the fund data provided in the context; never give personalised buy/sell advice; never promise returns; remind users that past performance does not guarantee future results; Mod Alpha does not place orders.`;

export default async function content(app: FastifyInstance) {
  const { db, providers, cfg } = app.deps;
  // Published FAQs and AI insight cards.
  app.get('/faqs', async () => ({ items: (await db.query('SELECT id, category, question, answer FROM faqs WHERE published ORDER BY sort, id')).rows }));
  app.get('/insights', async () => ({ items: (await db.query(`SELECT id, icon, title, body, published_at FROM insights WHERE status='Published' ORDER BY published_at DESC LIMIT 10`)).rows }));

  /** Aggregated, anonymous public activity for the landing-page toast (no PII). */
  app.get('/public/activity', async (req) => {
    const p = parse(z.object({ limit: z.coerce.number().int().min(1).max(20).default(8) }), req.query);
    // A name is shown only for members who opted in (preferences.showInActivityFeed); and then only the first
    // name + last initial ("Rahul K."). Everyone else appears as "A new member". No emails, ids or exact times.
    const showName = `CASE WHEN (pr.data->>'showInActivityFeed')::boolean IS TRUE THEN split_part(u.full_name, ' ', 1) || CASE WHEN position(' ' in u.full_name) > 0 THEN ' ' || upper(left(regexp_replace(u.full_name, '^.* ', ''), 1)) || '.' ELSE '' END END`;
    const r = await db.query(`(SELECT 'signup' AS type, u.created_at AS "createdAt", ${showName} AS name, NULL AS plan FROM users u LEFT JOIN preferences pr ON pr.user_id=u.id WHERE u.role='user' AND u.created_at > now() - interval '48 hours' ORDER BY u.created_at DESC LIMIT $1)
      UNION ALL (SELECT 'subscription_activated', s.updated_at, ${showName}, s.plan_id FROM subscriptions s JOIN users u ON u.id=s.user_id LEFT JOIN preferences pr ON pr.user_id=u.id WHERE s.status='Active' AND s.provider<>'import' AND s.updated_at > now() - interval '48 hours' ORDER BY s.updated_at DESC LIMIT $1) ORDER BY "createdAt" DESC LIMIT $1`, [p.limit]);
    return { events: r.rows };
  });

  // POST /assistant/messages — check the plan's daily question limit (Free = 1), answer with the AI provider using
  // live fund data as context, and count usage.
  app.post('/assistant/messages', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) })).min(1).max(20) }), req.body);
    const ent = await entitlements(db, u.id);
    const limit = Number(ent.limits?.ai_queries_per_day ?? 1);
    const used = (await db.query('SELECT queries FROM assistant_usage WHERE user_id=$1 AND day=CURRENT_DATE', [u.id])).rows[0]?.queries ?? 0;
    if (limit >= 0 && used >= limit) throw tooMany(`Your ${ent.plan} plan includes ${limit} AI ${limit === 1 ? 'query' : 'queries'} per day. Upgrade for more.`);
    // ground the model in current data
    const top = (await db.query(`SELECT f.scheme_name, f.category, m.r1, m.r3, m.r5, m.vol3, m.sharpe3 FROM fund_metrics m JOIN funds f USING (fund_id) WHERE f.is_active ORDER BY m.r5 DESC NULLS LAST LIMIT 15`)).rows;
    const sip = (await db.query(`SELECT month, recommended_day, uplift_pct FROM sip_dates WHERE status='Published' ORDER BY month DESC LIMIT 1`)).rows[0];
    const context = `Fund data (returns are CAGR %):\n${top.map((f) => `- ${f.scheme_name} [${f.category}] 1Y ${f.r1} 3Y ${f.r3} 5Y ${f.r5} vol ${f.vol3} sharpe ${f.sharpe3}`).join('\n')}\nCurrent SIP date: ${sip ? `${sip.month} day ${sip.recommended_day} (+${sip.uplift_pct}% historical uplift)` : 'not published'}`;
    const out = await providers.ai.complete({ system: `${SYSTEM}\n\n${context}`, messages: b.messages });
    await db.query(`INSERT INTO assistant_usage (user_id, day, queries, tokens_in, tokens_out) VALUES ($1, CURRENT_DATE, 1, $2, $3) ON CONFLICT (user_id, day) DO UPDATE SET queries=assistant_usage.queries+1, tokens_in=assistant_usage.tokens_in+$2, tokens_out=assistant_usage.tokens_out+$3`, [u.id, out.tokensIn, out.tokensOut]);
    return { reply: out.text, provider: providers.ai.name, usage: { today: used + 1, limit }, disclaimer: 'Not investment advice. Past performance does not guarantee future returns.' };
  });

  // POST /support/tickets — store the ticket and pass it to the helpdesk provider (5 per 10 minutes per IP).
  app.post('/support/tickets', { config: { rateLimit: { max: cfg.APP_ENV === 'test' ? 100 : 5, timeWindow: '10 minutes' } } }, async (req) => {
    const b = parse(z.object({ email: z.string().email(), topic: z.enum(['Product question', 'Fund data', 'Subscription', 'Account & privacy']), message: z.string().trim().min(10).max(2000) }), req.body);
    const number = `MA-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomInt(1000, 9999)}`;
    const ref = await providers.support.create({ email: b.email, subject: b.topic, message: b.message, number });
    await db.query('INSERT INTO support_tickets (number, user_id, email, topic, message, provider, provider_ref) VALUES ($1,$2,$3,$4,$5,$6,$7)', [number, req.user?.id ?? null, b.email, b.topic, b.message, providers.support.name, ref]);
    return { number, message: `Request ${number} received. We reply within one business day.` };
  });
}
