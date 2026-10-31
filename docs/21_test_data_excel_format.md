# 21 — Test data workbook: Excel format specification

**Audience:** testing team, data operations and administrators
**Applies to:** Admin → Data Management upload (`#/admin/data`) and the bundled sample `data/mod-alpha-test-data.xlsx`
**Status:** v1.0 (31 Oct 2026)

Every number on the admin dashboard, the Users / Subscriptions / SIP Date pages, and every fund return and chart on the user side is now **calculated from this workbook**. Nothing on those screens is hard-coded any more. To test with "live-like" data, create a workbook in the format below and upload it.

---

## 1. Files provided

| File | Purpose |
|---|---|
| `data/mod-alpha-data-template.xlsx` | **Blank template.** Correct sheet names and column headers, with no data. Start here. |
| `data/mod-alpha-test-data.xlsx` | **Sample test data.** 24 funds, about 10 years of daily NAV (62,472 rows), 12,568 users, 3,925 subscriptions and 11 months of SIP dates. Use it as a worked example. |
| `tools/generate_test_data.py` | Regenerates both files deterministically (`python3 tools/generate_test_data.py`). |

Both files can also be downloaded from **Admin → Data Management** ("Blank template" and "Sample test data"). The **Export active dataset** button there downloads whatever is currently loaded, in the same format.

---

## 2. General rules (apply to every sheet)

1. **One workbook (.xlsx).** Each dataset goes on its own sheet, named exactly as in section 3. Sheet-name matching ignores case, and spaces are treated as `_`. Sheets with other names (for example `README`, `Notes`) are ignored.
2. **Row 1 is the header row.** Column names must match the names in this document. Column order does not matter, and extra columns are ignored (they produce a warning).
3. **One record per row.** No merged cells, no blank header cells, no sub-totals and no formulas in data cells (paste values instead). Fully empty rows are skipped.
4. **Dates:** either a real Excel date cell, or text in **`YYYY-MM-DD`** form (for example `2026-10-30`). `30/10/2026`, `10/30/2026` and `30-Oct-26` are **rejected**, because day/month order is ambiguous.
5. **Months** (SIP_Dates): text `YYYY-MM`, for example `2026-11`.
6. **Numbers:** plain numbers. Do not add `₹` or `%`, and do not use thousands separators. Use a `.` for decimals.
7. **Lists (enumerations)** must use one of the allowed values below. Case is ignored (`active` → `Active`).
8. **IDs** are text without spaces. They must be unique within their sheet.
9. **No future dates** in `nav_date`, `signup_date`, `start_date` or `last_payment_date`.
10. **Encoding:** standard Excel. Avoid leading or trailing spaces; they are trimmed automatically.
11. **Max file size:** 50 MB.

---

## 3. Sheets

Required sheets: **Funds, NAV_History, Users, Subscriptions, SIP_Dates**. Optional: **Market_Holidays**.

### 3.1 `Funds` — fund master (one row per scheme)

| Column | Type | Required | Rules / allowed values | Example |
|---|---|---|---|---|
| `fund_id` | Text (ID) | ✔ | Unique. Referenced by NAV_History. | `QSC01` |
| `scheme_name` | Text | ✔ | Full scheme name shown in the app | `Quant Small Cap Fund` |
| `amc` | Text | ✔ | Fund house | `Quant Mutual Fund` |
| `category` | Text | ✔ | Free text; drives the category chips and filters (for example `Small Cap`, `Mid Cap`, `Large Cap`, `Flexi Cap`, `ELSS`, `Index`, `Contra`, `Hybrid`) | `Small Cap` |
| `asset_class` | List | ✔ | `Equity`, `Debt`, `Hybrid`, `Index`, `Other` | `Equity` |
| `plan` | List | ✔ | `Direct`, `Regular` | `Direct` |
| `option` | List | ✔ | `Growth`, `IDCW` | `Growth` |
| `risk_level` | List | ✔ | `Low`, `Low to Moderate`, `Moderate`, `Moderately High`, `High`, `Very High` | `Very High` |
| `benchmark` | Text | | | `Nifty Smallcap 250 TRI` |
| `aum_cr` | Number | | ≥ 0, in ₹ crore | `24620` |
| `expense_ratio_pct` | Number | | 0 – 5 | `0.62` |
| `inception_date` | Date | ✔ | | `2013-01-01` |
| `is_active` | List | | `Y` / `N` (default `Y`). `N` hides the fund in the app. | `Y` |

### 3.2 `NAV_History` — daily NAV (one row per fund per business day)

| Column | Type | Required | Rules | Example |
|---|---|---|---|---|
| `fund_id` | Text (ID) | ✔ | Must exist in `Funds` | `QSC01` |
| `nav_date` | Date | ✔ | Not in the future. Business days only (skip weekends and market holidays). | `2026-10-30` |
| `nav` | Number | ✔ | > 0. Up to 4 decimals. | `425.6` |

* **Unique key:** `fund_id + nav_date` (no duplicates).
* **History needed:** at least 1 year for 1Y returns, and 3, 5 or 10 years for the 3Y, 5Y and 10Y figures. If a fund has less history, the longer periods show "—".
* Every active fund should have NAV rows. Funds without NAV produce a warning.
* Rows can be in any order.

### 3.3 `Users` — registered users

| Column | Type | Required | Rules / allowed values | Example |
|---|---|---|---|---|
| `user_id` | Text (ID) | ✔ | Unique. Referenced by Subscriptions. | `U-10001` |
| `full_name` | Text | ✔ | | `Rahul Sharma` |
| `email` | Email | ✔ | Unique. Valid email format. **Use `@example.com` for test data.** | `rahul.sharma1@example.com` |
| `mobile` | Text | | Store as text so the leading `+` is kept | `+91 98765 43210` |
| `signup_date` | Date | ✔ | Not in the future | `2026-10-26` |
| `account_status` | List | ✔ | `Active`, `Suspended`, `Closed` | `Active` |
| `kyc_status` | List | ✔ | `Not started`, `Pending`, `In review`, `Verified`, `Rejected` | `Verified` |
| `marketing_consent` | List | | `Y` / `N` (default `N`) | `Y` |

> ⚠️ Never put real customer names, emails or phone numbers in test files. Use synthetic values only.

### 3.4 `Subscriptions` — paid subscriptions

Free-plan users have **no** row here. A user can have several rows over time (for example cancelled, then re-subscribed); the most recent row by `start_date` is treated as their current plan.

| Column | Type | Required | Rules / allowed values | Example |
|---|---|---|---|---|
| `subscription_id` | Text (ID) | ✔ | Unique | `SUB-20001` |
| `user_id` | Text (ID) | ✔ | Must exist in `Users` | `U-10001` |
| `plan` | List | ✔ | `Pro`, `Premium` | `Pro` |
| `billing_cycle` | List | ✔ | `Monthly`, `Quarterly`, `Yearly` | `Monthly` |
| `amount_inr` | Number | ✔ | ≥ 0. Amount charged **per billing cycle** (for example yearly = 12 months of price) | `299` |
| `start_date` | Date | ✔ | Not in the future. Should be on or after the user's `signup_date` (otherwise a warning). | `2026-10-31` |
| `last_payment_date` | Date | | Most recent successful charge. Not in the future. | `2026-10-31` |
| `renewal_date` | Date | | Next charge date (blank if cancelled or expired) | `2026-11-30` |
| `status` | List | ✔ | `Active`, `Past due`, `Cancelled`, `Expired` | `Active` |
| `payment_ref` | Text | | Gateway / test reference | `TEST-PAY-300001` |

**Current prices used in the sample:** Pro ₹299 / ₹897 / ₹2,868 and Premium ₹499 / ₹1,497 / ₹4,788 (monthly / quarterly / yearly).

### 3.5 `SIP_Dates` — monthly recommended SIP date

| Column | Type | Required | Rules / allowed values | Example |
|---|---|---|---|---|
| `month` | Month | ✔ | `YYYY-MM`, unique | `2026-11` |
| `recommended_day` | Whole number | ✔ | 1 – 28 | `12` |
| `uplift_pct` | Number | | Historical uplift vs a fixed-date SIP, in % | `2.8` |
| `alt_day_1`, `alt_day_2`, `alt_day_3` | Whole number | | 1 – 28; alternative good dates | `5`, `20`, `28` |
| `alt_uplift_1`, `alt_uplift_2`, `alt_uplift_3` | Number | | Uplift for each alternative, in % | `1.6` |
| `status` | List | ✔ | `Draft`, `Published`, `Archived` | `Published` |
| `published_on` | Date | | | `2026-10-28` |
| `version` | Text | | | `TEST-v11.0` |

The latest `Published` row is the "current published date" on the SIP Date page. The row for the dataset's current month drives the user dashboard calendar.

### 3.6 `Market_Holidays` — optional

| Column | Type | Required | Rules | Example |
|---|---|---|---|---|
| `holiday_date` | Date | ✔ | | `2026-10-20` |
| `description` | Text | ✔ | | `Diwali (Laxmi Pujan)` |
| `exchange` | Text | | Default `NSE` | `NSE` |

Unique key: `holiday_date + exchange`.

---

## 4. Relationships

```
Funds.fund_id  1 ──< NAV_History.fund_id
Users.user_id  1 ──< Subscriptions.user_id
```

Rows that reference an unknown `fund_id` or `user_id` are **errors**.

---

## 5. How uploads work

1. **Admin → Data Management → Upload test-data workbook**: drop or choose the `.xlsx` file.
2. The file is **parsed and validated in the browser**. A report lists, for each sheet, the row count, the valid rows, and every error and warning with its **row number** and **column**. **Issues CSV** downloads the full list.
3. **Errors block publishing**; warnings do not. Fix the file and upload again.
4. **Publish dataset** makes it the active dataset: dashboards, tables and fund charts recalculate immediately. The dataset is stored in this browser (IndexedDB), so it survives a reload. **Reset to bundled test data** reverts.

**Replace semantics.** Each sheet included in the file **replaces** that whole sheet in the active dataset. Sheets you leave out are kept. Examples:

* **Full refresh:** upload a workbook with all five required sheets.
* **NAV-only refresh:** upload a workbook containing only `NAV_History`, with the **complete** history for every fund. This is not an append.
* **SIP date change:** upload a workbook containing only `SIP_Dates`.

The very first upload in a browser that has no dataset must contain all required sheets. A **single-sheet CSV** is also accepted: choose which sheet it represents in "If uploading a CSV, it contains". The CSV header row must follow the same column names.

### 5.1 Validation messages you may see

| Message | Meaning / fix |
|---|---|
| `Missing required column(s): kyc_status` | The header row is missing that column. Add it with the exact name. |
| `Required value is empty` | A required cell is blank. |
| `"30/10/2026" is not a date — use YYYY-MM-DD or an Excel date` | Reformat the cell as a date, or type `2026-10-30`. |
| `"active user" is not allowed — use one of: Active, Suspended, Closed` | Use an allowed value from section 3. |
| `Must be greater than 0` / `must be ≤ 28` | The value is out of range. |
| `Duplicate fund_id + nav_date "QSC01 / 2026-10-30"` | The same key appears twice. Keep one row. |
| `fund_id "XXX99" does not exist in Funds` | Add the fund to `Funds`, or fix the ID. |
| `2026-12-01 is in the future` | Future dates are not allowed for that column. |
| `N fund(s) have no NAV rows` (warning) | Those funds will show no returns or charts. |
| `Unknown column "notes" will be ignored` (warning) | Informational only. |

---

## 6. How the app calculates what it shows

| Screen / metric | Calculation |
|---|---|
| **Dataset "as of" date** | Latest of `nav_date`, `signup_date` and `start_date` |
| **Total Users** | Count of `Users` rows. "vs last month" compares with the total at the end of the previous month. |
| **Subscribed Users** | Subscriptions with `status = Active` |
| **Conversion Rate** | Active subscriptions ÷ total users. The change is shown in percentage points. |
| **Revenue (this month)** | Sum of payments in the current month. Payments are rebuilt as `start_date`, then every billing cycle up to `last_payment_date`, each for `amount_inr`. |
| **User Growth chart** | Bars = new `signup_date` in each bucket; line = cumulative users. 7D/30D are daily buckets, 3M weekly, 1Y monthly. |
| **Subscription Trends chart** | Bars = new subscriptions (`start_date`); line = revenue collected in each bucket |
| **MRR (Subscriptions page)** | Σ active `amount_inr` ÷ months in cycle (1 / 3 / 12) |
| **Fund 1Y/3Y/5Y/10Y CAGR** | `(NAV_latest / NAV_on_or_before(latest − N years))^(1/N) − 1` |
| **Sharpe ratio** | (3Y CAGR − 6.5% risk-free) ÷ annualised volatility of daily log returns over 3 years |
| **Fund charts / sparklines** | `NAV_History` sampled across the chosen period |
| **Top performing funds** | Top 3 active funds by 5Y CAGR; chart shows cumulative return over the period |
| **SIP date / calendar** | `SIP_Dates` (see 3.5) |

The What‑If and SIP comparison calculators still use their illustrative models. They are not driven by NAV yet.

---

## 7. Checklist before sharing a file

- [ ] Sheet names: `Funds`, `NAV_History`, `Users`, `Subscriptions`, `SIP_Dates` (+ optional `Market_Holidays`)
- [ ] Row 1 headers exactly as above
- [ ] Dates as Excel dates or `YYYY-MM-DD`; no future dates
- [ ] Every `NAV_History.fund_id` exists in `Funds`; every `Subscriptions.user_id` exists in `Users`
- [ ] No duplicate IDs, emails or `fund_id + nav_date` pairs
- [ ] Synthetic personal data only (`@example.com`, fake mobiles)
- [ ] Validated in Admin → Data Management with **0 errors**
