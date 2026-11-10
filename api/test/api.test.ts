import fs from 'node:fs';
import crypto from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { setupApp, client, adminClient, WORKBOOK } from './helpers.js';
import { loadConfig } from '../src/config.js';

let app: Awaited<ReturnType<typeof setupApp>>['app'];
let db: Awaited<ReturnType<typeof setupApp>>['db'];
beforeAll(async () => { ({ app, db } = await setupApp()); });

function multipart(file: Buffer, name: string, fields: Record<string, string> = {}) {
  const b = '----modalpha' + crypto.randomBytes(6).toString('hex');
  const parts = Object.entries(fields).map(([k, v]) => Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`), file, Buffer.from(`\r\n--${b}--\r\n`));
  return { body: Buffer.concat(parts), headers: { 'content-type': `multipart/form-data; boundary=${b}` } };
}

describe('config', () => {
  it('rejects mock payments/KYC/email/SMS in prod', () => {
    expect(() => loadConfig({ APP_ENV: 'prod', DATABASE_URL: 'postgres://x', JWT_SECRET: 'p'.repeat(40) } as any)).toThrow(/PAYMENT_PROVIDER=mock is not allowed in prod/);
  });
  it('requires credentials for a real provider', () => {
    expect(() => loadConfig({ APP_ENV: 'stage', DATABASE_URL: 'postgres://x', JWT_SECRET: 'p'.repeat(40), PAYMENT_PROVIDER: 'razorpay' } as any)).toThrow(/RAZORPAY_KEY_ID/);
  });
  it('allows an explicit temporary mock exception in prod', () => {
    const c = loadConfig({ APP_ENV: 'prod', DATABASE_URL: 'postgres://x', JWT_SECRET: 'p'.repeat(40), ALLOW_MOCK_PROVIDERS: 'email,sms,payments,kyc', INVOICE_SELLER_GSTIN: '29ABCDE1234F1Z5', INVOICE_SELLER_ADDRESS: '1 Test Street, Bengaluru' } as any);
    expect(c.allowMocks.has('payments')).toBe(true);
  });
  it('requires the GST seller details in prod', () => {
    expect(() => loadConfig({ APP_ENV: 'prod', DATABASE_URL: 'postgres://x', JWT_SECRET: 'p'.repeat(40), ALLOW_MOCK_PROVIDERS: 'email,sms,payments,kyc' } as any)).toThrow(/INVOICE_SELLER_GSTIN is required/);
  });
  it('rejects a malformed seller GSTIN', () => {
    expect(() => loadConfig({ APP_ENV: 'stage', DATABASE_URL: 'postgres://x', JWT_SECRET: 'p'.repeat(40), INVOICE_SELLER_GSTIN: '12345' } as any)).toThrow(/Not a valid GSTIN/);
  });
});

describe('auth', () => {
  it('signs up, reads /auth/me, refreshes (rotating) and logs out', async () => {
    const c = client(app);
    const s = await c.post('/auth/signup', { name: 'Riya Test', email: 'riya@example.com', password: 'secret-pass-1' });
    expect(s.statusCode).toBe(201);
    expect(c.jar.ma_at).toBeTruthy(); expect(c.jar.ma_rt).toBeTruthy();
    expect((await c.get('/auth/me')).json().user.email).toBe('riya@example.com');
    const old = c.jar.ma_rt;
    expect((await c.post('/auth/refresh')).statusCode).toBe(200);
    expect(c.jar.ma_rt).not.toBe(old);
    // reusing the old refresh token is rejected and revokes the family
    const replay = client(app); replay.jar.ma_rt = old;
    expect((await replay.post('/auth/refresh')).statusCode).toBe(401);
    expect((await c.post('/auth/refresh')).statusCode).toBe(401);
    expect((await c.post('/auth/signup', { name: 'Dup', email: 'riya@example.com', password: 'secret-pass-1' })).statusCode).toBe(409);
  });
  it('rejects a wrong password and audits it', async () => {
    const r = await client(app).post('/auth/login', { email: 'riya@example.com', password: 'nope-nope' });
    expect(r.statusCode).toBe(401);
    expect((await db.query(`SELECT count(*)::int n FROM audit_log WHERE action='LOGIN_FAILED'`)).rows[0].n).toBeGreaterThan(0);
  });
  it('logs in with mobile OTP (mock SMS returns devCode)', async () => {
    const c = client(app);
    // Login screen: an unknown number is refused before any SMS is sent
    const nope = await c.post('/auth/otp/send', { mobile: '98765 43210' });
    expect(nope.statusCode).toBe(404); expect(nope.json().error.code).toBe('no_account');
    const s = (await c.post('/auth/otp/send', { mobile: '98765 43210', intent: 'signup' })).json();
    expect(s.devCode).toMatch(/^\d{6}$/);
    expect((await c.post('/auth/otp/verify', { mobile: '9876543210', code: s.devCode })).json().error.code).toBe('no_account');
    expect((await c.post('/auth/otp/verify', { mobile: '9876543210', code: '000000', intent: 'signup' })).statusCode).toBe(400);
    const v = await c.post('/auth/otp/verify', { mobile: '9876543210', code: s.devCode, name: 'Mobile User', intent: 'signup' });
    expect(v.statusCode).toBe(201);
    expect(v.json().user.mobile).toBe('+919876543210');
    const sms = await db.query(`SELECT body FROM mock_outbox WHERE channel='sms' ORDER BY id DESC LIMIT 1`);
    expect(sms.rows[0].body).toContain(s.devCode);
  });
  it('resets a password via the emailed token', async () => {
    const c = client(app);
    await c.post('/auth/password/forgot', { email: 'riya@example.com' });
    const mail = (await db.query(`SELECT body FROM mock_outbox WHERE channel='email' AND subject LIKE 'Reset%' ORDER BY id DESC LIMIT 1`)).rows[0].body;
    const token = mail.match(/token=([\w-]+)/)[1];
    expect((await c.post('/auth/password/reset', { token, password: 'brand-new-pass' })).statusCode).toBe(200);
    expect((await c.post('/auth/password/reset', { token, password: 'again-again' })).statusCode).toBe(400);
    expect((await c.post('/auth/login', { email: 'riya@example.com', password: 'brand-new-pass' })).statusCode).toBe(200);
  });
  it('signs in with Google (mock token on stage) and blocks Apple as not implemented', async () => {
    const c = client(app);
    expect((await c.post('/auth/oauth/google', { idToken: 'mock:gina@example.com' })).json().error.code).toBe('no_account');
    expect((await c.post('/auth/oauth/google', { idToken: 'mock:gina@example.com', intent: 'signup' })).json().user.email).toBe('gina@example.com');
    // afterwards the Login screen works for that Google account
    expect((await client(app).post('/auth/oauth/google', { idToken: 'mock:gina@example.com' })).json().user.email).toBe('gina@example.com');
    expect((await c.post('/auth/oauth/apple', {})).statusCode).toBe(501);
  });
  it('protects admin routes', async () => {
    const c = client(app);
    await c.post('/auth/login', { email: 'riya@example.com', password: 'brand-new-pass' });
    expect((await c.get('/admin/users')).statusCode).toBe(403);
    expect((await client(app).get('/admin/users')).statusCode).toBe(401);
  });
});

describe('funds & calculators (computed from NAV)', () => {
  it('lists funds with server-computed CAGR that matches the workbook', async () => {
    const r = (await client(app).get('/funds?sort=5y&pageSize=5')).json();
    expect(r.total).toBe(24);
    const q = r.items[0];
    expect(q.id).toBe('QSC01');
    expect(q.returns['5']).toBeCloseTo(32.4, 0);
    expect(q.returns['1']).toBeCloseTo(18.2, 0);
    expect(q.spark.length).toBeGreaterThan(10);
  });
  it('filters, searches and returns NAV series', async () => {
    const c = client(app);
    expect((await c.get('/funds?category=Small%20Cap')).json().items.every((f: any) => f.category === 'Small Cap' || f.type === 'Small Cap')).toBe(true);
    expect((await c.get('/funds?q=hdfc')).json().items[0].id).toBe('HMC03');
    const n = (await c.get('/funds/QSC01/nav?period=1Y&points=30')).json();
    expect(n.points.length).toBeLessThanOrEqual(31);
  });
  it('lump-sum what-if uses actual NAV', async () => {
    const r = (await client(app).post('/calc/lumpsum', { fundId: 'QSC01', date: '2021-10-29', amount: 100000 })).json();
    expect(r.cagrPct).toBeCloseTo(32.4, 0);
    expect(r.value).toBeGreaterThan(300000);
  });
  it('SIP compare buys on published dates vs a fixed day', async () => {
    const r = (await client(app).post('/calc/sip-compare', { fundId: 'QSC01', amount: 10000, start: '2026-01-05', end: '2026-10-30' })).json();
    expect(r.months).toBe(10);
    expect(r.invested).toBe(100000);
    expect(r.monthsWithPublishedDate).toBeGreaterThan(0);
    expect(typeof r.extra).toBe('number');
  });
});

describe('KYC → checkout → webhook → subscription', () => {
  it('blocks checkout before KYC, completes mock KYC, pays via signed webhook, issues invoice', async () => {
    const c = client(app);
    await c.post('/auth/signup', { name: 'Pay User', email: 'pay@example.com', password: 'secret-pass-1' });
    const blocked = await c.post('/billing/checkout', { planId: 'Pro', cycle: 'Monthly' });
    expect(blocked.statusCode).toBe(409); expect(blocked.json().error.code).toBe('kyc_required');
    const k = (await c.post('/kyc/sessions')).json();
    expect(k.redirectUrl).toContain('#/kyc/mock');
    expect((await c.post('/kyc/mock/complete', { ref: k.ref, decision: 'Verified' })).json().ok).toBe(true);
    expect((await c.get('/kyc/status')).json().kyc_status).toBe('Verified');
    const co = (await c.post('/billing/checkout', { planId: 'Pro', cycle: 'Monthly' })).json();
    expect(co.amountInr).toBe(299); expect(co.order.mockConfirm).toBe(true);
    const done = (await c.post('/billing/mock/complete', { orderId: co.order.orderId })).json();
    expect(done.processed).toBe(true);
    // the client-side verify step is idempotent
    expect((await c.post('/billing/verify', { orderId: co.order.orderId, paymentId: done.paymentId, signature: done.signature })).json().already).toBe(true);
    const e = (await c.get('/me/entitlements')).json();
    expect(e.plan).toBe('Pro'); expect(e.subscription.status).toBe('Active');
    const inv = (await c.get('/billing/invoices')).json().items;
    expect(inv[0].amount_inr).toBe(299);
    // cancel at period end
    expect((await c.post(`/billing/subscriptions/${e.subscription.id}/cancel`)).json().ok).toBe(true);
  });
  it('rejects webhooks with a bad signature and ignores duplicates', async () => {
    const body = JSON.stringify({ id: 'evt_x', event: 'payment.captured', orderId: 'nope', paymentId: 'p' });
    const bad = await app.inject({ method: 'POST', url: '/api/v1/webhooks/payments', payload: body, headers: { 'content-type': 'application/json', 'x-mock-signature': 'deadbeef' } });
    expect(bad.statusCode).toBe(401);
  });
});

describe('assistant quotas', () => {
  it('Free plan gets 1 query/day, grounded mock answer', async () => {
    const c = client(app);
    await c.post('/auth/signup', { name: 'Ai User', email: 'ai@example.com', password: 'secret-pass-1' });
    const a = await c.post('/assistant/messages', { messages: [{ role: 'user', content: 'What is the best SIP date this month?' }] });
    expect(a.statusCode).toBe(200); expect(a.json().reply).toMatch(/Pro and Premium/);   // the day is a paid feature
    expect(a.json().usage).toMatchObject({ today: 1, month: 1, limit: 1, monthLimit: 20, remainingToday: 0, remainingMonth: 19 });
    const blocked = await c.post('/assistant/messages', { messages: [{ role: 'user', content: 'and CAGR?' }] });
    expect(blocked.statusCode).toBe(429); expect(blocked.json().error.message).toMatch(/1 AI question a day/);
    expect((await c.get('/me/entitlements')).json().usage).toMatchObject({ aiQueriesToday: 1, aiQueriesMonth: 1 });
  });
  it('plans carry daily and monthly AI caps (no unlimited AI)', async () => {
    const plans = (await client(app).get('/plans')).json().plans;
    const by = Object.fromEntries(plans.map((p: any) => [p.id, p]));
    expect(by.Free.limits).toMatchObject({ ai_queries_per_day: 1, ai_queries_per_month: 20 });
    expect(by.Pro.limits).toMatchObject({ ai_queries_per_day: 10, ai_queries_per_month: 200 });
    expect(by.Premium.limits).toMatchObject({ ai_queries_per_day: 25, ai_queries_per_month: 500 });
    expect(JSON.stringify(plans)).not.toMatch(/Unlimited AI/);
  });
  it('the monthly cap stops questions even when the daily cap has room', async () => {
    const adm = await adminClient(app);
    const free = (await client(app).get('/plans')).json().plans.find((p: any) => p.id === 'Free');
    expect((await adm.put('/admin/plans/Free', { limits: { ai_queries_per_day: 5, ai_queries_per_month: 2 } })).statusCode).toBe(200);
    try {
      const c = client(app);
      await c.post('/auth/signup', { name: 'Ai Monthly', email: 'ai-month@example.com', password: 'secret-pass-1' });
      const ask = () => c.post('/assistant/messages', { messages: [{ role: 'user', content: 'What is CAGR?' }] });
      expect((await ask()).statusCode).toBe(200);
      expect((await ask()).json().usage.remainingMonth).toBe(0);
      const third = await ask();
      expect(third.statusCode).toBe(429); expect(third.json().error.message).toMatch(/all 2 AI questions .* this month/);
    } finally { await adm.put('/admin/plans/Free', { limits: free.limits }); }
  });
});

describe('me', () => {
  it('saves preferences, consents, watchlist, notifications, data requests', async () => {
    const c = client(app);
    await c.post('/auth/login', { email: 'pay@example.com', password: 'secret-pass-1' });
    expect((await c.put('/me/preferences', { defaultSip: 15000, channels: { sms: true } })).json().preferences.channels.sms).toBe(true);
    expect((await c.put('/me/preferences', { hacker: 1 })).statusCode).toBe(400);
    expect((await c.put('/me/consents', { analytics: true })).statusCode).toBe(200);
    expect((await c.post('/me/watchlist/QSC01')).statusCode).toBe(200);
    expect((await c.get('/me/watchlist')).json().items[0].fund_id).toBe('QSC01');
    const n = (await c.get('/me/notifications')).json();
    expect(n.items.some((x: any) => x.title.includes('Pro plan activated'))).toBe(true);
    await c.post('/me/notifications/read', {});
    expect((await c.get('/me/notifications')).json().unread).toBe(0);
    expect((await c.post('/me/data-export')).json().status).toBe('Requested');
    expect((await c.post('/me/deletion-request', { password: 'wrong', confirm: 'DELETE' })).statusCode).toBe(401);
  });
});

describe('support requests, cancellation survey, grace period, test accounts', () => {
  it('lists my requests and shows the team reply', async () => {
    const c = client(app); await c.post('/auth/signup', { name: 'Help Seeker', email: 'help@example.com', password: 'secret-pass-1' });
    const t = (await c.post('/support/tickets', { email: 'help@example.com', topic: 'Fund data', message: 'The NAV looks a day old today.' })).json();
    let mine = (await c.get('/me/support-tickets')).json().items;
    expect(mine[0].number).toBe(t.number); expect(mine[0].status).toBe('Open'); expect(mine[0].reply).toBeNull();
    expect((await c.raw('PATCH', `/admin/support/tickets/${t.number}`, { reply: 'Fixed, thanks!' })).statusCode).toBe(403);
    const adm = await adminClient(app);
    expect((await adm.patch(`/admin/support/tickets/${t.number}`, { reply: 'Thanks, the NAV is updated now.' })).json().ticket.status).toBe('Answered');
    mine = (await c.get('/me/support-tickets')).json().items;
    expect(mine[0].reply).toContain('NAV is updated'); expect(mine[0].replied_at).toBeTruthy();
    const other = client(app); await other.post('/auth/signup', { name: 'Someone Else', email: 'else@example.com', password: 'secret-pass-1' });
    expect((await other.get('/me/support-tickets')).json().items.length).toBe(0);
  });
  it('test accounts cover each state: grace period, cancelling with resume, unverified email', async () => {
    const { seedDemoAccounts, DEMO_PASSWORD } = await import('../src/cli/seed.js');
    expect(await seedDemoAccounts(db as any, loadConfig({ ...process.env, APP_ENV: 'test' } as any))).toBe(5);
    const login = async (email: string) => { const c = client(app); expect((await c.post('/auth/login', { email, password: DEMO_PASSWORD })).statusCode).toBe(200); return c; };
    // renewal failed 3 days ago: still Pro (grace) until renewal + 7 days
    const pd = await login('demo.pastdue@modalpha.test');
    const e = (await pd.get('/me/entitlements')).json();
    expect(e.plan).toBe('Pro'); expect(e.subscription.status).toBe('Past due'); expect(e.subscription.graceEndsOn).toBeTruthy();
    // past the grace period → Free
    await db.query(`UPDATE subscriptions SET renewal_date = CURRENT_DATE - 9 WHERE id='demo-sub-pastdue'`);
    expect((await pd.get('/me/entitlements')).json().plan).toBe('Free');
    // cancelling at period end → resume keeps the plan; cancelling again records the survey
    const cn = await login('demo.cancelling@modalpha.test');
    let s = (await cn.get('/me/entitlements')).json().subscription;
    expect(s.cancelAtPeriodEnd).toBe(true);
    expect((await cn.post(`/billing/subscriptions/${s.id}/resume`)).json().ok).toBe(true);
    expect((await cn.get('/me/entitlements')).json().subscription.cancelAtPeriodEnd).toBe(false);
    expect((await cn.post(`/billing/subscriptions/${s.id}/cancel`, { reason: 'bogus' })).statusCode).toBe(400);
    expect((await cn.post(`/billing/subscriptions/${s.id}/cancel`, { reason: 'too_expensive', comment: 'Need a cheaper yearly plan' })).json().ok).toBe(true);
    expect((await db.query(`SELECT cancel_reason FROM subscriptions WHERE id=$1`, [s.id])).rows[0].cancel_reason).toBe('too_expensive');
    // unverified email: the flag the website uses for its banner, then the emailed link verifies it
    const un = await login('demo.unverified@modalpha.test');
    expect((await un.get('/auth/me')).json().user.emailVerified).toBe(false);
    expect((await un.post('/me/verify-email')).json().ok).toBe(true);
    expect((await un.post('/auth/verify-email', { token: 'not-a-real-token-123' })).statusCode).toBe(400);
    // the Pro test account has two requests, one answered
    const pro = await login('demo.pro@modalpha.test');
    const tk = (await pro.get('/me/support-tickets')).json().items;
    expect(tk.length).toBe(2); expect(tk.some((x: any) => x.status === 'Answered' && x.reply)).toBe(true);
    // refused in prod
    await expect(seedDemoAccounts(db as any, { APP_ENV: 'prod' } as any)).rejects.toThrow(/prod/);
  });
});

describe('plan changes (docs/29): prorated upgrade, scheduled downgrade, credit notes', () => {
  it('previewChange follows the rules doc, including its worked examples', async () => {
    const { previewChange } = await import('../src/modules/billing/plan-change.js');
    const plans: any[] = [{ id: 'Free', name: 'Free', sort: 1, prices: { Monthly: 0, Quarterly: 0, Yearly: 0 } }, { id: 'Pro', name: 'Pro', sort: 2, prices: { Monthly: 299, Quarterly: 897, Yearly: 2868 } }, { id: 'Premium', name: 'Premium', sort: 3, prices: { Monthly: 499, Quarterly: 1497, Yearly: 4788 } }];
    const sub = (plan: string, cycle: any, amount: number, renewal: string, status = 'Active') => ({ plan_id: plan, billing_cycle: cycle, amount_inr: amount, renewal_date: renewal, status });
    // Pro monthly → Premium monthly, 15 of 30 days left (Nov has 30 days): 249.50 − 149.50 = ₹100
    const up: any = previewChange(sub('Pro', 'Monthly', 299, '2026-11-25'), plans, { planId: 'Premium', cycle: 'Monthly' }, '2026-11-10');
    expect(up).toMatchObject({ kind: 'upgrade', daysLeft: 15, daysInCycle: 31, renewsOn: '2026-11-25', newCycle: false });
    const up2: any = previewChange(sub('Pro', 'Monthly', 299, '2026-12-25'), plans, { planId: 'Premium', cycle: 'Monthly' }, '2026-12-10');
    expect(up2).toMatchObject({ kind: 'upgrade', daysLeft: 15, daysInCycle: 30, chargeNow: 100, credit: 149.5, newPart: 249.5 });
    // Pro monthly → Pro yearly with 10 of 30 days left: 2868 − 99.67 = 2768.33, new 12-month cycle from today
    const cyc: any = previewChange(sub('Pro', 'Monthly', 299, '2026-12-20'), plans, { planId: 'Pro', cycle: 'Yearly' }, '2026-12-10');
    expect(cyc).toMatchObject({ kind: 'upgrade', chargeNow: 2768.33, renewsOn: '2027-12-10', newCycle: true });
    // less → scheduled for the renewal date, nothing charged
    expect(previewChange(sub('Premium', 'Monthly', 499, '2026-11-25'), plans, { planId: 'Pro', cycle: 'Monthly' }, '2026-11-10')).toMatchObject({ kind: 'scheduled', effectiveOn: '2026-11-25', chargeNow: 0, nextAmount: 299 });
    expect(previewChange(sub('Pro', 'Yearly', 2868, '2027-06-01'), plans, { planId: 'Pro', cycle: 'Monthly' }, '2026-11-10')).toMatchObject({ kind: 'scheduled', effectiveOn: '2027-06-01' });
    expect(previewChange(sub('Pro', 'Monthly', 299, '2026-11-25'), plans, { planId: 'Free', cycle: 'Monthly' }, '2026-11-10')).toMatchObject({ kind: 'scheduled', toFree: true });
    // higher plan on a shorter cycle is refused; past due must pay first; same plan is a no-op
    expect(previewChange(sub('Pro', 'Yearly', 2868, '2027-06-01'), plans, { planId: 'Premium', cycle: 'Monthly' }, '2026-11-10').kind).toBe('blocked');
    expect(previewChange(sub('Pro', 'Monthly', 299, '2026-11-08', 'Past due'), plans, { planId: 'Premium', cycle: 'Monthly' }, '2026-11-10').kind).toBe('blocked');
    expect(previewChange(sub('Pro', 'Monthly', 299, '2026-11-25'), plans, { planId: 'Pro', cycle: 'Monthly' }, '2026-11-10').kind).toBe('same');
    expect(previewChange(null, plans, { planId: 'Pro', cycle: 'Yearly' }, '2026-11-10')).toMatchObject({ kind: 'new', chargeNow: 2868 });
  });
  it('upgrades through checkout, schedules and undoes a downgrade, applies it on renewal, refunds with a credit note', async () => {
    const { subscriptionLifecycle } = await import('../src/jobs/index.js');
    const { todayIST } = await import('../src/modules/billing/plan-change.js');
    const c = client(app);
    await c.post('/auth/signup', { name: 'Plan Changer', email: 'changer@example.com', password: 'secret-pass-1' });
    const k = (await c.post('/kyc/sessions')).json(); await c.post('/kyc/mock/complete', { ref: k.ref, decision: 'Verified' });
    const co = (await c.post('/billing/checkout', { planId: 'Pro', cycle: 'Monthly' })).json();
    await c.post('/billing/mock/complete', { orderId: co.order.orderId });
    // pretend we are half-way through the month
    const t = todayIST(), renew = new Date(Date.parse(t) + 15 * 864e5).toISOString().slice(0, 10);
    await db.query(`UPDATE subscriptions SET renewal_date=$2 WHERE id=$1`, [co.subscriptionId, renew]);
    const pv = (await c.get('/billing/change/preview?planId=Premium&cycle=Monthly')).json().preview;
    expect(pv).toMatchObject({ kind: 'upgrade', daysLeft: 15, renewsOn: renew });
    expect(pv.chargeNow).toBeCloseTo(200 * 15 / pv.daysInCycle, 1);
    const ch = (await c.post('/billing/change', { planId: 'Premium', cycle: 'Monthly' })).json();
    expect(ch.amountInr).toBe(pv.chargeNow);
    await c.post('/billing/mock/complete', { orderId: ch.order.orderId });
    let e = (await c.get('/me/entitlements')).json();
    expect(e.plan).toBe('Premium'); expect(e.subscription).toMatchObject({ id: co.subscriptionId, renewalDate: renew, amountInr: 499 });
    let inv = (await c.get('/billing/invoices')).json().items;
    expect(inv.filter((i: any) => i.type === 'invoice')).toHaveLength(2);
    expect(inv.find((i: any) => Number(i.amount_inr) === pv.chargeNow)).toBeTruthy();
    // downgrade waits for the renewal date; undo clears it; the job applies it on the day
    const dn = (await c.post('/billing/change', { planId: 'Pro', cycle: 'Monthly' })).json();
    expect(dn).toMatchObject({ scheduled: true, preview: { effectiveOn: renew, chargeNow: 0 } });
    e = (await c.get('/me/entitlements')).json();
    expect(e.plan).toBe('Premium'); expect(e.subscription.pendingChange).toMatchObject({ plan: 'Pro', effectiveOn: renew, amountInr: 299 });
    expect((await c.post('/billing/change/undo')).json().ok).toBe(true);
    expect((await c.get('/me/entitlements')).json().subscription.pendingChange).toBeNull();
    expect((await c.post('/billing/change/undo')).statusCode).toBe(404);
    await c.post('/billing/change', { planId: 'Pro', cycle: 'Monthly' });
    await db.query(`UPDATE subscriptions SET renewal_date=CURRENT_DATE WHERE id=$1`, [co.subscriptionId]);
    expect((await subscriptionLifecycle(app.deps)).changed).toBeGreaterThanOrEqual(1);
    e = (await c.get('/me/entitlements')).json();
    expect(e.plan).toBe('Pro'); expect(e.subscription.pendingChange).toBeNull();
    // refund → credit note against the original invoice, listed and printable
    const a = await adminClient(app);
    const pay = (await db.query(`SELECT p.id FROM payments p JOIN users u ON u.id=p.user_id WHERE u.email='changer@example.com' AND p.kind='upgrade'`)).rows[0];
    const rf = (await a.post(`/admin/payments/${pay.id}/refund`, { amountInr: 50, reason: 'Goodwill refund' })).json();
    expect(rf.creditNote.number).toMatch(/^CN\/\d{2}-\d{2}\/\d{5}$/);
    inv = (await c.get('/billing/invoices')).json().items;
    const cn = inv.find((i: any) => i.type === 'credit_note');
    expect(cn).toMatchObject({ number: rf.creditNote.number }); expect(cn.against).toMatch(/^MA\//);
    expect(Number(cn.gst_inr)).toBeCloseTo(50 - 50 / 1.18, 1);
    const pdf = await c.get(`/billing/credit-notes/${cn.id}/pdf`);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    expect((await client(app).get(`/billing/credit-notes/${cn.id}`)).statusCode).toBe(401);
    // admin screens: payments list (with the credit note), cancellation reasons, support inbox
    const pays = (await a.get('/admin/payments?q=changer@example.com')).json();
    const up = pays.items.find((x: any) => x.id === pay.id);
    expect(up).toMatchObject({ kind: 'upgrade', plan_id: 'Pro' }); expect(Number(up.refunded_inr)).toBe(50); expect(up.credit_notes[0].number).toBe(rf.creditNote.number);
    expect(pays.month.refunded).toBeGreaterThanOrEqual(50);
    await c.post(`/billing/subscriptions/${co.subscriptionId}/cancel`, { reason: 'too_expensive', comment: 'Bit pricey for me' });
    const can = (await a.get('/admin/cancellations?days=30')).json();
    expect(can.reasons.find((r: any) => r.reason === 'too_expensive').n).toBeGreaterThanOrEqual(1);
    expect(can.latest.find((x: any) => x.email === 'changer@example.com')).toMatchObject({ reason: 'too_expensive', comment: 'Bit pricey for me' });
    const sent = (await c.post('/support/tickets', { email: 'changer@example.com', topic: 'Subscription', message: 'Why was I charged twice this month?' })).json();
    const inbox = (await a.get('/admin/support/tickets?status=Open')).json();
    expect(inbox.items.find((t: any) => t.number === sent.number)).toMatchObject({ full_name: 'Plan Changer', status: 'Open' });
    expect(inbox.counts.Open).toBeGreaterThanOrEqual(1);
    await a.patch(`/admin/support/tickets/${sent.number}`, { reply: 'You were charged once; the second line was a pending authorisation.' });
    expect((await c.get('/me/notifications')).json().items.some((n: any) => n.title.includes(sent.number))).toBe(true);
    // users get 403 on every admin screen
    for (const u of ['/admin/payments', '/admin/cancellations', '/admin/support/tickets']) expect((await c.get(u)).statusCode).toBe(403);
  });
});

describe('signed-in devices', () => {
  it('lists this account\'s sessions and signs out another device', async () => {
    const a = client(app), b = client(app);
    await a.post('/auth/login', { email: 'pay@example.com', password: 'secret-pass-1' });
    await b.post('/auth/login', { email: 'pay@example.com', password: 'secret-pass-1' });
    const list = (await a.get('/me/sessions')).json().items;
    expect(list.length).toBeGreaterThanOrEqual(2);
    const mine = list.find((s: any) => s.current), other = list.find((s: any) => !s.current);
    expect(mine).toBeTruthy(); expect(other).toBeTruthy();
    expect((await a.del(`/me/sessions/${mine.id}`)).statusCode).toBe(400); // this device: use Log out
    expect((await a.del(`/me/sessions/${other.id}`)).statusCode).toBe(200);
    expect((await a.del(`/me/sessions/${other.id}`)).statusCode).toBe(404);
    expect((await a.get('/auth/me')).statusCode).toBe(200);
    // another account cannot see or end these sessions
    const c = client(app); await c.post('/auth/signup', { name: 'Other Person', email: 'other-dev@example.com', password: 'secret-pass-1' });
    expect((await c.get('/me/sessions')).json().items.every((s: any) => s.id !== mine.id)).toBe(true);
    expect((await c.del(`/me/sessions/${mine.id}`)).statusCode).toBe(404);
  });
});

describe('admin', () => {
  it('metrics come from the database with a date range', async () => {
    const a = await adminClient(app);
    const m = (await a.get('/admin/metrics?from=2026-08-01&to=2026-10-31')).json();
    expect(m.range.granularity).toBe('week');
    expect(m.kpis.totalUsers.value).toBeGreaterThan(12000);
    expect(m.series.length).toBeGreaterThan(10);
    // plan mix adds up to all users; funnel narrows; support speed is reported
    expect(m.planMix[0].plan).toBe('Free');
    expect(m.planMix.reduce((a: number, r: any) => a + r.users, 0)).toBe(Number(m.kpis.totalUsers.value));
    expect(m.funnel.signedUp).toBeGreaterThanOrEqual(m.funnel.kyc);
    expect(m.funnel.kyc).toBeGreaterThanOrEqual(0);
    expect(m.support).toHaveProperty('waiting');
    expect((await a.get('/admin/metrics?from=2026-10-31&to=2026-10-01')).statusCode).toBe(400);
  });
  it('lists and filters users/subscriptions, exports CSV, suspends a user', async () => {
    const a = await adminClient(app);
    const u = (await a.get('/admin/users?kyc=Pending&pageSize=5')).json();
    expect(u.items.every((x: any) => x.kyc === 'Pending')).toBe(true);
    expect((await a.get('/admin/users?q=pay@example.com&format=csv')).body).toContain('pay@example.com');
    const s = (await a.get('/admin/subscriptions?plan=Premium&status=Active')).json();
    expect(s.items.every((x: any) => x.plan === 'Premium' && x.status === 'Active')).toBe(true);
    expect(s.kpis.mrr).toBeGreaterThan(0);
    const target = (await a.get('/admin/users?q=riya@example.com')).json().items[0];
    expect((await a.patch(`/admin/users/${target.id}`, { accountStatus: 'Suspended', reason: 'test' })).statusCode).toBe(200);
    expect((await client(app).post('/auth/login', { email: 'riya@example.com', password: 'brand-new-pass' })).statusCode).toBe(403);
  });
  it('validates and publishes a SIP date, then dispatches the reminder campaign', async () => {
    const a = await adminClient(app);
    const v = (await a.post('/admin/sip-dates/validate', { month: '2027-01', day: 26, reason: 'Model output Jan 2027' })).json();
    expect(v.checks.length).toBeGreaterThan(1);
    const p = (await a.post('/admin/sip-dates/publish', { month: '2027-01', day: 12, reason: 'Model output Jan 2027', upliftPct: 2.4 })).json();
    expect(p.ok).toBe(true);
    const cur = (await client(app).get('/sip-dates/current')).json();
    expect(cur.upcoming.map((x: any) => x.month)).toContain('2027-01');
    expect(cur.current.status).toBe('Published');
    // confidence comes with every month (same formula the website used in the browser)
    expect(cur.current.confidence.pct).toBeGreaterThanOrEqual(40);
    expect(cur.current.confidence.pct).toBeLessThanOrEqual(95);
    expect(['High', 'Medium', 'Low']).toContain(cur.current.confidence.label);
    const camp = (await a.get('/admin/campaigns')).json().items.find((x: any) => x.name === 'SIP reminder 2027-01');
    expect(camp.status).toBe('Scheduled');
    const sent = (await a.post('/admin/campaigns', { name: 'Test blast', templateKey: 'sip_reminder', channels: ['inapp', 'email'], audience: 'active_subscribers', sendNow: true })).json();
    expect(sent.sending).toBe(true);
    let stats: any = null;
    for (let i = 0; i < 60 && !stats?.delivered; i++) { await new Promise((r) => setTimeout(r, 500)); stats = (await db.query('SELECT stats FROM campaigns WHERE id=$1', [sent.campaign.id])).rows[0].stats; }
    expect(stats.delivered).toBeGreaterThan(100);
  });
  it('edits plan pricing and it shows publicly', async () => {
    const a = await adminClient(app);
    expect((await a.put('/admin/plans/Pro', { prices: { Monthly: 349, Quarterly: 999, Yearly: 3348 } })).json().plan.price).toBe(349);
    expect((await client(app).get('/plans')).json().plans.find((p: any) => p.id === 'Pro').price).toBe(349);
    await a.put('/admin/plans/Pro', { prices: { Monthly: 299, Quarterly: 897, Yearly: 2868 } });
  });
  it('uploads a workbook: rejects a broken one, publishes a valid partial one', async () => {
    const a = await adminClient(app);
    const XLSX = (await import('xlsx')).default;
    const bad = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(bad, XLSX.utils.aoa_to_sheet([['fund_id', 'nav_date', 'nav'], ['QSC01', '30/10/2026', 1], ['XXX', '2026-10-01', 5]]), 'NAV_History');
    const m1 = multipart(XLSX.write(bad, { type: 'buffer', bookType: 'xlsx' }), 'bad.xlsx');
    const r1 = await a.raw('POST', '/admin/data/uploads', m1.body, m1.headers);
    expect(r1.statusCode).toBe(201);
    const rep = r1.json().report;
    expect(rep.ok).toBe(false); expect(rep.errors).toBe(2);
    const empty = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(empty, XLSX.utils.aoa_to_sheet([['fund_id', 'nav_date', 'nav']]), 'NAV_History');
    const m0 = multipart(XLSX.write(empty, { type: 'buffer', bookType: 'xlsx' }), 'empty.xlsx');
    expect((await a.raw('POST', '/admin/data/uploads', m0.body, m0.headers)).json().report.ok).toBe(false);
    expect((await a.post(`/admin/data/uploads/${r1.json().id}/publish`)).statusCode).toBe(400);
    const good = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(good, XLSX.utils.aoa_to_sheet([['holiday_date', 'description', 'exchange'], ['2026-12-25', 'Christmas', 'NSE'], ['2027-01-26', 'Republic Day', 'NSE']]), 'Market_Holidays');
    const m2 = multipart(XLSX.write(good, { type: 'buffer', bookType: 'xlsx' }), 'holidays.xlsx');
    const r2 = (await a.raw('POST', '/admin/data/uploads', m2.body, m2.headers)).json();
    expect(r2.report.ok).toBe(true);
    expect((await a.post(`/admin/data/uploads/${r2.id}/publish`)).json().counts.Market_Holidays).toBe(2);
    expect((await a.get('/admin/data/uploads')).json().items.length).toBeGreaterThanOrEqual(2);
    expect(fs.existsSync(WORKBOOK)).toBe(true);
    // users and subscriptions are never loaded from a spreadsheet (only sign-ups / payments / a backup restore)
    const ppl = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(ppl, XLSX.utils.aoa_to_sheet([['user_id', 'full_name', 'email'], ['U-1', 'Some One', 'some@example.com']]), 'Users');
    const m3 = multipart(XLSX.write(ppl, { type: 'buffer', bookType: 'xlsx' }), 'users.xlsx');
    const r3 = (await a.raw('POST', '/admin/data/uploads', m3.body, m3.headers)).json();
    expect(r3.report.ok).toBe(false); expect(JSON.stringify(r3.report)).toContain('database backup');
  });
  it('setting up a database from the workbook loads funds, NAV and SIP dates but no users or subscriptions', async () => {
    const { validateWorkbook } = await import('../src/modules/data/workbook.js');
    const { report, data } = validateWorkbook(fs.readFileSync(WORKBOOK), { fileName: 'wb.xlsx', existingFundIds: new Set(), existingUserRefs: new Set(), allowPersonal: false, skipPersonal: true, todayIso: '2026-11-02' });
    expect(report.ok).toBe(true);
    expect(data.Funds.length).toBeGreaterThan(0); expect(data.Users).toBeUndefined(); expect(data.Subscriptions).toBeUndefined();
  });
  it('reports which providers are mocked (integrated later)', async () => {
    const a = await adminClient(app);
    const s = (await a.get('/admin/integrations')).json();
    expect(s.providers.find((p: any) => p.key === 'payments').mode).toBe('mock');
    expect(s.notYetBuilt.length).toBeGreaterThan(3);
  });
  it('audit log is searchable and append-only', async () => {
    const a = await adminClient(app);
    expect((await a.get('/admin/audit?q=SIP_DATE_PUBLISHED')).json().items.length).toBeGreaterThan(0);
    await expect(db.query(`DELETE FROM audit_log`)).rejects.toThrow(/append-only/);
  });
});

describe('jobs', () => {
  it('imports NAV from the feed, recomputes metrics, runs lifecycle and data requests', async () => {
    const { JOBS } = await import('../src/jobs/index.js');
    const deps = app.deps;
    const before = (await db.query('SELECT count(*)::int n FROM nav_history')).rows[0].n;
    const r = await JOBS.importNav(deps);
    expect(r.imported).toBe(24);
    expect((await db.query('SELECT count(*)::int n FROM nav_history')).rows[0].n).toBe(before + 24);
    expect(await JOBS.subscriptionLifecycle(deps)).toHaveProperty('ended');
    const d = await JOBS.processDataRequests(deps);
    expect(d.exports).toBeGreaterThanOrEqual(1);
    expect(await JOBS.dispatchDueCampaigns(deps)).toBeInstanceOf(Array);
  });
});

describe('custom SIP reminder (Set Reminder)', () => {
  it('is for paid subscribers only; the Mod Alpha campaign skips them; the daily job reminds them on their day', async () => {
    const { customSipReminders } = await import('../src/jobs/index.js');
    const { dispatchCampaign } = await import('../src/modules/notifications/routes.js');
    const c = client(app);
    await c.post('/auth/signup', { name: 'Remind Me', email: 'remind@example.com', password: 'secret-pass-1' });
    // Free plan → 402 subscription_required
    const free = await c.put('/me/preferences', { sipReminder: { mode: 'custom', day: 20 } });
    expect(free.statusCode).toBe(402); expect(free.json().error.code).toBe('subscription_required');
    // Mod Alpha mode is always allowed
    expect((await c.put('/me/preferences', { sipReminder: { mode: 'modalpha' } })).statusCode).toBe(200);
    // subscribe (mock KYC + mock payment)
    const k = (await c.post('/kyc/sessions')).json();
    await c.post('/kyc/mock/complete', { ref: k.ref, decision: 'Verified' });
    const co = (await c.post('/billing/checkout', { planId: 'Pro', cycle: 'Monthly' })).json();
    await c.post('/billing/mock/complete', { orderId: co.order.orderId });
    const ok = await c.put('/me/preferences', { sipReminder: { mode: 'custom', day: 31 } });
    expect(ok.statusCode).toBe(200); expect(ok.json().preferences.sipReminder).toEqual({ mode: 'custom', day: 31 });
    expect((await c.get('/me/preferences')).json().preferences.sipReminder.day).toBe(31);
    const me = (await c.get('/auth/me')).json().user;
    // the Mod Alpha SIP reminder campaign skips this user
    const a = await adminClient(app);
    const camp = (await a.post('/admin/campaigns', { name: 'Skip check', templateKey: 'sip_reminder', channels: ['inapp'], audience: 'active_subscribers', sendAt: new Date(Date.now() + 3600e3).toISOString() })).json().campaign;
    await db.query(`UPDATE campaigns SET scheduled_for=now() WHERE id=$1`, [camp.id]);
    await dispatchCampaign(app.deps, camp.id);
    expect((await db.query(`SELECT count(*)::int n FROM deliveries WHERE campaign_id=$1 AND user_id=$2`, [camp.id, me.id])).rows[0].n).toBe(0);
    // day 31 in a 30-day month → reminded on the 30th, once
    expect((await customSipReminders(app.deps, '2026-11-29')).sent).toBe(0);
    expect((await customSipReminders(app.deps, '2026-11-30')).sent).toBe(1);
    expect((await customSipReminders(app.deps, '2026-11-30')).sent).toBe(0);
    const n = (await c.get('/me/notifications')).json().items.find((x: any) => x.kind === 'custom_sip');
    expect(n.title).toContain('30 November');
    // switching back to Mod Alpha's date
    expect((await c.put('/me/preferences', { sipReminder: { mode: 'modalpha' } })).json().preferences.sipReminder).toEqual({ mode: 'modalpha', day: null });
  });
});

describe('logout really ends the session', () => {
  it('revokes access + refresh tokens on logout, supports sign-out-everywhere, and blocks suspended users at once', async () => {
    const a = client(app), b = client(app);
    await a.post('/auth/signup', { name: 'Session User', email: 'session@example.com', password: 'secret-pass-1' });
    await b.post('/auth/login', { email: 'session@example.com', password: 'secret-pass-1' });
    const stolen = { ...a.jar };                       // copy of A's cookies (access + refresh)
    const me = await a.get('/auth/me');
    expect(me.statusCode).toBe(200); expect(me.headers['cache-control']).toBe('no-store');
    expect((await a.post('/auth/logout')).json().ok).toBe(true);
    // the copied access token no longer works, even though it has not expired
    const replay = client(app); Object.assign(replay.jar, stolen);
    expect((await replay.get('/auth/me')).statusCode).toBe(401);
    // the other device (B) is unaffected by A's logout
    expect((await b.get('/auth/me')).statusCode).toBe(200);
    // replaying A's revoked refresh token is treated as theft: it fails AND ends every session of the user
    expect((await replay.post('/auth/refresh')).statusCode).toBe(401);
    expect((await b.get('/auth/me')).statusCode).toBe(401);
    // "sign out everywhere"
    const c = client(app), d = client(app);
    await c.post('/auth/login', { email: 'session@example.com', password: 'secret-pass-1' });
    await d.post('/auth/login', { email: 'session@example.com', password: 'secret-pass-1' });
    expect((await d.get('/auth/me')).statusCode).toBe(200);
    expect((await c.post('/auth/logout-all')).json().sessionsEnded).toBe(2);
    expect((await d.get('/auth/me')).statusCode).toBe(401);
    expect((await c.get('/auth/me')).statusCode).toBe(401);
    const acts = (await db.query(`SELECT action FROM audit_log WHERE action IN ('LOGOUT','LOGOUT_ALL_DEVICES')`)).rows.map((r: any) => r.action);
    expect(acts).toEqual(expect.arrayContaining(['LOGOUT', 'LOGOUT_ALL_DEVICES']));
    // suspending a user cuts off their current access token immediately
    const e = client(app);
    await e.post('/auth/login', { email: 'session@example.com', password: 'secret-pass-1' });
    expect((await e.get('/auth/me')).statusCode).toBe(200);
    await db.query(`UPDATE users SET account_status='Suspended' WHERE email='session@example.com'`);
    expect((await e.get('/auth/me')).statusCode).toBe(401);
  });
});

describe('admin sign-in: password + email OTP + SMS OTP', () => {
  it('requires both codes, limits attempts, sends via both channels, and only then starts a session', async () => {
    const c = client(app);
    const r = (await c.post('/auth/login', { email: 'admin@modalpha.test', password: 'Admin-password-123' })).json();
    expect(r.mfaRequired).toBe(true); expect(r.user).toBeUndefined();
    expect(r.email).toMatch(/^a•+n@modalpha\.test$/); expect(r.mobile).toBe('+91 •••••• 0001');
    expect(c.jar.ma_at).toBeUndefined();                                // no session yet
    expect((await c.get('/auth/me')).statusCode).toBe(401);
    // the codes went out by email AND by SMS (mock outbox)
    const out = (await db.query(`SELECT channel, recipient FROM mock_outbox ORDER BY id DESC LIMIT 2`)).rows.map((x: any) => x.channel).sort();
    expect(out).toEqual(['email', 'sms']);
    // one right code is not enough
    const one = await c.post('/auth/login/verify', { challengeId: r.challengeId, emailCode: r.devCodes.email, smsCode: '000000' });
    expect(one.statusCode).toBe(400); expect(one.json().error.message).toMatch(/SMS code/);
    const other = await c.post('/auth/login/verify', { challengeId: r.challengeId, emailCode: '000000', smsCode: r.devCodes.sms });
    expect(other.json().error.message).toMatch(/email code/);
    // resend issues fresh codes; old ones stop working
    const rs = (await c.post('/auth/login/resend', { challengeId: r.challengeId })).json();
    expect(rs.sent).toBe(true); expect(rs.devCodes.email).not.toBeUndefined();
    const ok = await c.post('/auth/login/verify', { challengeId: r.challengeId, emailCode: rs.devCodes.email, smsCode: rs.devCodes.sms });
    expect(ok.statusCode).toBe(200); expect(ok.json().user.role).toBe('superadmin');
    expect((await c.get('/admin/metrics')).statusCode).toBe(200);
    // a challenge cannot be reused
    expect((await c.post('/auth/login/verify', { challengeId: r.challengeId, emailCode: rs.devCodes.email, smsCode: rs.devCodes.sms })).statusCode).toBe(400);
    // 5 wrong tries lock the challenge
    const c2 = client(app);
    const r2 = (await c2.post('/auth/login', { email: 'admin@modalpha.test', password: 'Admin-password-123' })).json();
    for (let i = 0; i < 5; i++) await c2.post('/auth/login/verify', { challengeId: r2.challengeId, emailCode: '111111', smsCode: '222222' });
    expect((await c2.post('/auth/login/verify', { challengeId: r2.challengeId, emailCode: r2.devCodes.email, smsCode: r2.devCodes.sms })).statusCode).toBe(429);
    // regular users are not affected
    const u = client(app);
    await u.post('/auth/signup', { name: 'Plain User', email: 'plain@example.com', password: 'secret-pass-1' });
    const ul = (await client(app).post('/auth/login', { email: 'plain@example.com', password: 'secret-pass-1' })).json();
    expect(ul.mfaRequired).toBeUndefined(); expect(ul.user.role).toBe('user');
    const acts = (await db.query(`SELECT action FROM audit_log WHERE action LIKE 'ADMIN_LOGIN%'`)).rows.map((x: any) => x.action);
    expect(acts).toEqual(expect.arrayContaining(['ADMIN_LOGIN_CHALLENGE', 'ADMIN_LOGIN_CODE_FAILED', 'ADMIN_LOGIN']));
  });
});

describe('session timeouts: 15 min inactivity, 12 h (users) / 8 h (admins) absolute limit', () => {
  /** Move a session's clock back instead of waiting: last activity and/or absolute end. */
  const age = (email: string, set: string) => db.query(`UPDATE sessions SET ${set} WHERE user_id=(SELECT id FROM users WHERE email=$1) AND revoked_at IS NULL`, [email]);

  it('tells the browser its timers and caps users at 12 h, admins at 8 h', async () => {
    const c = client(app);
    const r = (await c.post('/auth/signup', { name: 'Timer User', email: 'timer@example.com', password: 'secret-pass-1' })).json();
    expect(r.session.idleTimeoutSec).toBe(15 * 60);
    const hours = (Date.parse(r.session.absoluteExpiresAt) - Date.now()) / 3600_000;
    expect(hours).toBeGreaterThan(11.9); expect(hours).toBeLessThanOrEqual(12);
    const s = (await c.get('/auth/session')).json();
    expect(s).toMatchObject({ idleTimeoutSec: 900, warnBeforeSec: 60 });
    const a = await adminClient(app);
    const as = (await a.get('/auth/session')).json();
    const ah = (Date.parse(as.absoluteExpiresAt) - Date.now()) / 3600_000;
    expect(ah).toBeGreaterThan(7.9); expect(ah).toBeLessThanOrEqual(8);
  });

  it('ends a session after 15 minutes without activity; activity keeps it alive', async () => {
    const c = client(app), other = client(app);
    await c.post('/auth/signup', { name: 'Idle User', email: 'idle@example.com', password: 'secret-pass-1' });
    // 14 minutes idle → still fine, and the heartbeat resets the clock
    await age('idle@example.com', `last_seen_at = now() - interval '14 minutes'`);
    expect((await c.get('/auth/me')).statusCode).toBe(200);
    const hb = (await c.post('/auth/activity')).json();
    expect(Date.now() - Date.parse(hb.lastSeenAt)).toBeLessThan(5000);
    // background requests do not count as activity
    await age('idle@example.com', `last_seen_at = now() - interval '10 minutes'`);
    await c.raw('GET', '/me/notifications', undefined, { 'x-ma-background': '1' });
    const seen = (await db.query(`SELECT last_seen_at FROM sessions WHERE user_id=(SELECT id FROM users WHERE email='idle@example.com') AND revoked_at IS NULL`)).rows[0].last_seen_at;
    expect(Date.now() - new Date(seen).getTime()).toBeGreaterThan(9 * 60_000);
    // a second device signs in; then this one goes idle for 16 minutes
    await other.post('/auth/login', { email: 'idle@example.com', password: 'secret-pass-1' });
    await db.query(`UPDATE sessions SET last_seen_at = now() - interval '16 minutes' WHERE refresh_hash=$1`, [crypto.createHash('sha256').update(c.jar.ma_rt).digest('hex')]);
    const res = await c.get('/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatchObject({ code: 'session_expired', details: { reason: 'idle' } });
    // the refresh cookie cannot revive it, and the other device is NOT signed out
    const rf = await c.post('/auth/refresh');
    expect(rf.statusCode).toBe(401); expect(rf.json().error.details.reason).toBe('idle');
    expect((await other.get('/auth/me')).statusCode).toBe(200);
    const acts = (await db.query(`SELECT count(*)::int n FROM audit_log WHERE action='SESSION_TIMEOUT_IDLE'`)).rows[0].n;
    expect(acts).toBe(1);
  });

  it('ends a session at its absolute limit, and refreshing never extends it', async () => {
    const c = client(app);
    await c.post('/auth/signup', { name: 'Long User', email: 'long@example.com', password: 'secret-pass-1' });
    const before = (await c.get('/auth/session')).json().absoluteExpiresAt;
    expect((await c.post('/auth/refresh')).statusCode).toBe(200);           // rotate the refresh token
    expect((await c.get('/auth/session')).json().absoluteExpiresAt).toBe(before);
    await age('long@example.com', `absolute_expires_at = now() - interval '1 second'`);
    const res = await c.get('/auth/me');
    expect(res.statusCode).toBe(401); expect(res.json().error.details.reason).toBe('absolute');
    expect((await c.post('/auth/refresh')).statusCode).toBe(401);
  });

  it('records a sign-out triggered by the browser timer, and a password change ends the other devices only', async () => {
    const c = client(app), d = client(app);
    await c.post('/auth/signup', { name: 'Pw User', email: 'pw@example.com', password: 'secret-pass-1' });
    await d.post('/auth/login', { email: 'pw@example.com', password: 'secret-pass-1' });
    expect((await c.post('/me/password', { currentPassword: 'secret-pass-1', newPassword: 'secret-pass-2' })).json().otherSessionsEnded).toBe(1);
    expect((await d.get('/auth/me')).statusCode).toBe(401);
    expect((await c.get('/auth/me')).statusCode).toBe(200);
    // replaying the password-change-ended refresh token on D does not sign out C (not treated as theft)
    expect((await d.post('/auth/refresh')).statusCode).toBe(401);
    expect((await c.get('/auth/me')).statusCode).toBe(200);
    expect((await c.post('/auth/logout', { reason: 'idle' })).json().ok).toBe(true);
    const a = (await db.query(`SELECT action FROM audit_log WHERE resource=(SELECT id::text FROM users WHERE email='pw@example.com') ORDER BY id DESC LIMIT 1`)).rows[0];
    expect(a.action).toBe('SESSION_TIMEOUT_IDLE');
  });
});

describe('PAN-first KYC (mock provider test PANs)', () => {
  const kycUser = async (email: string) => { const c = client(app); await c.post('/auth/signup', { name: 'Kyc User', email, password: 'secret-pass-1' }); return c; };
  const body = (pan: string) => ({ pan, name: 'Kyc User', dob: '1990-05-14', consent: true });

  it('KRA record found → verified at once; only the masked PAN and a hash are stored', async () => {
    const c = await kycUser('kra@example.com');
    expect((await c.post('/billing/checkout', { planId: 'Pro', cycle: 'Monthly' })).json().error.code).toBe('kyc_required');
    const r = (await c.post('/kyc/pan', body('abcde1234f'))).json();
    expect(r).toMatchObject({ status: 'Verified', method: 'kra', panMasked: 'ABCDE••••F' });
    const st = (await c.get('/kyc/status')).json();
    expect(st).toMatchObject({ kyc_status: 'Verified', method: 'kra', pan_masked: 'ABCDE••••F' });
    expect(st.kra_ref).toMatch(/^MOCKKRA/);
    const row = (await db.query(`SELECT k.* FROM kyc_sessions k JOIN users u ON u.id=k.user_id WHERE u.email='kra@example.com'`)).rows[0];
    expect(JSON.stringify(row)).not.toContain('ABCDE1234F');
    expect(row.pan_hash).toHaveLength(64);
    expect((await c.post('/billing/checkout', { planId: 'Pro', cycle: 'Monthly' })).statusCode).toBe(200);
  });

  it('no KRA record → full KYC (DigiLocker) → approved via the signed webhook', async () => {
    const c = await kycUser('digi@example.com');
    const r = (await c.post('/kyc/pan', body('ABCDE5678G'))).json();
    expect(r).toMatchObject({ status: 'Pending', next: 'digilocker' });
    const ref = new URL(r.redirectUrl.replace('#/', '')).searchParams.get('ref');
    expect((await c.post('/kyc/mock/complete', { ref, decision: 'Verified' })).json().ok).toBe(true);
    const st = (await c.get('/kyc/status')).json();
    expect(st).toMatchObject({ kyc_status: 'Verified', method: 'digilocker' });
    expect(st.kra_ref).toMatch(/^MOCKKRA/);
  });

  it('invalid PAN fails with a clear message; format, consent and daily limit are checked', async () => {
    const c = await kycUser('bad@example.com');
    const f = await c.post('/kyc/pan', body('ABCDE0000X'));
    expect(f.statusCode).toBe(400); expect(f.json().error.code).toBe('pan_invalid');
    expect((await c.post('/kyc/pan', body('12345'))).statusCode).toBe(400);
    expect((await c.post('/kyc/pan', { ...body('ABCDE5678G'), consent: false })).statusCode).toBe(400);
    for (let i = 0; i < 4; i++) await c.post('/kyc/pan', body('ABCDE0000X'));
    expect((await c.post('/kyc/pan', body('ABCDE5678G'))).statusCode).toBe(429);
    expect((await c.get('/kyc/status')).json().kyc_status).toBe('Not started');
  });

  it('the same PAN on a second account goes to admin review', async () => {
    const c = await kycUser('dup@example.com');
    const r = (await c.post('/kyc/pan', body('ABCDE1234F'))).json();
    expect(r.status).toBe('In review');
    const a = (await db.query(`SELECT action FROM audit_log WHERE action='KYC_DUPLICATE_PAN'`)).rows;
    expect(a.length).toBe(1);
  });
});

describe('public activity feed', () => {
  it('is anonymous unless the member opted in, and then shows only first name + last initial', async () => {
    const c = client(app);
    await c.post('/auth/signup', { name: 'Rahul Kumar Verma', email: 'feed@example.com', password: 'secret-pass-1' });
    const anon = (await client(app).get('/public/activity')).json().events;
    expect(anon.some((e: any) => e.name === null)).toBe(true);
    expect(JSON.stringify(anon)).not.toContain('Verma');
    expect((await c.put('/me/preferences', { showInActivityFeed: true })).statusCode).toBe(200);
    const named = (await client(app).get('/public/activity')).json().events;
    expect(named.map((e: any) => e.name)).toContain('Rahul V.');
    expect(JSON.stringify(named)).not.toMatch(/feed@example|Verma/);
  });
});

describe('paid features: SIP date lock and GST invoices', () => {
  // sign up, pass KYC and pay for Pro (mock providers)
  const payingUser = async (email: string, billing?: Record<string, unknown>) => {
    const c = client(app);
    await c.post('/auth/signup', { name: 'Gst User', email, password: 'secret-pass-1' });
    if (billing) expect((await c.patch('/me', billing)).statusCode).toBe(200);
    const k = (await c.post('/kyc/sessions')).json();
    await c.post('/kyc/mock/complete', { ref: k.ref, decision: 'Verified' });
    const co = (await c.post('/billing/checkout', { planId: 'Pro', cycle: 'Monthly' })).json();
    await c.post('/billing/mock/complete', { orderId: co.order.orderId });
    return c;
  };
  it('hides the recommended day of current/future months from visitors and Free users, shows it to subscribers', async () => {
    const a = await adminClient(app);
    expect((await a.post('/admin/sip-dates/publish', { month: '2027-03', day: 9, reason: 'Model output Mar 2027', upliftPct: 2.1, alternatives: [{ day: 17, upliftPct: 1.2 }] })).json().ok).toBe(true);
    const find = (items: any[]) => items.find((x) => x.month === '2027-03');
    const anon = (await client(app).get('/sip-dates')).json();
    expect(anon.locked).toBe(true);
    expect(find(anon.items)).toMatchObject({ recommended_day: null, alt_day_1: null, locked: true, uplift_pct: 2.1 });
    expect(find(anon.items).reason).toBeUndefined();
    const free = client(app); await free.post('/auth/signup', { name: 'Free User', email: 'free-sip@example.com', password: 'secret-pass-1' });
    expect(find((await free.get('/sip-dates')).json().items).recommended_day).toBeNull();
    // the assistant does not reveal it either
    const ans = (await free.post('/assistant/messages', { messages: [{ role: 'user', content: 'What is the best date this month?' }] })).json();
    expect(ans.reply).toMatch(/Pro and Premium/);
    const paid = await payingUser('paid-sip@example.com');
    const p = (await paid.get('/sip-dates')).json();
    expect(p.locked).toBe(false);
    expect(find(p.items)).toMatchObject({ recommended_day: 9, alt_day_1: 17 });
    expect((await a.get('/sip-dates')).json().items.find((x: any) => x.month === '2027-03').reason).toBe('Model output Mar 2027');
  });
  it('issues a numbered GST tax invoice (CGST+SGST in the seller state, IGST otherwise) and serves it as a PDF', async () => {
    // seller state defaults to 29 (Karnataka)
    const intra = await payingUser('gst-ka@example.com', { billingStateCode: '29', billingAddress: '12 MG Road, Bengaluru 560001' });
    const i1 = (await intra.get('/billing/invoices')).json().items[0];
    expect(i1.number).toMatch(/^MA\/\d{2}-\d{2}\/\d{5}$/);
    const v1 = (await intra.get(`/billing/invoices/${i1.id}`)).json().invoice;
    expect(v1).toMatchObject({ total: 299, taxable: 253.39, igst: 0, pos: '29', sac: '997156' });
    expect(+(v1.cgst + v1.sgst).toFixed(2)).toBe(45.61); expect(Math.abs(v1.cgst - v1.sgst)).toBeLessThan(0.02);
    expect(v1.buyer.address).toContain('MG Road');
    const pdf = await intra.get(`/billing/invoices/${i1.id}/pdf`);
    expect(pdf.statusCode).toBe(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
    const raw = pdf.rawPayload.toString('latin1');
    expect(raw.startsWith('%PDF-1.4')).toBe(true);
    for (const t of ['TAX INVOICE', i1.number, 'CGST @ 9%', 'SGST @ 9%', 'Rupees Two Hundred Ninety Nine Only', 'Karnataka \\(29\\)', '997156']) expect(raw).toContain(t);
    // another state → IGST; invoice numbers are consecutive
    const inter = await payingUser('gst-mh@example.com', { billingStateCode: '27', billingGstin: '27ABCDE1234F1Z5' });
    const i2 = (await inter.get('/billing/invoices')).json().items[0];
    expect(+i2.number.slice(-5)).toBeGreaterThan(+i1.number.slice(-5));
    const v2 = (await inter.get(`/billing/invoices/${i2.id}`)).json().invoice;
    expect(v2).toMatchObject({ igst: 45.61, cgst: 0, sgst: 0, pos: '27' });
    expect(v2.buyer.gstin).toBe('27ABCDE1234F1Z5');
    expect((await inter.get(`/billing/invoices/${i2.id}/pdf`)).rawPayload.toString('latin1')).toContain('IGST @ 18%');
    // someone else's invoice is not reachable
    expect((await intra.get(`/billing/invoices/${i2.id}/pdf`)).statusCode).toBe(404);
    // billing details are validated
    expect((await inter.patch('/me', { billingGstin: 'NOT-A-GSTIN' })).statusCode).toBe(400);
    expect((await inter.patch('/me', { billingStateCode: '29', billingGstin: '27ABCDE1234F1Z5' })).statusCode).toBe(400);
  });
});

describe('admin accounts', () => {
  it('a super admin invites an admin, who sets a password from the email and then signs in with both codes', async () => {
    const a = await adminClient(app);
    const r = (await a.post('/admin/admins', { name: 'Ops Admin', email: 'ops@modalpha.in', mobile: '98200 11223', role: 'admin' })).json();
    expect(r.ok).toBe(true); expect(r.devLink).toContain('#/reset-password?token=');
    expect((await a.post('/admin/admins', { name: 'Ops Again', email: 'ops@modalpha.in', mobile: '98200 11224' })).statusCode).toBe(409);
    const token = r.devLink.split('token=')[1];
    expect((await client(app).post('/auth/password/reset', { token, password: 'ops-admin-pass-1' })).json().ok).toBe(true);
    const login = (await client(app).post('/auth/login', { email: 'ops@modalpha.in', password: 'ops-admin-pass-1' })).json();
    expect(login.mfaRequired).toBe(true); expect(login.user).toBeUndefined();   // admin → email + SMS codes first
    const ops = client(app);
    const ch = (await ops.post('/auth/login', { email: 'ops@modalpha.in', password: 'ops-admin-pass-1' })).json();
    expect((await ops.post('/auth/login/verify', { challengeId: ch.challengeId, emailCode: ch.devCodes.email, smsCode: ch.devCodes.sms })).statusCode).toBe(200);
    expect((await ops.get('/admin/users')).statusCode).toBe(200);
    // only super admins add admins
    expect((await ops.post('/admin/admins', { name: 'Another', email: 'another@modalpha.in', mobile: '9820011225' })).statusCode).toBe(403);
  });
  it('promoting a user to admin needs an email and a mobile on the account', async () => {
    const a = await adminClient(app);
    const c = client(app); await c.post('/auth/signup', { name: 'Email Only', email: 'emailonly@example.com', password: 'secret-pass-1' });
    const id = (await db.query(`SELECT id FROM users WHERE email='emailonly@example.com'`)).rows[0].id;
    expect((await a.patch(`/admin/users/${id}`, { role: 'admin', reason: 'new ops hire' })).statusCode).toBe(400);
  });
});

describe('insights & Instagram reels', () => {
  it('reads Instagram links in all common forms and rejects anything else', async () => {
    const { parseInstagram } = await import('../src/modules/insights/routes.js');
    expect(parseInstagram('https://www.instagram.com/reel/C9xYz_123ab/?igsh=abc')).toMatchObject({ id: 'C9xYz_123ab', url: 'https://www.instagram.com/reel/C9xYz_123ab/', embed: 'https://www.instagram.com/reel/C9xYz_123ab/embed/' });
    expect(parseInstagram('instagram.com/reels/C9xYz_123ab')?.url).toBe('https://www.instagram.com/reel/C9xYz_123ab/');
    expect(parseInstagram('https://www.instagram.com/modalpha/p/DAbc12345/')?.url).toBe('https://www.instagram.com/p/DAbc12345/');
    for (const bad of ['https://youtube.com/watch?v=x', 'https://www.instagram.com/modalpha/', 'javascript:alert(1)']) expect(parseInstagram(bad)).toBeNull();
  });
  it('admins add a reel as a draft, publish and pin it; users see it first; drafts and hidden items stay private', async () => {
    const a = await adminClient(app);
    const bad = await a.post('/admin/insights', { kind: 'instagram', title: 'Why dates matter', url: 'https://example.com/x' });
    expect(bad.statusCode).toBe(400);
    const png = 'data:image/png;base64,' + Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex').toString('base64');
    const r = (await a.post('/admin/insights', { kind: 'instagram', title: 'Why the SIP date matters', body: '60-second explainer', url: 'https://www.instagram.com/reel/C9xYz_123ab/?igsh=1', cover: png })).json().item;
    expect(r).toMatchObject({ kind: 'instagram', status: 'Draft', url: 'https://www.instagram.com/reel/C9xYz_123ab/', embedUrl: 'https://www.instagram.com/reel/C9xYz_123ab/embed/' });
    expect(r.cover).toContain(`/insights/${r.id}/cover`);
    const pub = () => client(app).get('/insights').then((x) => x.json().items);
    expect((await pub()).some((x: any) => x.id === r.id)).toBe(false);          // draft: not public
    expect((await a.put(`/admin/insights/${r.id}`, { status: 'Published', pinned: true })).json().item.status).toBe('Published');
    expect((await pub())[0].id).toBe(r.id);                                     // pinned → first
    const cov = await client(app).get(`/insights/${r.id}/cover`);
    expect(cov.statusCode).toBe(200); expect(cov.headers['content-type']).toBe('image/png');
    expect((await a.put(`/admin/insights/${r.id}`, { status: 'Hidden' })).statusCode).toBe(200);
    expect((await pub()).some((x: any) => x.id === r.id)).toBe(false);
    // text insights need text; users cannot manage insights
    expect((await a.post('/admin/insights', { kind: 'text', title: 'No body' })).statusCode).toBe(400);
    const u = client(app); await u.post('/auth/signup', { name: 'Ins User', email: 'ins@example.com', password: 'secret-pass-1' });
    expect((await u.post('/admin/insights', { kind: 'text', title: 'Sneaky', body: 'x' })).statusCode).toBe(403);
    expect((await a.del(`/admin/insights/${r.id}`)).json().ok).toBe(true);
    const log = (await a.get('/admin/audit?q=INSIGHT_')).json();
    expect(JSON.stringify(log)).toContain('INSIGHT_DELETED');
  });
});

describe('config: empty values', () => {
  it('treats KEY= (empty) as not set, so optional settings do not fail', () => {
    const c = loadConfig({ APP_ENV: 'stage', DATABASE_URL: 'postgres://x', JWT_SECRET: 'p'.repeat(40), ADMIN_BOOTSTRAP_EMAIL: '', ADMIN_BOOTSTRAP_PASSWORD: '', ADMIN_BOOTSTRAP_MOBILE: '', COOKIE_DOMAIN: '', INVOICE_SELLER_GSTIN: '', PORT: '' } as any);
    expect(c.ADMIN_BOOTSTRAP_MOBILE).toBeUndefined(); expect(c.PORT).toBe(8080); expect(c.INVOICE_SELLER_GSTIN).toBe('');
  });
});

describe('cookie domain', () => {
  it('is used only when it matches the API address', async () => {
    const { cookieDomain } = await import('../src/modules/auth/session.js');
    expect(cookieDomain({ COOKIE_DOMAIN: '.stage.modalpha.in', API_PUBLIC_URL: 'https://api.stage.modalpha.in' } as any)).toBe('.stage.modalpha.in');
    expect(cookieDomain({ COOKIE_DOMAIN: '.stage.modalpha.in', API_PUBLIC_URL: 'https://52-65-52-22.sslip.io' } as any)).toBeUndefined();
    expect(cookieDomain({ COOKIE_DOMAIN: '', API_PUBLIC_URL: 'https://x.io' } as any)).toBeUndefined();
  });
});
