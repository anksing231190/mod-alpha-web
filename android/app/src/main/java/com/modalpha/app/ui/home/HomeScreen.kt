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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.modalpha.app.data.Fund
import com.modalpha.app.data.HomeData
import com.modalpha.app.data.SipMonth
import com.modalpha.app.ui.components.AmcLogo
import com.modalpha.app.ui.components.ErrorBanner
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.Loader
import com.modalpha.app.ui.components.MaCard
import com.modalpha.app.ui.components.Pill
import com.modalpha.app.ui.components.Sparkline
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.theme.Ma
import java.time.LocalDate
import java.time.LocalTime
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

/** What Home can ask the rest of the app to do. */
class HomeActions(
    val openFunds: () -> Unit = {},
    val openSip: () -> Unit = {},
    val openPlans: () -> Unit = {},
    val openNotifications: () -> Unit = {},
    val setReminder: (Int) -> Unit = {},
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeContent(d: HomeData, refreshing: Boolean, onRefresh: () -> Unit, actions: HomeActions, contentPadding: PaddingValues = PaddingValues()) {
    PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(top = contentPadding.calculateTopPadding() + 8.dp, bottom = contentPadding.calculateBottomPadding() + 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            item { Header(d, actions) }
            item { SipHero(d.sip, d.locked, actions, Modifier.padding(horizontal = 16.dp)) }
            item { TopFunds(d.topFunds, actions) }
            item { Stats(d, actions) }
            item {
                Text(
                    "Returns shown are historical. Past performance does not guarantee future returns.",
                    Modifier.padding(horizontal = 20.dp), color = Ma.c.muted, style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

@Composable
private fun Header(d: HomeData, actions: HomeActions) {
    val h = LocalTime.now().hour
    val hello = when { h < 12 -> "Good morning"; h < 17 -> "Good afternoon"; else -> "Good evening" }
    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(hello, color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium)
            Text(d.user.firstName, color = Ma.c.text, style = MaterialTheme.typography.headlineSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Box {
            IconButton(onClick = actions.openNotifications, modifier = Modifier.size(44.dp).clip(CircleShape).background(Ma.c.surface).border(1.dp, Ma.c.line, CircleShape)) {
                Icon(Icons.Outlined.NotificationsNone, "Notifications, ${d.unread} unread", tint = Ma.c.text)
            }
            if (d.unread > 0) Box(
                Modifier.align(Alignment.TopEnd).offset(2.dp, (-2).dp).size(18.dp).clip(CircleShape).background(Ma.c.down),
                contentAlignment = Alignment.Center,
            ) { Text(if (d.unread > 9) "9+" else "${d.unread}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
        }
        Spacer(Modifier.width(10.dp))
        Box(Modifier.size(44.dp).clip(CircleShape).background(Ma.c.accentBrush), contentAlignment = Alignment.Center) {
            Text(d.user.initial, color = Ma.c.onAccent, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
    }
}

private fun ordinal(n: Int) = n.toString() + when { n % 100 in 11..13 -> "th"; n % 10 == 1 -> "st"; n % 10 == 2 -> "nd"; n % 10 == 3 -> "rd"; else -> "th" }
private fun monthName(m: String) = runCatching { YearMonth.parse(m).month.getDisplayName(TextStyle.FULL, Locale.ENGLISH) }.getOrDefault("This month")
private fun weekday(m: String, day: Int) = runCatching { LocalDate.parse("$m-%02d".format(day)).dayOfWeek.getDisplayName(TextStyle.FULL, Locale.ENGLISH) }.getOrDefault("")
private fun pct(v: Double?) = v?.let { (if (it >= 0) "+" else "") + "%.1f%%".format(it) } ?: "—"

/** This month's best SIP date — the main thing the app is for. Free plan: the date is hidden behind an upgrade. */
@Composable
fun SipHero(sip: SipMonth?, locked: Boolean, actions: HomeActions, modifier: Modifier = Modifier) {
    val white = Color.White
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(Ma.c.heroBrush).clickable(onClick = actions.openSip).padding(20.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("BEST SIP DATE · ${monthName(sip?.month ?: "").uppercase()}", color = white.copy(alpha = .8f), style = MaterialTheme.typography.labelSmall, modifier = Modifier.weight(1f))
            Row(Modifier.clip(CircleShape).background(white.copy(alpha = .16f)).padding(horizontal = 8.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.AutoAwesome, null, tint = white, modifier = Modifier.size(12.dp)); Spacer(Modifier.width(4.dp))
                Text("AI", color = white, style = MaterialTheme.typography.labelSmall)
            }
        }
        VSpace(10.dp)
        if (sip == null) {
            Text("This month's date is being prepared. We'll notify you when it's ready.", color = white, style = MaterialTheme.typography.bodyLarge)
            return@Column
        }
        if (locked || sip.day == null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        "18", color = white, fontSize = 64.sp, fontWeight = FontWeight.ExtraBold,
                        modifier = if (Build.VERSION.SDK_INT >= 31) Modifier.blur(14.dp) else Modifier.alpha(.15f),
                    )
                    Box(Modifier.size(40.dp).clip(CircleShape).background(white.copy(alpha = .2f)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.Lock, "Locked", tint = white, modifier = Modifier.size(20.dp))
                    }
                }
                Spacer(Modifier.width(16.dp))
                Column {
                    Text("See this month's best date", color = white, style = MaterialTheme.typography.titleMedium)
                    Text("Historically ${pct(sip.upliftPct)} vs a fixed-date SIP", color = white.copy(alpha = .8f), style = MaterialTheme.typography.bodyMedium)
                }
            }
            VSpace(16.dp)
            HeroButton("Unlock with Pro", Icons.Outlined.WorkspacePremium, actions.openPlans)
            return@Column
        }
        Row(verticalAlignment = Alignment.Bottom) {
            Text("${sip.day}", color = white, fontSize = 64.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 64.sp)
            Column(Modifier.padding(start = 6.dp, bottom = 10.dp)) {
                Text(ordinal(sip.day).drop(sip.day.toString().length), color = white, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text(weekday(sip.month, sip.day), color = white.copy(alpha = .8f), style = MaterialTheme.typography.bodyMedium)
            }
            Spacer(Modifier.weight(1f))
            Column(horizontalAlignment = Alignment.End, modifier = Modifier.padding(bottom = 10.dp)) {
                Text(pct(sip.upliftPct), color = white, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text("vs fixed-date SIP", color = white.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall)
            }
        }
        VSpace(12.dp)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Confidence", color = white.copy(alpha = .85f), style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.width(10.dp))
            Box(Modifier.weight(1f).height(6.dp).clip(CircleShape).background(white.copy(alpha = .2f))) {
                Box(Modifier.fillMaxWidth(sip.confidencePct / 100f).height(6.dp).clip(CircleShape).background(Color(0xFF4ADE80)))
            }
            Spacer(Modifier.width(10.dp))
            Text("High · ${sip.confidencePct}%", color = white, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
        }
        if (sip.alternatives.isNotEmpty()) {
            VSpace(14.dp)
            Text("Other good dates", color = white.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall)
            VSpace(6.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                sip.alternatives.take(3).forEach { a ->
                    Column(
                        Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(white.copy(alpha = .12f)).border(1.dp, white.copy(alpha = .18f), RoundedCornerShape(12.dp)).padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(ordinal(a.day), color = white, fontWeight = FontWeight.Bold)
                        Text(pct(a.upliftPct), color = white.copy(alpha = .8f), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        VSpace(16.dp)
        HeroButton("Set reminder", Icons.Outlined.NotificationsActive) { actions.setReminder(sip.day) }
    }
}

@Composable
private fun HeroButton(text: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(48.dp).clip(RoundedCornerShape(14.dp)).background(Color.White).clickable(onClick = onClick),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = Ma.c.heroStart, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp))
        Text(text, color = Ma.c.heroStart, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
private fun TopFunds(funds: List<Fund>, actions: HomeActions) {
    Column {
        Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Top funds", color = Ma.c.text, style = MaterialTheme.typography.titleMedium)
                Text("By 5-year return", color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
            }
            TextButton(onClick = actions.openFunds) {
                Text("See all", color = Ma.c.accent, fontWeight = FontWeight.SemiBold); Spacer(Modifier.width(4.dp))
                Icon(Icons.AutoMirrored.Outlined.ArrowForward, null, tint = Ma.c.accent, modifier = Modifier.size(16.dp))
            }
        }
        VSpace(8.dp)
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(funds, key = { it.id }) { f -> FundCard(f, actions.openFunds) }
        }
    }
}

@Composable
private fun FundCard(f: Fund, onClick: () -> Unit) {
    val up = (f.r5 ?: 0.0) >= 0
    Column(
        Modifier.width(172.dp).clip(RoundedCornerShape(20.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(20.dp)).clickable(onClick = onClick).padding(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AmcLogo(f.amc, 32.dp); Spacer(Modifier.width(8.dp))
            Text(f.category, color = Ma.c.muted, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        VSpace(10.dp)
        Text(f.short, color = Ma.c.text, style = MaterialTheme.typography.titleMedium, maxLines = 2, minLines = 2, overflow = TextOverflow.Ellipsis)
        VSpace(6.dp)
        Text(pct(f.r5), color = if (up) Ma.c.up else Ma.c.down, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text("5Y return", color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
        VSpace(8.dp)
        Sparkline(f.spark, if (up) Ma.c.up else Ma.c.down, Modifier.fillMaxWidth().height(36.dp))
    }
}

@Composable
private fun Stats(d: HomeData, actions: HomeActions) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        MaCard(Modifier.weight(1f).clickable(onClick = actions.openFunds)) {
            Column {
                Icon(Icons.Outlined.Inventory2, null, tint = Ma.c.accent, modifier = Modifier.size(22.dp))
                VSpace(10.dp)
                Text("${d.fundsTracked}", color = Ma.c.text, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Text("Funds tracked", color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
            }
        }
        MaCard(Modifier.weight(1f).clickable(onClick = actions.openPlans)) {
            Column {
                Icon(Icons.Outlined.WorkspacePremium, null, tint = Ma.c.warn, modifier = Modifier.size(22.dp))
                VSpace(10.dp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(d.plan, color = Ma.c.text, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    if (d.plan == "Free") { Spacer(Modifier.width(8.dp)); Pill("UPGRADE", Ma.c.accent.copy(alpha = .15f), Ma.c.accent) }
                }
                Text("Your plan", color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
