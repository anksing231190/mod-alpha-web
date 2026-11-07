/**
 * AI assistant (LLM) — provider adapter.
 * Switch: AI_PROVIDER = mock | anthropic (credentials in env; see docs/23_mocks_and_replacements.md).
 * Mock: rule-based answers grounded in the fund database (mock-ai.ts). Real: Anthropic Messages API.
 */
import { type Ctx, http } from './shared.js';
import { mockAnswer } from './mock-ai.js';

export interface AiProvider { name: string; complete(i: { system: string; messages: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number }): Promise<{ text: string; tokensIn: number; tokensOut: number }> }
export const mockAi = (ctx: Ctx): AiProvider => ({ name: 'mock', async complete(i) { const q = i.messages.at(-1)?.content ?? ''; return { text: await mockAnswer(ctx.db, q, !i.system.includes('subscribers only')), tokensIn: 0, tokensOut: 0 }; } });
// Price per million tokens in USD [input, output], used to estimate spend against AI_MONTHLY_BUDGET_INR.
export function aiPricePerMTok(model: string): [number, number] {
  if (/haiku-5/.test(model)) return [0.1, 0.5];
  if (/haiku/.test(model)) return [1, 5];
  if (/opus-5-5/.test(model)) return [4, 20];
  if (/opus|fable|mythos/.test(model)) return [5, 25];
  return [2, 10]; // Sonnet
}
export const anthropic = (ctx: Ctx): AiProvider => ({
  name: 'anthropic',
  async complete(i) {
    // effort "low": short, factual answers (thinking tokens count as output, so this keeps cost and length down)
    const { json } = await http('https://api.anthropic.com/v1/messages', { method: 'POST', timeoutMs: 60000, headers: { 'x-api-key': ctx.cfg.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: ctx.cfg.ANTHROPIC_MODEL, max_tokens: i.maxTokens ?? 1024, output_config: { effort: 'low' }, system: i.system, messages: i.messages }) });
    const usage = { tokensIn: json.usage?.input_tokens ?? 0, tokensOut: json.usage?.output_tokens ?? 0 };
    // the model may decline (stop_reason "refusal"): answer politely instead of an empty bubble
    if (json.stop_reason === 'refusal') return { text: 'I can only help with questions about mutual funds, SIP dates and the data on Mod Alpha. Could you rephrase?', ...usage };
    const text = (json.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
    return { text: text || 'Sorry, I could not answer that. Please try again.', ...usage };
  },
});
