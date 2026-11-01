/**
 * WhatsApp template messages — provider adapter.
 * Switch: WHATSAPP_PROVIDER = mock | meta (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: writes the message to the mock outbox. Real: WhatsApp Business Cloud API (approved templates).
 */
import { type Ctx, outbox, http } from './shared.js';

export interface WhatsAppProvider { name: string; sendTemplate(m: { to: string; template: string; vars: string[] }): Promise<string> }
export const mockWa = (ctx: Ctx): WhatsAppProvider => ({ name: 'mock', sendTemplate: (m) => outbox(ctx, 'mock', 'whatsapp', m.to, `[${m.template}] ${m.vars.join(' | ')}`) });
export const metaWa = (ctx: Ctx): WhatsAppProvider => ({
  name: 'meta',
  async sendTemplate(m) {
    const { json } = await http(`https://graph.facebook.com/v20.0/${ctx.cfg.META_WA_PHONE_ID}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${ctx.cfg.META_WA_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: m.to.replace(/\D/g, ''), type: 'template', template: { name: m.template, language: { code: 'en' }, components: [{ type: 'body', parameters: m.vars.map((t) => ({ type: 'text', text: t })) }] } }) });
    return json?.messages?.[0]?.id ?? `wa_${Date.now()}`;
  },
});
