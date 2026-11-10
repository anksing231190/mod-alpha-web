/**
 * Device push notifications — provider adapter.
 * Switch: PUSH_PROVIDER = mock | fcm (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: writes the push to the mock outbox. Real: Firebase Cloud Messaging. (The in-app bell does not use this.)
 */
import { type Ctx, outbox, http } from './shared.js';

export interface PushProvider { name: string; send(m: { token: string; title: string; body: string; link?: string }): Promise<string> }
export const mockPush = (ctx: Ctx): PushProvider => ({ name: 'mock', send: (m) => outbox(ctx, 'mock', 'push', m.token, m.body, m.title, { link: m.link }) });
export const fcm = (ctx: Ctx): PushProvider => ({
  name: 'fcm',
  async send(m) {
    const { json } = await http('https://fcm.googleapis.com/fcm/send', { method: 'POST', headers: { Authorization: `key=${ctx.cfg.FCM_SERVER_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: m.token, notification: { title: m.title, body: m.body, click_action: m.link } }) });
    return String(json?.multicast_id ?? Date.now());
  },
});
