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
    const c = loadConfig({ APP_ENV: 'prod', DATABASE_URL: 'postgres://x', JWT_SECRET: 'p'.repeat(40), ALLOW_MOCK_PROVIDERS: 'email,sms,payments,kyc' } as any);
    expect(c.allowMocks.has('payments')).toBe(true);
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
    const s = (await c.post('/auth/otp/send', { mobile: '98765 43210' })).json();
    expect(s.devCode).toMatch(/^\d{6}$/);
    expect((await c.post('/auth/otp/verify', { mobile: '9876543210', code: '000000' })).statusCode).toBe(400);
    const v = await c.post('/auth/otp/verify', { mobile: '9876543210', code: s.devCode, name: 'Mobile User' });
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
    expect((await c.post('/auth/oauth/google', { idToken: 'mock:gina@example.com' })).json().user.email).toBe('gina@example.com');
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
    expect(a.statusCode).toBe(200); expect(a.json().reply).toMatch(/published date/);
    expect((await c.post('/assistant/messages', { messages: [{ role: 'user', content: 'and CAGR?' }] })).statusCode).toBe(429);
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

describe('admin', () => {
  it('metrics come from the database with a date range', async () => {
    const a = await adminClient(app);
    const m = (await a.get('/admin/metrics?from=2026-08-01&to=2026-10-31')).json();
    expect(m.range.granularity).toBe('week');
    expect(m.kpis.totalUsers.value).toBeGreaterThan(12000);
    expect(m.series.length).toBeGreaterThan(10);
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
