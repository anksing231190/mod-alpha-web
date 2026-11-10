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
        val locked = acc.plan == "Free"
        val today = LocalDate.now()
        val sip = SipMonth(
            month = "%d-%02d".format(today.year, today.monthValue),
            day = if (locked) null else 12, upliftPct = 2.8,
            alternatives = if (locked) emptyList() else listOf(AltDay(5, 1.6), AltDay(20, 1.4), AltDay(28, 1.2)),
        )
        return HomeData(acc.user, acc.plan, sip, locked, demoFunds, fundsTracked = 24, unread = 2)
    }

    override suspend fun logout() { current = null }

    companion object {
        const val DEMO_CODE = "123456"
        private fun spark(seed: Int, growth: Double) = List(24) { i -> 100 * (1 + growth * i / 23.0) + 6 * sin(i * 0.9 + seed) + 3 * sin(i * 2.3 + seed * 2) }
        val demoFunds = listOf(
            Fund("QSC01", "Quant Small Cap Fund", "Quant Small Cap", "Quant", "Small Cap", 18.2, 29.7, 32.4, spark(1, 3.0)),
            Fund("SBC01", "SBI Contra Fund", "SBI Contra", "SBI", "Contra", 12.4, 24.9, 28.1, spark(2, 2.4)),
            Fund("HMC01", "HDFC Mid-Cap Opportunities Fund", "HDFC Mid-Cap Opportunities", "HDFC", "Mid Cap", 15.1, 25.6, 27.8, spark(3, 2.3)),
            Fund("PPF01", "Parag Parikh Flexi Cap Fund", "Parag Parikh Flexi Cap", "PPFAS", "Flexi Cap", 14.6, 19.8, 24.3, spark(4, 1.9)),
            Fund("AXB01", "Axis Bluechip Fund", "Axis Bluechip", "Axis", "Large Cap", 9.8, 12.1, 15.6, spark(5, 1.1)),
        )
    }
}
