/**
 * Content module — public content and help.
 *   GET /faqs · GET /public/activity (anonymous counts for the landing page)
 *   POST /assistant/messages (AI assistant; daily + monthly question caps per plan, app-wide monthly budget)
 *   POST /support/tickets
 */
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { notFound, tooMany } from '../../shared/errors.js';
import { audit } from '../../shared/audit.js';
import { requireAdmin, requireUser } from '../auth/session.js';
import { entitlements } from '../billing/routes.js';
import { aiPricePerMTok } from '../../providers/ai.js';
import { mockAnswer } from '../../providers/mock-ai.js';

// Instructions for the AI assistant: explain data, never give personal advice or place orders.
const SYSTEM = `You are the Mod Alpha assistant for Indian mutual fund investors. Explain fund data, returns (CAGR, volatility, Sharpe) and SIP concepts in plain language.
Rules: use only the fund data provided in the context; never give personalised buy/sell advice; never promise returns; remind users that past performance does not guarantee future results; Mod Alpha does not place orders.`;

export default async function content(app: FastifyInstance) {
  const { db, providers, cfg } = app.deps;
  // Published FAQs.
  app.get('/faqs', async () => ({ items: (await db.query('SELECT id, category, question, answer FROM faqs WHERE published ORDER BY sort, id')).rows }));
  // (GET /insights moved to modules/insights)

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

  // POST /assistant/messages — answer a question with the AI provider, grounded in live fund data.
  // Caps (from the plan's limits, editable by admins): ai_queries_per_day and ai_queries_per_month (-1 = no cap).
  // App-wide guard: when this month's estimated spend reaches AI_MONTHLY_BUDGET_INR, answers come from the free
  // rule-based assistant until the month ends (no AI cost). Only the last 6 messages are sent, to keep cost down.
  app.post('/assistant/messages', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req) => {
    const u = requireUser(req);
    const b = parse(z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(2000) })).min(1).max(20) }), req.body);
    const ent = await entitlements(db, u.id);
    const usage = await aiUsage(u.id, ent.limits);
    if (usage.monthLimit >= 0 && usage.month >= usage.monthLimit) throw tooMany(`You have used all ${usage.monthLimit} AI questions in your ${ent.plan} plan this month. They reset on the 1st.${ent.plan === 'Premium' ? '' : ' Upgrade for more.'}`);
    if (usage.limit >= 0 && usage.today >= usage.limit) throw tooMany(`Your ${ent.plan} plan includes ${usage.limit} AI ${usage.limit === 1 ? 'question' : 'questions'} a day. Ask again tomorrow${ent.plan === 'Premium' ? '' : ' or upgrade for more'}.`);
    // ground the model in current data
    const top = (await db.query(`SELECT f.scheme_name, f.category, m.r1, m.r3, m.r5, m.vol3, m.sharpe3 FROM fund_metrics m JOIN funds f USING (fund_id) WHERE f.is_active ORDER BY m.r5 DESC NULLS LAST LIMIT 15`)).rows;
    // the recommended day is a paid feature: the assistant only knows it for subscribers
    const paid = ent.plan !== 'Free' && ent.subscription?.status === 'Active';
    const sip = paid ? (await db.query(`SELECT month, recommended_day, uplift_pct FROM sip_dates WHERE status='Published' ORDER BY month DESC LIMIT 1`)).rows[0] : null;
    const context = `Fund data (returns are CAGR %):\n${top.map((f) => `- ${f.scheme_name} [${f.category}] 1Y ${f.r1} 3Y ${f.r3} 5Y ${f.r5} vol ${f.vol3} sharpe ${f.sharpe3}`).join('\n')}\nCurrent SIP date: ${sip ? `${sip.month} day ${sip.recommended_day} (+${sip.uplift_pct}% historical uplift)` : paid ? 'not published' : 'shown to Pro and Premium subscribers only — do not guess it; say it is on the dashboard after subscribing'}`;
    const messages = b.messages.slice(-6);
    if (messages[0].role !== 'user') messages.shift();
    let out: { text: string; tokensIn: number; tokensOut: number }, provider = providers.ai.name;
    if (providers.ai.name !== 'mock' && cfg.AI_MONTHLY_BUDGET_INR > 0 && (await monthSpendInr()) >= cfg.AI_MONTHLY_BUDGET_INR) {
      out = { text: await mockAnswer(db, messages.at(-1)!.content, paid), tokensIn: 0, tokensOut: 0 }; provider = 'mock (monthly AI budget reached)';
    } else out = await providers.ai.complete({ system: `${SYSTEM}\n\n${context}`, messages });
    await db.query(`INSERT INTO assistant_usage (user_id, day, queries, tokens_in, tokens_out) VALUES ($1, CURRENT_DATE, 1, $2, $3) ON CONFLICT (user_id, day) DO UPDATE SET queries=assistant_usage.queries+1, tokens_in=assistant_usage.tokens_in+$2, tokens_out=assistant_usage.tokens_out+$3`, [u.id, out.tokensIn, out.tokensOut]);
    const after = { ...usage, today: usage.today + 1, month: usage.month + 1 };
    return { reply: out.text, provider, usage: { ...after, remainingToday: left(after.limit, after.today), remainingMonth: left(after.monthLimit, after.month) }, disclaimer: 'Not investment advice. Past performance does not guarantee future returns.' };
  });
  // questions left under a cap (-1 = no cap → null)
  const left = (cap: number, used: number) => (cap < 0 ? null : Math.max(0, cap - used));
  // today's and this month's questions for a user, with the plan's caps
  async function aiUsage(userId: string, limits: any) {
    const r = (await db.query(`SELECT coalesce(sum(queries) FILTER (WHERE day = CURRENT_DATE), 0)::int AS today, coalesce(sum(queries), 0)::int AS month FROM assistant_usage WHERE user_id=$1 AND day >= date_trunc('month', CURRENT_DATE)::date`, [userId])).rows[0];
    return { today: r.today, month: r.month, limit: Number(limits?.ai_queries_per_day ?? 1), monthLimit: Number(limits?.ai_queries_per_month ?? -1) };
  }
  // estimated AI spend of the whole app this month (₹), from token counts and the model's price
  async function monthSpendInr() {
    const t = (await db.query(`SELECT coalesce(sum(tokens_in),0)::float AS i, coalesce(sum(tokens_out),0)::float AS o FROM assistant_usage WHERE day >= date_trunc('month', CURRENT_DATE)::date`)).rows[0];
    const [pi, po] = aiPricePerMTok(cfg.ANTHROPIC_MODEL);
    return ((t.i * pi + t.o * po) / 1e6) * cfg.AI_USD_INR;
  }

  // POST /support/tickets — store the ticket and pass it to the helpdesk provider (5 per 10 minutes per IP).
  app.post('/support/tickets', { config: { rateLimit: { max: cfg.APP_ENV === 'test' ? 100 : 5, timeWindow: '10 minutes' } } }, async (req) => {
    const b = parse(z.object({ email: z.string().email(), topic: z.enum(['Product question', 'Fund data', 'Subscription', 'Account & privacy']), message: z.string().trim().min(10).max(2000) }), req.body);
    const number = `MA-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomInt(1000, 9999)}`;
    const ref = await providers.support.create({ email: b.email, subject: b.topic, message: b.message, number });
    await db.query('INSERT INTO support_tickets (number, user_id, email, topic, message, provider, provider_ref) VALUES ($1,$2,$3,$4,$5,$6,$7)', [number, req.user?.id ?? null, b.email, b.topic, b.message, providers.support.name, ref]);
    return { number, message: `Request ${number} received. We reply within one business day.` };
  });

  // GET /me/support-tickets — the signed-in person's requests with their status and our reply (Help & FAQ → My requests).
  app.get('/me/support-tickets', async (req) => {
    const u = requireUser(req);
    const r = await db.query(`SELECT number, topic, message, status, reply, replied_at, created_at, updated_at FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [u.id]);
    return { items: r.rows };
  });
  // PATCH /admin/support/tickets/:number — set the status and/or reply (the reply is also emailed to the person).
  app.patch('/admin/support/tickets/:number', async (req) => {
    requireAdmin(req);
    const { number } = parse(z.object({ number: z.string().min(3).max(40) }), req.params);
    const b = parse(z.object({ status: z.enum(['Open', 'In progress', 'Answered', 'Closed']).optional(), reply: z.string().trim().min(2).max(4000).optional() }), req.body);
    const r = await db.query(`UPDATE support_tickets SET status=coalesce($2, CASE WHEN $3::text IS NOT NULL THEN 'Answered' ELSE status END), reply=coalesce($3, reply), replied_at=CASE WHEN $3::text IS NOT NULL THEN now() ELSE replied_at END, updated_at=now() WHERE number=$1 RETURNING number, email, topic, status, reply`, [number, b.status ?? null, b.reply ?? null]);
    if (!r.rows[0]) throw notFound('Ticket not found');
    if (b.reply) await providers.email.send({ to: r.rows[0].email, subject: `Re: ${r.rows[0].topic} (${number})`, text: b.reply });
    await audit(db, req, { action: 'SUPPORT_TICKET_UPDATED', category: 'Account', resource: number, meta: { status: r.rows[0].status } });
    return { ticket: r.rows[0] };
  });
}
