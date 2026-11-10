package com.modalpha.app.ui.explore

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ShowChart
import androidx.compose.material.icons.automirrored.outlined.Sort
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.CompareArrows
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.StarOutline
import androidx.compose.material.icons.outlined.SwapHoriz
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.data.Fund
import com.modalpha.app.data.Insight
import com.modalpha.app.ui.LocalNav
import com.modalpha.app.ui.Route
import com.modalpha.app.ui.components.AmcLogo
import com.modalpha.app.ui.components.ChartSeries
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.GridChart
import com.modalpha.app.ui.components.MaCard
import com.modalpha.app.ui.components.Sparkline
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.components.inr
import com.modalpha.app.ui.components.inrShort
import com.modalpha.app.ui.kit.Caption
import com.modalpha.app.ui.kit.CardList
import com.modalpha.app.ui.kit.ChromeIcon
import com.modalpha.app.ui.kit.Chips
import com.modalpha.app.ui.kit.LoadBox
import com.modalpha.app.ui.kit.OutlineButton
import com.modalpha.app.ui.kit.Res
import com.modalpha.app.ui.kit.Screen
import com.modalpha.app.ui.kit.SectionTitle
import com.modalpha.app.ui.kit.Segmented
import com.modalpha.app.ui.kit.Tag
import com.modalpha.app.ui.kit.Tone
import com.modalpha.app.ui.kit.rememberLoad
import com.modalpha.app.ui.theme.Ma
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale

fun pct(v: Double?) = v?.let { (if (it >= 0) "+" else "") + "%.1f%%".format(it) } ?: "—"
private val dmy = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)
fun prettyDate(iso: String?) = runCatching { LocalDate.parse(iso!!.take(10)).format(dmy) }.getOrDefault(iso ?: "")
private fun riskShort(r: String?) = r?.replace("Very High", "V. high", true)?.replace(" risk", "", true) ?: "—"

/* ============================== Explore tab ============================== */

@Composable
fun ExploreTab(bottomPad: androidx.compose.ui.unit.Dp) {
    val nav = LocalNav.current
    val funds = rememberLoad { nav.repo.funds() }
    var q by rememberSaveable { mutableStateOf("") }
    var cat by rememberSaveable { mutableStateOf("All") }
    var sort by rememberSaveable { mutableStateOf("5Y") }
    var sortMenu by remember { mutableStateOf(false) }
    val cats = (funds.res as? Res.Ok)?.value?.map { it.category }?.distinct()?.sorted().orEmpty()
    Screen(
        "Explore",
        actions = {
            Box {
                ChromeIcon(Icons.AutoMirrored.Outlined.Sort, "Sort") { sortMenu = true }
                DropdownMenu(sortMenu, { sortMenu = false }) {
                    listOf("1Y", "3Y", "5Y", "Name").forEach { s -> DropdownMenuItem({ Text(if (s == "Name") "Name (A–Z)" else "$s return") }, { sort = s; sortMenu = false }) }
                }
            }
        },
        header = {
            SearchField(q, { q = it }, "Search funds, AMCs, categories", Modifier.padding(horizontal = 20.dp))
            VSpace(12.dp)
            Chips(listOf("All") + cats, cat, { cat = it }, dark = true)
        },
        bottomPad = bottomPad,
    ) {
        LoadBox(funds) { all ->
            val list = all.filter { (cat == "All" || it.category == cat) && (q.isBlank() || listOf(it.name, it.amc, it.category).any { s -> s.contains(q, true) }) }
                .let { l -> when (sort) { "1Y" -> l.sortedByDescending { it.r1 ?: -99.0 }; "3Y" -> l.sortedByDescending { it.r3 ?: -99.0 }; "Name" -> l.sortedBy { it.short }; else -> l.sortedByDescending { it.r5 ?: -99.0 } } }
            LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                item {
                    Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Tool("What if", Icons.AutoMirrored.Outlined.ShowChart, Color(0xFFDBEAFE), Color(0xFF1D4ED8), Modifier.weight(1f)) { nav.push(Route.WhatIf()) }
                        Tool("Compare", Icons.Outlined.CompareArrows, Color(0xFFEDE9FE), Color(0xFF6D28D9), Modifier.weight(1f)) { nav.push(Route.Compare()) }
                        Tool("Insights", Icons.Outlined.Lightbulb, Color(0xFFFEF3C7), Color(0xFFB45309), Modifier.weight(1f)) { nav.push(Route.Insights) }
                    }
                }
                item { SectionTitle("${list.size} funds", if (sort == "Name") "A–Z" else "$sort return ▾") { sortMenu = true } }
                item {
                    if (list.isEmpty()) Text("No funds match \"$q\".", Modifier.padding(20.dp), color = Ma.c.muted)
                    else CardList(rows = list.map { f -> { FundRow(f, sort) { nav.push(Route.Fund(f.id)) } } })
                }
            }
        }
    }
}

@Composable
private fun Tool(label: String, icon: ImageVector, bg: Color, fg: Color, modifier: Modifier, onClick: () -> Unit) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(12.dp)) {
        Box(Modifier.size(32.dp).clip(RoundedCornerShape(10.dp)).background(bg), contentAlignment = Alignment.Center) { Icon(icon, null, tint = fg, modifier = Modifier.size(18.dp)) }
        VSpace(8.dp); Text(label, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }
}

@Composable
fun FundRow(f: Fund, period: String = "5Y", onClick: () -> Unit) {
    val v = when (period) { "1Y" -> f.r1; "3Y" -> f.r3; else -> f.r5 }
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        AmcLogo(f.amc, 38.dp); Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(f.short, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(listOfNotNull(f.category, f.risk?.let { "${riskShort(it)} risk" }).joinToString(" · "), color = Ma.c.muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (f.spark.size > 1) Sparkline(f.spark, if ((v ?: 0.0) >= 0) Ma.c.up else Ma.c.down, Modifier.width(52.dp).height(22.dp))
        Spacer(Modifier.width(10.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(pct(v), color = if ((v ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontWeight = FontWeight.Bold, fontSize = 14.5.sp)
            Text(if (period == "Name") "5Y" else period, color = Ma.c.muted, fontSize = 11.5.sp)
        }
    }
}

@Composable
fun SearchField(value: String, onChange: (String) -> Unit, hint: String, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().height(46.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = .08f)).border(1.dp, Ma.c.chromeLine, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Search, null, tint = Ma.c.chromeMuted, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(10.dp))
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) Text(hint, color = Ma.c.chromeMuted, fontSize = 14.5.sp)
            BasicTextField(value, onChange, singleLine = true, textStyle = TextStyle(color = Ma.c.chromeText, fontSize = 14.5.sp), cursorBrush = SolidColor(Ma.c.hi), modifier = Modifier.fillMaxWidth())
        }
    }
}

/* ============================== Fund detail ============================== */

@Composable
fun FundScreen(id: String) {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val fund = rememberLoad(id) { nav.repo.fund(id) }
    var period by rememberSaveable { mutableStateOf("5Y") }
    val navPts = rememberLoad(id to period) { nav.repo.nav(id, period) }
    val cmp = rememberLoad(id) { nav.repo.sipCompare(id, 10000, "2021-01-01") }
    var watched by remember { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(id) { watched = runCatching { id in nav.repo.watchlist() }.getOrNull() ?: false }
    val f = (fund.res as? Res.Ok)?.value
    Screen(
        "",
        onBack = nav::pop,
        actions = {
            ChromeIcon(if (watched == true) Icons.Outlined.Star else Icons.Outlined.StarOutline, "Watchlist", tint = Ma.c.gold) {
                val on = watched != true; watched = on
                scope.launch { runCatching { nav.repo.setWatch(id, on) }.onSuccess { nav.toast(if (on) "Added to watchlist" else "Removed from watchlist"); nav.refreshHome() }.onFailure { watched = !on; nav.toast(it.message ?: "Couldn't update") } }
            }
        },
        header = {
            if (f != null) Column(Modifier.padding(horizontal = 20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AmcLogo(f.amc, 48.dp); Spacer(Modifier.width(12.dp))
                    Column {
                        Text(f.name, color = Ma.c.chromeText, fontSize = 19.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Text(listOfNotNull(f.category, f.amc).joinToString(" · "), color = Ma.c.chromeSub, fontSize = 12.5.sp)
                    }
                }
                VSpace(14.dp)
                Text("NAV${f.navDate?.let { " · " + prettyDate(it) } ?: ""}".uppercase(), color = Ma.c.chromeMuted, style = MaterialTheme.typography.labelSmall)
                Text(f.nav?.let { "₹%.2f".format(it) } ?: "—", color = Ma.c.chromeText, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
            }
        },
        bottom = {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlineButton(if (watched == true) "Watching" else "Watchlist", {
                    val on = watched != true; watched = on
                    scope.launch { runCatching { nav.repo.setWatch(id, on) }.onSuccess { nav.refreshHome() } }
                }, Modifier.weight(1f), icon = if (watched == true) Icons.Outlined.Star else Icons.Outlined.StarOutline)
                GradientButton("Remind me", { nav.remindMe(null) }, Modifier.weight(1.4f), leading = { Icon(Icons.Outlined.NotificationsActive, null, tint = Color.White, modifier = Modifier.size(18.dp)) })
            }
        },
    ) {
        LoadBox(fund) { fd ->
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 20.dp)) {
                MaCard(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp).fillMaxWidth()) {
                    Column {
                        val pts = (navPts.res as? Res.Ok)?.value.orEmpty()
                        val chg = if (pts.size > 1) (pts.last().value / pts.first().value - 1) * 100 else null
                        Row { Text("NAV growth", color = Ma.c.text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f)); Text(pct(chg), color = if ((chg ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontWeight = FontWeight.Bold) }
                        VSpace(10.dp)
                        if (pts.size > 1) GridChart(
                            listOf(ChartSeries(pts.map { it.value }, Ma.c.accent, fill = true)), yearLabels(pts.map { it.date }, period),
                            Modifier.fillMaxWidth().height(170.dp), yFormat = { "₹%.0f".format(it) },
                        ) else Box(Modifier.fillMaxWidth().height(170.dp), contentAlignment = Alignment.Center) { Text(if (navPts.res is Res.Err) "No NAV history" else "Loading…", color = Ma.c.muted) }
                        VSpace(10.dp)
                        PeriodTabs(listOf("1M", "6M", "1Y", "3Y", "5Y", "MAX"), period) { period = it }
                    }
                }
                Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).padding(vertical = 10.dp)) {
                    listOf("1Y" to fd.r1, "3Y" to fd.r3, "5Y" to fd.r5).forEach { (k, v) -> Stat(k, pct(v), if ((v ?: 0.0) >= 0) Ma.c.up else Ma.c.down, Modifier.weight(1f)) }
                    Stat("Risk", riskShort(fd.risk), Ma.c.down, Modifier.weight(1f))
                }
                Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Fact("AUM", fd.aum ?: "—", Modifier.weight(1f)); Fact("Expense ratio", fd.expense?.let { "%.2f%%".format(it) } ?: "—", Modifier.weight(1f))
                }
                if (fd.benchmark != null && fd.benchmark != "—") Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 10.dp)) { Fact("Benchmark", fd.benchmark, Modifier.fillMaxWidth()) }
                (cmp.res as? Res.Ok)?.value?.let { c ->
                    Row(
                        Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp))
                            .background(Brush.horizontalGradient(listOf(Ma.c.accent.copy(alpha = .08f), Ma.c.surface))).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.AutoAwesome, null, tint = Ma.c.accent, modifier = Modifier.size(22.dp)); Spacer(Modifier.width(12.dp))
                        Column {
                            Text("On Mod Alpha dates this fund made ${if (c.extra >= 0) "+" else "−"}${inr(kotlin.math.abs(c.extra))} more than a fixed-date SIP", color = Ma.c.text, fontSize = 13.5.sp)
                            Text("${inr(c.amount.toLong())}/month since ${c.since} · backtest", color = Ma.c.muted, fontSize = 11.5.sp)
                        }
                    }
                }
                Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlineButton("What if…", { nav.push(Route.WhatIf(id)) }, Modifier.weight(1f), icon = Icons.AutoMirrored.Outlined.ShowChart)
                    OutlineButton("Compare", { nav.push(Route.Compare(id)) }, Modifier.weight(1f), icon = Icons.Outlined.CompareArrows)
                }
            }
        }
    }
}

@Composable private fun Stat(k: String, v: String, color: Color, modifier: Modifier) = Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
    Text(k, color = Ma.c.muted, fontSize = 11.sp); Text(v, color = color, fontWeight = FontWeight.Bold, fontSize = 14.5.sp, maxLines = 1)
}
@Composable private fun Fact(k: String, v: String, modifier: Modifier) = Column(modifier.clip(RoundedCornerShape(14.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(14.dp)).padding(horizontal = 12.dp, vertical = 10.dp)) {
    Text(k, color = Ma.c.muted, fontSize = 11.5.sp); Text(v, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
}

@Composable
fun PeriodTabs(options: List<String>, selected: String, onSelect: (String) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        options.forEach { o ->
            val on = o == selected
            Box(Modifier.weight(1f).height(30.dp).clip(RoundedCornerShape(9.dp)).background(if (on) Ma.c.accent else Color.Transparent).clickable { onSelect(o) }, contentAlignment = Alignment.Center) {
                Text(if (o == "MAX") "Max" else o, color = if (on) Color.White else Ma.c.muted, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

/** 3–6 x labels from ISO dates: years for long periods, "Mon yy" for short ones. */
fun yearLabels(dates: List<String>, period: String = "5Y"): List<String> {
    if (dates.size < 2) return emptyList()
    val short = period in setOf("1M", "6M", "1Y")
    val idx = listOf(0, dates.size / 3, 2 * dates.size / 3, dates.size - 1)
    return idx.map { i -> val d = runCatching { LocalDate.parse(dates[i].take(10)) }.getOrNull() ?: return@map ""
        if (short) d.format(DateTimeFormatter.ofPattern(if (period == "1M") "d MMM" else "MMM yy", Locale.ENGLISH)) else d.year.toString() }
}

/* ============================== What if ============================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WhatIfScreen(startFund: String?) {
    val nav = LocalNav.current
    val funds = rememberLoad { nav.repo.funds() }
    var mode by rememberSaveable { mutableStateOf("Lump sum") }
    var fundId by rememberSaveable { mutableStateOf(startFund) }
    var amount by rememberSaveable { mutableStateOf("100000") }
    var date by rememberSaveable { mutableStateOf("2021-01-15") }
    var pick by remember { mutableStateOf(false) }
    var datePick by remember { mutableStateOf(false) }
    LaunchedEffect(funds.res) { if (fundId == null) fundId = (funds.res as? Res.Ok)?.value?.firstOrNull()?.id }
    LaunchedEffect(mode) { amount = if (mode == "Lump sum") "100000" else "10000" }
    val f = (funds.res as? Res.Ok)?.value?.find { it.id == fundId }
    val amt = amount.toIntOrNull()?.coerceIn(500, 100_000_000) ?: 0
    val result = rememberLoad(listOf(mode, fundId, amt, date)) {
        val id = fundId ?: return@rememberLoad null
        if (amt < 500) return@rememberLoad null
        if (mode == "Lump sum") {
            val r = nav.repo.lumpsum(id, date, amt)
            val pts = nav.repo.nav(id, "MAX").filter { it.date >= r.investedOn }
            WhatIfOut(r.value, r.gain, r.totalPct, r.cagrPct, r.invested, pts.map { it.value * amt / (pts.firstOrNull()?.value ?: 1.0) }, null, pts.map { it.date })
        } else {
            val c = nav.repo.sipCompare(id, amt, date, LocalDate.parse(date).dayOfMonth.coerceAtMost(28)) ?: throw Exception("Not enough NAV history for this date")
            val inv = c.points.mapIndexed { i, _ -> ((i + 1) * amt).toDouble() }
            WhatIfOut(c.fixedValue, c.fixedValue - c.invested, (c.fixedValue.toDouble() / c.invested - 1) * 100, null, c.invested, c.points.map { it.fixed.toDouble() }, inv, c.points.map { it.month + "-01" })
        }
    }
    Screen("What if…", onBack = nav::pop, header = { Segmented(listOf("Lump sum", "Monthly SIP"), mode, { mode = it }) }) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
            Field("Fund", Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp).clickable { pick = true }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    f?.let { AmcLogo(it.amc, 28.dp); Spacer(Modifier.width(10.dp)) }
                    Text(f?.short ?: "Choose a fund", color = Ma.c.text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f)); Icon(Icons.Outlined.SwapHoriz, null, tint = Ma.c.muted)
                }
            }
            Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Field(if (mode == "Lump sum") "Amount" else "Every month", Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("₹", color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        BasicTextField(amount, { amount = it.filter(Char::isDigit).take(9) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            textStyle = TextStyle(color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold), cursorBrush = SolidColor(Ma.c.accent))
                    }
                }
                Field(if (mode == "Lump sum") "Invested on" else "Starting", Modifier.weight(1f).clickable { datePick = true }) { Text(prettyDate(date), color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold) }
            }
            MaCard(Modifier.padding(start = 20.dp, end = 20.dp, top = 14.dp).fillMaxWidth()) {
                LoadBox(result) { r ->
                    if (r == null) Text("Enter an amount of at least ₹500.", color = Ma.c.muted) else Column {
                        Caption("It would be worth today")
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(inr(r.value), color = Ma.c.text, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold); Spacer(Modifier.width(10.dp))
                            Text(pct(r.pct), color = if (r.pct >= 0) Ma.c.up else Ma.c.down, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 6.dp))
                        }
                        Text("Invested ${inr(r.invested)} · gain ${inr(r.gain)}${r.cagr?.let { " · %.1f%% a year".format(it) } ?: ""}", color = Ma.c.muted, fontSize = 12.5.sp)
                        VSpace(12.dp)
                        if (r.series.size > 1) GridChart(
                            listOfNotNull(ChartSeries(r.series, Ma.c.accent, fill = true), r.invested2?.let { ChartSeries(it, Ma.c.muted, dashed = true) } ?: ChartSeries(List(r.series.size) { r.invested.toDouble() }, Ma.c.muted, dashed = true)),
                            yearLabels(r.dates), Modifier.fillMaxWidth().height(160.dp), yFormat = { inrShort(it) },
                        )
                    }
                }
            }
            Text("Based on real NAV history. Past returns don't guarantee future returns.", Modifier.padding(20.dp), color = Ma.c.muted, fontSize = 12.sp)
        }
    }
    if (pick) FundPicker((funds.res as? Res.Ok)?.value.orEmpty(), { fundId = it; pick = false }, { pick = false })
    if (datePick) {
        val st = rememberDatePickerState(initialSelectedDateMillis = LocalDate.parse(date).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog({ datePick = false }, confirmButton = {
            TextButton({ st.selectedDateMillis?.let { date = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().coerceAtMost(LocalDate.now().minusMonths(1)).toString() }; datePick = false }) { Text("OK") }
        }, dismissButton = { TextButton({ datePick = false }) { Text("Cancel") } }) { DatePicker(st) }
    }
}

private class WhatIfOut(val value: Long, val gain: Long, val pct: Double, val cagr: Double?, val invested: Long, val series: List<Double>, val invested2: List<Double>?, val dates: List<String>)

@Composable
private fun Field(label: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp, vertical = 10.dp)) {
        Text(label, color = Ma.c.muted, fontSize = 11.5.sp); VSpace(4.dp); content()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FundPicker(funds: List<Fund>, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    var q by remember { mutableStateOf("") }
    ModalBottomSheet(onDismiss, containerColor = Ma.c.bg) {
        Text("Choose a fund", Modifier.padding(horizontal = 20.dp), color = Ma.c.text, style = MaterialTheme.typography.titleLarge)
        VSpace(10.dp)
        Box(Modifier.padding(horizontal = 20.dp).fillMaxWidth().height(46.dp).clip(RoundedCornerShape(12.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(12.dp)).padding(horizontal = 14.dp), contentAlignment = Alignment.CenterStart) {
            if (q.isEmpty()) Text("Search", color = Ma.c.muted)
            BasicTextField(q, { q = it }, singleLine = true, textStyle = TextStyle(color = Ma.c.text, fontSize = 15.sp), modifier = Modifier.fillMaxWidth())
        }
        LazyColumn(Modifier.fillMaxWidth().height(460.dp), contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp)) {
            items(funds.filter { q.isBlank() || it.name.contains(q, true) || it.amc.contains(q, true) }, key = { it.id }) { f ->
                FundRow(f) { onPick(f.id) }; HorizontalDivider(color = Ma.c.line)
            }
        }
    }
}

/* ============================== Compare ============================== */

@Composable
fun CompareScreen(a0: String?, b0: String?) {
    val nav = LocalNav.current
    val funds = rememberLoad { nav.repo.funds() }
    var a by rememberSaveable { mutableStateOf(a0) }
    var b by rememberSaveable { mutableStateOf(b0) }
    var picking by remember { mutableStateOf<Int?>(null) }
    val all = (funds.res as? Res.Ok)?.value.orEmpty()
    LaunchedEffect(all) { if (all.isNotEmpty()) { if (a == null) a = all[0].id; if (b == null || b == a) b = all.firstOrNull { it.id != a }?.id } }
    val fa = all.find { it.id == a }; val fb = all.find { it.id == b }
    val series = rememberLoad(a to b) {
        val x = a ?: return@rememberLoad null; val y = b ?: return@rememberLoad null
        nav.repo.nav(x, "5Y") to nav.repo.nav(y, "5Y")
    }
    val colA = Ma.c.accent; val colB = Color(0xFF0D9488)
    Screen("Compare", onBack = nav::pop, header = {
        Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            Pick(fa, Modifier.weight(1f)) { picking = 0 }
            Text("vs", Modifier.padding(horizontal = 10.dp), color = Ma.c.chromeMuted, fontWeight = FontWeight.Bold)
            Pick(fb, Modifier.weight(1f)) { picking = 1 }
        }
    }) {
        LoadBox(funds) { _ ->
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
                MaCard(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp).fillMaxWidth()) {
                    Column {
                        Text("Growth of ₹100 · 5 years", color = Ma.c.text, fontWeight = FontWeight.SemiBold); VSpace(10.dp)
                        val s = (series.res as? Res.Ok)?.value
                        if (s != null && s.first.size > 1 && s.second.size > 1) {
                            val n = minOf(s.first.size, s.second.size)
                            val p = s.first.takeLast(n); val q = s.second.takeLast(n)
                            GridChart(listOf(ChartSeries(p.map { it.value / p[0].value * 100 }, colA), ChartSeries(q.map { it.value / q[0].value * 100 }, colB)),
                                yearLabels(p.map { it.date }), Modifier.fillMaxWidth().height(160.dp), yFormat = { "₹%.0f".format(it) })
                        } else Box(Modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) { Text("Loading…", color = Ma.c.muted) }
                        VSpace(8.dp)
                        Row { Legend(colA, fa?.short ?: ""); Spacer(Modifier.width(14.dp)); Legend(colB, fb?.short ?: "") }
                    }
                }
                if (fa != null && fb != null) {
                    val rows = listOf(
                        Triple("1Y return", fa.r1, fb.r1) to true, Triple("3Y return", fa.r3, fb.r3) to true, Triple("5Y return", fa.r5, fb.r5) to true,
                        Triple("Volatility", fa.vol, fb.vol) to false, Triple("Expense", fa.expense, fb.expense) to false,
                    )
                    Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(20.dp))) {
                        Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                            Spacer(Modifier.weight(1.1f)); Text(fa.short, Modifier.weight(1f), color = Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(fb.short, Modifier.weight(1f), color = Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        rows.forEach { (t, higherBetter) ->
                            val (k, x, y) = t
                            val winA = x != null && y != null && (if (higherBetter) x > y else x < y); val winB = x != null && y != null && (if (higherBetter) y > x else y < x)
                            val fmt: (Double?) -> String = { v -> if (k.endsWith("return")) pct(v) else v?.let { "%.2f%%".format(it) } ?: "—" }
                            HorizontalDivider(color = Ma.c.line)
                            Row(Modifier.padding(horizontal = 14.dp, vertical = 11.dp)) {
                                Text(k, Modifier.weight(1.1f), color = Ma.c.muted, fontSize = 13.5.sp)
                                Text(fmt(x), Modifier.weight(1f), color = if (winA) Ma.c.up else Ma.c.text, fontWeight = if (winA) FontWeight.Bold else FontWeight.Normal, fontSize = 13.5.sp)
                                Text(fmt(y), Modifier.weight(1f), color = if (winB) Ma.c.up else Ma.c.text, fontWeight = if (winB) FontWeight.Bold else FontWeight.Normal, fontSize = 13.5.sp)
                            }
                        }
                    }
                    Text("Green = better on that measure (higher return, lower volatility and cost).", Modifier.padding(20.dp), color = Ma.c.muted, fontSize = 12.sp)
                }
            }
        }
    }
    picking?.let { w -> FundPicker(all, { if (w == 0) a = it else b = it; picking = null }, { picking = null }) }
}

@Composable private fun Pick(f: Fund?, modifier: Modifier, onClick: () -> Unit) {
    Row(modifier.clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = .08f)).border(1.dp, Ma.c.chromeLine, RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
        if (f != null) { AmcLogo(f.amc, 28.dp); Spacer(Modifier.width(8.dp)) }
        Text(f?.short ?: "Choose", color = Ma.c.chromeText, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}
@Composable private fun Legend(c: Color, t: String) = Row(verticalAlignment = Alignment.CenterVertically) {
    Box(Modifier.width(12.dp).height(3.dp).clip(CircleShape).background(c)); Spacer(Modifier.width(6.dp)); Text(t, color = Ma.c.sub, fontSize = 12.sp, maxLines = 1)
}

/* ============================== Insights ============================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InsightsScreen() {
    val nav = LocalNav.current
    val ctx = LocalContext.current
    val items = rememberLoad { nav.repo.insights() }
    var tab by rememberSaveable { mutableStateOf("All") }
    var open by remember { mutableStateOf<Insight?>(null) }
    Screen("Insights", onBack = nav::pop, header = { Chips(listOf("All", "Reels", "Articles"), tab, { tab = it }, dark = true) }) {
        LoadBox(items) { list ->
            val reels = list.filter { it.kind == "instagram" }; val text = list.filter { it.kind != "instagram" }
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
                if (tab != "Articles" && reels.isNotEmpty()) {
                    SectionTitle("Reels")
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        reels.forEachIndexed { i, r ->
                            val g = listOf(listOf(Color(0xFF1E3A8A), Color(0xFF5B21B6)), listOf(Color(0xFF0F766E), Color(0xFF1E3A8A)), listOf(Color(0xFF9A3412), Color(0xFF7C2D12)))[i % 3]
                            Box(Modifier.width(124.dp).height(210.dp).clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(g))
                                .clickable { r.url?.let { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it))) } }.padding(10.dp)) {
                                Box(Modifier.align(Alignment.TopEnd).size(30.dp).clip(CircleShape).background(Color.White.copy(alpha = .22f)), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.PlayArrow, "Play", tint = Color.White, modifier = Modifier.size(18.dp)) }
                                Column(Modifier.align(Alignment.BottomStart)) {
                                    Text(r.title, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                                    Text(prettyDate(r.publishedAt), color = Color.White.copy(alpha = .75f), fontSize = 10.5.sp)
                                }
                            }
                        }
                    }
                }
                if (tab != "Reels" && text.isNotEmpty()) {
                    SectionTitle("Read")
                    CardList(rows = text.mapIndexed { i, t -> {
                        Row(Modifier.fillMaxWidth().clickable { open = t }.padding(vertical = 12.dp)) {
                            val c = listOf(Color(0xFF1E3A8A), Color(0xFF0F766E), Color(0xFFB45309))[i % 3]
                            Box(Modifier.size(60.dp).clip(RoundedCornerShape(12.dp)).background(c), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Lightbulb, null, tint = Color.White, modifier = Modifier.size(26.dp)) }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Tag(listOf("SIP timing", "Basics", "Explainer")[i % 3], listOf(Tone.Blue, Tone.Green, Tone.Amber)[i % 3]); VSpace(5.dp)
                                Text(t.title, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.5.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Text("${(t.body.length / 900).coerceAtLeast(1)} min read · ${prettyDate(t.publishedAt)}", color = Ma.c.muted, fontSize = 12.sp)
                            }
                        }
                    } })
                }
                if (list.isEmpty()) Text("No insights yet.", Modifier.padding(20.dp), color = Ma.c.muted)
            }
        }
    }
    open?.let { t ->
        ModalBottomSheet({ open = null }, containerColor = Ma.c.surface) {
            Column(Modifier.padding(start = 20.dp, end = 20.dp, bottom = 32.dp).verticalScroll(rememberScrollState())) {
                Text(t.title, color = Ma.c.text, style = MaterialTheme.typography.titleLarge); VSpace(6.dp)
                Text(prettyDate(t.publishedAt), color = Ma.c.muted, fontSize = 12.sp); VSpace(14.dp)
                Text(t.body, color = Ma.c.sub, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}
