/**
 * Auth routes: create accounts and start / end sessions.
 *   POST /auth/signup · /auth/login · /auth/otp/send · /auth/otp/verify · /auth/oauth/google (· /auth/oauth/apple = 501)
 *   POST /auth/refresh · GET /auth/session · POST /auth/activity · POST /auth/logout · /auth/logout-all
 *   POST /auth/password/forgot · /auth/password/reset · /auth/verify-email · GET /auth/me
 * Admins never get a session from the first step: they get a 2-code challenge (admin-mfa.ts).
 * Session cookies, timeouts and the per-request check live in session.ts.
 */
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { badRequest, conflict, forbidden, tooMany, unauthorized, HttpError } from '../../shared/errors.js';
import { AuthUser, clearSession, endForTimeout, expiredBy, issueSession, randomToken, requireUser, sessionExpired, sessionInfo, sha256 } from './session.js';
import { audit } from '../../shared/audit.js';
import { active, mobile, pw, strictLimit, toAuth, userView } from './helpers.js';
import { adminMfa } from './admin-mfa.js';

export { userView } from './helpers.js';

export default async function auth(app: FastifyInstance) {
  const { db, cfg, providers } = app.deps;
  const strict = strictLimit(cfg);
  const { isAdmin, adminChallenge } = adminMfa(app);   // admins: email code + SMS code before a session starts

  // POST /auth/signup — email + password account. Records the marketing consent, emails a verification link and
  // signs the person in (201).
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


  // POST /auth/login — email + password. Wrong details are audited (LOGIN_FAILED). Admins continue with the 2-code
  // step.
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

  // POST /auth/otp/send — 6-digit code by SMS (10-minute expiry, max 5 per hour per number). On stage the mock
  // returns the code as devCode.
  // `intent`: 'login' (the Login screen) only works for an existing account; 'signup' (Create account) may create one.
  const NO_ACCOUNT = (what: string) => new HttpError(404, 'no_account', `No Mod Alpha account uses this ${what}. Create an account first.`);
  app.post('/auth/otp/send', strict, async (req) => {
    const b = parse(z.object({ mobile, purpose: z.enum(['login', 'verify']).default('login'), intent: z.enum(['login', 'signup']).default('login') }), req.body);
    if (b.purpose === 'login' && b.intent === 'login' && !(await db.query('SELECT 1 FROM users WHERE mobile=$1 AND deleted_at IS NULL', [b.mobile])).rows[0]) throw NO_ACCOUNT('mobile number');
    const recent = await db.query(`SELECT count(*)::int n FROM otp_codes WHERE target=$1 AND created_at > now() - interval '1 hour'`, [b.mobile]);
    if (recent.rows[0].n >= 5) throw tooMany('Too many OTP requests. Try again in an hour.');
    const code = String(crypto.randomInt(100000, 1000000));
    await db.query(`INSERT INTO otp_codes (target, purpose, code_hash, expires_at) VALUES ($1,$2,$3, now() + interval '10 minutes')`, [b.mobile, b.purpose, sha256(code)]);
    await providers.sms.send({ to: b.mobile, text: `${code} is your Mod Alpha verification code. It expires in 10 minutes.`, templateId: cfg.MSG91_OTP_TEMPLATE_ID, vars: { otp: code } });
    return { sent: true, expiresIn: 600, ...(providers.sms.name === 'mock' && cfg.APP_ENV !== 'prod' ? { devCode: code } : {}) };
  });

  // Check the latest unused code for this number: expiry, max 5 attempts, then mark it used.
  async function checkOtp(target: string, purpose: string, code: string) {
    const r = await db.query(`SELECT * FROM otp_codes WHERE target=$1 AND purpose=$2 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`, [target, purpose]);
    const o = r.rows[0];
    if (!o || new Date(o.expires_at) < new Date()) throw badRequest('Code expired. Request a new one.');
    if (o.attempts >= 5) throw tooMany('Too many attempts. Request a new code.');
    if (o.code_hash !== sha256(code)) { await db.query('UPDATE otp_codes SET attempts=attempts+1 WHERE id=$1', [o.id]); throw badRequest('Incorrect code'); }
    await db.query('UPDATE otp_codes SET consumed_at=now() WHERE id=$1', [o.id]);
  }

  // POST /auth/otp/verify — mobile sign-in. With intent 'signup' it creates the account on first use (name
  // optional); with intent 'login' (default) the account must already exist.
  app.post('/auth/otp/verify', strict, async (req, reply) => {
    const b = parse(z.object({ mobile, code: z.string().regex(/^\d{6}$/), name: z.string().trim().min(2).max(80).optional(), remember: z.boolean().default(true), intent: z.enum(['login', 'signup']).default('login') }), req.body);
    let u = (await db.query('SELECT * FROM users WHERE mobile=$1 AND deleted_at IS NULL', [b.mobile])).rows[0];
    if (!u && b.intent === 'login') throw NO_ACCOUNT('mobile number');
    await checkOtp(b.mobile, 'login', b.code);
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

  // POST /auth/oauth/google — verify the Google ID token, then find the user by Google id or email (linking them),
  // or create one.
  app.post('/auth/oauth/google', strict, async (req, reply) => {
    const b = parse(z.object({ idToken: z.string().min(5), intent: z.enum(['login', 'signup']).default('login') }), req.body);
    const g = await providers.google.verify(b.idToken);
    let u = (await db.query('SELECT * FROM users WHERE google_sub=$1 OR email=$2 ORDER BY google_sub NULLS LAST LIMIT 1', [g.sub, g.email])).rows[0];
    if (!u && b.intent === 'login') throw NO_ACCOUNT('Google account');
    if (!u) u = (await db.query(`INSERT INTO users (email, full_name, google_sub, email_verified_at) VALUES ($1,$2,$3, CASE WHEN $4 THEN now() END) RETURNING *`, [g.email, g.name, g.sub, g.emailVerified])).rows[0];
    else if (!u.google_sub) u = (await db.query('UPDATE users SET google_sub=$2, email_verified_at=coalesce(email_verified_at, now()) WHERE id=$1 RETURNING *', [u.id, g.sub])).rows[0];
    active(u);
    if (isAdmin(u)) return adminChallenge(req, u, true);
    return { user: userView(u), ...(await issueSession(db, cfg, reply, req, toAuth(u))) };
  });
  // Sign in with Apple is planned (AUTH-05); the website shows 'coming later'.
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
  // POST /auth/logout-all — "Sign out of all devices": revoke every open session of this user.
  app.post('/auth/logout-all', async (req, reply) => {
    const u = requireUser(req);
    const r = await db.query(`UPDATE sessions SET revoked_at=now(), end_reason='logout_all' WHERE user_id=$1 AND revoked_at IS NULL`, [u.id]);
    await audit(db, req, { action: 'LOGOUT_ALL_DEVICES', category: 'Access', resource: u.id, meta: { sessions: r.rowCount } });
    clearSession(cfg, reply);
    return { ok: true, sessionsEnded: r.rowCount };
  });

  // POST /auth/password/forgot — always answers the same way (does not reveal whether the email exists). Link
  // valid 1 hour.
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

  // POST /auth/password/reset — set a new password with the emailed token; ends every session of the user.
  app.post('/auth/password/reset', strict, async (req) => {
    const b = parse(z.object({ token: z.string().min(10), password: pw }), req.body);
    const r = await db.query('SELECT * FROM password_resets WHERE token_hash=$1', [sha256(b.token)]);
    const pr = r.rows[0];
    if (!pr || pr.used_at || new Date(pr.expires_at) < new Date()) throw badRequest('This reset link is invalid or has expired.');
    // the link was opened from the inbox, so the email address is confirmed too (admin invitations rely on this)
    await db.query('UPDATE users SET password_hash=$2, email_verified_at=coalesce(email_verified_at, now()), updated_at=now() WHERE id=$1', [pr.user_id, await bcrypt.hash(b.password, 11)]);
    await db.query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1', [pr.token_hash]);
    await db.query(`UPDATE sessions SET revoked_at=now(), end_reason='password_reset' WHERE user_id=$1 AND revoked_at IS NULL`, [pr.user_id]);
    await audit(db, req, { action: 'PASSWORD_RESET', category: 'Access', resource: pr.user_id, actorLabel: 'user' });
    return { ok: true };
  });

  // POST /auth/verify-email — confirm the address from the link sent at sign-up (valid 3 days).
  app.post('/auth/verify-email', async (req) => {
    const b = parse(z.object({ token: z.string().min(10) }), req.body);
    const r = await db.query(`UPDATE users SET email_verified_at=now() WHERE id=(SELECT user_id FROM password_resets WHERE token_hash=$1 AND expires_at > now() AND used_at IS NULL) RETURNING id`, ['verify:' + sha256(b.token)]);
    if (!r.rows[0]) throw badRequest('Verification link is invalid or expired.');
    await db.query('UPDATE password_resets SET used_at=now() WHERE token_hash=$1', ['verify:' + sha256(b.token)]);
    return { ok: true };
  });

  // GET /auth/me — who is signed in (the website calls this on page load).
  app.get('/auth/me', async (req) => {
    const me = requireUser(req);
    const u = (await db.query('SELECT * FROM users WHERE id=$1', [me.id])).rows[0];
    if (!u) throw unauthorized();
    return { user: userView(u) };
  });

  // Email a 3-day verification link (token stored hashed in password_resets with a 'verify:' prefix).
  async function sendVerifyEmail(u: any) {
    if (!u.email) return;
    const token = randomToken();
    await db.query(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1,$2, now() + interval '3 days')`, ['verify:' + sha256(token), u.id]);
    await providers.email.send({ to: u.email, subject: 'Verify your email for Mod Alpha', text: `Welcome to Mod Alpha, ${u.full_name}!\n\nConfirm your email: ${cfg.PUBLIC_APP_URL}/#/verify-email?token=${token}` });
  }
}
