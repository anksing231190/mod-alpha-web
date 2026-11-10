/**
 * Google sign-in — provider adapter.
 * Switch: OAUTH_GOOGLE = mock | google (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: accepts "mock:<email>" tokens on non-prod. Real: verifies the Google ID token (audience = GOOGLE_CLIENT_ID).
 */
import { type Ctx, http } from './shared.js';
import { upstream } from '../shared/errors.js';

export interface OAuthProvider { name: string; verify(idToken: string): Promise<{ sub: string; email: string; name: string; emailVerified: boolean }> }
export const mockGoogle = (ctx: Ctx): OAuthProvider => ({ name: 'mock', async verify(t) { const m = t.match(/^mock:(.+@.+)$/); if (!m || ctx.cfg.APP_ENV === 'prod') throw upstream('Invalid mock Google token'); return { sub: `mock-${m[1]}`, email: m[1], name: m[1].split('@')[0], emailVerified: true }; } });
export const google = (ctx: Ctx): OAuthProvider => ({
  name: 'google',
  async verify(t) {
    const { json } = await http(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(t)}`);
    if (json.aud !== ctx.cfg.GOOGLE_CLIENT_ID) throw upstream('Google token audience mismatch');
    return { sub: json.sub, email: json.email, name: json.name ?? json.email, emailVerified: json.email_verified === 'true' || json.email_verified === true };
  },
});
