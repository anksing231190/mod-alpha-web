/**
 * Plan changes (docs/29_subscription_rules.md): a change that gives the customer more starts now and is charged
 * now; a change that gives them less waits for the renewal date and is never refunded.
 *
 *   more  = a higher plan (Free → Pro → Premium), or the same plan on a longer cycle (Monthly → Quarterly → Yearly)
 *   less  = a lower plan, or a shorter cycle (and a lower plan on a longer cycle: nothing is charged, it waits)
 *
 * Immediate changes are prorated by whole days in India time:
 *   same cycle  → charge = (new price − old price) × days left ÷ days in cycle; the renewal date does not move
 *   other cycle → charge = new cycle price − old price × days left ÷ days in cycle; a new cycle starts today
 * A higher plan on a SHORTER cycle (Pro yearly → Premium monthly) is refused: the credit would exceed the charge.
 * Prices include GST; amounts are rounded to the paisa.
 */
import { addDays, addMonths, daysBetween, iso } from '../../shared/dates.js';

export const CYCLE_MONTHS = { Monthly: 1, Quarterly: 3, Yearly: 12 } as const;
export type Cycle = keyof typeof CYCLE_MONTHS;
/** Today's date in India (IST), 'YYYY-MM-DD'. */
export const todayIST = (now = Date.now()) => iso(new Date(now + 5.5 * 3600e3));
const r2 = (n: number) => Math.round(n * 100) / 100;

export type Sub = { plan_id: string; billing_cycle: Cycle; amount_inr: number; renewal_date: string; status: string };
export type Plan = { id: string; name: string; sort: number; prices: Record<Cycle, number> };
export type Preview =
  | { kind: 'same'; message: string }
  | { kind: 'blocked'; message: string }
  | { kind: 'new'; planId: string; cycle: Cycle; chargeNow: number }
  | { kind: 'upgrade'; from: { plan: string; cycle: Cycle }; to: { plan: string; cycle: Cycle }; chargeNow: number; credit: number; newPart: number; daysLeft: number; daysInCycle: number; renewsOn: string; periodEnd: string; nextAmount: number; newCycle: boolean }
  | { kind: 'scheduled'; from: { plan: string; cycle: Cycle }; to: { plan: string; cycle: Cycle }; chargeNow: 0; effectiveOn: string; nextAmount: number; toFree: boolean };

/** Work out what a change from the current subscription (or none) to `target` would do. Pure: no database. */
export function previewChange(sub: Sub | null, plans: Plan[], target: { planId: string; cycle: Cycle }, today = todayIST()): Preview {
  const tp = plans.find((p) => p.id === target.planId);
  if (!tp) return { kind: 'blocked', message: 'Unknown plan' };
  const price = Number(tp.prices[target.cycle] ?? 0);
  if (!sub) return tp.id === 'Free' ? { kind: 'same', message: 'You are already on the Free plan.' } : { kind: 'new', planId: tp.id, cycle: target.cycle, chargeNow: price };
  if (sub.status === 'Past due') return { kind: 'blocked', message: 'Please pay your renewal first; then you can change your plan.' };
  const cp = plans.find((p) => p.id === sub.plan_id);
  const from = { plan: sub.plan_id, cycle: sub.billing_cycle }, to = { plan: tp.id, cycle: target.cycle };
  if (tp.id === sub.plan_id && target.cycle === sub.billing_cycle) return { kind: 'same', message: 'This is your current plan.' };
  // Paid → Free is a cancellation at the end of the period
  if (tp.id === 'Free') return { kind: 'scheduled', from, to, chargeNow: 0, effectiveOn: sub.renewal_date, nextAmount: 0, toFree: true };
  const rank = (tp.sort ?? 0) - (cp?.sort ?? 0), dm = CYCLE_MONTHS[target.cycle] - CYCLE_MONTHS[sub.billing_cycle];
  if (rank > 0 && dm < 0) return { kind: 'blocked', message: `To move to ${tp.name} on a shorter cycle, first switch to ${tp.name} ${sub.billing_cycle.toLowerCase()}; the shorter cycle can then start at your next renewal.` };
  const immediate = rank > 0 || (rank === 0 && dm > 0);
  if (!immediate) return { kind: 'scheduled', from, to, chargeNow: 0, effectiveOn: sub.renewal_date, nextAmount: price, toFree: false };
  const periodStart = addMonths(sub.renewal_date, -CYCLE_MONTHS[sub.billing_cycle]);
  const daysInCycle = Math.max(1, daysBetween(periodStart, sub.renewal_date));
  const daysLeft = Math.min(daysInCycle, Math.max(0, daysBetween(today, sub.renewal_date)));
  const credit = r2(Number(sub.amount_inr) * daysLeft / daysInCycle);
  const newCycle = target.cycle !== sub.billing_cycle;
  const newPart = newCycle ? price : r2(price * daysLeft / daysInCycle);
  const renewsOn = newCycle ? addMonths(today, CYCLE_MONTHS[target.cycle]) : sub.renewal_date;
  const chargeNow = Math.max(1, r2(newPart - credit)); // a gateway cannot take ₹0; on the last day the minimum is ₹1
  return { kind: 'upgrade', from, to, chargeNow, credit, newPart, daysLeft, daysInCycle, renewsOn, periodEnd: addDays(renewsOn, -1), nextAmount: price, newCycle };
}
