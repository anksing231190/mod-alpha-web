package com.modalpha.app.data

import kotlinx.coroutines.delay
import java.time.LocalDate
import kotlin.math.sin

/**
 * Demo mode: no network. Test accounts (OTP is always 123456):
 *   +91 98765 43210  Ankit Singh  · Pro plan  (best SIP date visible)
 *   +91 98765 00000  Riya Sharma  · Free plan (best SIP date locked)
 *   demo@modalpha.in / demo1234   · Pro plan
 * Any other number can create an account ("Create account"), which starts on the Free plan.
 */
class DemoRepository(private val latencyMs: Long = 450) : Repository {
    override val isDemo = true

    private data class Account(val user: User, val plan: String)
    private val accounts = mutableMapOf(
        "+919876543210" to Account(User("u1", "Ankit Singh", "ankit@example.com", "+919876543210"), "Pro"),
        "+919876500000" to Account(User("u2", "Riya Sharma", null, "+919876500000"), "Free"),
    )
    private var current: Account? = null

    override suspend fun restore(): User? = current?.user

    override suspend fun sendOtp(mobile: String, signup: Boolean): OtpSent {
        delay(latencyMs)
        if (!signup && mobile !in accounts) throw ApiException("No Mod Alpha account uses this mobile number. Create an account first.", 404, "no_account")
        return OtpSent(600, DEMO_CODE)
    }

    override suspend fun verifyOtp(mobile: String, code: String, signup: Boolean): User {
        delay(latencyMs)
        if (code != DEMO_CODE) throw ApiException("Incorrect code", 400)
        val acc = accounts.getOrPut(mobile) { Account(User("u${accounts.size + 1}", "Investor", null, mobile), "Free") }
        current = acc
        return acc.user
    }

    override suspend fun loginWithEmail(email: String, password: String): User {
        delay(latencyMs)
        if (email.trim().lowercase() != "demo@modalpha.in" || password != "demo1234") throw ApiException("Incorrect email or password", 401)
        current = accounts.getValue("+919876543210")
        return current!!.user
    }

    override suspend fun home(): HomeData {
        delay(latencyMs)
        val acc = current ?: throw ApiException("Please log in again.", 401)
        val locked = !isPro()
        val today = LocalDate.now()
        val sip = SipMonth(
            month = "%d-%02d".format(today.year, today.monthValue),
            day = if (locked) null else 12, upliftPct = 2.8,
            alternatives = if (locked) emptyList() else listOf(AltDay(5, 1.6), AltDay(20, 1.4), AltDay(28, 1.2)),
        )
        return HomeData(
            acc.user, sub?.plan ?: acc.plan, sip, locked, demoFunds, fundsTracked = 24, unread = if (locked) 0 else 2,
            compare = demoCompare, watchlist = if (locked) emptyList() else demoFunds.take(2),
        )
    }

    override suspend fun logout() { current = null; sub = null; kyc = "Not started"; asked = 2 }

    /* ---------------- other screens (sample data, no network) ---------------- */
    private val watch = mutableSetOf("QSC01", "SBC01")
    private var prefsNow = Prefs("1 day before", push = true, sms = true, email = false, sipReminder = true, datePublished = true)
    private val notes = mutableListOf(
        Notice("n1", "sip_date", "November's best date is out", "Invest on the 12th (Thursday). +2.8% vs a fixed date.", "2026-11-10T09:00:00", false),
        Notice("n2", "reminder", "Reminder: SIP on Thursday", "Your best date is the 12th.", "2026-11-10T08:30:00", false),
        Notice("n3", "billing", "Payment received", "Pro yearly · ₹2,868. Your GST invoice is ready.", "2026-11-04T10:12:00", true),
        Notice("n4", "support", "Support replied", "We've updated your billing address on the invoice.", "2026-11-02T16:40:00", true),
        Notice("n5", "insight", "New reel: Why mid-month wins", "45 seconds on SIP timing.", "2026-10-30T12:00:00", true),
    )
    private val ticketList = mutableListOf(
        Ticket("MA-261102-1042", "Subscription", "Please update the billing address on my invoice.", "Answered", "We've updated your billing address and re-issued the invoice.", "2026-11-02"),
        Ticket("MA-261110-1051", "Product question", "My reminder came a day late.", "Open", null, "2026-11-10"),
    )
    private var kyc = "Not started"
    private var sub: Subscription? = null

    private fun acc() = current ?: throw ApiException("Please log in again.", 401)
    private fun isPro() = acc().plan != "Free" || sub != null

    override suspend fun funds(): List<Fund> { delay(latencyMs / 2); return demoFunds }
    override suspend fun fund(id: String): Fund { delay(latencyMs / 2); return demoFunds.find { it.id == id } ?: throw ApiException("Fund not found") }
    override suspend fun nav(id: String, period: String): List<NavPoint> {
        delay(latencyMs / 2)
        val f = demoFunds.find { it.id == id } ?: demoFunds.first()
        val years = when (period) { "1M" -> 1.0 / 12; "6M" -> .5; "1Y" -> 1.0; "3Y" -> 3.0; else -> 5.0 }
        val n = if (years >= 3) (years * 250).toInt() else 120; val g = (f.r5 ?: 15.0) / 100; val end = 245.67 * (f.r5 ?: 20.0) / 32.4
        val start0 = LocalDate.of(2026, 11, 7).minusDays((years * 365).toLong())
        return List(n) { i -> val t = i / (n - 1.0); val yrsBack = years * (1 - t)
            NavPoint(start0.plusDays((years * 365 * t).toLong()).toString(), end / Math.pow(1 + g, yrsBack) * (1 + .04 * sin(i * 6.0 / n * 35 + f.id.length) + .02 * sin(i * 1.3) + .003 * sin(2 * Math.PI * (start0.plusDays((years * 365 * t).toLong()).dayOfMonth - 12) / 30.0 + Math.PI / 2) * -1)) }
    }
    override suspend fun sipCompare(fundId: String?, amount: Int, start: String, fixedDay: Int): SipCompare? {
        delay(latencyMs / 2)
        val k = amount / 10000.0; val f = demoFunds.find { it.id == fundId }; val scale = (f?.r5 ?: 25.0) / 25.0
        val y0 = start.take(4).toIntOrNull() ?: 2021; val skip = ((y0 - 2021).coerceAtLeast(0)) * 12
        val pts = demoCompare.points.drop(skip).map { ComparePoint(it.month, (it.fixed * k * scale).toLong(), (it.modAlpha * k * scale).toLong()) }
        if (pts.size < 2) return null
        return SipCompare(amount, pts.first().month.take(4), fixedDay, pts.size * amount.toLong(), pts.last().fixed, pts.last().modAlpha, pts.last().modAlpha - pts.last().fixed, pts)
    }
    override suspend fun lumpsum(fundId: String, date: String, amount: Int): LumpResult {
        delay(latencyMs / 2)
        val f = demoFunds.find { it.id == fundId } ?: demoFunds.first()
        val yrs = (java.time.temporal.ChronoUnit.DAYS.between(LocalDate.parse(date), LocalDate.of(2026, 11, 7)) / 365.25).coerceAtLeast(.1)
        val cagr = (f.r5 ?: 15.0) * .7; val value = (amount * Math.pow(1 + cagr / 100, yrs)).toLong()
        return LumpResult(amount.toLong(), value, value - amount, (value.toDouble() / amount - 1) * 100, if (yrs >= 1) cagr else null, date)
    }
    override suspend fun watchlist(): Set<String> = watch.toSet()
    override suspend fun setWatch(fundId: String, on: Boolean) { if (on) watch += fundId else watch -= fundId }
    override suspend fun insights(): List<Insight> = listOf(
        Insight(1, "instagram", "Why mid-month beats the 1st", "", "https://www.instagram.com/mod_alpha_/", "2026-11-04"),
        Insight(2, "instagram", "SIP vs lump sum in 60s", "", "https://www.instagram.com/mod_alpha_/", "2026-10-28"),
        Insight(3, "instagram", "What is CAGR?", "", "https://www.instagram.com/mod_alpha_/", "2026-10-20"),
        Insight(4, "text", "Does the day of the month really matter?", "Over ten years, SIPs placed mid-month bought slightly more units on average than SIPs on the 1st, because NAVs tend to dip after month-start inflows. The gap is small each month but compounds over years.", null, "2026-11-04"),
        Insight(5, "text", "Small caps: high returns, high swings", "Small-cap funds have led 5-year returns, but they also fall harder in corrections. A steady SIP smooths the ride.", null, "2026-10-28"),
        Insight(6, "text", "How we pick each month's date", "We backtest every day of the month across our funds' NAV history and publish the day with the best risk-adjusted result, plus three good alternatives.", null, "2026-10-20"),
    )
    override suspend fun sipHistory(): Pair<List<SipMonth>, Boolean> {
        delay(latencyMs / 2)
        val past = listOf(SipMonth("2026-10", 8, 2.1, emptyList()), SipMonth("2026-09", 15, 1.7, emptyList()), SipMonth("2026-08", 11, 2.4, emptyList()), SipMonth("2026-07", 9, -0.3, emptyList()), SipMonth("2026-06", 18, 1.2, emptyList()))
        val cur = if (isPro()) SipMonth("2026-11", 12, 2.8, listOf(AltDay(5, 1.6), AltDay(20, 1.4), AltDay(28, 1.2))) else SipMonth("2026-11", null, 2.8, emptyList())
        return (listOf(cur) + past) to !isPro()
    }
    override suspend fun prefs(): Prefs = prefsNow
    override suspend fun savePrefs(p: Prefs) { delay(latencyMs / 2); prefsNow = p }
    private var asked = 2
    override suspend fun ask(history: List<ChatMsg>): AskReply {
        delay(latencyMs * 2)
        val q = history.last().text.lowercase(); val lim = if (isPro()) 10 else 1
        if (asked >= lim) throw ApiException("Your plan includes $lim AI question${if (lim > 1) "s" else ""} a day. Ask again tomorrow or upgrade for more.", 429)
        asked++
        val a = when {
            "small" in q -> "Yes. Across the small-cap funds we track, a SIP on the 12th beat the 1st in **7 of the last 10 years**, by **+3.1%** on average."
            "cagr" in q -> "**CAGR** is the steady yearly growth rate that turns your starting value into today's value. 32% CAGR over 5 years means the money grew about 4× in total."
            "compare" in q || " vs " in q -> "Over 5 years **Quant Small Cap** returned +32.4% a year vs **SBI Contra** at +28.1%, but Quant swung more (volatility 21% vs 16%)."
            else -> "Based on 10 years of NAV data, mid-month dates (around the **10th–15th**) have usually bought more units than the 1st. This month's best date is the **12th**."
        }
        return AskReply(a, lim - asked)
    }
    override suspend fun aiLeftToday(): Int? = ((if (isPro()) 10 else 1) - asked).coerceAtLeast(0)
    override suspend fun notifications(): List<Notice> { delay(latencyMs / 2); return notes.toList() }
    override suspend fun markAllRead() { notes.replaceAll { it.copy(read = true) } }
    override suspend fun plans(): List<Plan> = listOf(
        Plan("Free", "Free", "Basic features to get started", mapOf("Monthly" to 0, "Quarterly" to 0, "Yearly" to 0), listOf("Access to 50+ funds", "Basic charts", "1 AI query per day")),
        Plan("Pro", "Pro", "For serious investors", mapOf("Monthly" to 299, "Quarterly" to 897, "Yearly" to 2868), listOf("Best SIP date every month", "Access to 250+ funds", "Historical SIP comparisons", "10 AI questions a day (200 a month)", "Email support")),
        Plan("Premium", "Premium", "For power users", mapOf("Monthly" to 499, "Quarterly" to 1497, "Yearly" to 4788), listOf("Everything in Pro", "25 AI questions a day (500 a month)", "Custom analytics reports", "Priority support")),
    )
    override suspend fun plan(): String = sub?.plan ?: acc().plan
    override suspend fun kycStatus(): String = if (acc().plan != "Free") "Verified" else kyc
    override suspend fun submitPan(pan: String, name: String, dob: String): KycResult {
        delay(latencyMs * 2)
        return when {
            Regex("0000[A-Z]$").containsMatchIn(pan) -> throw ApiException("PAN not found in the Income Tax database. Check the number and try again.", 400)
            pan == "ABCDE1234F" || pan.startsWith("ABC") -> { kyc = "Verified"; KycResult("Verified") }
            else -> { kyc = "Verified"; KycResult("Verified") }
        }
    }
    override suspend fun checkout(planId: String, cycle: String): Order {
        delay(latencyMs)
        if (kycStatus() != "Verified") throw ApiException("Complete KYC before your first paid subscription.", 409, "kyc_required")
        val amt = plans().first { it.id == planId }.prices[cycle] ?: 0
        val o = Order("demo_order_${System.currentTimeMillis()}", "mock", amt, "SUB-DEMO-$planId-$cycle")
        pendingSub = Subscription(o.subscriptionId, planId, cycle, "Active", LocalDate.now().plusMonths(if (cycle == "Yearly") 12L else if (cycle == "Quarterly") 3L else 1L).toString(), amt, false)
        return o
    }
    override suspend fun completeMockPayment(orderId: String) {
        delay(latencyMs * 2)
        pendingSub?.let { sub = it }
    }
    private var pendingSub: Subscription? = null
    override suspend fun subscription(): Subscription? = sub ?: if (acc().plan != "Free") Subscription("SUB-DEMO1", acc().plan, "Yearly", "Active", "2027-11-04", 2868, false).also { sub = it } else null
    override suspend fun cancel(subId: String, reason: String?): String { delay(latencyMs); sub = sub?.copy(cancelling = true); return "Your plan stays active until the end of the current billing period." }
    override suspend fun resume(subId: String) { delay(latencyMs); sub = sub?.copy(cancelling = false) }
    override suspend fun invoices(): List<Invoice> = if (!isPro()) emptyList() else listOf(
        Invoice("i3", "invoice", "MA/26-27/00042", 2868.0, "2026-11-04", "Pro", "Yearly"),
        Invoice("c1", "credit_note", "CN/26-27/00007", 180.0, "2026-11-04", "Pro", "Monthly"),
        Invoice("i1", "invoice", "MA/26-27/00019", 299.0, "2026-10-04", "Pro", "Monthly"),
    )
    override suspend fun invoicePdf(inv: Invoice): ByteArray = throw ApiException("PDFs open with a real account (demo mode has sample invoices only).")
    override suspend fun faqs(): List<Faq> = listOf(
        Faq("SIP dates", "How is the best SIP date chosen?", "We backtest every day of the month on 10+ years of NAV history across the funds we track and publish the day that historically bought the most units, with a confidence score."),
        Faq("Investing", "Do I invest through Mod Alpha?", "No. Mod Alpha tells you when; you invest in your own broker or fund-house app. We never touch your money."),
        Faq("Plans", "How do I change or cancel my plan?", "You → Subscription & invoices. Cancelling keeps your plan until the renewal date; upgrades are prorated with a GST credit note."),
        Faq("Plans", "Where is my GST invoice?", "You → Subscription & invoices. Every payment has a downloadable GST invoice (PDF)."),
    )
    override suspend fun tickets(): List<Ticket> = ticketList.toList()
    override suspend fun newTicket(email: String, topic: String, message: String): String {
        delay(latencyMs); val n = "MA-261110-${1100 + ticketList.size}"
        ticketList.add(0, Ticket(n, topic, message, "Open", null, LocalDate.now().toString())); return n
    }


    companion object {
        const val DEMO_CODE = "123456"
        private fun spark(seed: Int, growth: Double) = List(24) { i -> 100 * (1 + growth * i / 23.0) + 6 * sin(i * 0.9 + seed) + 3 * sin(i * 2.3 + seed * 2) }
        /** ₹10,000 a month from Jan 2021: fixed 1st-of-month SIP vs Mod Alpha dates (sample backtest). */
        val demoCompare: SipCompare by lazy {
            var f = 0.0; var m = 0.0
            val pts = (0 until 70).map { i ->
                val r = 0.012 + 0.03 * sin(i * 0.55) + 0.012 * sin(i * 1.7)   // monthly market move
                f = (f + 10000) * (1 + r); m = (m + 10000) * (1 + r + 0.00095)
                ComparePoint("%d-%02d".format(2021 + i / 12, i % 12 + 1), f.toLong(), m.toLong())
            }
            val last = pts.last()
            SipCompare(10000, "2021", 1, 70 * 10000L, last.fixed, last.modAlpha, last.modAlpha - last.fixed, pts)
        }
        val demoFunds = listOf(
            Fund("QSC01", "Quant Small Cap Fund", "Quant Small Cap", "Quant", "Small Cap", 18.2, 29.7, 32.4, spark(1, 3.0), null, 245.67, "2026-11-07", "₹26,421 Cr", 0.64, "Very High", 21.4, "NIFTY Smallcap 250 TRI"),
            Fund("SBC01", "SBI Contra Fund", "SBI Contra", "SBI", "Contra", 12.4, 24.9, 28.1, spark(2, 2.4), null, 389.12, "2026-11-07", "₹44,069 Cr", 0.59, "Very High", 15.8, "BSE 500 TRI"),
            Fund("HMC01", "HDFC Mid-Cap Opportunities Fund", "HDFC Mid-Cap Opportunities", "HDFC", "Mid Cap", 15.1, 25.6, 27.8, spark(3, 2.3), null, 211.40, "2026-11-07", "₹79,718 Cr", 0.74, "Very High", 16.9, "NIFTY Midcap 150 TRI"),
            Fund("PPF01", "Parag Parikh Flexi Cap Fund", "Parag Parikh Flexi Cap", "PPFAS", "Flexi Cap", 14.6, 19.8, 24.3, spark(4, 1.9), null, 92.35, "2026-11-07", "₹1,03,868 Cr", 0.63, "Very High", 12.7, "NIFTY 500 TRI"),
            Fund("AXB01", "Axis Bluechip Fund", "Axis Bluechip", "Axis", "Large Cap", 9.8, 12.1, 15.6, spark(5, 1.1), null, 64.88, "2026-11-07", "₹33,102 Cr", 0.67, "High", 12.1, "BSE 100 TRI"),
        )
    }
}
