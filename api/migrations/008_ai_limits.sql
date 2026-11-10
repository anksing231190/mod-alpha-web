-- 008: AI assistant questions are capped per plan — per day AND per month — so the AI cost of a member always
-- stays well below what their plan earns. Admins change the caps in Admin → Subscriptions → Pricing configuration.
-- Defaults: Free 1 a day / 20 a month · Pro 10 a day / 200 a month · Premium 25 a day / 500 a month.
-- Only plans still on the old defaults change: "-1" (unlimited) a day, or no monthly cap yet.
UPDATE plans SET limits = limits || '{"ai_queries_per_day":10}'::jsonb WHERE id = 'Pro' AND coalesce((limits->>'ai_queries_per_day')::int, -1) < 0;
UPDATE plans SET limits = limits || '{"ai_queries_per_day":25}'::jsonb WHERE id = 'Premium' AND coalesce((limits->>'ai_queries_per_day')::int, -1) < 0;
UPDATE plans SET limits = limits || jsonb_build_object('ai_queries_per_month', CASE id WHEN 'Free' THEN 20 WHEN 'Premium' THEN 500 ELSE 200 END)
  WHERE NOT (limits ? 'ai_queries_per_month');
-- plan cards: "Unlimited AI queries" becomes the real allowance
UPDATE plans p SET features = (
  SELECT jsonb_agg(CASE WHEN e #>> '{}' = 'Unlimited AI queries'
    THEN to_jsonb(format('%s AI questions a day (%s a month)', p.limits->>'ai_queries_per_day', p.limits->>'ai_queries_per_month')) ELSE e END ORDER BY ord)
  FROM jsonb_array_elements(p.features) WITH ORDINALITY AS t(e, ord))
  WHERE p.features ? 'Unlimited AI queries';
UPDATE plans p SET features = p.features || to_jsonb(format('%s AI questions a day (%s a month)', p.limits->>'ai_queries_per_day', p.limits->>'ai_queries_per_month'))
  WHERE p.id = 'Premium' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.features) f WHERE f ILIKE '%AI quer%' OR f ILIKE '%AI question%');
