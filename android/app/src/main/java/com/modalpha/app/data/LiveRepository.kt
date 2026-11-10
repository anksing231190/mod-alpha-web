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

    private suspend fun call(method: String, path: String, body: JsonObject? = null, retry: Boolean = true): JsonObject = withContext(Dispatchers.IO) {
        val rb = body?.toString()?.toRequestBody("application/json".toMediaType())
        val req = Request.Builder().url(api + path).header("x-ma-client", "android")
            .method(method, rb ?: if (method == "POST") "{}".toRequestBody("application/json".toMediaType()) else null).build()
        val res = try { http.newCall(req).execute() } catch (e: IOException) { throw ApiException("Can't reach Mod Alpha. Check your internet connection.") }
        res.use { r ->
            val text = r.body?.string().orEmpty()
            val obj = runCatching { json.parseToJsonElement(text).jsonObject }.getOrElse { JsonObject(emptyMap()) }
            if (r.code == 401 && retry && !path.startsWith("/auth/")) {
                if (refresh()) return@withContext call(method, path, body, retry = false)
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
        if (u.str("role") != null && u.str("role") != "user") throw ApiException("Admin accounts sign in on the website.", 403)
        return User(u.str("id") ?: "", u.str("name") ?: "Investor", u.str("email"), u.str("mobile"))
    }

    override suspend fun restore(): User? = if (!jar.hasSession()) null else runCatching { call("GET", "/auth/me").toUser() }.getOrNull()

    override suspend fun sendOtp(mobile: String, signup: Boolean): OtpSent {
        val r = call("POST", "/auth/otp/send", buildJsonObject { put("mobile", mobile); put("intent", if (signup) "signup" else "login") })
        return OtpSent(r.int("expiresIn") ?: 600, r.str("devCode"))
    }

    override suspend fun verifyOtp(mobile: String, code: String, signup: Boolean): User {
        val r = call("POST", "/auth/otp/verify", buildJsonObject { put("mobile", mobile); put("code", code); put("intent", if (signup) "signup" else "login") })
        if (r["challenge"] != null || r["mfa"] != null) throw ApiException("Admin accounts sign in on the website.", 403)
        return r.toUser()
    }

    override suspend fun loginWithEmail(email: String, password: String): User {
        val r = call("POST", "/auth/login", buildJsonObject { put("email", email.trim()); put("password", password) })
        if (r["user"] == null) throw ApiException("Admin accounts sign in on the website.", 403)
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
        )
    }

    private fun JsonObject.toCompare(): SipCompare? {
        val pts = (this["path"] as? JsonArray).orEmpty().mapNotNull { p ->
            val o = p as? JsonObject ?: return@mapNotNull null
            ComparePoint(o.str("month") ?: "", o.num("fixed")?.toLong() ?: return@mapNotNull null, o.num("modAlpha")?.toLong() ?: return@mapNotNull null)
        }
        if (pts.size < 2) return null
        return SipCompare(10000, pts.first().month.take(4), int("fixedDay") ?: 1, num("invested")?.toLong() ?: 0,
            num("fixedValue")?.toLong() ?: 0, num("modAlphaValue")?.toLong() ?: 0, num("extra")?.toLong() ?: 0, pts)
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

