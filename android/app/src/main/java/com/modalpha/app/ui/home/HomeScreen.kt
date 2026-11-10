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
import com.modalpha.app.ui.theme.Ma
import java.time.LocalDate
import java.time.LocalTime
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
        Row(Modifier.fillMaxWidth().padding(start = 18.dp, end = 18.dp, top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(40.dp).clip(CircleShape).background(Brush.linearGradient(listOf(Color(0xFF60A5FA), Color(0xFF8B5CF6)))), contentAlignment = Alignment.Center) {
                Text(d.user.initial, color = Color.White, fontWeight = FontWeight.Black, fontSize = 17.sp)
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                val h = LocalTime.now().hour
                Text(if (h < 12) "Good morning" else if (h < 17) "Good afternoon" else "Good evening", color = c.chromeMuted, fontSize = 12.sp)
                Text(d.user.firstName, color = c.chromeText, fontSize = 17.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            if (d.plan != "Free") { GhostChip(d.plan.uppercase(), gold = true); Spacer(Modifier.width(8.dp)) }
            Box(Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(Color.White.copy(alpha = .08f)).border(1.dp, Color.White.copy(alpha = .12f), RoundedCornerShape(13.dp)).clickable(onClick = actions.openNotifications), contentAlignment = Alignment.Center) {
                Icon(Icons.Outlined.NotificationsNone, "Notifications, ${d.unread} unread", tint = c.chromeText, modifier = Modifier.size(20.dp))
                if (d.unread > 0) Box(Modifier.align(Alignment.TopEnd).offset((-7).dp, 7.dp).size(8.dp).clip(CircleShape).background(Color(0xFFF43F5E)))
            }
        }
        // date + confidence
        Text("BEST SIP DATE · ${monthName(sip?.month ?: "").uppercase()}", Modifier.padding(start = 18.dp, top = 16.dp), color = c.chromeMuted, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.3.sp)
        if (sip == null) {
            Text("This month's date is being prepared. We'll notify you when it's ready.", Modifier.padding(18.dp), color = c.chromeSub, fontSize = 15.sp)
            return@MeshHero
        }
        val locked = d.locked || sip.day == null
        Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Box(contentAlignment = Alignment.CenterStart) {
                    Row(verticalAlignment = Alignment.Top, modifier = if (locked) (if (Build.VERSION.SDK_INT >= 31) Modifier.blur(12.dp) else Modifier.alpha(.12f)) else Modifier) {
                        Text("${sip.day ?: 18}", color = c.chromeText, fontSize = 84.sp, fontWeight = FontWeight.Black, letterSpacing = (-4).sp, lineHeight = 84.sp)
                        Text(sfx(sip.day ?: 18), color = c.chromeText, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(start = 3.dp, top = 12.dp))
                    }
                    if (locked) Box(Modifier.padding(start = 26.dp).size(52.dp).clip(CircleShape).background(Color.White.copy(alpha = .12f)).border(1.dp, Color.White.copy(alpha = .2f), CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.Lock, "Locked", tint = c.chromeText, modifier = Modifier.size(22.dp))
                    }
                }
                if (!locked) {
                    val date = runCatching { LocalDate.parse("${sip.month}-%02d".format(sip.day)) }.getOrNull()
                    val days = date?.let { ChronoUnit.DAYS.between(today, it) }
                    val wd = date?.dayOfWeek?.getDisplayName(TextStyle.FULL, Locale.ENGLISH) ?: ""
                    Text(when { days == null -> wd; days > 1 -> "$wd · in $days days"; days == 1L -> "$wd · tomorrow"; days == 0L -> "$wd · today"; else -> "$wd · done for this month" }, color = c.chromeSub, fontSize = 14.sp)
                } else Text("This month's date is ready", color = c.chromeSub, fontSize = 14.sp)
            }
            if (!locked && sip.confidencePct > 0) Ring(sip.confidencePct / 100f, 96.dp, 9.dp, listOf(Mint, Color(0xFF22D3EE))) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${sip.confidencePct}%", color = c.chromeText, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text("CONFIDENCE", color = c.chromeMuted, fontSize = 8.5.sp, fontWeight = FontWeight.Bold, letterSpacing = .5.sp)
                }
            }
        }
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 12.dp).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            UpChip("${pct(sip.upliftPct)} vs 1st of month", up = (sip.upliftPct ?: 0.0) >= 0)
            if (!locked) sip.leadPts?.let { GhostChip("Leads next date by %.1f pts".format(it)) }
            if (!locked) GhostChip("${sip.confidenceLabel.ifBlank { "High" }} confidence")
        }
        // every day of the month
        d.dayEdge?.let { edge ->
            GlassCard(Modifier.padding(start = 18.dp, end = 18.dp, top = 12.dp).fillMaxWidth()) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Every day this month · historical edge", color = c.chromeMuted, fontSize = 11.sp, modifier = Modifier.weight(1f))
                        if (!locked) { Text("■ ", color = Gold, fontSize = 10.sp); Text("best  ", color = c.chromeMuted, fontSize = 11.sp); Text("■ ", color = Mint, fontSize = 10.sp); Text("good", color = c.chromeMuted, fontSize = 11.sp) }
                    }
                    VSpace(6.dp)
                    BarStrip(edge, Modifier.fillMaxWidth().height(46.dp), hi = if (locked) null else sip.day?.minus(1), good = if (locked) emptySet() else sip.alternatives.map { it.day - 1 }.toSet())
                    Row(Modifier.fillMaxWidth().padding(top = 3.dp)) { listOf("1", "7", "14", "21", "28").forEachIndexed { i, s -> if (i > 0) Spacer(Modifier.weight(1f)); Text(s, color = c.chromeMuted, fontSize = 9.5.sp) } }
                }
            }
        }
        // actions
        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (locked) GradientButton("Unlock with Pro", actions.openPlans, brush = c.hiBrush)
            else {
                GradientButton("Remind me", { actions.setReminder(sip.day!!) }, Modifier.weight(1.4f), brush = c.hiBrush, leading = { Icon(Icons.Outlined.NotificationsActive, null, tint = Color.White, modifier = Modifier.size(18.dp)) })
                Box(Modifier.weight(1f).height(52.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = .1f)).border(1.dp, Color.White.copy(alpha = .18f), RoundedCornerShape(14.dp)).clickable(onClick = actions.whyDate), contentAlignment = Alignment.Center) {
                    Text("Why ${sip.day}${sfx(sip.day!!)}?", color = Color.White, style = MaterialTheme.typography.labelLarge)
                }
            }
        }
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
            GridChart(
                listOf(ChartSeries(c.points.map { it.modAlpha.toDouble() }, Ma.c.accent, fill = true), ChartSeries(c.points.map { it.fixed.toDouble() }, Ma.c.muted, dashed = true)),
                emptyList(), Modifier.fillMaxWidth().height(96.dp), yFormat = { inrShort(it) }, glow = true, showY = false,
            )
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
