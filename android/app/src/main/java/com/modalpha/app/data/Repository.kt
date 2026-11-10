package com.modalpha.app.data

/**
 * What the screens need from Mod Alpha. Two implementations:
 *   LiveRepository — the real API (stage or prod, see BuildConfig.API_BASE_URL)
 *   DemoRepository — built-in test accounts and sample data, no network (used by "Try the demo" and screenshots)
 */
interface Repository {
    val isDemo: Boolean
    /** The saved session's user, or null when signed out. */
    suspend fun restore(): User?
    suspend fun sendOtp(mobile: String, signup: Boolean): OtpSent
    suspend fun verifyOtp(mobile: String, code: String, signup: Boolean): User
    suspend fun loginWithEmail(email: String, password: String): User
    suspend fun home(): HomeData
    suspend fun logout()
}

/** Indian mobile numbers as the API expects them: +91 and 10 digits. */
fun normaliseMobile(input: String): String? {
    val d = input.filter { it.isDigit() }
    val ten = when {
        d.length == 10 -> d
        d.length == 12 && d.startsWith("91") -> d.drop(2)
        d.length == 11 && d.startsWith("0") -> d.drop(1)
        else -> return null
    }
    return if (ten.first() in '6'..'9') "+91$ten" else null
}

fun prettyMobile(m: String): String {
    val d = m.filter { it.isDigit() }.takeLast(10)
    return if (d.length == 10) "+91 ${d.take(5)} ${d.drop(5)}" else m
}
