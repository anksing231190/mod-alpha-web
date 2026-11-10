package com.modalpha.app.data

/** Signed-in person (GET /auth/me → user). */
data class User(
    val id: String,
    val name: String,
    val email: String?,
    val mobile: String?,
    val role: String = "user",            // user | admin | superadmin
    val signupDate: String? = null,
    val ref: String? = null,                  // Customer ID
    val emailVerified: Boolean = false,
    val mobileVerified: Boolean = false,
) {
    val isAdmin: Boolean get() = role == "admin" || role == "superadmin"
    val firstName: String get() = name.trim().split(" ").firstOrNull()?.ifBlank { null } ?: "there"
    val initial: String get() = name.trim().take(1).uppercase().ifBlank { "M" }
}

/** One month's recommended SIP date (GET /sip-dates/current → current). `day` is null when locked. */
data class SipMonth(
    val month: String,            // "2026-11"
    val day: Int?,
    val upliftPct: Double?,
    val alternatives: List<AltDay>,
    val confidencePct: Int = 85,
    val confidenceLabel: String = "High",
    val leadPts: Double? = null,          // how far the best date leads the next-best one
)
data class AltDay(val day: Int, val upliftPct: Double?)

/** A fund in a list (GET /funds → items). Returns in % (1, 3, 5 years). */
data class Fund(
    val id: String,
    val name: String,
    val short: String,
    val amc: String,
    val category: String,
    val r1: Double?, val r3: Double?, val r5: Double?,
    val spark: List<Double>,
    val r10: Double? = null,
    val nav: Double? = null, val navDate: String? = null,
    val aum: String? = null, val expense: Double? = null,
    val risk: String? = null, val vol: Double? = null, val benchmark: String? = null,
    val sharpe: Double? = null,
) {
    /** SEBI riskometer step 1 (low) … 5 (very high). */
    val riskLevel: Int get() = when { risk == null -> 0; risk.contains("very high", true) -> 5; risk.contains("high", true) -> 4; risk.contains("moderate", true) && risk.contains("low", true) -> 2; risk.contains("moderate", true) -> 3; risk.contains("low", true) -> 1; else -> 3 }
}

/**
 * Backtest from POST /calc/sip-compare: the same monthly SIP on each published Mod Alpha date vs a fixed day.
 * Values in ₹; one point per month.
 */
data class SipCompare(
    val amount: Int,                  // ₹ per month
    val since: String,                // "2021"
    val fixedDay: Int,
    val invested: Long,
    val fixedValue: Long,
    val modAlphaValue: Long,
    val extra: Long,
    val points: List<ComparePoint>,
)
data class ComparePoint(val month: String, val fixed: Long, val modAlpha: Long)

/** Everything the Home tab shows. */
data class HomeData(
    val user: User,
    val plan: String,                 // "Free", "Pro", …
    val sip: SipMonth?,
    val locked: Boolean,              // the best date is a paid feature
    val topFunds: List<Fund>,
    val fundsTracked: Int,
    val unread: Int,
    val compare: SipCompare? = null,
    val watchlist: List<Fund> = emptyList(),
    /** Value of a ₹10,000 SIP on each day 1–28 (Analytics.dayValues on the top fund's NAV history). */
    val dayEdge: List<Double>? = null,
)

/** Result of asking for an OTP. `devCode` comes back only on stage (mock SMS) and in demo mode. */
data class OtpSent(val expiresInSec: Int, val devCode: String?)

/** A message the screens can show as-is. */
class ApiException(message: String, val status: Int = 0, val code: String? = null) : Exception(message)

/* ---------- the other screens ---------- */

data class NavPoint(val date: String, val value: Double)

/** POST /calc/lumpsum result. */
data class LumpResult(val invested: Long, val value: Long, val gain: Long, val totalPct: Double, val cagrPct: Double?, val investedOn: String)

data class Notice(val id: String, val kind: String, val title: String, val body: String, val createdAt: String, val read: Boolean)

/** GET /insights item. kind = "instagram" (a reel with url) or a text insight. */
data class Insight(val id: Int, val kind: String, val title: String, val body: String, val url: String?, val publishedAt: String?)

data class ChatMsg(val fromUser: Boolean, val text: String)
data class AskReply(val text: String, val leftToday: Int?)

/** Plan prices include 18% GST. */
data class Plan(val id: String, val name: String, val tagline: String, val prices: Map<String, Int>, val features: List<String>)

data class KycResult(val status: String, val message: String? = null, val redirectUrl: String? = null)

/** POST /billing/checkout: provider "mock" on stage (completed in-app), "razorpay" in production. */
data class Order(val orderId: String, val provider: String, val amount: Int, val subscriptionId: String)

data class Subscription(
    val id: String, val plan: String, val cycle: String, val status: String,
    val renewalDate: String?, val amount: Int, val cancelling: Boolean,
)

data class Invoice(val id: String, val type: String, val number: String, val amount: Double, val issuedAt: String, val plan: String?, val cycle: String?)

data class Faq(val category: String, val question: String, val answer: String)
data class Ticket(val number: String, val topic: String, val message: String, val status: String, val reply: String?, val createdAt: String)

/** The parts of GET/PUT /me/preferences the app edits (reminders and channels). */
data class Prefs(
    val timing: String,                 // "3 days before" | "2 days before" | "1 day before" | "On the day"
    val push: Boolean, val sms: Boolean, val email: Boolean,
    val sipReminder: Boolean, val datePublished: Boolean,
)

/* ---------- admin ---------- */

/** Admin sign-in step 2: both codes (email + SMS) are needed. `devCodes` only on stage mocks / demo. */
class AdminChallenge(val challengeId: String, val email: String, val mobile: String, val devEmail: String?, val devSms: String?) :
    Exception("Enter the codes sent to your email and phone")

data class Kpi(val value: Double, val changePct: Double?)
data class AdminSeries(val bucket: String, val newUsers: Int, val revenue: Double)
data class RecentSignup(val name: String, val contact: String, val date: String, val status: String)
data class RecentSub(val name: String, val plan: String, val cycle: String, val amount: Double, val date: String, val status: String)
data class PlanCount(val plan: String, val users: Int)
data class Funnel(val signedUp: Int, val verified: Int, val kyc: Int, val paid: Int)
data class AdminOverview(
    val from: String, val to: String,
    val totalUsers: Kpi, val activeSubs: Kpi, val revenue: Kpi, val conversion: Kpi, val newUsers: Int,
    val series: List<AdminSeries>, val signups: List<RecentSignup>, val subs: List<RecentSub>, val openTickets: Int,
    val planMix: List<PlanCount> = emptyList(), val funnel: Funnel? = null,
    val oldestWaiting: String? = null, val avgReplyHours: Double? = null,
)
data class AdminUser(val id: String, val ref: String, val name: String, val email: String?, val mobile: String?, val signupDate: String, val status: String, val kyc: String, val role: String, val plan: String)
data class AdminSubRow(val id: String, val plan: String, val cycle: String, val amount: Double, val status: String, val start: String, val renewal: String?)
data class AdminUserDetail(val user: AdminUser, val subs: List<AdminSubRow>, val emailVerified: Boolean, val mobileVerified: Boolean)
data class AdminTicket(val number: String, val name: String?, val email: String, val topic: String, val message: String, val status: String, val reply: String?, val createdAt: String)
data class SipCheck(val level: String, val msg: String)
data class SipValidation(val date: String, val ok: Boolean, val checks: List<SipCheck>, val recipients: Int, val existingDay: Int?)
data class AdminPayment(val id: String, val amount: Double, val refunded: Double, val status: String, val kind: String, val paidOn: String, val plan: String?, val cycle: String?, val name: String?, val email: String?, val invoice: String?)
data class PaymentMonth(val gross: Double, val refunded: Double, val refunds: Int)
