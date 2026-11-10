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

    // Explore
    suspend fun funds(): List<Fund>
    suspend fun fund(id: String): Fund
    suspend fun nav(id: String, period: String): List<NavPoint>
    suspend fun sipCompare(fundId: String?, amount: Int, start: String, fixedDay: Int = 1): SipCompare?
    suspend fun lumpsum(fundId: String, date: String, amount: Int): LumpResult
    suspend fun watchlist(): Set<String>
    suspend fun setWatch(fundId: String, on: Boolean)
    suspend fun insights(): List<Insight>
    // SIP dates
    suspend fun sipHistory(): Pair<List<SipMonth>, Boolean>       // months (newest first), locked
    suspend fun prefs(): Prefs
    suspend fun savePrefs(p: Prefs)
    // AI
    suspend fun ask(history: List<ChatMsg>): AskReply
    suspend fun aiLeftToday(): Int?
    // inbox
    suspend fun notifications(): List<Notice>
    suspend fun markAllRead()
    // money
    suspend fun plans(): List<Plan>
    suspend fun plan(): String
    suspend fun kycStatus(): String
    suspend fun submitPan(pan: String, name: String, dob: String): KycResult
    suspend fun checkout(planId: String, cycle: String): Order
    suspend fun completeMockPayment(orderId: String)
    suspend fun subscription(): Subscription?
    suspend fun cancel(subId: String, reason: String?): String
    suspend fun resume(subId: String)
    suspend fun invoices(): List<Invoice>
    suspend fun invoicePdf(inv: Invoice): ByteArray
    // help
    suspend fun faqs(): List<Faq>
    suspend fun tickets(): List<Ticket>
    suspend fun newTicket(email: String, topic: String, message: String): String
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
