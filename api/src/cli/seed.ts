/**
 * Seed data.
 *   seedReference()      plans, templates, FAQs, insights, model release (idempotent)
 *   bootstrapAdmin()     first super admin from ADMIN_BOOTSTRAP_* (also fills in its mobile for the SMS code)
 *   importWorkbookFile() load a workbook (stage/local test data)
 * usage: npm run seed -- --workbook=path/to/file.xlsx
 */
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import { validateWorkbook } from '../modules/data/workbook.js';
import { importData } from '../modules/data/routes.js';
import { tx } from '../db.js';
import { today } from '../shared/dates.js';

/** Reference data needed in every environment (idempotent). */
export async function seedReference(db: Db) {
  const plans = [
    ['Free', 'Free', 'Basic features to get started', { Monthly: 0, Quarterly: 0, Yearly: 0 }, ['Access to 50+ funds', 'Basic charts', '1 AI query per day'], { ai_queries_per_day: 1, ai_queries_per_month: 20 }, 0],
    ['Pro', 'Pro', 'For serious investors', { Monthly: 299, Quarterly: 897, Yearly: 2868 }, ['Access to 250+ funds', 'Advanced analytics', '10 AI questions a day (200 a month)', 'Historical SIP comparisons', 'Email support'], { ai_queries_per_day: 10, ai_queries_per_month: 200 }, 1],
    ['Premium', 'Premium', 'For power users', { Monthly: 499, Quarterly: 1497, Yearly: 4788 }, ['Everything in Pro', '25 AI questions a day (500 a month)', 'Custom analytics reports', 'Priority support', 'Early access to new features'], { ai_queries_per_day: 25, ai_queries_per_month: 500 }, 2],
  ];
  for (const p of plans) await db.query(`INSERT INTO plans (id, name, tagline, prices, features, limits, sort) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`, [p[0], p[1], p[2], JSON.stringify(p[3]), JSON.stringify(p[4]), JSON.stringify(p[5]), p[6]]);
  const tpls = [
    ['sip_reminder', 'SIP date reminder', ['email', 'sms', 'push', 'inapp'], 'Your SIP date is {{date}}', 'Hi {{name}},\n\nYour Mod Alpha recommended SIP date this month is {{date}}. Review your decision and, if appropriate, invest through your own mutual fund provider. Mod Alpha does not place orders.\n\nPast performance does not guarantee future returns.', 'Mod Alpha: your SIP date this month is {{date}}. Invest via your own provider. Not advice.', 'Active'],
    ['subscription_confirmation', 'Subscription confirmation', ['email'], 'Your Mod Alpha plan is active', 'Hi {{name}},\n\nThank you for subscribing. Your invoice is available under Subscription → Billing history.', null, 'Active'],
    ['payment_status', 'Payment status update', ['email', 'push'], 'Payment update for your Mod Alpha plan', 'Hi {{name}},\n\nThere is an update on your latest payment. Open the Subscription page for details.', 'Mod Alpha: payment update — open the app for details.', 'Active'],
    ['security_alert', 'Security alert', ['email', 'sms'], 'New sign-in to your Mod Alpha account', 'Hi {{name}},\n\nWe noticed a new sign-in. If this was not you, reset your password immediately.', 'Mod Alpha: new sign-in detected. Not you? Reset your password.', 'Draft'],
  ];
  for (const t of tpls) await db.query(`INSERT INTO notification_templates (key, name, channels, subject, body, sms_text, status) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (key) DO NOTHING`, t);
  if (!(await db.query('SELECT 1 FROM faqs LIMIT 1')).rows[0]) {
    const faqs = [
      ['product', 'Does Mod Alpha place SIP orders or hold my money?', 'No. Mod Alpha provides analytics, a monthly SIP date insight and reminders. You invest through your own broker or mutual fund platform — we never execute transactions or hold customer money.'],
      ['product', 'How is the monthly SIP date chosen?', 'Our engine analyses historical NAV data, volatility windows, market holidays and multiple statistical factors to identify the historically strongest date each month. The detailed model remains proprietary.'],
      ['product', 'Is the recommended date guaranteed to give higher returns?', 'No. Recommendations are based on historical analysis, which does not predict or guarantee future performance.'],
      ['pricing', 'When do I need to complete KYC?', 'KYC is required once, before your first paid subscription is activated. The Free plan does not require KYC.'],
      ['pricing', 'Can I upgrade, downgrade or cancel my plan?', 'Yes, from the Subscription page. Cancelling keeps your plan active until the end of the current billing period.'],
      ['data', 'Where does the fund data come from?', 'Daily NAVs are imported from AMFI and validated before they are published.'],
    ];
    for (const [i, f] of faqs.entries()) await db.query('INSERT INTO faqs (category, question, answer, sort) VALUES ($1,$2,$3,$4)', [...f, i]);
  }
  if (!(await db.query('SELECT 1 FROM insights LIMIT 1')).rows[0]) {
    for (const i of [['trend', 'Small Cap Funds Showing Strong Momentum', 'Small cap funds have outperformed mid and large cap funds over the last 12 months in the current dataset.'], ['calendar', 'This Month’s SIP Date Is Published', 'Check the dashboard calendar for the recommended date and alternatives.'], ['bulb', 'Compare Before You Choose', 'Use the fund detail page to compare returns, risk level and expense ratio.']])
      await db.query('INSERT INTO insights (icon, title, body) VALUES ($1,$2,$3)', i);
  }
  await db.query(`INSERT INTO model_releases (version, gates) VALUES ('MA-SIP-1.0', $1) ON CONFLICT DO NOTHING`, [JSON.stringify({ data_quality: false, bias_tests: false, walk_forward: false, holiday_rules: false, compliance_review: false, admin_approval: false })]);
}

export async function bootstrapAdmin(db: Db, cfg: Config) {
  if (!cfg.ADMIN_BOOTSTRAP_EMAIL || !cfg.ADMIN_BOOTSTRAP_PASSWORD) return null;
  const hash = await bcrypt.hash(cfg.ADMIN_BOOTSTRAP_PASSWORD, 11);
  // admins sign in with password + email OTP + SMS OTP, so the bootstrap admin needs a mobile number
  const r = await db.query(`INSERT INTO users (email, full_name, password_hash, role, email_verified_at, kyc_status, mobile, mobile_verified_at)
      VALUES ($1,'Admin',$2,'superadmin', now(), 'Verified', $3, CASE WHEN $3::text IS NOT NULL THEN now() END)
      ON CONFLICT (email) DO UPDATE SET role='superadmin', mobile=coalesce(EXCLUDED.mobile, users.mobile), mobile_verified_at=coalesce(users.mobile_verified_at, EXCLUDED.mobile_verified_at) RETURNING id`, [cfg.ADMIN_BOOTSTRAP_EMAIL, hash, cfg.ADMIN_BOOTSTRAP_MOBILE ?? null]);
  return r.rows[0].id;
}

/**
 * Test accounts for stage and local testing (refused in prod), one per state the website shows. All use the
 * password DEMO_PASSWORD. Payments, KYC, email and SMS stay on the mock providers.
 *   demo.free@modalpha.test        Free plan, KYC not started, email verified
 *   demo.pro@modalpha.test         Pro (monthly) active, renews in 20 days, KYC verified, two support requests
 *   demo.pastdue@modalpha.test     Pro, renewal payment failed 3 days ago → grace period (features until day 7)
 *   demo.cancelling@modalpha.test  Premium cancelled at period end, ends in 9 days
 *   demo.unverified@modalpha.test  Free plan, email not verified yet (shows the verify banner)
 */
export const DEMO_PASSWORD = 'Demo@12345';
export async function seedDemoAccounts(db: Db, cfg: Config) {
  if (cfg.APP_ENV === 'prod') throw new Error('Refusing to create test accounts in prod');
  const hash = await bcrypt.hash(DEMO_PASSWORD, 11);
  const user = async (email: string, name: string, verified: boolean, kyc: string) => (await db.query(
    `INSERT INTO users (email, full_name, password_hash, email_verified_at, kyc_status, mobile, mobile_verified_at) VALUES ($1,$2,$3, CASE WHEN $4 THEN now() END, $5, NULL, NULL)
     ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name, password_hash=EXCLUDED.password_hash, email_verified_at=EXCLUDED.email_verified_at, kyc_status=EXCLUDED.kyc_status RETURNING id`, [email, name, hash, verified, kyc])).rows[0].id;
  const sub = async (uid: string, id: string, plan: string, status: string, renewInDays: number, cancel = false) => {
    await db.query(`DELETE FROM subscriptions WHERE id=$1 OR user_id=$2`, [id, uid]);
    const amount = (await db.query(`SELECT (prices->>'Monthly')::numeric AS a FROM plans WHERE id=$1`, [plan])).rows[0]?.a ?? 299;
    await db.query(`INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, amount_inr, status, start_date, last_payment_date, renewal_date, provider, cancel_at_period_end)
      VALUES ($1,$2,$3,'Monthly',$4,$5, CURRENT_DATE - 40, CURRENT_DATE - 10, CURRENT_DATE + $6::int, 'mock', $7)`, [id, uid, plan, amount, status, renewInDays, cancel]);
  };
  await user('demo.free@modalpha.test', 'Free Tester', true, 'Not started');
  const pro = await user('demo.pro@modalpha.test', 'Pro Tester', true, 'Verified');
  await sub(pro, 'demo-sub-pro', 'Pro', 'Active', 20);
  await db.query(`DELETE FROM support_tickets WHERE user_id=$1`, [pro]);
  await db.query(`INSERT INTO support_tickets (number, user_id, email, topic, message, status, provider, reply, replied_at, created_at) VALUES
    ('MA-DEMO-0001',$1,'demo.pro@modalpha.test','Subscription','I was charged twice this month. Can you check?','Answered','mock','Thanks for flagging this. The second charge was a pending authorisation and has been released; it should disappear from your statement within 5 working days.', now() - interval '1 day', now() - interval '3 days'),
    ('MA-DEMO-0002',$1,'demo.pro@modalpha.test','Fund data','The NAV for Quant Small Cap looks a day old today.','In progress','mock',NULL,NULL, now() - interval '5 hours')`, [pro]);
  const pd = await user('demo.pastdue@modalpha.test', 'Renewal Failed Tester', true, 'Verified');
  await sub(pd, 'demo-sub-pastdue', 'Pro', 'Past due', -3);
  const cn = await user('demo.cancelling@modalpha.test', 'Cancelling Tester', true, 'Verified');
  await sub(cn, 'demo-sub-cancel', 'Premium', 'Active', 9, true);
  await user('demo.unverified@modalpha.test', 'Unverified Tester', false, 'Not started');
  return 5;
}

// Load a workbook into the database. Database set-up passes allowPersonal=false: the Users / Subscriptions sheets
// are skipped, so a new database starts with no users or subscribers. Only the API tests load them (true), as fixtures.
export async function importWorkbookFile(db: Db, file: string, allowPersonal: boolean) {
  const { report, data } = validateWorkbook(fs.readFileSync(file), { fileName: file, existingFundIds: new Set(), existingUserRefs: new Set(), allowPersonal, skipPersonal: !allowPersonal, todayIso: today() });
  if (!report.ok) throw new Error(`Workbook failed validation: ${report.fatal ?? report.errors + ' errors'}`);
  return tx(db, (c) => importData(c, data));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await import('../load-env.js');
  const { loadConfig } = await import('../config.js'); const { createDb } = await import('../db.js'); const { migrate } = await import('./migrate.js');
  const cfg = loadConfig(); const db = createDb(cfg);
  await migrate(db); await seedReference(db); const admin = await bootstrapAdmin(db, cfg);
  console.log('reference data seeded', admin ? `· admin ${cfg.ADMIN_BOOTSTRAP_EMAIL}` : '');
  const wb = process.argv.find((a) => a.startsWith('--workbook='))?.slice(11);
  if (process.argv.includes('--demo-accounts')) console.log('test accounts created (password ' + DEMO_PASSWORD + '):', await seedDemoAccounts(db, cfg));
  if (wb) { if (cfg.APP_ENV === 'prod') throw new Error('Refusing to import a test workbook in prod'); console.log('imported (funds, NAV, SIP dates, holidays — no users or subscriptions)', await importWorkbookFile(db, wb, false)); }
  await db.end();
}
