package com.modalpha.app.ui.home

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.modalpha.app.data.Fund
import com.modalpha.app.data.HomeData
import com.modalpha.app.data.SipCompare
import com.modalpha.app.data.SipMonth
import com.modalpha.app.ui.components.AmcLogo
import com.modalpha.app.ui.components.ChartSeries
import com.modalpha.app.ui.components.ErrorBanner
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.GridChart
import com.modalpha.app.ui.components.Loader
import com.modalpha.app.ui.components.MaCard
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

/**
 * Home, "one big focus": this month's best SIP date in large type with Remind me / Why;
 * one card that shows what the dates are worth (backtest chart); the watchlist. Nothing else.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeContent(d: HomeData, refreshing: Boolean, onRefresh: () -> Unit, actions: HomeActions, contentPadding: PaddingValues = PaddingValues(), today: LocalDate = LocalDate.now()) {
    PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = contentPadding.calculateBottomPadding() + 24.dp),
        ) {
            item {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp)).background(Ma.c.chromeBrush)
                        .background(Brush.radialGradient(listOf(Ma.c.glow.copy(alpha = .28f), Color.Transparent), center = androidx.compose.ui.geometry.Offset(220f, 520f), radius = 760f))
                        .padding(top = contentPadding.calculateTopPadding() + 8.dp, bottom = 24.dp)
                ) {
                    Header(d, actions)
                    Hero(d.sip, d.locked, today, actions)
                }
            }
            d.compare?.let { item { ValueCard(it, Modifier.padding(start = 20.dp, end = 20.dp, top = 24.dp)) } }
            item { Watchlist(d.watchlist, actions) }
        }
    }
}

@Composable
private fun Header(d: HomeData, actions: HomeActions) {
    val h = LocalTime.now().hour
    val hello = when { h < 12 -> "Good morning"; h < 17 -> "Good afternoon"; else -> "Good evening" }
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(42.dp).clip(CircleShape).background(Ma.c.hiBrush), contentAlignment = Alignment.Center) {
            Text(d.user.initial, color = Ma.c.onAccent, fontWeight = FontWeight.Bold, fontSize = 17.sp)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(hello, color = Ma.c.chromeMuted, style = MaterialTheme.typography.bodySmall)
            Text(d.user.firstName, color = Ma.c.chromeText, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Box {
            IconButton(onClick = actions.openNotifications, modifier = Modifier.size(42.dp).clip(CircleShape).background(Ma.c.chrome2).border(1.dp, Ma.c.chromeLine, CircleShape)) {
                Icon(Icons.Outlined.NotificationsNone, "Notifications, ${d.unread} unread", tint = Ma.c.chromeText, modifier = Modifier.size(21.dp))
            }
            if (d.unread > 0) Box(Modifier.align(Alignment.TopEnd).offset((-9).dp, 9.dp).size(9.dp).clip(CircleShape).background(Ma.c.down).border(2.dp, Ma.c.chrome2, CircleShape))
        }
    }
}

private fun suffix(n: Int) = when { n % 100 in 11..13 -> "th"; n % 10 == 1 -> "st"; n % 10 == 2 -> "nd"; n % 10 == 3 -> "rd"; else -> "th" }
private fun monthName(m: String) = runCatching { YearMonth.parse(m).month.getDisplayName(TextStyle.FULL, Locale.ENGLISH) }.getOrDefault("this month")
private fun pct(v: Double?) = v?.let { (if (it >= 0) "+" else "") + "%.1f%%".format(it) } ?: "—"

@Composable
private fun Hero(sip: SipMonth?, locked: Boolean, today: LocalDate, actions: HomeActions) {
    Column(Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 28.dp)) {
        Text("YOUR BEST SIP DATE · ${monthName(sip?.month ?: "").uppercase()}", color = Ma.c.chromeMuted, style = MaterialTheme.typography.labelSmall)
        if (sip == null) {
            VSpace(12.dp)
            Text("This month's date is being prepared. We'll notify you when it's ready.", color = Ma.c.chromeSub, style = MaterialTheme.typography.bodyLarge)
            return@Column
        }
        if (locked || sip.day == null) {
            VSpace(6.dp)
            Box(contentAlignment = Alignment.Center) {
                BigDay(18, Modifier.then(if (Build.VERSION.SDK_INT >= 31) Modifier.blur(10.dp) else Modifier.alpha(.12f)).alpha(.8f))
                Box(Modifier.size(54.dp).clip(CircleShape).background(Ma.c.chrome2).border(1.dp, Ma.c.chromeLine, CircleShape), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.Lock, "Locked", tint = Ma.c.chromeText, modifier = Modifier.size(22.dp))
                }
            }
            VSpace(8.dp)
            Text(buildAnnotatedString {
                append("This month's date is ready. Historically ")
                withStyle(SpanStyle(color = Color(0xFF4ADE80), fontWeight = FontWeight.Bold)) { append(pct(sip.upliftPct)) }
                append(" vs a fixed date.")
            }, color = Ma.c.chromeSub, style = MaterialTheme.typography.bodyLarge)
            VSpace(20.dp)
            GradientButton("Unlock with Pro", actions.openPlans, brush = Ma.c.hiBrush)
            return@Column
        }
        val date = runCatching { LocalDate.parse("${sip.month}-%02d".format(sip.day)) }.getOrNull()
        val days = date?.let { ChronoUnit.DAYS.between(today, it) }
        val wd = date?.dayOfWeek?.getDisplayName(TextStyle.FULL, Locale.ENGLISH) ?: ""
        val whenText = when { days == null -> wd; days > 1 -> "$wd · in $days days"; days == 1L -> "$wd · tomorrow"; days == 0L -> "$wd · today"; else -> "$wd · done for this month" }
        VSpace(6.dp)
        BigDay(sip.day)
        Text(whenText, color = Ma.c.chromeSub, fontSize = 16.sp)
        VSpace(16.dp)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Chip("▲ ${pct(sip.upliftPct)} vs 1st of month", Color(0xFF4ADE80))
            Chip("● High confidence", Ma.c.chromeSub)
        }
        VSpace(20.dp)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            GradientButton("Remind me", { actions.setReminder(sip.day) }, Modifier.weight(1.4f), brush = Ma.c.hiBrush,
                leading = { Icon(Icons.Outlined.NotificationsActive, null, tint = Ma.c.onAccent, modifier = Modifier.size(18.dp)) })
            Box(
                Modifier.weight(1f).height(52.dp).clip(RoundedCornerShape(14.dp)).background(Ma.c.chrome2).border(1.dp, Ma.c.chromeLine, RoundedCornerShape(14.dp)).clickable(onClick = actions.whyDate),
                contentAlignment = Alignment.Center,
            ) { Text("Why ${sip.day}${suffix(sip.day)}?", color = Ma.c.chromeText, style = MaterialTheme.typography.labelLarge) }
        }
    }
}

@Composable
private fun BigDay(day: Int, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.Top) {
        Text("$day", color = Ma.c.chromeText, fontSize = 80.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-3).sp, lineHeight = 84.sp)
        Text(suffix(day), color = Ma.c.chromeText, fontSize = 26.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 4.dp, top = 14.dp))
    }
}

@Composable
private fun Chip(text: String, color: Color) {
    Text(text, Modifier.clip(CircleShape).background(Ma.c.chrome2).border(1.dp, Ma.c.chromeLine, CircleShape).padding(horizontal = 11.dp, vertical = 6.dp),
        color = color, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold)
}

/** What the dates are worth: the backtest from POST /calc/sip-compare on the standard checkered chart. */
@Composable
private fun ValueCard(c: SipCompare, modifier: Modifier = Modifier) {
    MaCard(modifier.fillMaxWidth()) {
        Column {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text("${inr(c.amount.toLong())} a month since ${c.since}", color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
                    Text("Mod Alpha dates would have added", color = Ma.c.sub, style = MaterialTheme.typography.bodyMedium)
                }
                Spacer(Modifier.width(10.dp))
                Text((if (c.extra >= 0) "+" else "−") + inr(kotlin.math.abs(c.extra)), color = if (c.extra >= 0) Ma.c.up else Ma.c.down, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            }
            VSpace(12.dp)
            val years = c.points.map { it.month.take(4) }.distinct()
            GridChart(
                series = listOf(
                    ChartSeries(c.points.map { it.modAlpha.toDouble() }, Ma.c.accent, fill = true),
                    ChartSeries(c.points.map { it.fixed.toDouble() }, Ma.c.muted, dashed = true),
                ),
                xLabels = if (years.size > 4) listOf(years.first(), years[years.size / 3], years[2 * years.size / 3], years.last()) else years,
                yFormat = ::inrShort,
                modifier = Modifier.fillMaxWidth().height(150.dp),
            )
            VSpace(10.dp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Legend(Ma.c.accent, "Mod Alpha dates"); Spacer(Modifier.width(14.dp))
                Legend(Ma.c.muted, "Fixed date (${c.fixedDay}${suffix(c.fixedDay)})"); Spacer(Modifier.weight(1f))
                Text("Backtest", color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun Legend(color: Color, text: String) {
    Box(Modifier.width(10.dp).height(3.dp).clip(CircleShape).background(color)); Spacer(Modifier.width(5.dp))
    Text(text, color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
}

@Composable
private fun Watchlist(list: List<Fund>, actions: HomeActions) {
    Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 24.dp)) {
        if (list.isEmpty()) {
            Text("Start a watchlist", color = Ma.c.text, style = MaterialTheme.typography.titleMedium)
            VSpace(10.dp)
            MaCard(Modifier.fillMaxWidth().clickable(onClick = actions.openFunds), padding = 14.dp) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(38.dp).clip(RoundedCornerShape(10.dp)).background(Ma.c.surface2), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.StarOutline, null, tint = Ma.c.warn, modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Track funds you like", color = Ma.c.text, style = MaterialTheme.typography.titleMedium)
                        Text("Tap ☆ on any fund in Explore", color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
                    }
                    Text("Explore", color = Ma.c.accent, fontWeight = FontWeight.SemiBold)
                }
            }
            return@Column
        }
        Row(verticalAlignment = Alignment.Bottom) {
            Text("Watchlist", color = Ma.c.text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
            Text("See all", color = Ma.c.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.clickable(onClick = actions.openFunds))
        }
        VSpace(4.dp)
        list.take(3).forEachIndexed { i, f ->
            if (i > 0) HorizontalDivider(color = Ma.c.line)
            Row(Modifier.fillMaxWidth().clickable { actions.openFund(f.id) }.padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                AmcLogo(f.amc, 38.dp); Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(f.short, color = Ma.c.text, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(f.category, color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(pct(f.r5), color = if ((f.r5 ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontWeight = FontWeight.Bold)
                    Text("5Y", color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}
