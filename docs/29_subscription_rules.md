# 29 · Subscription upgrade, downgrade and cancellation rules

Last updated: 9 Nov 2026 · PDF: [assets/subscription-rules.pdf](assets/subscription-rules.pdf) · Editable copy: https://claude.ai/artifact/Pb2moeW72xRSFBYWhLeS9W

One rule decides every plan change: **a change that gives the customer more starts now and is charged now; a change that gives them less starts at the next renewal and is never refunded.** This keeps bills simple and avoids refunds in almost every case.

## Plans and prices

All prices include 18% GST. The yearly price is 20% off the monthly price.

| Plan | Monthly (₹) | Quarterly (₹) | Yearly (₹) |
| --- | --- | --- | --- |
| Free | 0 | 0 | 0 |
| Pro | 299 | 897 | 2,868 |
| Premium | 499 | 1,497 | 4,788 |

Plan order, low to high: Free → Pro → Premium. For billing cycles, a longer cycle counts as "more": Monthly → Quarterly → Yearly.

## Every plan change at a glance

| Change | Takes effect | Charged now | New document |
| --- | --- | --- | --- |
| Free → Pro or Premium | Immediately | Full price of the cycle | Tax invoice |
| Upgrade (Pro → Premium) | Immediately | Only the difference for the days left | Tax invoice for the difference |
| Longer cycle (Monthly → Quarterly or Yearly) | Immediately | New cycle price minus credit for unused days | Tax invoice |
| Downgrade (Premium → Pro) | At the next renewal | Nothing | None now; the next renewal invoice is at the lower price |
| Shorter cycle (Yearly → Monthly) | When the current cycle ends | Nothing | None now |
| Paid → Free | When the current cycle ends | Nothing | None |
| Cancel | When the current cycle ends; full access until then | Nothing | None |
| Undo a scheduled change or cancellation | Immediately | Nothing | None |
| Refund (exception only) | Immediately | Money returned | Credit note linked to the original invoice |
| Price increase by Mod Alpha | At each customer's next renewal | Nothing | Notice 30 days before |

## Upgrades

An upgrade starts the moment payment succeeds, and the customer pays only for the days left in the current cycle.

1. The customer sees a preview before paying, for example: "You pay ₹100 today, then ₹499 a month from 25 Nov."
2. Unused days of the old plan become a credit; the new plan is charged for the same days.
3. The renewal date does not change. The next renewal is a full invoice at the new plan's price.
4. The new plan's features unlock as soon as payment succeeds. If payment fails, nothing changes.
5. Days are counted in whole days, in India time, and amounts are rounded to the paisa.

**Charge now = (New price − Old price) × Days left ÷ Days in cycle**

**Worked example.** Pro monthly (₹299) to Premium monthly (₹499), with 15 of 30 days left:

| Line | Amount (₹, incl. GST) |
| --- | --- |
| Premium for 15 days: 499 × 15/30 | 249.50 |
| Credit for unused Pro days: 299 × 15/30 | −149.50 |
| **Charged today** | **100.00** |
| of which taxable value | 84.75 |
| of which GST at 18% | 15.25 |

The invoice line reads "Upgrade Pro → Premium, 10 Nov – 24 Nov 2026". A cycle change works the same way: a Pro monthly customer with 10 of 30 days left who moves to Pro yearly pays ₹2,868 − (299 × 10/30) = ₹2,768.33, and a new 12-month cycle starts that day.

A customer on Free who buys a plan pays the full price of the chosen cycle; the cycle starts that day.

## Downgrades and shorter cycles

A downgrade is scheduled for the next renewal date; the customer keeps everything they paid for until then and gets no refund.

- The Subscription page shows a banner: "Changes to Pro on 25 Nov · Undo". Undo is free until that date.
- On the renewal date the lower plan starts and is charged at its own price, with its own invoice.
- Yearly → Monthly (or Quarterly) follows the same rule: the yearly cycle runs to its end, then monthly billing starts.
- If the lower plan has smaller limits (for example AI questions a day), the new limits apply from the renewal date. Saved data such as the watchlist is kept; anything over a limit is hidden, not deleted.
- Choosing a downgrade while an upgrade payment is pending is not allowed; the customer waits for the payment result first.

## Cancellation

Cancelling stops the next renewal; the customer keeps full access until the end of the period they paid for, then moves to Free.

- Before cancelling, the customer answers a one-question survey (too expensive, not using it, missing a feature, found an alternative, temporary break, other) with an optional comment.
- The automatic-payment mandate in Razorpay is cancelled at the same time, so no further debit can happen.
- Until the end date, a banner shows "Your Premium plan ends on 18 Nov" with a **Keep my plan** button that undoes the cancellation at no charge.
- After the end date: features drop to Free; the watchlist, settings and invoices stay. Coming back later starts a new paid cycle at the current price.
- An email confirms the cancellation and its end date.

### Refunds

There are no refunds for unused days after a cancellation or downgrade. Refunds are made only in these cases:

| Case | Refund | How |
| --- | --- | --- |
| Charged twice for the same period | Full duplicate amount | Automatic once found, credit note |
| Charged after the customer cancelled (our error) | Full amount of that charge | Credit note |
| Service unavailable for a long period | Pro-rata for the affected days, at admin's discretion | Credit note |
| First payment, within 7 days (optional, to be decided) | Full amount | Credit note; plan moves to Free at once |

Refunds go back to the original payment method through Razorpay, usually within 5–7 working days. Only a super admin can issue one, and every refund is recorded in the audit log.

## Failed renewals and the 7-day grace period

If a renewal payment fails, the customer keeps their plan for 7 more days to pay; after that they move to Free.

1. The renewal charge fails (insufficient balance, expired card, mandate revoked). The subscription becomes **Past due**.
2. The customer gets an email and SMS, and a red banner: "Your renewal payment didn't go through. Pay by 13 Nov to keep Pro." with a **Retry payment** button.
3. During the 7 days everything keeps working, and the customer can retry with any payment method.
4. Paid within 7 days: the plan continues from the original renewal date, so the next renewal date does not move. One tax invoice is issued for the payment.
5. Not paid after 7 days: the plan moves to Free. No invoice is issued, and nothing is owed for the grace days.

## GST invoices and credit notes

Every charge gets its own tax invoice, and every refund gets a credit note; an issued invoice is never edited or deleted.

- **Invoice for each charge**: first purchase, upgrade difference, cycle change and each renewal. Numbers run in one sequence per financial year (April–March).
- **Tax split**: prices include GST, so the taxable value is worked back from the total (total ÷ 1.18). CGST 9% + SGST 9% when the customer is in the same state as Mod Alpha's registered office; IGST 18% otherwise. The customer's GSTIN is printed when they give one.
- **Credit note for each refund** (CGST Act section 34): its own number series, a reference to the original invoice number and date, the refunded amount and the GST reversed. It reduces the GST Mod Alpha owes for that month.
- **Deadline**: a credit note for a financial year must be issued by 30 November after that year ends, or the GST can no longer be reduced.
- **No document** for a cancellation or downgrade without a refund, or for a grace period that ends unpaid.
- Invoices and credit notes are shown in Billing history and can be downloaded as PDF.

## Automatic payments and price changes

Renewals run on a UPI Autopay or card mandate set up through Razorpay, and RBI rules for recurring payments apply.

- **Pre-debit notice**: the customer is notified at least 24 hours before every automatic charge, with the amount and date. Razorpay Subscriptions sends this.
- **New approval**: an upgrade or cycle change changes the amount, so the customer approves once more (UPI PIN or card OTP). Any single charge above ₹15,000 always needs this approval.
- **Easy cancellation**: cancelling in Mod Alpha also cancels the mandate. The customer can also cancel it from their UPI app or bank.
- **Price increases**: existing customers keep their current price until their next renewal and get an email at least 30 days before the new price applies. Price cuts apply to everyone from their next renewal.
- **Earlier prices** stay on record: each plan price change is saved as a new version, and every invoice shows the price that applied on its date.

## What the product does today

Updated 9 Nov 2026 (v24): cancellation, the grace period, prorated upgrades, scheduled downgrades and credit notes now follow these rules. Automatic-payment items wait for Razorpay Subscriptions to go live.

| Rule | Status | Today in Mod Alpha |
| --- | --- | --- |
| Cancel at end of period, survey, Keep my plan | Built | Works as described |
| 7-day grace period with Retry payment | Built | Works as described |
| Tax invoice for every payment (CGST/SGST or IGST) | Built | Works as described |
| Price changes saved as versions | Built | Works as described |
| Upgrade charges only the difference | Built | Preview with the exact amount, prorated charge, renewal date kept (monthly → yearly starts a new year minus the credit) |
| Downgrade at next renewal, with Undo | Built | Scheduled for the renewal date, banner with Undo; the jobs worker applies it on the day |
| Refunds with a credit note | Built | Every admin refund issues a numbered GST credit note (CN/yy-yy/nnnnn) shown in Billing history with a PDF |
| Pre-debit notice and mandate re-approval | To build | Needs Razorpay Subscriptions live (stage uses mock payments) |
| 30-day notice of a price increase | To build | Not sent |

## Decisions to confirm with the CA

- [ ] Offer a 7-day full refund on the first payment, or no refunds except errors?
- [ ] SAC code for the service (997156 is set as a placeholder).
- [ ] Credit note number format and series.
- [ ] Pro-rata refund rule when the service is down for a long period.
