/**
 * Transactional email — provider adapter.
 * Switch: EMAIL_PROVIDER = mock | sendgrid (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: writes the email to the mock outbox (Admin → Notifications). Real: SendGrid v3 mail/send.
 */
import { type Ctx, outbox, http } from './shared.js';

export interface EmailProvider { name: string; send(m: { to: string; subject: string; text: string; html?: string }): Promise<string> }
export const mockEmail = (ctx: Ctx): EmailProvider => ({ name: 'mock', send: (m) => outbox(ctx, 'mock', 'email', m.to, m.text, m.subject) });
export const sendgrid = (ctx: Ctx): EmailProvider => ({
  name: 'sendgrid',
  async send(m) {
    const from = ctx.cfg.EMAIL_FROM.match(/^(.*)<(.+)>$/);
    await http('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST', headers: { Authorization: `Bearer ${ctx.cfg.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ personalizations: [{ to: [{ email: m.to }] }], from: from ? { name: from[1].trim(), email: from[2] } : { email: ctx.cfg.EMAIL_FROM }, subject: m.subject, content: [{ type: 'text/plain', value: m.text }, ...(m.html ? [{ type: 'text/html', value: m.html }] : [])] }),
    });
    return `sendgrid_${Date.now()}`;
  },
});
