/**
 * AI assistant (LLM) — provider adapter.
 * Switch: AI_PROVIDER = mock | anthropic (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: rule-based answers grounded in the fund database (mock-ai.ts). Real: Anthropic Messages API.
 */
import { type Ctx, http } from './shared.js';
import { mockAnswer } from './mock-ai.js';

export interface AiProvider { name: string; complete(i: { system: string; messages: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number }): Promise<{ text: string; tokensIn: number; tokensOut: number }> }
export const mockAi = (ctx: Ctx): AiProvider => ({ name: 'mock', async complete(i) { const q = i.messages.at(-1)?.content ?? ''; return { text: await mockAnswer(ctx.db, q, !i.system.includes('subscribers only')), tokensIn: 0, tokensOut: 0 }; } });
export const anthropic = (ctx: Ctx): AiProvider => ({
  name: 'anthropic',
  async complete(i) {
    const { json } = await http('https://api.anthropic.com/v1/messages', { method: 'POST', timeoutMs: 60000, headers: { 'x-api-key': ctx.cfg.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: ctx.cfg.ANTHROPIC_MODEL, max_tokens: i.maxTokens ?? 600, system: i.system, messages: i.messages }) });
    return { text: (json.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join(''), tokensIn: json.usage?.input_tokens ?? 0, tokensOut: json.usage?.output_tokens ?? 0 };
  },
});
