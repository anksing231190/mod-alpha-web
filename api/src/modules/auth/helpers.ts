/**
 * Auth helpers shared by the auth routes, admin MFA and the account module.
 */
import { z } from 'zod';
import type { Config } from '../../config.js';
import { forbidden } from '../../shared/errors.js';
import type { AuthUser } from './session.js';

/** Password rule for sign-up, reset and change: 8–128 characters. */
export const pw = z.string().min(8, 'Password must be at least 8 characters').max(128);
/** Indian mobile number → E.164 (+91XXXXXXXXXX). Accepts spaces, dashes, with or without +91. */
export const mobile = z.string().transform((s) => s.replace(/[^\d+]/g, '')).refine((s) => /^\+?\d{10,13}$/.test(s), 'Enter a valid mobile number').transform((s) => (s.startsWith('+') ? s : s.length === 10 ? `+91${s}` : `+${s}`));
/** Database user row → the minimal identity stored in the access token. */
export const toAuth = (r: any): AuthUser => ({ id: r.id, role: r.role, name: r.full_name, email: r.email });
/** Database user row → the user object returned to the browser (no secrets). */
// ref: the Customer ID shown in the apps and to support (same as the admin screens)
export const userView = (r: any) => ({ id: r.id, ref: r.external_ref ?? String(r.id).slice(0, 8), name: r.full_name, email: r.email, mobile: r.mobile, role: r.role, kycStatus: r.kyc_status, accountStatus: r.account_status, emailVerified: !!r.email_verified_at, mobileVerified: !!r.mobile_verified_at, signupDate: r.signup_date, billing: { stateCode: r.billing_state_code ?? null, address: r.billing_address ?? null, gstin: r.billing_gstin ?? null } });
/** Refuse sign-in for suspended / closed / deleted accounts. */
export const active = (r: any) => { if (r.account_status !== 'Active' || r.deleted_at) throw forbidden(`This account is ${r.account_status.toLowerCase()}. Contact support.`); };
/** Tighter rate limit for sign-in style routes: 10 requests per minute per IP (relaxed in tests). */
export const strictLimit = (cfg: Config) => ({ config: { rateLimit: { max: cfg.APP_ENV === 'test' ? 1000 : 10, timeWindow: '1 minute' } } });
