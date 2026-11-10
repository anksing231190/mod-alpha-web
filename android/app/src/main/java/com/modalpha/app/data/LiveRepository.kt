package com.modalpha.app.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * The real Mod Alpha API (same endpoints as the website, under /api/v1).
 * Session: the API sets two cookies — ma_at (15-minute access token) and ma_rt (refresh token, path /api/v1/auth).
 * They are kept in a cookie jar saved to SharedPreferences, so the app stays signed in like the browser does.
 * On a 401 the app calls POST /auth/refresh once and retries, exactly like apps/web/src/core/api-client.js.
 */
class LiveRepository(context: Context, private val baseUrl: String) : Repository {
    override val isDemo = false
    private val prefs = context.getSharedPreferences("ma_session", Context.MODE_PRIVATE)
    private val jar = PersistentCookieJar(prefs)
    private val http = OkHttpClient.Builder()
        .cookieJar(jar)
        .connectTimeout(15, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS)
        .build()
    private val json = Json { ignoreUnknownKeys = true }
    private val api = baseUrl.trimEnd('/') + "/api/v1"
    private val ended = kotlinx.coroutines.flow.MutableSharedFlow<String>(extraBufferCapacity = 1)
    override val sessionEnded: kotlinx.coroutines.flow.Flow<String> = ended
    /** Sign-in calls answer 401 for a wrong code or password; only other calls mean "this session is over". */
    private fun isEntry(path: String) = listOf("/auth/refresh", "/auth/login", "/auth/otp/", "/auth/signup", "/auth/logout", "/auth/admin").any { path.startsWith(it) }

    private suspend fun call(method: String, path: String, body: JsonObject? = null, retry: Boolean = true): JsonObject = withContext(Dispatchers.IO) {
        val rb = body?.toString()?.toRequestBody("application/json".toMediaType())
        val req = Request.Builder().url(api + path).header("x-ma-client", "android")
            .method(method, rb ?: if (method == "POST") "{}".toRequestBody("application/json".toMediaType()) else null).build()
        val res = try { http.newCall(req).execute() } catch (e: IOException) { throw ApiException("Can't reach Mod Alpha. Check your internet connection.") }
        res.use { r ->
            val text = r.body?.string().orEmpty()
            val obj = runCatching { json.parseToJsonElement(text).jsonObject }.getOrElse { JsonObject(emptyMap()) }
            if (r.code == 401 && !isEntry(path)) {
                if (retry && refresh()) return@withContext call(method, path, body, retry = false)
                // the refresh token was refused too: this device was signed out (elsewhere, or timed out)
                val msg = ((obj["error"] as? JsonObject).str("message")) ?: "You were signed out. Please log in again."
                if (jar.hasSession()) { jar.clear(); ended.tryEmit(msg) }
                throw ApiException(msg, 401, "SESSION_ENDED")
            }
            if (!r.isSuccessful) {
                val err = obj["error"] as? JsonObject
                throw ApiException(err.str("message") ?: "Something went wrong (${r.code})", r.code, err.str("code"))
            }
            obj
        }
    }

    private suspend fun refresh(): Boolean = runCatching { call("POST", "/auth/refresh", retry = false); true }.getOrDefault(false)

    private fun JsonObject.toUser(): User {
        val u = (this["user"] as? JsonObject) ?: throw ApiException("Unexpected reply from the server")
        return User(u.str("id") ?: "", u.str("name") ?: "Investor", u.str("email"), u.str("mobile"), u.str("role") ?: "user", u.str("signupDate")?.take(10))
    }

    override suspend fun restore(): User? = if (!jar.hasSession()) null else runCatching { call("GET", "/auth/me").toUser() }.getOrNull()

    override suspend fun sendOtp(mobile: String, signup: Boolean, appHash: String?): OtpSent {
        val r = call("POST", "/auth/otp/send", buildJsonObject { put("mobile", mobile); put("intent", if (signup) "signup" else "login"); if (appHash != null) put("appHash", appHash) })
        return OtpSent(r.int("expiresIn") ?: 600, r.str("devCode"))
    }

    override suspend fun verifyOtp(mobile: String, code: String, signup: Boolean): User {
        val r = call("POST", "/auth/otp/verify", buildJsonObject { put("mobile", mobile); put("code", code); put("intent", if (signup) "signup" else "login") })
        r.challengeOrNull()?.let { throw it }
        return r.toUser()
    }

    override suspend fun loginWithEmail(email: String, password: String): User {
        val r = call("POST", "/auth/login", buildJsonObject { put("email", email.trim()); put("password", password) })
        r.challengeOrNull()?.let { throw it }
        return r.toUser()
    }

    override suspend fun home(): HomeData = coroutineScope {
        val me = async { call("GET", "/auth/me").toUser() }
        val sip = async { call("GET", "/sip-dates/current") }
        val funds = async { call("GET", "/funds?sort=5y&pageSize=200") }
        val watch = async { runCatching { call("GET", "/me/watchlist") }.getOrNull() }
        val compare = async {
            runCatching {
                call("POST", "/calc/sip-compare", buildJsonObject {
                    put("amount", 10000); put("start", "2021-01-01"); put("end", java.time.LocalDate.now().toString()); put("fixedDay", 1)
                })
            }.getOrNull()
        }
        val ent = async { runCatching { call("GET", "/me/entitlements") }.getOrNull() }
        val notes = async { runCatching { call("GET", "/me/notifications") }.getOrNull() }
        val s = sip.await(); val f = funds.await()
        val cur = s["current"] as? JsonObject
        val all = (f["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.toFund() }
        HomeData(
            user = me.await(),
            plan = ent.await()?.str("plan") ?: "Free",
            sip = cur?.let { c ->
                SipMonth(
                    month = c.str("month") ?: "",
                    day = c.int("recommended_day"),
                    upliftPct = c.num("uplift_pct"),
                    alternatives = (1..3).mapNotNull { i -> c.int("alt_day_$i")?.let { AltDay(it, c.num("alt_uplift_$i")) } },
                    confidencePct = (c["confidence"] as? JsonObject).int("pct") ?: 0,
                    confidenceLabel = (c["confidence"] as? JsonObject).str("label") ?: "",
                    leadPts = (c["confidence"] as? JsonObject).num("gap"),
                )
            },
            locked = (s["locked"] as? JsonPrimitive)?.content == "true",
            topFunds = all.take(6),
            fundsTracked = f.int("total") ?: 0,
            unread = notes.await()?.int("unread") ?: 0,
            compare = compare.await()?.toCompare(),
            watchlist = (watch.await()?.get("items") as? JsonArray).orEmpty()
                .mapNotNull { (it as? JsonObject).str("fund_id") }.mapNotNull { id -> all.find { it.id == id } },
        )
    }

    private fun JsonObject.toFund(): Fund? {
        val id = str("id") ?: return null
        val ret = this["returns"] as? JsonObject
        return Fund(
            id = id, name = str("name") ?: id, short = str("short") ?: str("name") ?: id, amc = str("amc") ?: "",
            category = str("category") ?: "", r1 = ret?.num("1"), r3 = ret?.num("3"), r5 = ret?.num("5"),
            spark = (this["spark"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonPrimitive)?.content?.toDoubleOrNull() },
            r10 = ret?.num("10"), nav = num("nav"), navDate = str("navDate")?.take(10), aum = str("aum"), expense = num("expense"),
            risk = str("riskLabel") ?: str("risk"), vol = num("vol"), benchmark = str("benchmark"), sharpe = num("sharpe"),
        )
    }


    /* ---------------- other screens ---------------- */
    private var fundCache: List<Fund>? = null
    override suspend fun funds(): List<Fund> = fundCache ?: (call("GET", "/funds?sort=5y&pageSize=200")["items"] as? JsonArray).orEmpty()
        .mapNotNull { (it as? JsonObject)?.toFund() }.also { fundCache = it }
    override suspend fun fund(id: String): Fund = (call("GET", "/funds/${enc(id)}")["fund"] as? JsonObject)?.toFund() ?: throw ApiException("Fund not found")
    override suspend fun nav(id: String, period: String): List<NavPoint> =
        (call("GET", "/funds/${enc(id)}/nav?period=$period&points=${if (period == "5Y" || period == "MAX") 1500 else 260}")["points"] as? JsonArray).orEmpty()
            .mapNotNull { p -> (p as? JsonObject)?.let { o -> NavPoint(o.str("d")?.take(10) ?: return@mapNotNull null, o.num("v") ?: return@mapNotNull null) } }

    override suspend fun sipCompare(fundId: String?, amount: Int, start: String, fixedDay: Int): SipCompare? = runCatching {
        call("POST", "/calc/sip-compare", buildJsonObject {
            fundId?.let { put("fundId", it) }; put("amount", amount); put("start", start); put("end", java.time.LocalDate.now().toString()); put("fixedDay", fixedDay)
        }).toCompare()?.copy(amount = amount)
    }.getOrNull()

    override suspend fun lumpsum(fundId: String, date: String, amount: Int): LumpResult {
        val r = call("POST", "/calc/lumpsum", buildJsonObject { put("fundId", fundId); put("date", date); put("amount", amount) })
        return LumpResult(amount.toLong(), r.num("value")?.toLong() ?: 0, r.num("gain")?.toLong() ?: 0, r.num("totalReturnPct") ?: 0.0, r.num("cagrPct"), r.str("investedOn")?.take(10) ?: date)
    }

    override suspend fun watchlist(): Set<String> = (call("GET", "/me/watchlist")["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject).str("fund_id") }.toSet()
    override suspend fun setWatch(fundId: String, on: Boolean) { call(if (on) "POST" else "DELETE", "/me/watchlist/${enc(fundId)}") }

    override suspend fun insights(): List<Insight> = (call("GET", "/insights")["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o ->
        Insight(o.int("id") ?: 0, o.str("kind") ?: "text", o.str("title") ?: "", o.str("body") ?: "", o.str("url"), o.str("publishedAt")?.take(10))
    } }

    override suspend fun sipHistory(): Pair<List<SipMonth>, Boolean> {
        val r = call("GET", "/sip-dates")
        val items = (r["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { c ->
            SipMonth(c.str("month") ?: return@mapNotNull null, c.int("recommended_day"), c.num("uplift_pct"),
                (1..3).mapNotNull { i -> c.int("alt_day_$i")?.let { AltDay(it, c.num("alt_uplift_$i")) } })
        } }
        return items to ((r["locked"] as? JsonPrimitive)?.content == "true")
    }

    override suspend fun prefs(): Prefs {
        val p = call("GET", "/me/preferences")["preferences"] as? JsonObject
        val ch = p?.get("channels") as? JsonObject; val tp = p?.get("topics") as? JsonObject
        fun b(o: JsonObject?, k: String, d: Boolean) = o.str(k)?.toBooleanStrictOrNull() ?: d
        return Prefs(p.str("reminderTiming") ?: "2 days before", b(ch, "push", true), b(ch, "sms", false), b(ch, "email", true), b(tp, "sipReminder", true), b(tp, "datePublished", true))
    }
    override suspend fun savePrefs(p: Prefs) {
        call("PUT", "/me/preferences", buildJsonObject {
            put("reminderTiming", p.timing)
            put("channels", buildJsonObject { put("push", p.push); put("sms", p.sms); put("email", p.email) })
            put("topics", buildJsonObject { put("sipReminder", p.sipReminder); put("datePublished", p.datePublished) })
        })
    }

    override suspend fun ask(history: List<ChatMsg>): AskReply {
        val r = call("POST", "/assistant/messages", buildJsonObject {
            put("messages", kotlinx.serialization.json.buildJsonArray {
                history.takeLast(20).forEach { m -> add(buildJsonObject { put("role", if (m.fromUser) "user" else "assistant"); put("content", m.text.take(2000)) }) }
            })
        })
        return AskReply(r.str("reply") ?: "", (r["usage"] as? JsonObject).int("remainingToday"))
    }
    override suspend fun aiLimitToday(): Int? = (call("GET", "/me/entitlements")["limits"] as? JsonObject).int("ai_queries_per_day")?.takeIf { it >= 0 }
    override suspend fun aiLeftToday(): Int? {
        val e = call("GET", "/me/entitlements")
        val lim = (e["limits"] as? JsonObject).int("ai_queries_per_day") ?: return null
        if (lim < 0) return null
        return (lim - ((e["usage"] as? JsonObject).int("aiQueriesToday") ?: 0)).coerceAtLeast(0)
    }

    override suspend fun notifications(): List<Notice> = (call("GET", "/me/notifications")["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o ->
        Notice(o.str("id") ?: "", o.str("kind") ?: "", o.str("title") ?: "", o.str("body") ?: "", o.str("created_at") ?: "", o.str("read") == "true")
    } }
    override suspend fun markAllRead() { call("POST", "/me/notifications/read", buildJsonObject { }) }

    override suspend fun plans(): List<Plan> = (call("GET", "/plans")["plans"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o ->
        val pr = o["prices"] as? JsonObject
        Plan(o.str("id") ?: return@mapNotNull null, o.str("name") ?: "", o.str("tagline") ?: "",
            pr?.keys?.associateWith { k -> pr.num(k)?.toInt() ?: 0 } ?: emptyMap(),
            (o["features"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonPrimitive)?.content })
    } }
    override suspend fun plan(): String = call("GET", "/me/entitlements").str("plan") ?: "Free"
    override suspend fun kycStatus(): String = call("GET", "/kyc/status").str("kyc_status") ?: "Not started"
    override suspend fun submitPan(pan: String, name: String, dob: String): KycResult {
        val r = call("POST", "/kyc/pan", buildJsonObject { put("pan", pan); put("name", name); put("dob", dob); put("consent", true) })
        return KycResult(r.str("status") ?: "Pending", r.str("message"), r.str("redirectUrl"))
    }
    override suspend fun checkout(planId: String, cycle: String): Order {
        val r = call("POST", "/billing/checkout", buildJsonObject { put("planId", planId); put("cycle", cycle) })
        val o = r["order"] as? JsonObject
        return Order(o.str("orderId") ?: "", o.str("provider") ?: "", r.int("amountInr") ?: 0, r.str("subscriptionId") ?: "")
    }
    override suspend fun completeMockPayment(orderId: String) { call("POST", "/billing/mock/complete", buildJsonObject { put("orderId", orderId); put("outcome", "success") }) }
    override suspend fun subscription(): Subscription? = (call("GET", "/billing/subscription")["subscription"] as? JsonObject)?.let { o ->
        Subscription(o.str("id") ?: "", o.str("plan_name") ?: o.str("plan_id") ?: "", o.str("billing_cycle") ?: "", o.str("status") ?: "",
            o.str("renewal_date")?.take(10), o.num("amount_inr")?.toInt() ?: 0, o.str("cancel_at_period_end") == "true")
    }
    override suspend fun cancel(subId: String, reason: String?): String =
        call("POST", "/billing/subscriptions/${enc(subId)}/cancel", buildJsonObject { reason?.let { put("reason", it) } }).str("message") ?: "Cancelled"
    override suspend fun resume(subId: String) { call("POST", "/billing/subscriptions/${enc(subId)}/resume", buildJsonObject { }) }
    override suspend fun invoices(): List<Invoice> = (call("GET", "/billing/invoices")["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o ->
        Invoice(o.str("id") ?: return@mapNotNull null, o.str("type") ?: "invoice", o.str("number") ?: "", o.num("amount_inr") ?: 0.0, o.str("issued_at")?.take(10) ?: "", o.str("plan_id"), o.str("billing_cycle"))
    } }
    override suspend fun invoicePdf(inv: Invoice): ByteArray = withContext(Dispatchers.IO) {
        val path = if (inv.type == "credit_note") "/billing/credit-notes/${enc(inv.id)}/pdf" else "/billing/invoices/${enc(inv.id)}/pdf"
        fun get() = http.newCall(Request.Builder().url(api + path).build()).execute()
        var res = get()
        if (res.code == 401) { res.close(); refresh(); res = get() }
        res.use { if (!it.isSuccessful) throw ApiException("Couldn't download the PDF (${it.code})"); it.body!!.bytes() }
    }

    override suspend fun faqs(): List<Faq> = (call("GET", "/faqs")["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o ->
        Faq(o.str("category") ?: "", o.str("question") ?: "", o.str("answer") ?: "") } }
    override suspend fun tickets(): List<Ticket> = (call("GET", "/me/support-tickets")["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o ->
        Ticket(o.str("number") ?: "", o.str("topic") ?: "", o.str("message") ?: "", o.str("status") ?: "Open", o.str("reply"), o.str("created_at")?.take(10) ?: "") } }
    override suspend fun newTicket(email: String, topic: String, message: String): String =
        call("POST", "/support/tickets", buildJsonObject { put("email", email); put("topic", topic); put("message", message) }).str("number") ?: ""


    /* ---------------- admin ---------------- */
    private fun JsonObject.challengeOrNull(): AdminChallenge? {
        if (str("mfaRequired") != "true") return null
        val dc = this["devCodes"] as? JsonObject
        return AdminChallenge(str("challengeId") ?: "", str("email") ?: "", str("mobile") ?: "", dc.str("email"), dc.str("sms"))
    }
    override suspend fun verifyAdminCodes(challengeId: String, emailCode: String, smsCode: String): User =
        call("POST", "/auth/login/verify", buildJsonObject { put("challengeId", challengeId); put("emailCode", emailCode); put("smsCode", smsCode) }).toUser()
    override suspend fun resendAdminCodes(challengeId: String): AdminChallenge? {
        val r = call("POST", "/auth/login/resend", buildJsonObject { put("challengeId", challengeId) })
        val dc = r["devCodes"] as? JsonObject
        return AdminChallenge(challengeId, "", "", dc.str("email"), dc.str("sms"))
    }
    private fun JsonObject?.kpi(k: String): Kpi { val o = this?.get(k) as? JsonObject; return Kpi(o.num("value") ?: 0.0, o.num("changePct") ?: o.num("changePp")) }
    override suspend fun adminOverview(): AdminOverview = coroutineScope {
        val m = async { call("GET", "/admin/metrics") }; val rc = async { call("GET", "/admin/recent") }
        val t = async { runCatching { call("GET", "/admin/support/tickets") }.getOrNull() }
        val mm = m.await(); val k = mm["kpis"] as? JsonObject; val range = mm["range"] as? JsonObject; val r = rc.await()
        val counts = t.await()?.get("counts") as? JsonObject
        AdminOverview(
            range.str("from") ?: "", range.str("to") ?: "",
            k.kpi("totalUsers"), k.kpi("activeSubscriptions"), k.kpi("revenue"), k.kpi("conversionRate"), (k?.get("newUsers") as? JsonObject).int("value") ?: 0,
            (mm["series"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o -> AdminSeries(o.str("bucket")?.take(10) ?: "", o.int("new_users") ?: 0, o.num("revenue") ?: 0.0) } },
            (r["signups"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o -> RecentSignup(o.str("name") ?: "", o.str("contact") ?: "", o.str("signup_date")?.take(10) ?: "", o.str("status") ?: "") } },
            (r["subscriptions"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o -> RecentSub(o.str("name") ?: "", o.str("plan") ?: "", o.str("cycle") ?: "", o.num("amount") ?: 0.0, o.str("start_date")?.take(10) ?: "", o.str("status") ?: "") } },
            (counts.int("Open") ?: 0) + (counts.int("In progress") ?: 0),
            planMix = (mm["planMix"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o -> PlanCount(o.str("plan") ?: "", o.int("users") ?: 0) } },
            funnel = (mm["funnel"] as? JsonObject)?.let { f -> Funnel(f.int("signedUp") ?: 0, f.int("verified") ?: 0, f.int("kyc") ?: 0, f.int("paid") ?: 0) },
            oldestWaiting = (mm["support"] as? JsonObject).str("oldest"),
            avgReplyHours = (mm["support"] as? JsonObject).num("avgReplyHours"),
        )
    }
    private fun JsonObject.toAdminUser() = AdminUser(str("id") ?: "", str("ref") ?: str("external_ref") ?: "", str("name") ?: str("full_name") ?: "", str("email"), str("mobile"),
        str("signup_date")?.take(10) ?: "", str("status") ?: str("account_status") ?: "", str("kyc") ?: str("kyc_status") ?: "", str("role") ?: "user", str("plan") ?: "Free")
    override suspend fun adminUsers(q: String, status: String?): List<AdminUser> {
        val qs = buildString { append("?pageSize=50"); if (q.isNotBlank()) append("&q=" + enc(q)); status?.let { append("&status=" + enc(it)) } }
        return (call("GET", "/admin/users$qs")["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.toAdminUser() }
    }
    override suspend fun adminUser(id: String): AdminUserDetail {
        val r = call("GET", "/admin/users/${enc(id)}"); val u = r["user"] as? JsonObject ?: throw ApiException("User not found")
        val subs = (r["subscriptions"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o -> AdminSubRow(o.str("id") ?: "", o.str("plan_id") ?: "", o.str("billing_cycle") ?: "", o.num("amount_inr") ?: 0.0, o.str("status") ?: "", o.str("start_date")?.take(10) ?: "", o.str("renewal_date")?.take(10)) } }
        val au = u.toAdminUser().copy(plan = subs.firstOrNull { it.status == "Active" }?.let { "${it.plan} (${it.cycle})" } ?: "Free")
        return AdminUserDetail(au, subs, u.str("email_verified_at") != null, u.str("mobile_verified_at") != null)
    }
    override suspend fun adminSetStatus(id: String, status: String, reason: String) { call("PATCH", "/admin/users/${enc(id)}", buildJsonObject { put("accountStatus", status); put("reason", reason) }) }
    override suspend fun adminTickets(status: String?): Pair<List<AdminTicket>, Map<String, Int>> {
        val r = call("GET", "/admin/support/tickets" + (status?.let { "?status=" + enc(it) } ?: ""))
        val items = (r["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o -> AdminTicket(o.str("number") ?: "", o.str("full_name"), o.str("email") ?: "", o.str("topic") ?: "", o.str("message") ?: "", o.str("status") ?: "Open", o.str("reply"), o.str("created_at") ?: "") } }
        val c = r["counts"] as? JsonObject
        return items to (c?.keys?.associateWith { c.int(it) ?: 0 } ?: emptyMap())
    }
    override suspend fun adminUpdateTicket(number: String, reply: String?, status: String?) {
        call("PATCH", "/admin/support/tickets/${enc(number)}", buildJsonObject { reply?.let { put("reply", it) }; status?.let { put("status", it) } })
    }
    private fun sipBody(month: String, day: Int, reason: String, uplift: Double?, alts: List<AltDay>) = buildJsonObject {
        put("month", month); put("day", day); put("reason", reason); uplift?.let { put("upliftPct", it) }
        if (alts.isNotEmpty()) put("alternatives", kotlinx.serialization.json.buildJsonArray { alts.forEach { a -> add(buildJsonObject { put("day", a.day); put("upliftPct", a.upliftPct ?: 0.0) }) } })
    }
    override suspend fun adminValidateSip(month: String, day: Int, reason: String, uplift: Double?, alts: List<AltDay>): SipValidation {
        val r = call("POST", "/admin/sip-dates/validate", sipBody(month, day, reason, uplift, alts))
        return SipValidation(r.str("date") ?: "", r.str("ok") == "true",
            (r["checks"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o -> SipCheck(o.str("level") ?: "ok", o.str("msg") ?: "") } },
            r.int("recipients") ?: 0, (r["existing"] as? JsonObject).int("recommended_day"))
    }
    override suspend fun adminPublishSip(month: String, day: Int, reason: String, uplift: Double?, alts: List<AltDay>): String {
        val r = call("POST", "/admin/sip-dates/publish", sipBody(month, day, reason, uplift, alts))
        return "Published ${r.str("date") ?: ""} (${r.str("version") ?: ""}). Reminders go to ${r.int("recipients") ?: 0} subscribers on ${r.str("reminderOn") ?: ""}."
    }
    override suspend fun adminPayments(): Pair<List<AdminPayment>, PaymentMonth> {
        val r = call("GET", "/admin/payments")
        val items = (r["items"] as? JsonArray).orEmpty().mapNotNull { (it as? JsonObject)?.let { o -> AdminPayment(o.str("id") ?: "", o.num("amount_inr") ?: 0.0, o.num("refunded_inr") ?: 0.0, o.str("status") ?: "",
            o.str("kind") ?: "new", (o.str("paid_on") ?: o.str("created_at"))?.take(10) ?: "", o.str("plan_id"), o.str("billing_cycle"), o.str("full_name"), o.str("email"), o.str("invoice_number")) } }
        val m = r["month"] as? JsonObject
        return items to PaymentMonth(m.num("gross") ?: 0.0, m.num("refunded") ?: 0.0, m.int("refunds") ?: 0)
    }

    private fun enc(s: String) = java.net.URLEncoder.encode(s, "UTF-8").replace("+", "%20")

    private fun JsonObject.toCompare(): SipCompare? {
        val pts = (this["path"] as? JsonArray).orEmpty().mapNotNull { p ->
            val o = p as? JsonObject ?: return@mapNotNull null
            ComparePoint(o.str("month") ?: "", o.num("fixed")?.toLong() ?: return@mapNotNull null, o.num("modAlpha")?.toLong() ?: return@mapNotNull null)
        }
        if (pts.size < 2) return null
        return SipCompare(10000, pts.first().month.take(4), int("fixedDay") ?: 1, num("invested")?.toLong() ?: 0,
            num("fixedValue")?.toLong() ?: 0, num("modAlphaValue")?.toLong() ?: 0, num("extra")?.toLong() ?: 0, pts)
    }

    override suspend fun checkSession(): Boolean = runCatching { call("GET", "/auth/session"); true }.getOrElse { (it as? ApiException)?.status != 401 }
    override suspend fun logoutAll(): Int {
        val n = call("POST", "/auth/logout-all").int("sessionsEnded") ?: 1
        jar.clear(); return n
    }
    override suspend fun logout() {
        runCatching { call("POST", "/auth/logout", retry = false) }
        jar.clear()
    }
}

// --- small JSON helpers: the API sends Postgres numerics as strings ("2.80"), so read numbers leniently ---
private fun JsonObject?.str(k: String): String? = (this?.get(k) as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content
private fun JsonObject?.num(k: String): Double? = str(k)?.toDoubleOrNull()
private fun JsonObject?.int(k: String): Int? = num(k)?.toInt()

/** Cookie jar that survives app restarts. Only Mod Alpha's own cookies are ever set, so a flat store is enough. */
private class PersistentCookieJar(private val prefs: SharedPreferences) : CookieJar {
    private val cookies = mutableMapOf<String, Cookie>()

    init {
        prefs.getStringSet("cookies", emptySet())!!.forEach { line ->
            val url = prefs.getString("url:$line", null)?.toHttpUrlOrNull() ?: return@forEach
            Cookie.parse(url, line)?.let { if (it.expiresAt > System.currentTimeMillis()) cookies[it.name + it.path] = it }
        }
    }

    @Synchronized override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        cookies.forEach { c -> if (c.expiresAt <= System.currentTimeMillis()) this.cookies.remove(c.name + c.path) else this.cookies[c.name + c.path] = c }
        persist(url)
    }

    @Synchronized override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val now = System.currentTimeMillis()
        cookies.values.removeAll { it.expiresAt <= now }
        return cookies.values.filter { it.matches(url) }
    }

    @Synchronized fun hasSession() = cookies.values.any { it.name == "ma_rt" && it.expiresAt > System.currentTimeMillis() }

    @Synchronized fun clear() { cookies.clear(); prefs.edit().clear().apply() }

    private fun persist(url: HttpUrl) {
        val base = "${url.scheme}://${url.host}/"
        val e = prefs.edit().clear()
        val lines = cookies.values.map { it.toString() }.toSet()
        e.putStringSet("cookies", lines)
        lines.forEach { e.putString("url:$it", base) }
        e.apply()
    }
}

