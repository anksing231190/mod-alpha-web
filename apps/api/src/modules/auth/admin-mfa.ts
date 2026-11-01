/**
 * Admin sign-in, step 2: a 6-digit code by EMAIL and another by SMS — both are required.
 *
 * Flow
 *   1. POST /auth/login (or mobile OTP / Google) recognises an admin and calls `adminChallenge()` instead of
 *      starting a session. It stores a `login_challenges` row (codes hashed, 10-minute expiry) and sends the
 *      codes. The response is { mfaRequired, challengeId, masked email/mobile } (+ devCodes on stage mocks).
 *   2. POST /auth/login/verify { challengeId, emailCode, smsCode } → both correct → session starts.
 *      Max 5 wrong attempts per challenge.
 *   3. POST /auth/login/resend { challengeId } → new codes (max 3 resends).
 * Every step is written to the audit log.
 */
import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { parse } from '../../shared/validate.js';
import { badRequest, tooMany, unauthorized, HttpError } from '../../shared/errors.js';
import { audit } from '../../shared/audit.js';
import { issueSession, sha256 } from './session.js';
import { active, strictLimit, toAuth, userView } from './helpers.js';

/** Registers the verify/resend routes and returns the helpers the login routes need. */
export function adminMfa(app: FastifyInstance) {
  const { db, cfg, providers } = app.deps;
  const strict = strictLimit(cfg);
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

  /** POST /auth/login/verify — check both codes, then start the admin session. */
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
  /** POST /auth/login/resend — fresh codes for the same challenge. */
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


  return { isAdmin, adminChallenge };
}
