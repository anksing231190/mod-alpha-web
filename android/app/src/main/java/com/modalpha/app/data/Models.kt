package com.modalpha.app.data

/** Signed-in person (GET /auth/me → user). */
data class User(
    val id: String,
    val name: String,
    val email: String?,
    val mobile: String?,
) {
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
)

/** Everything the Home tab shows. */
data class HomeData(
    val user: User,
    val plan: String,                 // "Free", "Pro", …
    val sip: SipMonth?,
    val locked: Boolean,              // the best date is a paid feature
    val topFunds: List<Fund>,
    val fundsTracked: Int,
    val unread: Int,
)

/** Result of asking for an OTP. `devCode` comes back only on stage (mock SMS) and in demo mode. */
data class OtpSent(val expiresInSec: Int, val devCode: String?)

/** A message the screens can show as-is. */
class ApiException(message: String, val status: Int = 0, val code: String? = null) : Exception(message)
