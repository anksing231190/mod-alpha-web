package com.modalpha.app.ui.home

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CompareArrows
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.material3.TextButton
import androidx.compose.material3.AlertDialog
import androidx.compose.material.icons.automirrored.outlined.ShowChart
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.modalpha.app.data.Fund
import com.modalpha.app.data.HomeData
import com.modalpha.app.data.SipCompare
import com.modalpha.app.data.SipMonth
import com.modalpha.app.ui.components.AmcLogo
import com.modalpha.app.ui.components.BarStrip
import com.modalpha.app.ui.components.ChartSeries
import com.modalpha.app.ui.components.ErrorBanner
import com.modalpha.app.ui.components.GhostChip
import com.modalpha.app.ui.components.GlassCard
import com.modalpha.app.ui.components.Gold
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.GridChart
import com.modalpha.app.ui.components.Loader
import com.modalpha.app.ui.components.MaCard
import com.modalpha.app.ui.components.MeshHero
import com.modalpha.app.ui.components.Mint
import com.modalpha.app.ui.components.Ring
import com.modalpha.app.ui.components.Sparkline
import com.modalpha.app.ui.components.UpChip
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.components.inr
import com.modalpha.app.ui.components.inrShort
import com.modalpha.app.ui.components.*
import com.modalpha.app.ui.theme.Ma
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

/** What Home can ask the rest of the app to do. */
class HomeActions(
    val openFunds: () -> Unit = {},
    val openSip: () -> Unit = {},
    val openPlans: () -> Unit = {},
    val openNotifications: () -> Unit = {},
    val setReminder: (Int) -> Unit = {},
    val whyDate: () -> Unit = {},
    val openFund: (String) -> Unit = {},
    val openProfile: () -> Unit = {},
    val openWhatIf: () -> Unit = {},
    val logout: () -> Unit = {},
    val openCompare: () -> Unit = {},
    val openAsk: () -> Unit = {},
)

@Composable
fun HomeScreen(vm: HomeViewModel, actions: HomeActions, contentPadding: PaddingValues = PaddingValues()) {
    val s by vm.state.collectAsStateWithLifecycle()
    when (val st = s) {
        HomeState.Loading -> Loader(Modifier.fillMaxSize(), "Loading your dashboard…")
        is HomeState.Failed -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center) {
            ErrorBanner(st.message); VSpace(16.dp); GradientButton("Try again", vm::load)
        }
        is HomeState.Ready -> HomeContent(st.data, st.refreshing, vm::load, actions, contentPadding)
    }
}

private fun sfx(n: Int) = when { n % 100 in 11..13 -> "th"; n % 10 == 1 -> "st"; n % 10 == 2 -> "nd"; n % 10 == 3 -> "rd"; else -> "th" }
private fun monthName(m: String) = runCatching { YearMonth.parse(m).month.getDisplayName(TextStyle.FULL, Locale.ENGLISH) }.getOrDefault("this month")
private fun pct(v: Double?) = v?.let { (if (it >= 0) "+" else "") + "%.1f%%".format(it) } ?: "—"

/**
 * Home: one glance — this month's date with its confidence, the historical edge of every day of the month,
 * what the dates are worth (backtest), and the watchlist.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeContent(d: HomeData, refreshing: Boolean, onRefresh: () -> Unit, actions: HomeActions, contentPadding: PaddingValues = PaddingValues(), today: LocalDate = LocalDate.now()) {
    PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = contentPadding.calculateBottomPadding() + 16.dp)) {
            item { Hero(d, today, actions) }
            item { QuickLinks(actions, Modifier.padding(start = 18.dp, end = 18.dp, top = 14.dp)) }
            d.compare?.let { item { EdgeCard(it, Modifier.padding(start = 18.dp, end = 18.dp, top = 14.dp)) } }

            item { Watchlist(d.watchlist, actions) }
        }
    }
}

@Composable
private fun Hero(d: HomeData, today: LocalDate, actions: HomeActions) {
    val c = Ma.c
    val sip = d.sip
    MeshHero {
        // greeting row
        var askLogout by remember { mutableStateOf(false) }
        if (askLogout) AlertDialog({ askLogout = false }, containerColor = c.surface,
            title = { Text("Log out?") }, text = { Text("You'll need your phone or email to sign in again.", color = c.sub) },
            confirmButton = { TextButton({ askLogout = false; actions.logout() }) { Text("Log out", color = c.down, fontWeight = FontWeight.SemiBold) } },
            dismissButton = { TextButton({ askLogout = false }) { Text("Cancel", color = c.muted) } })
        Row(Modifier.fillMaxWidth().padding(start = 18.dp, end = 18.dp, top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
          // avatar + name open the profile
          Row(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).clickable(onClickLabel = "Open profile", onClick = actions.openProfile).padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF8B5CF6)))), contentAlignment = Alignment.Center) {
                Text(d.user.initial, color = Color.White, fontWeight = FontWeight.Black, fontSize = 17.sp)
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(d.user.firstName, color = c.chromeText, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("View profile ›", color = c.chromeMuted, fontSize = 11.sp)
            }
          }
            if (d.plan != "Free") { GhostChip(d.plan.uppercase(), gold = true); Spacer(Modifier.width(8.dp)) }
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(Color.White).border(1.dp, c.line, RoundedCornerShape(13.dp)).clickable(onClick = actions.openNotifications), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.NotificationsNone, "Notifications, ${d.unread} unread", tint = Color(0xFF0F1A33), modifier = Modifier.size(20.dp))
                if (d.unread > 0) Box(Modifier.align(Alignment.TopEnd).offset((-7).dp, 7.dp).size(8.dp).clip(CircleShape).background(Color(0xFFF43F5E)))
            }
            Spacer(Modifier.width(8.dp))
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(Color.White).border(1.dp, c.line, RoundedCornerShape(13.dp)).clickable(onClickLabel = "Log out") { askLogout = true }, contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Outlined.Logout, "Log out", tint = Color(0xFFB91C1C), modifier = Modifier.size(19.dp))
            }
        }
        // date + days-to-go ring
        Text("BEST SIP DATE · ${monthName(sip?.month ?: "").uppercase()}", Modifier.padding(start = 18.dp, top = 14.dp), color = c.chromeMuted, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
        if (sip == null) {
            Text("This month's date is being prepared. We'll notify you when it's ready.", Modifier.padding(18.dp), color = c.chromeSub, fontSize = 15.sp)
            return@MeshHero
        }
        val locked = d.locked || sip.day == null
        val date = if (locked) null else runCatching { LocalDate.parse("${sip.month}-%02d".format(sip.day)) }.getOrNull()
        val days = date?.let { ChronoUnit.DAYS.between(today, it) }
        Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Box(contentAlignment = Alignment.CenterStart) {
                    Row(verticalAlignment = Alignment.Top, modifier = if (locked) (if (Build.VERSION.SDK_INT >= 31) Modifier.blur(12.dp) else Modifier.alpha(.12f)) else Modifier) {
                        Text("${sip.day ?: 18}", color = c.chromeText, fontSize = 76.sp, fontWeight = FontWeight.Black, letterSpacing = (-4).sp, lineHeight = 76.sp)
                        Text(sfx(sip.day ?: 18), color = c.chromeText, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(start = 3.dp, top = 10.dp))
                    }
                    if (locked) Box(Modifier.padding(start = 26.dp).size(52.dp).clip(CircleShape).background(c.surface).border(1.dp, c.line, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.Lock, "Locked", tint = Color(0xFF0F1A33), modifier = Modifier.size(22.dp))
                    }
                }
                val wd = date?.dayOfWeek?.getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                Text(if (locked) "This month's date is ready" else listOfNotNull(wd, "${sip.confidencePct}% confidence".takeIf { sip.confidencePct > 0 }).joinToString(" · "), color = c.chromeSub, fontSize = 13.5.sp)
            }
            if (!locked && days != null) {
                val len = YearMonth.parse(sip.month).lengthOfMonth()
                Ring(if (days > 0) 1f - days.toFloat() / len else 1f, 88.dp, 8.dp, listOf(Mint, Color(0xFF22D3EE))) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(when { days > 0 -> "$days"; days == 0L -> "Today"; else -> "Done" }, color = c.chromeText, fontSize = if (days > 0) 24.sp else 16.sp, fontWeight = FontWeight.Black, lineHeight = 24.sp)
                        if (days > 0) Text(if (days == 1L) "DAY TO GO" else "DAYS TO GO", color = c.chromeMuted, fontSize = 7.5.sp, fontWeight = FontWeight.Bold, letterSpacing = .5.sp)
                    }
                }
            }
        }
        // three facts about this month's date
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            HeroTile(pct(sip.upliftPct), "vs the 1st", Modifier.weight(1f))
            if (!locked) {
                if (sip.leadPts != null) HeroTile("%.1f pts".format(sip.leadPts), "ahead of next", Modifier.weight(1f))
                else HeroTile("${sip.confidencePct}%", "confidence", Modifier.weight(1f))
                val backup = sip.alternatives.maxByOrNull { it.upliftPct ?: 0.0 }?.day
                HeroTile(backup?.let { "$it${sfx(it)}" } ?: "—", "backup day", Modifier.weight(1f))
            }
        }
        // actions
        val ctx = androidx.compose.ui.platform.LocalContext.current
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (locked) GradientButton("Unlock with Pro", actions.openPlans, brush = c.hiBrush)
            else {
                GradientButton("Remind me", { actions.setReminder(sip.day!!) }, Modifier.weight(1.25f), brush = c.hiBrush, leading = { Icon(Icons.Outlined.NotificationsActive, null, tint = Color.White, modifier = Modifier.size(17.dp)) })
                HeroButton("Add to calendar", Modifier.weight(1.25f)) { date?.let { addToCalendar(ctx, it) } }
                HeroButton("Why ${sip.day}${sfx(sip.day!!)}?", Modifier.weight(1f), onClick = actions.whyDate)
            }
        }
    }
}

@Composable private fun HeroTile(value: String, label: String, modifier: Modifier) =
    Column(modifier.clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = .1f)).border(1.dp, Color.White.copy(alpha = .12f), RoundedCornerShape(12.dp)).padding(vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = Ma.c.chromeText, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
        Text(label, color = Ma.c.chromeMuted, fontSize = 10.5.sp, maxLines = 1)
    }

@Composable private fun HeroButton(text: String, modifier: Modifier, onClick: () -> Unit) =
    Box(modifier.height(52.dp).clip(RoundedCornerShape(14.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(14.dp)).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        Text(text, color = Ma.c.text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 6.dp))
    }

/** Opens the phone's calendar with an all-day "Mod Alpha · SIP date" event (no calendar permission needed). */
private fun addToCalendar(ctx: android.content.Context, date: LocalDate) {
    val start = date.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
    val i = android.content.Intent(android.content.Intent.ACTION_INSERT).setData(android.provider.CalendarContract.Events.CONTENT_URI)
        .putExtra(android.provider.CalendarContract.Events.TITLE, "Mod Alpha · SIP date")
        .putExtra(android.provider.CalendarContract.Events.DESCRIPTION, "This month's best SIP date from Mod Alpha. Invest in your own app or broker.")
        .putExtra(android.provider.CalendarContract.EXTRA_EVENT_ALL_DAY, true)
        .putExtra(android.provider.CalendarContract.EXTRA_EVENT_BEGIN_TIME, start)
        .putExtra(android.provider.CalendarContract.EXTRA_EVENT_END_TIME, start + 86_400_000L)
    runCatching { ctx.startActivity(i) }
}

/** Shortcuts under the hero. */
@Composable
private fun QuickLinks(actions: HomeActions, modifier: Modifier = Modifier) {
    val c = Ma.c
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(Triple(Icons.AutoMirrored.Outlined.ShowChart, "What if", actions.openWhatIf), Triple(Icons.Outlined.CompareArrows, "Compare", actions.openCompare),
            Triple(Icons.Outlined.CalendarMonth, "Calendar", actions.openSip), Triple(Icons.Outlined.ChatBubbleOutline, "Ask α", actions.openAsk)).forEach { (ic, label, go) ->
            Column(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(14.dp)).clickable(onClick = go).padding(vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(Modifier.size(32.dp).clip(RoundedCornerShape(10.dp)).background(c.accent.copy(alpha = .1f)), contentAlignment = Alignment.Center) { Icon(ic, null, tint = c.accent, modifier = Modifier.size(18.dp)) }
                Spacer(Modifier.height(5.dp))
                Text(label, color = c.text, fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

/** "What if" entry on Home: opens the lump sum / SIP calculator on real NAV history. */
@Composable
private fun WhatIfCard(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = Ma.c
    Row(
        modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(20.dp)).clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(44.dp).clip(RoundedCornerShape(14.dp)).background(c.accent.copy(alpha = .1f)), contentAlignment = Alignment.Center) {
            Icon(Icons.AutoMirrored.Outlined.ShowChart, null, tint = c.accent, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("What if you'd invested?", color = c.text, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text("Pick a fund, amount and date — see what it's worth today", color = c.muted, fontSize = 12.sp, maxLines = 2)
        }
        Text("Try ›", color = c.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp)
    }
}

/** Your edge since 2021: the backtest (POST /calc/sip-compare) on the checkered chart with the three totals. */
@Composable
private fun EdgeCard(c: SipCompare, modifier: Modifier = Modifier) {
    MaCard(modifier.fillMaxWidth(), padding = 14.dp) {
        Column {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text("YOUR EDGE SINCE ${c.since}", color = Ma.c.muted, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                    Text("${inr(c.amount.toLong())}/month on Mod Alpha dates", color = Ma.c.sub, fontSize = 12.sp)
                }
                Text((if (c.extra >= 0) "+" else "−") + inr(kotlin.math.abs(c.extra)), color = if (c.extra >= 0) Ma.c.up else Ma.c.down, fontSize = 22.sp, fontWeight = FontWeight.Black)
            }
            VSpace(8.dp)
            // the gap itself (Mod Alpha value − fixed-date value) over time, so even a small edge reads as a curve
            val gap = c.points.map { (it.modAlpha - it.fixed).toDouble() }
            Text("Extra value over a SIP on the ${c.fixedDay}${sfx(c.fixedDay)}" + if (c.fixedValue > 0) " · %+.2f%%".format(c.extra * 100.0 / c.fixedValue) else "", color = Ma.c.muted, fontSize = 11.sp)
            VSpace(4.dp)
            if (gap.size > 1) GridChart(listOf(ChartSeries(gap, Ma.c.up, fill = true)), emptyList(), Modifier.fillMaxWidth().height(96.dp), yFormat = { inrShort(it) }, showY = false)
            VSpace(10.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Mini("Invested", inrShort(c.invested.toDouble()), Ma.c.text, Modifier.weight(1f))
                Mini("Fixed ${c.fixedDay}${sfx(c.fixedDay)}", inrShort(c.fixedValue.toDouble()), Ma.c.text, Modifier.weight(1f))
                Mini("Mod Alpha", inrShort(c.modAlphaValue.toDouble()), Ma.c.up, Modifier.weight(1f))
            }
        }
    }
}

@Composable private fun Mini(k: String, v: String, col: Color, modifier: Modifier) = Column(modifier.clip(RoundedCornerShape(12.dp)).background(Ma.c.surface2).padding(horizontal = 10.dp, vertical = 8.dp)) {
    Text(k, color = Ma.c.muted, fontSize = 10.5.sp, maxLines = 1); Text(v, color = col, fontWeight = FontWeight.Bold, fontSize = 14.sp)
}

@Composable
private fun Watchlist(list: List<Fund>, actions: HomeActions) {
    Row(Modifier.fillMaxWidth().padding(start = 18.dp, end = 18.dp, top = 16.dp, bottom = 8.dp), verticalAlignment = Alignment.Bottom) {
        Text("Watchlist", color = Ma.c.text, fontSize = 15.5.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        Text(if (list.isEmpty()) "Explore" else "See all", color = Ma.c.accent, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, modifier = Modifier.clickable(onClick = actions.openFunds))
    }
    if (list.isEmpty()) {
        MaCard(Modifier.padding(horizontal = 18.dp).fillMaxWidth().clickable(onClick = actions.openFunds), padding = 14.dp) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(38.dp).clip(RoundedCornerShape(11.dp)).background(Ma.c.surface2), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.StarOutline, null, tint = Ma.c.warn, modifier = Modifier.size(20.dp)) }
                Spacer(Modifier.width(12.dp))
                Column { Text("Track funds you like", color = Ma.c.text, fontWeight = FontWeight.SemiBold); Text("Tap ☆ on any fund in Explore", color = Ma.c.muted, fontSize = 12.sp) }
            }
        }
        return
    }
    Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        list.forEach { f ->
            MaCard(Modifier.width(156.dp).clickable { actions.openFund(f.id) }, padding = 12.dp) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) { AmcLogo(f.amc, 28.dp); Spacer(Modifier.width(8.dp)); Text(f.category, color = Ma.c.muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                    Text(f.short, color = Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(pct(f.r5), color = if ((f.r5 ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontWeight = FontWeight.Black, fontSize = 15.sp, modifier = Modifier.weight(1f))
                        if (f.spark.size > 1) Sparkline(f.spark, Ma.c.up, Modifier.width(54.dp).height(22.dp))
                    }
                }
            }
        }
    }
}
