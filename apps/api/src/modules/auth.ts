import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { badRequest, conflict, forbidden, tooMany, unauthorized, HttpError } from '../lib/errors.js';
import { AuthUser, clearSession, issueSession, randomToken, requireUser, sha256 } from '../lib/auth.js';
import { audit } from '../lib/audit.js';

const pw = z.string().min(8, 'Password must be at least 8 characters').max(128);
const mobile = z.string().transform((s) => s.replace(/[^\d+]/g, '')).refine((s) => /^\+?\d{10,13}$/.test(s), 'Enter a valid mobile number').transform((s) => (s.startsWith('+') ? s : s.length === 10 ? `+91${s}` : `+${s}`));
const toAuth = (r: any): AuthUser => ({ id: r.id, role: r.role, name: r.full_name, email: r.email });
export const userView = (r: any) => ({ id: r.id, name: r.full_name, email: r.email, mobile: r.mobile, role: r.role, kycStatus: r.kyc_status, accountStatus: r.account_status, emailVerified: !!r.email_verified_at, mobileVerified: !!r.mobile_verified_at, signupDate: r.signup_date });

export default async function auth(app: FastifyInstance) {
  const { db, cfg, providers } = app.deps;
  const strict = { config: { rateLimit: { max: cfg.APP_ENV === 'test' ? 1000 : 10, timeWindow: '1 minute' } } };
  const active = (r: any) => { if (r.account_status !== 'Active' || r.deleted_at) throw forbidden(`This account is ${r.account_status.toLowerCase()}. Contact support.`); };

  app.post('/auth/signup', strict, async (req, reply) => {
    const b = parse(z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email(), password: pw, marketingConsent: z.boolean().default(false) }), req.body);
    const hash = await bcrypt.hash(b.password, 11);
    const r = await db.query(`INSERT INTO users (email, full_name, password_hash, marketing_consent) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING RETURNING *`, [b.email, b.name, hash, b.marketingConsent]);
    if (!r.rows[0]) throw conflict('An account with this email already exists. Log in instead.');
    const u = r.rows[0];
    await db.query('INSERT INTO consents (user_id, kind, granted, source) VALUES ($1,$2,$3,$4)', [u.id, 'marketing', b.marketingConsent, 'signup']);
    await sendVerifyEmail(u);
    await audit(db, req, { action: 'USER_SIGNUP', category: 'Account', resource: u.id, actorLabel: u.email });
    const s = await issueSession(db, cfg, reply, req, toAuth(u));
    return reply.status(201).send({ user: userView(u), ...s });
  });

  app.post('/auth/login', strict, async (req, reply) => {
    const b = parse(z.object({ email: z.string().trim().email(), password: z.string().min(1), remember: z.boolean().default(true) }), req.body);
    const r = await db.query('SELECT * FROM users WHERE email=$1 AND deleted_at IS NULL', [b.email]);
    const u = r.rows[0];
    if (!u || !u.password_hash || !(await bcrypt.compare(b.password, u.password_hash))) {
      await audit(db, req, { action: 'LOGIN_FAILED', category: 'Access', resource: b.email, outcome: 'Blocked', actorLabel: b.email });
      throw unauthorized('Incorrect email or password');
    }
    active(u);
    const s = await issueSession(db, cfg, reply, req, toAuth(u), b.remember);
    return { user: userView(u), ...s };
  });

  app.post('/auth/otp/send', strict, async (req) => {
    const b = parse(z.object({ mobile, purpose: z.enum(['login', 'verify']).default('login') }), req.body);
    const recent = await db.query(`SELECT count(*)::int n FROM otp_codes WHERE target=$1 AND created_at > now() - interval '1 hour'`, [b.mobile]);
    if (recent.rows[0].n >= 5) throw tooMany('Too many OTP requests. Try again in an hour.');
    const code = String(crypto.randomInt(100000, 1000000));
    await db.query(`INSERT INTO otp_codes (target, purpose, code_hash, expires_at) VALUES ($1,$2,$3, now() + interval '10 minutes')`, [b.mobile, b.purpose, sha256(code)]);
    await providers.sms.send({ to: b.mobile, text: `${code} is your Mod Alpha verification code. It expires in 10 minutes.`, templateId: cfg.MSG91_OTP_TEMPLATE_ID, vars: { otp: code } });
    return { sent: true, expiresIn: 600, ...(providers.sms.name === 'mock' && cfg.APP_ENV !== 'prod' ? { devCode: code } : {}) };
  });

  async function checkOtp(target: string, purpose: string, code: string) {
    const r = await db.query(`SELECT * FROM otp_codes WHERE target=$1 AND purpose=$2 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`, [target, purpose]);
    const o = r.rows[0];
    if (!o || new Date(o.expires_at) < new Date()) throw badRequest('Code expired. Request a new one.');
    if (o.attempts >= 5) throw tooMany('Too many attempts. Request a new code.');
    if (o.code_hash !== sha256(code)) { await db.query('UPDATE otp_codes SET attempts=attempts+1 WHERE id=$1', [o.id]); throw badRequest('Incorrect code'); }
    await db.query('UPDATE otp_codes SET consumed_at=now() WHERE id=$1', [o.id]);
  }

  app.post('/auth/otp/verify', strict, async (req, reply) => {
    const b = parse(z.object({ mobile, code: z.string().regex(/^\d{6}$/), name: z.string().trim().min(2).max(80).optional(), remember: z.boolean().default(true) }), req.body);
    await checkOtp(b.mobile, 'login', b.code);
    let u = (await db.query('SELECT * FROM users WHERE mobile=$1 AND deleted_at IS NULL', [b.mobile])).rows[0];
    let created = false;
    if (!u) {
      u = (await db.query(`INSERT INTO users (mobile, full_name, mobile_verified_at) VALUES ($1,$2, now()) RETURNING *`, [b.mobile, b.name ?? 'Investor'])).rows[0];
      created = true;
      await audit(db, req, { action: 'USER_SIGNUP', category: 'Account', resource: u.id, actorLabel: b.mobile });
    } else if (!u.mobile_verified_at) await db.query('UPDATE users SET mobile_verified_at=now() WHERE id=$1', [u.id]);
    active(u);
    const s = await issueSession(db, cfg, reply, req, toAuth(u), b.remember);
    return reply.status(created ? 201 : 200).send({ user: userView(u), created, ...s });
  });

  app.post('/auth/oauth/google', strict, async (req, reply) => {
    const b = parse(z.object({ idToken: z.string().min(5) }), req.body);
    const g = await providers.google.verify(b.idToken);
    let u = (await db.query('SELECT * FROM users WHERE google_sub=$1 OR email=$2 ORDER BY google_sub NULLS LAST LIMIT 1', [g.sub, g.email])).rows[0];
    if (!u) u = (await db.query(`INSERT INTO users (email, full_name, google_sub, email_verified_at) VALUES ($1,$2,$3, CASE WHEN $4 THEN now() END) RETURNING *`, [g.email, g.name, g.sub, g.emailVerified])).rows[0];
    else if (!u.google_sub) u = (await db.query('UPDATE users SET google_sub=$2, email_verified_at=coalesce(email_verified_at, now()) WHERE id=$1 RETURNING *', [u.id, g.sub])).rows[0];
    active(u);
    return { user: userView(u), ...(await issueSession(db, cfg, reply, req, toAuth(u))) };
  });
  app.post('/auth/oauth/apple', async () => { throw new HttpError(501, 'not_implemented', 'Sign in with Apple is not available yet (AUTH-05).'); });

  app.post('/auth/refresh', async (req, reply) => {
    const t = (req.cookies as any)?.ma_rt ?? (req.body as any)?.refreshToken;
    if (!t) throw unauthorized('No session');
    const r = await db.query(`SELECT s.*, u.role, u.full_name, u.email, u.account_status, u.deleted_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_hash=$1`, [sha256(t)]);
    const s = r.rows[0];
    if (!s || s.revoked_at || new Date(s.expires_at) < new Date()) {
      if (s && s.revoked_at) await db.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [s.user_id]); // reuse detected → revoke all
      clearSession(cfg, reply); throw unauthorized('Session expired. Please log in again.');
    }
    active(s);
    await db.query('UPDATE sessions SET revoked_at=now() WHERE id=$1', [s.id]);
    return issueSession(db, cfg, reply, req, { id: s.user_id, role: s.role, name: s.full_name, email: s.email });
  });

  app.post('/auth/logout', async (req, reply) => {
    const t = (req.cookies as any)?.ma_rt;
    if (t) await db.query('UPDATE sessions SET revoked_at=now() WHERE refresh_hash=$1', [sha256(t)]);
    clearSession(cfg, reply);
    return { ok: true };
  });

  app.post('/auth/password/forgot', strict, async (req) => {
    const b = parse(z.object({ email: z.string().trim().email() }), req.body);
    const u = (await db.query('SELECT * FROM users WHERE email=$1 AND deleted_at IS NULL', [b.email])).rows[0];
    if (u) {
      const token = randomToken();
      await db.query(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1,$2, now() + interval '1 hour')`, [sha256(token), u.id]);
      await providers.email.send({ to: u.email, subject: 'Reset your Mod Alpha password', text: `Hi ${u.full_name},\n\nReset your password using this link (valid for 1 hour):\n${cfg.PUBLIC_APP_URL}/#/reset-password?token=${token}\n\nIf you did not request this, ignore this email.` });
    }
    return { ok: true, message: 'If an account exists for this email, a reset link has been sent.' };
  });

  app.post('/auth/password/reset', strict, async (req) => {
    const b = parse(z.object({ token: z.string().min(10), password: pw }), req.body);
    const r = await db.query('SELECT * FROM password_resets WHERE token_hash=$1', [sha256(b.token)]);
    const pr = r.rows[0];
    if (!pr || pr.used_at || new Date(pr.expires_at) < new Date()) throw badRequest('This reset link is invalid or has expired.');
    await db.query('UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1', [pr.user_id, await bcrypt.hash(b.password, 11)]);
    await db.query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1', [pr.token_hash]);
    await db.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [pr.user_id]);
    await audit(db, req, { action: 'PASSWORD_RESET', category: 'Access', resource: pr.user_id, actorLabel: 'user' });
    return { ok: true };
  });

  app.post('/auth/verify-email', async (req) => {
    const b = parse(z.object({ token: z.string().min(10) }), req.body);
    const r = await db.query(`UPDATE users SET email_verified_at=now() WHERE id=(SELECT user_id FROM password_resets WHERE token_hash=$1 AND expires_at > now() AND used_at IS NULL) RETURNING id`, ['verify:' + sha256(b.token)]);
    if (!r.rows[0]) throw badRequest('Verification link is invalid or expired.');
    await db.query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1', ['verify:' + sha256(b.token)]);
    return { ok: true };
  });

  app.get('/auth/me', async (req) => {
    const me = requireUser(req);
    const u = (await db.query('SELECT * FROM users WHERE id=$1', [me.id])).rows[0];
    if (!u) throw unauthorized();
    return { user: userView(u) };
  });

  async function sendVerifyEmail(u: any) {
    if (!u.email) return;
    const token = randomToken();
    await db.query(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1,$2, now() + interval '3 days')`, ['verify:' + sha256(token), u.id]);
    await providers.email.send({ to: u.email, subject: 'Verify your email for Mod Alpha', text: `Welcome to Mod Alpha, ${u.full_name}!\n\nConfirm your email: ${cfg.PUBLIC_APP_URL}/#/verify-email?token=${token}` });
  }
}
