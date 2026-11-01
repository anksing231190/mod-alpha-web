/**
 * SMS and OTP — provider adapter.
 * Switch: SMS_PROVIDER = mock | msg91 (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: writes the SMS to the mock outbox (stage also shows the OTP on screen). Real: MSG91 Flow API with DLT-registered templates.
 */
import { type Ctx, outbox, http } from './shared.js';

export interface SmsProvider { name: string; send(m: { to: string; text: string; templateId?: string; vars?: Record<string, string> }): Promise<string> }
export const mockSms = (ctx: Ctx): SmsProvider => ({ name: 'mock', send: (m) => outbox(ctx, 'mock', 'sms', m.to, m.text, undefined, { templateId: m.templateId, vars: m.vars }) });
export const msg91 = (ctx: Ctx): SmsProvider => ({
  name: 'msg91',
  async send(m) {
    // MSG91 Flow API — DLT-registered template; variables are substituted by MSG91.
    const { json } = await http('https://control.msg91.com/api/v5/flow/', {
      method: 'POST', headers: { authkey: ctx.cfg.MSG91_AUTH_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: m.templateId ?? ctx.cfg.MSG91_SMS_TEMPLATE_ID, sender: ctx.cfg.MSG91_SENDER_ID, recipients: [{ mobiles: m.to.replace(/\D/g, ''), ...(m.vars ?? {}) }] }),
    });
    return json?.request_id ?? `msg91_${Date.now()}`;
  },
});
