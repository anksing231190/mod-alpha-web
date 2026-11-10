package com.modalpha.app.data

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.modalpha.app.MainActivity
import com.modalpha.app.ModAlphaApp
import com.modalpha.app.R
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.TimeUnit
import kotlin.math.abs

/*
 * Morning heads-up on the SIP date. Once a day, around 8 am, on the month's best date only: if a fund on the
 * watchlist (or the top fund) moved more than the chosen % at the last NAV, post a notification. Tapping it opens
 * the fund with its recent NAV on the checkered chart. Wording is factual: what moved, and that the date stands.
 */
object NavAlert {
    const val CHANNEL = "sip_date_alerts"
    const val EXTRA_FUND = "open_fund"
    private const val WORK = "nav-alert-daily"

    /** Schedule (or keep) the daily check at the next 8:00. */
    fun schedule(context: Context) {
        val now = LocalDateTime.now()
        var next = now.toLocalDate().atTime(LocalTime.of(8, 0)); if (!next.isAfter(now)) next = next.plusDays(1)
        val req = PeriodicWorkRequestBuilder<NavAlertWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(Duration.between(now, next).toMinutes(), TimeUnit.MINUTES).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, req)
    }

    /** The headline and body for the funds that moved (pure, so it can be tested). */
    fun message(day: Int, moves: List<Pair<String, Double>>, navDate: String?): Pair<String, String> {
        val sfx = if (day % 100 in 11..13) "th" else when (day % 10) { 1 -> "st"; 2 -> "nd"; 3 -> "rd"; else -> "th" }
        return if (moves.size == 1) {
            val (name, ch) = moves.first()
            "Today is your SIP date · NAV ${if (ch < 0) "fell" else "rose"} %.1f%%".format(abs(ch)) to
                "$name closed ${if (ch < 0) "lower" else "higher"}${navDate?.let { " on $it" } ?: ""}. The $day$sfx is still this month's date."
        } else {
            "Today is your SIP date · ${moves.size} funds moved" to
                moves.joinToString(" · ") { (n, ch) -> "$n ${if (ch < 0) "▼" else "▲"} %.1f%%".format(abs(ch)) } + ". The $day$sfx is still this month's date."
        }
    }

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null)
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "SIP date alerts", NotificationManager.IMPORTANCE_DEFAULT).apply { description = "A heads-up on the morning of your SIP date if a fund's NAV moved" })
    }

    fun post(context: Context, title: String, body: String, fundId: String) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        ensureChannel(context)
        val open = PendingIntent.getActivity(context, 7, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra(EXTRA_FUND, fundId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(context, CHANNEL).setSmallIcon(R.drawable.splash_mark).setContentTitle(title).setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(open).setAutoCancel(true).build()
        runCatching { NotificationManagerCompat.from(context).notify(4101, n) }
    }
}

class NavAlertWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val prefs = AppPrefs(applicationContext)
        val pct = prefs.navAlertPct; if (pct <= 0) return Result.success()
        val today = LocalDate.now()
        if (prefs.lastNavAlert == today.toString()) return Result.success()
        val repo = (applicationContext as ModAlphaApp).live
        val home = runCatching { repo.home() }.getOrNull() ?: return Result.success()     // signed out or offline: skip today
        val sip = home.sip ?: return Result.success()
        val day = sip.day ?: return Result.success()
        if (home.locked || "${sip.month}-%02d".format(day) != today.toString()) return Result.success()
        val funds = home.watchlist.ifEmpty { home.topFunds.take(1) }.take(5)
        val moves = funds.mapNotNull { f ->
            val pts = runCatching { repo.nav(f.id, "1M") }.getOrNull().orEmpty()
            if (pts.size < 2) null else { val ch = (pts.last().value / pts[pts.size - 2].value - 1) * 100; if (abs(ch) >= pct) Triple(f, ch, pts.last().date) else null }
        }
        prefs.lastNavAlert = today.toString()
        if (moves.isEmpty()) return Result.success()
        val (title, body) = NavAlert.message(day, moves.map { it.first.short to it.second }, moves.first().third.take(10))
        NavAlert.post(applicationContext, title, body, moves.maxBy { abs(it.second) }.first.id)
        return Result.success()
    }
}
