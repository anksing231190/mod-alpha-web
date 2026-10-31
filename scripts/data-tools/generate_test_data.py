#!/usr/bin/env python3
"""
Generate the Mod Alpha test-data workbook (synthetic, deterministic).

    python3 scripts/data-tools/generate_test_data.py            # writes data/mod-alpha-test-data.xlsx
                                                   # and   data/mod-alpha-data-template.xlsx

Format specification: docs/21_test_data_excel_format.md
All values are synthetic test data, not real fund performance or real people.
"""
import json, math, random, datetime as dt, pathlib, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "apps" / "web" / "data"
OUT.mkdir(exist_ok=True)
rng = random.Random(20261031)
AS_OF = dt.date(2026, 10, 31)          # dataset "today"
NAV_START = dt.date(2016, 10, 31)

SHEETS = {
    "Funds": ["fund_id", "scheme_name", "amc", "category", "asset_class", "plan", "option",
              "risk_level", "benchmark", "aum_cr", "expense_ratio_pct", "inception_date", "is_active"],
    "NAV_History": ["fund_id", "nav_date", "nav"],
    "Users": ["user_id", "full_name", "email", "mobile", "signup_date", "account_status", "kyc_status", "marketing_consent"],
    "Subscriptions": ["subscription_id", "user_id", "plan", "billing_cycle", "amount_inr", "start_date",
                      "last_payment_date", "renewal_date", "status", "payment_ref"],
    "SIP_Dates": ["month", "recommended_day", "uplift_pct", "alt_day_1", "alt_uplift_1", "alt_day_2",
                  "alt_uplift_2", "alt_day_3", "alt_uplift_3", "status", "published_on", "version"],
    "Market_Holidays": ["holiday_date", "description", "exchange"],
}

# ---------------------------------------------------------------- funds
FUNDS_JSON = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else None
if FUNDS_JSON and FUNDS_JSON.exists():
    base = json.loads(FUNDS_JSON.read_text())
else:
    base = json.loads((OUT / "_fund_seed.json").read_text())
(OUT / "_fund_seed.json").write_text(json.dumps(base, indent=0))

RISK = {"Low": "Low", "Moderate": "Moderate", "High": "High", "Very High": "Very High"}
funds = []
for f in base:
    risk = f.get("riskLabel") or f.get("risk") or "Moderate"
    if risk not in ("Low", "Low to Moderate", "Moderate", "Moderately High", "High", "Very High"):
        risk = "Very High" if "Very" in risk else "Moderate"
    aum = f.get("aum", "₹10,000 Cr").replace("₹", "").replace(",", "").replace(" Cr", "")
    funds.append({
        "fund_id": f["id"], "scheme_name": f["name"], "amc": f["amc"], "category": f["category"],
        "asset_class": f["type"], "plan": f.get("plan", "Direct"), "option": f.get("option", "Growth"),
        "risk_level": risk, "benchmark": f.get("benchmark", "Nifty 500 TRI"),
        "aum_cr": float(aum) if aum.replace(".", "").isdigit() else 10000.0,
        "expense_ratio_pct": round(rng.uniform(0.35, 1.2), 2),
        "inception_date": dt.date.fromisoformat(f.get("inception", "2013-01-01")),
        "is_active": "Y", "_r": f["returns"], "_vol": (f.get("vol") or 14) / 100,
    })

# ---------------------------------------------------------------- holidays (sample NSE-style list, illustrative)
holidays = [
    (dt.date(2026, 1, 26), "Republic Day"), (dt.date(2026, 3, 3), "Holi"), (dt.date(2026, 4, 3), "Good Friday"),
    (dt.date(2026, 4, 14), "Dr. Ambedkar Jayanti"), (dt.date(2026, 5, 1), "Maharashtra Day"),
    (dt.date(2026, 8, 15), "Independence Day"), (dt.date(2026, 10, 2), "Gandhi Jayanti"),
    (dt.date(2026, 10, 20), "Diwali (Laxmi Pujan)"), (dt.date(2026, 11, 24), "Guru Nanak Jayanti"),
    (dt.date(2026, 12, 25), "Christmas"),
]
hol = {d for d, _ in holidays}

def business_days(a, b):
    d = a
    while d <= b:
        if d.weekday() < 5 and d not in hol:
            yield d
        d += dt.timedelta(days=1)

days = list(business_days(NAV_START, AS_OF))
last_day = days[-1]

def idx_at(target):
    lo, hi = 0, len(days) - 1
    while lo < hi:
        m = (lo + hi + 1) // 2
        if days[m] <= target: lo = m
        else: hi = m - 1
    return lo

def years_back(n):
    try:
        t = last_day.replace(year=last_day.year - n)
    except ValueError:
        t = last_day.replace(year=last_day.year - n, day=28)
    return idx_at(t)

# NAV path: Brownian bridge between anchor log-levels so trailing 1/3/5/10Y CAGR hit the targets
nav_rows = []
for f in funds:
    r = f["_r"]
    end_nav = round(rng.uniform(40, 460), 2) if f["fund_id"] != "QSC01" else 425.60
    anchors = {len(days) - 1: math.log(end_nav)}
    for y in (1, 3, 5, 10):
        if y in r or str(y) in r:
            ry = (r.get(y) if y in r else r.get(str(y))) / 100
            anchors[years_back(y)] = math.log(end_nav) - y * math.log(1 + ry)
    anchors.setdefault(0, min(anchors.values()) - 0.05)
    keys = sorted(anchors)
    logv = [0.0] * len(days)
    sd = f["_vol"] / math.sqrt(252)
    for a, b in zip(keys, keys[1:]):
        n = b - a
        walk = [0.0]
        for _ in range(n):
            walk.append(walk[-1] + rng.gauss(0, sd))
        for i in range(n + 1):
            t = i / n
            logv[a + i] = anchors[a] + (anchors[b] - anchors[a]) * t + (walk[i] - t * walk[-1])
    start = days.index(next(d for d in days if d >= f["inception_date"])) if f["inception_date"] > NAV_START else 0
    for i in range(start, len(days)):
        nav_rows.append((f["fund_id"], days[i], round(math.exp(logv[i]), 4)))

# ---------------------------------------------------------------- users
FIRST = "Aarav Vivaan Aditya Arjun Sai Reyansh Krishna Ishaan Rohan Kabir Ananya Diya Aadhya Saanvi Myra Ira Kiara Meera Priya Neha Rahul Amit Vikram Sneha Pooja Karan Rohit Arjun Riya Nisha Varun Tanvi Siddharth Kavya Manish Shreya Harsh Isha Nikhil Anjali".split()
LAST = "Sharma Mehta Verma Singh Patel Iyer Gupta Jain Nair Rao Reddy Das Kulkarni Joshi Menon Kapoor Bhat Chopra Malhotra Pillai Agarwal Banerjee Shah Desai Saxena".split()
TOTAL_USERS = 12568
start_u = dt.date(2025, 1, 1)
span = (AS_OF - start_u).days
users = []
for i in range(TOTAL_USERS):
    # accelerating growth, with a campaign spike on 15 Oct 2026
    x = rng.random() ** 0.55
    d = start_u + dt.timedelta(days=min(span, int(x * span)))
    if rng.random() < 0.012:
        d = dt.date(2026, 10, 15)
    users.append(d)
users.sort()
user_rows = []
for i, d in enumerate(users):
    fn, ln = rng.choice(FIRST), rng.choice(LAST)
    uid = f"U-{10001 + i}"
    status = "Suspended" if rng.random() < 0.0018 else ("Closed" if rng.random() < 0.004 else "Active")
    kyc = rng.choices(["Verified", "Pending", "In review", "Not started", "Rejected"], [0.42, 0.06, 0.03, 0.48, 0.01])[0]
    user_rows.append({
        "user_id": uid, "full_name": f"{fn} {ln}", "email": f"{fn.lower()}.{ln.lower()}{i + 1}@example.com",
        "mobile": f"+91 9{rng.randint(100000000, 999999999)}" if rng.random() < 0.7 else "",
        "signup_date": d, "account_status": status, "kyc_status": kyc,
        "marketing_consent": "Y" if rng.random() < 0.6 else "N",
    })

# ---------------------------------------------------------------- subscriptions (paid plans; Free users have no row)
PRICE = {("Pro", "Monthly"): 299, ("Pro", "Quarterly"): 897, ("Pro", "Yearly"): 2868,
         ("Premium", "Monthly"): 499, ("Premium", "Quarterly"): 1497, ("Premium", "Yearly"): 4788}
CYCLE_DAYS = {"Monthly": 30, "Quarterly": 91, "Yearly": 365}
sub_rows = []
verified = [u for u in user_rows if u["kyc_status"] == "Verified" and u["account_status"] != "Closed"]
rng.shuffle(verified)
n = 0
for u in verified[:3925]:
    n += 1
    plan = rng.choices(["Pro", "Premium"], [0.74, 0.26])[0]
    cyc = rng.choices(["Monthly", "Quarterly", "Yearly"], [0.62, 0.18, 0.20])[0]
    start = u["signup_date"] + dt.timedelta(days=rng.randint(0, 40))
    if start > AS_OF:
        start = u["signup_date"]
    st = rng.choices(["Active", "Past due", "Cancelled", "Expired"], [0.887, 0.022, 0.07, 0.021])[0]
    # last payment: most recent cycle boundary on/before as-of (for Active)
    cd = CYCLE_DAYS[cyc]
    k = max(0, (AS_OF - start).days // cd)
    last_pay = start + dt.timedelta(days=k * cd)
    if st in ("Cancelled", "Expired"):
        last_pay = start + dt.timedelta(days=max(0, k - 1) * cd)
    renew = last_pay + dt.timedelta(days=cd) if st in ("Active", "Past due") else None
    sub_rows.append({
        "subscription_id": f"SUB-{20000 + n}", "user_id": u["user_id"], "plan": plan, "billing_cycle": cyc,
        "amount_inr": PRICE[(plan, cyc)], "start_date": start, "last_payment_date": last_pay,
        "renewal_date": renew, "status": st, "payment_ref": f"TEST-PAY-{300000 + n}",
    })

# ---------------------------------------------------------------- SIP dates
sip_rows = []
for m in range(1, 12):
    day = rng.choice([5, 6, 8, 10, 12, 13, 15, 18, 20])
    if m in (10, 11):
        day = 12
    alts = sorted(rng.sample([d for d in range(1, 29) if d != day], 3))
    if m == 10:
        alts = [5, 20, 28]
    upl = round(rng.uniform(1.8, 3.2), 1) if m != 10 else 2.8
    status = "Published" if m == 11 else ("Archived" if m < 10 else "Archived")
    sip_rows.append({
        "month": f"2026-{m:02d}", "recommended_day": day, "uplift_pct": upl,
        "alt_day_1": alts[0], "alt_uplift_1": 1.6 if m == 10 else round(upl - 1.0, 1),
        "alt_day_2": alts[1], "alt_uplift_2": 1.4 if m == 10 else round(upl - 1.3, 1),
        "alt_day_3": alts[2], "alt_uplift_3": 1.2 if m == 10 else round(upl - 1.6, 1),
        "status": status, "published_on": dt.date(2026, m, 1) - dt.timedelta(days=4), "version": f"TEST-v{m}.0",
    })
sip_rows[9]["status"] = "Archived"

# ---------------------------------------------------------------- write workbooks
HEAD = Font(bold=True, color="FFFFFF")
FILL = PatternFill("solid", fgColor="1E3A8A")

def sheet(wb, name, rows, cols):
    ws = wb.create_sheet(name)
    ws.append(cols)
    for c in ws[1]:
        c.font, c.fill = HEAD, FILL
    for r in rows:
        ws.append([r[c] for c in cols] if isinstance(r, dict) else list(r))
    for i, c in enumerate(cols, 1):
        ws.column_dimensions[get_column_letter(i)].width = max(12, len(c) + 4)
        if c.endswith("_date") or c in ("signup_date", "nav_date", "start_date", "published_on", "holiday_date"):
            for cell in ws.iter_cols(min_col=i, max_col=i, min_row=2):
                for x in cell:
                    x.number_format = "yyyy-mm-dd"
    ws.freeze_panes = "A2"
    return ws

README = [
    ["Mod Alpha — test data workbook"],
    ["Synthetic test data only. Not real fund performance, people or payments."],
    ["Specification: docs/21_test_data_excel_format.md (column types, allowed values and validation rules)."],
    [""],
    ["Sheet", "Purpose", "Required"],
    ["Funds", "Fund master: one row per scheme", "Yes"],
    ["NAV_History", "Daily NAV per fund (business days)", "Yes"],
    ["Users", "Registered users", "Yes"],
    ["Subscriptions", "Paid subscriptions (Free users have no row)", "Yes"],
    ["SIP_Dates", "Monthly recommended SIP date", "Yes"],
    ["Market_Holidays", "Exchange holidays", "Optional"],
    [""],
    ["Rules", "Row 1 = column headers exactly as named. Dates as Excel dates or text YYYY-MM-DD. No merged cells, no formulas in data cells."],
]

def build(path, with_data):
    wb = Workbook()
    ws = wb.active
    ws.title = "README"
    for r in README:
        ws.append(r)
    ws["A1"].font = Font(bold=True, size=14)
    ws.column_dimensions["A"].width = 22; ws.column_dimensions["B"].width = 60
    data = {
        "Funds": [{k: v for k, v in f.items() if not k.startswith("_")} for f in funds],
        "NAV_History": nav_rows, "Users": user_rows, "Subscriptions": sub_rows, "SIP_Dates": sip_rows,
        "Market_Holidays": [(d, n_, "NSE") for d, n_ in holidays],
    }
    for name, cols in SHEETS.items():
        sheet(wb, name, data[name] if with_data else [], cols)
    wb.save(path)

build(OUT / "mod-alpha-test-data.xlsx", True)
build(OUT / "mod-alpha-data-template.xlsx", False)
print(f"funds={len(funds)} nav_rows={len(nav_rows)} users={len(user_rows)} subs={len(sub_rows)} sip={len(sip_rows)}")
