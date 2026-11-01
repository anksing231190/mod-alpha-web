import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { badRequest, conflict, forbidden, tooMany, unauthorized, HttpError } from '../lib/errors.js';
import { AuthUser, clearSession, endForTimeout, expiredBy, issueSession, randomToken, requireUser, sessionExpired, sessionInfo, sha256 } from '../lib/auth.js';
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


  /* ---- Admin sign-in second step: a code by email AND a code by SMS, both required ---- */
  const isAdmin = (u: any) => u.role === 'admin' || u.role === 'superadmin';
  const mask = {
    email: (e: string) => e.replace(/^(.)(.*)(.@.*)$/, (_, a, m, b) => a + '•'.repeat(Math.max(2, m.length)) + b),
    mobile: (m: string) => m.replace(/^(\+\d{2})\d+(\d{4})$/, '$1 •••••• $2'),
  };
  async function adminChallenge(req: any, u: any, remember: boolean) {
    if (!u.email || !u.mobile) {
      await audit(db, req, { action: 'ADMIN_LOGIN_BLOCKED', category: 'Access', resource: u.id, outcome: 'Blocked', actorLabel: u.email ?? u.mobile, meta: { reason: 'missing email or mobile' } });
      throw new HttpError(403, 'admin_contact_required', 'Admin sign-in needs both a verified email and mobile number on the account. Ask a super admin to add them.');
    }
    const ec = String(crypto.randomInt(100000, 1000000)), sc = String(crypto.randomInt(100000, 1000000));
    const ch = (await db.query(`INSERT INTO login_challenges (user_id, email_code_hash, sms_code_hash, remember, expires_at, ip) VALUES ($1,$2,$3,$4, now() + interval '10 minutes', $5) RETURNING id`, [u.id, sha256(ec), sha256(sc), remember, req.ip])).rows[0];
    await sendChallengeCodes(u, ec, sc);
    await audit(db, req, { action: 'ADMIN_LOGIN_CHALLENGE', category: 'Access', resource: u.id, actorLabel: u.email });
    const dev = cfg.APP_ENV !== 'prod' && providers.email.name === 'mock' && providers.sms.name === 'mock';
    return { mfaRequired: true, challengeId: ch.id, email: mask.email(u.email), mobile: mask.mobile(u.mobile), expiresIn: 600, ...(dev ? { devCodes: { email: ec, sms: sc } } : {}) };
  }
  async function sendChallengeCodes(u: any, ec: string, sc: string) {
    await providers.email.send({ to: u.email, subject: `${ec} is your Mod Alpha admin sign-in code`, text: `Your admin sign-in code is ${ec}. It expires in 10 minutes. You also need the code sent to your mobile.\n\nIf you did not try to sign in, reset your password and tell your security team.` });
    await providers.sms.send({ to: u.mobile, text: `${sc} is your Mod Alpha admin sign-in code. It expires in 10 minutes. Never share it.`, templateId: cfg.MSG91_OTP_TEMPLATE_ID, vars: { otp: sc } });
  }

  app.post('/auth/login/verify', strict, async (req, reply) => {
    const b = parse(z.object({ challengeId: z.string().uuid(), emailCode: z.string().regex(/^\d{6}$/, 'Enter the 6-digit email code'), smsCode: z.string().regex(/^\d{6}$/, 'Enter the 6-digit SMS code') }), req.body);
    const c = (await db.query('SELECT * FROM login_challenges WHERE id=$1', [b.challengeId])).rows[0];
    if (!c || c.consumed_at || new Date(c.expires_at) < new Date()) throw badRequest('This sign-in code has expired. Log in again.');
    if (c.attempts >= 5) throw tooMany('Too many attempts. Log in again to get new codes.');
    const okE = c.email_code_hash === sha256(b.emailCode), okS = c.sms_code_hash === sha256(b.smsCode);
    if (!okE || !okS) {
      await db.query('UPDATE login_challenges SET attempts=attempts+1 WHERE id=$1', [c.id]);
      await audit(db, req, { action: 'ADMIN_LOGIN_CODE_FAILED', category: 'Access', resource: c.user_id, outcome: 'Blocked', meta: { email: okE, sms: okS } });
      throw new HttpError(400, 'bad_code', !okE && !okS ? 'Both codes are incorrect.' : !okE ? 'The email code is incorrect.' : 'The SMS code is incorrect.', { email: okE, sms: okS });
    }
    const u = (await db.query('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [c.user_id])).rows[0];
    if (!u) throw unauthorized();
    active(u);
    await db.query('UPDATE login_challenges SET consumed_at=now() WHERE id=$1', [c.id]);
    await audit(db, req, { action: 'ADMIN_LOGIN', category: 'Access', resource: u.id, actorLabel: u.email, meta: { factors: ['password', 'email_otp', 'sms_otp'] } });
    return { user: userView(u), ...(await issueSession(db, cfg, reply, req, toAuth(u), c.remember)) };
  });
  app.post('/auth/login/resend', strict, async (req) => {
    const b = parse(z.object({ challengeId: z.string().uuid() }), req.body);
    const c = (await db.query('SELECT * FROM login_challenges WHERE id=$1', [b.challengeId])).rows[0];
    if (!c || c.consumed_at || new Date(c.expires_at) < new Date()) throw badRequest('This sign-in has expired. Log in again.');
    if (c.resends >= 3) throw tooMany('Too many resends. Log in again.');
    const u = (await db.query('SELECT * FROM users WHERE id=$1', [c.user_id])).rows[0];
    const ec = String(crypto.randomInt(100000, 1000000)), sc = String(crypto.randomInt(100000, 1000000));
    await db.query(`UPDATE login_challenges SET email_code_hash=$2, sms_code_hash=$3, attempts=0, resends=resends+1, expires_at=now() + interval '10 minutes' WHERE id=$1`, [c.id, sha256(ec), sha256(sc)]);
    await sendChallengeCodes(u, ec, sc);
    const dev = cfg.APP_ENV !== 'prod' && providers.email.name === 'mock' && providers.sms.name === 'mock';
    return { sent: true, expiresIn: 600, ...(dev ? { devCodes: { email: ec, sms: sc } } : {}) };
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
    if (isAdmin(u)) return adminChallenge(req, u, b.remember);
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
    if (isAdmin(u)) return adminChallenge(req, u, b.remember);
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
    if (isAdmin(u)) return adminChallenge(req, u, true);
    return { user: userView(u), ...(await issueSession(db, cfg, reply, req, toAuth(u))) };
  });
  app.post('/auth/oauth/apple', async () => { throw new HttpError(501, 'not_implemented', 'Sign in with Apple is not available yet (AUTH-05).'); });

  /**
   * POST /auth/refresh — swap the refresh cookie for a new access token (the browser does this silently when
   * the 15-minute access token expires). The refresh token rotates: the old session row is closed with
   * end_reason 'rotated' and a new row continues it with the SAME absolute end time and last activity.
   * Presenting an already-rotated refresh token again means it was copied → every session of the user ends.
   * A session that hit its inactivity or absolute limit cannot be refreshed (401 session_expired).
   */
  app.post('/auth/refresh', async (req, reply) => {
    const t = (req.cookies as any)?.ma_rt ?? (req.body as any)?.refreshToken;
    if (!t) throw unauthorized('No session');
    const r = await db.query(`SELECT s.*, u.role, u.full_name, u.email, u.account_status, u.deleted_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_hash=$1`, [sha256(t)]);
    const s = r.rows[0];
    if (!s) { clearSession(cfg, reply); throw unauthorized('Session expired. Please log in again.'); }
    if (s.revoked_at) {
      if (s.end_reason === 'idle' || s.end_reason === 'absolute') { clearSession(cfg, reply); throw sessionExpired(s.end_reason); }
      // A rotated or logged-out refresh token is never sent again by the real browser (it got a new one, or the
      // cookie was cleared) — seeing it again means it was copied → treat as stolen and end every session.
      // Sessions ended by a timeout, password change or suspension are NOT treated this way: the user's other
      // devices may still hold those cookies legitimately.
      if (s.end_reason === null || s.end_reason === 'rotated' || s.end_reason === 'logout') {
        await db.query(`UPDATE sessions SET revoked_at=now(), end_reason='reuse' WHERE user_id=$1 AND revoked_at IS NULL`, [s.user_id]);
        await audit(db, req, { action: 'REFRESH_TOKEN_REUSE', category: 'Access', resource: s.user_id, outcome: 'Blocked', actorLabel: 'system' });
      }
      clearSession(cfg, reply); throw unauthorized('Session expired. Please log in again.');
    }
    const ended = expiredBy(cfg, s);
    if (ended) { await endForTimeout(db, req, s, ended); clearSession(cfg, reply); throw sessionExpired(ended); }
    active(s);
    await db.query(`UPDATE sessions SET revoked_at=now(), end_reason='rotated' WHERE id=$1`, [s.id]);
    return issueSession(db, cfg, reply, req, { id: s.user_id, role: s.role, name: s.full_name, email: s.email }, true,
      { absoluteExpiresAt: new Date(s.absolute_expires_at), lastSeenAt: new Date(s.last_seen_at) });
  });

  /** GET /auth/session — timers for the browser (inactivity limit, absolute end). Does not count as activity. */
  app.get('/auth/session', async (req) => {
    const u = requireUser(req);
    const s = (await db.query('SELECT absolute_expires_at, last_seen_at FROM sessions WHERE id=$1', [u.sid])).rows[0];
    if (!s) throw unauthorized();
    return sessionInfo(cfg, s);
  });
  /** POST /auth/activity — heartbeat sent by the browser while the person is active, and by "Stay signed in". */
  app.post('/auth/activity', async (req) => {
    const u = requireUser(req);
    const s = (await db.query('UPDATE sessions SET last_seen_at=now() WHERE id=$1 RETURNING absolute_expires_at, last_seen_at', [u.sid])).rows[0];
    if (!s) throw unauthorized();
    return sessionInfo(cfg, s);
  });

  // Logout ends this session server-side: the refresh token and the access token (via its session id) stop working.
  // Body { reason: 'idle' | 'absolute' } is sent when the browser's own timer signs the person out.
  app.post('/auth/logout', async (req, reply) => {
    const reason = (req.body as any)?.reason === 'idle' || (req.body as any)?.reason === 'absolute' ? (req.body as any).reason : 'logout';
    const t = (req.cookies as any)?.ma_rt;
    const r = t ? await db.query('UPDATE sessions SET revoked_at=now(), end_reason=$2 WHERE refresh_hash=$1 AND revoked_at IS NULL RETURNING user_id', [sha256(t), reason]) : null;
    if (req.user?.sid) await db.query('UPDATE sessions SET revoked_at=now(), end_reason=$2 WHERE id=$1 AND revoked_at IS NULL', [req.user.sid, reason]);
    const uid = req.user?.id ?? r?.rows[0]?.user_id;
    const action = reason === 'idle' ? 'SESSION_TIMEOUT_IDLE' : reason === 'absolute' ? 'SESSION_TIMEOUT_ABSOLUTE' : 'LOGOUT';
    if (uid && (r?.rowCount || req.user)) await audit(db, req, { action, category: 'Access', resource: uid, actorLabel: req.user?.email ?? undefined });
    clearSession(cfg, reply);
    return { ok: true };
  });
  // "Sign out of all devices": revoke every session of this user.
  app.post('/auth/logout-all', async (req, reply) => {
    const u = requireUser(req);
    const r = await db.query(`UPDATE sessions SET revoked_at=now(), end_reason='logout_all' WHERE user_id=$1 AND revoked_at IS NULL`, [u.id]);
    await audit(db, req, { action: 'LOGOUT_ALL_DEVICES', category: 'Access', resource: u.id, meta: { sessions: r.rowCount } });
    clearSession(cfg, reply);
    return { ok: true, sessionsEnded: r.rowCount };
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
    await db.query(`UPDATE sessions SET revoked_at=now(), end_reason='password_reset' WHERE user_id=$1 AND revoked_at IS NULL`, [pr.user_id]);
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
