/**
 * Helpdesk tickets — provider adapter.
 * Switch: SUPPORT_PROVIDER = mock | freshdesk (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: copies the ticket to the mock outbox (tickets are always stored in the database). Real: Freshdesk tickets API.
 */
import { type Ctx, outbox, http } from './shared.js';

export interface SupportProvider { name: string; create(t: { email: string; subject: string; message: string; number: string }): Promise<string> }
export const mockSupport = (ctx: Ctx): SupportProvider => ({ name: 'mock', create: (t) => outbox(ctx, 'mock', 'support', t.email, t.message, `${t.number} · ${t.subject}`) });
export const freshdesk = (ctx: Ctx): SupportProvider => ({
  name: 'freshdesk',
  async create(t) { const { json } = await http(`https://${ctx.cfg.FRESHDESK_DOMAIN}/api/v2/tickets`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${ctx.cfg.FRESHDESK_API_KEY}:X`).toString('base64'), 'Content-Type': 'application/json' }, body: JSON.stringify({ email: t.email, subject: `${t.number} · ${t.subject}`, description: t.message, status: 2, priority: 1 }) }); return String(json.id); },
});
