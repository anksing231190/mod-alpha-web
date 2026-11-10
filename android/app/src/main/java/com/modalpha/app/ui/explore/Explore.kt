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
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.ui.text.style.TextAlign
import com.modalpha.app.data.Analytics
import com.modalpha.app.ui.components.*
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

/** Colour for an average 5Y return: greens for the best, blues / indigo for the rest. */
private fun heat(v: Double, max: Double): List<Color> {
    val t = (v / max.coerceAtLeast(1.0)).coerceIn(0.0, 1.0)
    // one hue, strength by return: subtle tint on the dark header
    val tint = androidx.compose.ui.graphics.lerp(Color.White, Color(0xFFBFE6D3), t.toFloat())
    return listOf(tint, androidx.compose.ui.graphics.lerp(tint, Color.White, .4f))
}

@Composable
fun ExploreTab(bottomPad: androidx.compose.ui.unit.Dp) {
    val nav = LocalNav.current
    val funds = rememberLoad { nav.repo.funds() }
    var q by rememberSaveable { mutableStateOf("") }
    var cat by rememberSaveable { mutableStateOf("All") }
    var sort by rememberSaveable { mutableStateOf("5Y") }
    var sortMenu by remember { mutableStateOf(false) }
    val all = (funds.res as? Res.Ok)?.value.orEmpty()
    // categories: number of funds and average 5Y return (the heat map)
    val cats = all.groupBy { it.category }.map { (k, l) -> Triple(k, l.size, l.mapNotNull { it.r5 }.average().takeIf { !it.isNaN() } ?: 0.0) }.sortedByDescending { it.second }
    val maxCat = cats.maxOfOrNull { it.third } ?: 1.0
    Column(Modifier.fillMaxSize().background(Ma.c.bg)) {
        com.modalpha.app.ui.components.MeshHero {
            Row(Modifier.fillMaxWidth().padding(start = 18.dp, end = 12.dp, top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Explore", color = Ma.c.chromeText, fontSize = 24.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                com.modalpha.app.ui.components.GhostChip("${all.size} funds"); Spacer(Modifier.width(8.dp))
                Box {
                    ChromeIcon(Icons.AutoMirrored.Outlined.Sort, "Sort") { sortMenu = true }
                    DropdownMenu(sortMenu, { sortMenu = false }) { listOf("1Y", "3Y", "5Y", "Name").forEach { o -> DropdownMenuItem({ Text(if (o == "Name") "Name (A–Z)" else "$o return") }, { sort = o; sortMenu = false }) } }
                }
            }
            SearchField(q, { q = it }, "Search funds, AMCs, categories", Modifier.padding(start = 18.dp, end = 18.dp, top = 12.dp))
            if (cats.isNotEmpty()) {
                Text("CATEGORIES · AVG 5Y RETURN · tap to filter", Modifier.padding(start = 18.dp, top = 14.dp, bottom = 8.dp), color = Ma.c.chromeMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.2.sp)
                // heat map: biggest category tall on the left, the rest in a 2-row grid
                Row(Modifier.padding(horizontal = 18.dp).height(138.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    HeatTile(cats[0], maxCat, cat == cats[0].first, Modifier.weight(1.3f).fillMaxSize(), big = true) { cat = if (cat == it) "All" else it }
                    val rest = cats.drop(1).take(4)
                    if (rest.isNotEmpty()) Column(Modifier.weight(2f).fillMaxSize(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        rest.chunked(2).forEach { row -> Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            row.forEach { c -> HeatTile(c, maxCat, cat == c.first, Modifier.weight(1f).fillMaxSize()) { cat = if (cat == it) "All" else it } }
                            if (row.size == 1) Spacer(Modifier.weight(1f))
                        } }
                    }
                }
            }
        }
        LoadBox(funds) { _ ->
            val list = all.filter { (cat == "All" || it.category == cat) && (q.isBlank() || listOf(it.name, it.amc, it.category).any { s -> s.contains(q, true) }) }
                .let { l -> when (sort) { "1Y" -> l.sortedByDescending { it.r1 ?: -99.0 }; "3Y" -> l.sortedByDescending { it.r3 ?: -99.0 }; "Name" -> l.sortedBy { it.short }; else -> l.sortedByDescending { it.r5 ?: -99.0 } } }
            val maxRet = list.maxOfOrNull { (if (sort == "1Y") it.r1 else if (sort == "3Y") it.r3 else it.r5) ?: 0.0 } ?: 1.0
            LazyColumn(contentPadding = PaddingValues(bottom = bottomPad + 16.dp)) {
                if (q.isBlank() && cat == "All") item {
                    SectionTitle("Top movers · 1Y")
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 18.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        all.sortedByDescending { it.r1 ?: -99.0 }.take(3).forEachIndexed { i, f ->
                            Column(Modifier.width(140.dp).clip(RoundedCornerShape(18.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(18.dp)).clickable { nav.push(Route.Fund(f.id)) }.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) { AmcLogo(f.amc, 20.dp); Spacer(Modifier.width(6.dp)); Text(f.short, color = Ma.c.sub, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                                Text(pct(f.r1), color = if ((f.r1 ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(vertical = 4.dp))
                                if (f.spark.size > 1) Sparkline(f.spark, Ma.c.up, Modifier.fillMaxWidth().height(28.dp))
                            }
                        }
                    }
                    Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Tool("What if", Icons.AutoMirrored.Outlined.ShowChart, Color(0xFFDBEAFE), Color(0xFF1D4ED8), Modifier.weight(1f)) { nav.push(Route.WhatIf()) }
                        Tool("Compare", Icons.Outlined.CompareArrows, Color(0xFFEDE9FE), Color(0xFF6D28D9), Modifier.weight(1f)) { nav.push(Route.Compare()) }
                        Tool("Insights", Icons.Outlined.Lightbulb, Color(0xFFFEF3C7), Color(0xFFB45309), Modifier.weight(1f)) { nav.push(Route.Insights) }
                    }
                }
                item { SectionTitle(if (cat == "All") "All funds" else "$cat · ${list.size}", if (sort == "Name") "A–Z" else "$sort return ▾") { sortMenu = true } }
                item {
                    if (list.isEmpty()) Text("No funds match \"$q\".", Modifier.padding(20.dp), color = Ma.c.muted)
                    else CardList(rows = list.map { f -> { FundRow(f, sort, maxRet) { nav.push(Route.Fund(f.id)) } } })
                }
            }
        }
    }
}

@Composable
private fun HeatTile(c: Triple<String, Int, Double>, max: Double, on: Boolean, modifier: Modifier, big: Boolean = false, onClick: (String) -> Unit) {
    Column(
        modifier.clip(RoundedCornerShape(14.dp)).background(Brush.linearGradient(heat(c.third, max))).border(if (on) 2.dp else 1.dp, if (on) Ma.c.accent else Color(0x1A0D1730), RoundedCornerShape(14.dp))
            .clickable { onClick(c.first) }.padding(horizontal = 10.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.SpaceBetween,
    ) {
        Text("${c.first} · ${c.second}", color = Color(0xFF475569), fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Column {
            Text("%.1f%%".format(c.third), color = Color(0xFF0F172A), fontSize = if (big) 24.sp else 17.sp, fontWeight = FontWeight.Black)
            if (big && c.third >= max - .01) Text("▲ best category", color = Color(0xFF047857), fontSize = 10.5.sp)
        }
    }
}

@Composable
private fun Tool(label: String, icon: ImageVector, bg: Color, fg: Color, modifier: Modifier, onClick: () -> Unit) {
    Row(modifier.clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(30.dp).clip(RoundedCornerShape(10.dp)).background(bg), contentAlignment = Alignment.Center) { Icon(icon, null, tint = fg, modifier = Modifier.size(17.dp)) }
        Spacer(Modifier.width(8.dp)); Text(label, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp, maxLines = 1)
    }
}

/** Fund row: logo, name, a return bar (relative to the best in the list), risk meter, return. */
@Composable
fun FundRow(f: Fund, period: String = "5Y", maxRet: Double = 40.0, onClick: () -> Unit) {
    val v = when (period) { "1Y" -> f.r1; "3Y" -> f.r3; else -> f.r5 }
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
        AmcLogo(f.amc, 38.dp); Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(f.short, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Box(Modifier.padding(top = 6.dp).fillMaxWidth().height(6.dp).clip(CircleShape).background(Ma.c.surface2)) {
                Box(Modifier.fillMaxWidth(((v ?: 0.0) / maxRet.coerceAtLeast(1.0)).toFloat().coerceIn(.03f, 1f)).height(6.dp).clip(CircleShape)
                    .background(Brush.horizontalGradient(if ((v ?: 0.0) >= 0) listOf(Color(0xFF34D399), Color(0xFF059669)) else listOf(Color(0xFFF87171), Color(0xFFDC2626)))))
            }
            Row(Modifier.padding(top = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                (1..5).forEach { k -> Box(Modifier.padding(end = 2.dp).width(10.dp).height(4.dp).clip(CircleShape).background(if (k <= f.riskLevel) Color(0xFFF97316) else Ma.c.line)) }
                Text("  ${f.category}", color = Ma.c.muted, fontSize = 11.sp, maxLines = 1)
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(pct(v).removePrefix("+"), color = if ((v ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontWeight = FontWeight.Black, fontSize = 15.sp)
            Text(if (period == "Name") "5Y" else period, color = Ma.c.muted, fontSize = 11.sp)
        }
    }
}

@Composable
fun SearchField(value: String, onChange: (String) -> Unit, hint: String, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().height(46.dp).clip(RoundedCornerShape(14.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.Search, null, tint = Ma.c.muted, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(10.dp))
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) Text(hint, color = Ma.c.muted, fontSize = 14.5.sp)
            BasicTextField(value, onChange, singleLine = true, textStyle = TextStyle(color = Ma.c.text, fontSize = 14.5.sp), cursorBrush = SolidColor(Ma.c.accent), modifier = Modifier.fillMaxWidth())
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
    val pts = (navPts.res as? Res.Ok)?.value.orEmpty()
    val chg = if (pts.size > 1) (pts.last().value / pts.first().value - 1) * 100 else null
    Screen(
        "",
        onBack = nav::pop,
        actions = {
            ChromeIcon(if (watched == true) Icons.Outlined.Star else Icons.Outlined.StarOutline, "Watchlist", tint = Gold) {
                val on = watched != true; watched = on
                scope.launch { runCatching { nav.repo.setWatch(id, on) }.onSuccess { nav.toast(if (on) "Added to watchlist" else "Removed from watchlist"); nav.refreshHome() }.onFailure { watched = !on; nav.toast(it.message ?: "Couldn't update") } }
            }
        },
        header = {
            if (f != null) Column(Modifier.padding(horizontal = 20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AmcLogo(f.amc, 44.dp); HSpace(12.dp)
                    Column {
                        Text(f.name, color = Ma.c.chromeText, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 22.sp)
                        Text(listOfNotNull(f.category, f.amc).joinToString(" · "), color = Ma.c.chromeSub, fontSize = 12.sp, maxLines = 1)
                    }
                }
                VSpace(12.dp)
                Row(verticalAlignment = Alignment.Bottom) {
                    Column(Modifier.weight(1f)) {
                        Text("NAV${f.navDate?.let { " · " + prettyDate(it) } ?: ""}".uppercase(), color = Ma.c.chromeMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        Text(f.nav?.let { "₹%.2f".format(it) } ?: "—", color = Ma.c.chromeText, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                    }
                    if (chg != null) Box(Modifier.padding(bottom = 6.dp)) { UpChip("%.1f%% · %s".format(kotlin.math.abs(chg), if (period == "MAX") "max" else period), up = chg >= 0) }
                }
                VSpace(8.dp)
                GlassCard(Modifier.fillMaxWidth()) { Column {
                    if (pts.size > 1) GridChart(
                        listOf(ChartSeries(pts.map { it.value }, Ma.c.accent, fill = true)), yearLabels(pts.map { it.date }, period),
                        Modifier.fillMaxWidth().height(140.dp), yFormat = { "₹%.0f".format(it) }, showY = false,
                    ) else Box(Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) { Text(if (navPts.res is Res.Err) "No NAV history" else "Loading…", color = Ma.c.muted) }
                    VSpace(8.dp)
                    GlassPills(listOf("1M", "6M", "1Y", "3Y", "5Y", "MAX"), period) { period = it }
                } }
            }
        },
        bottom = {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlineButton("What if…", { nav.push(Route.WhatIf(id)) }, Modifier.weight(1f), icon = Icons.AutoMirrored.Outlined.ShowChart)
                GradientButton("Remind me", { nav.remindMe(null) }, Modifier.weight(1.3f), leading = { Icon(Icons.Outlined.NotificationsActive, null, tint = Color.White, modifier = Modifier.size(18.dp)) })
            }
        },
    ) {
        LoadBox(fund) { fd ->
            Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(top = 14.dp, bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Return rings
                MaCard(Modifier.fillMaxWidth()) {
                    Column {
                        Text("Returns a year", color = Ma.c.text, fontWeight = FontWeight.SemiBold)
                        VSpace(12.dp)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                            listOf("1Y" to fd.r1, "3Y" to fd.r3, "5Y" to fd.r5).forEach { (k, v) ->
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    val up = (v ?: 0.0) >= 0
                                    Ring(((kotlin.math.abs(v ?: 0.0)) / 40.0).toFloat(), 74.dp, 8.dp, if (up) listOf(SoftGood, SoftGood) else listOf(Color(0xFFF87171), Color(0xFFEF4444)), track = Ma.c.line) {
                                        Text(pct(v), color = if (up) Ma.c.up else Ma.c.down, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
                                    }
                                    VSpace(6.dp); Text(k, color = Ma.c.muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    }
                }
                // Riskometer + facts
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MaCard(Modifier.weight(1f)) {
                        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Risk", color = Ma.c.muted, fontSize = 11.5.sp, modifier = Modifier.fillMaxWidth())
                            VSpace(8.dp)
                            Riskometer(fd.riskLevel, Modifier.size(104.dp, 58.dp))
                            VSpace(6.dp)
                            Text(fd.risk ?: "—", color = Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            fd.vol?.let { Text("Swings %.1f%% a year".format(it), color = Ma.c.muted, fontSize = 11.sp) }
                        }
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Fact("Fund size (AUM)", fd.aum ?: "—", Modifier.fillMaxWidth())
                        Fact("Expense ratio", fd.expense?.let { "%.2f%%".format(it) } ?: "—", Modifier.fillMaxWidth())
                        Fact("Sharpe ratio", fd.sharpe?.let { "%.2f".format(it) } ?: "—", Modifier.fillMaxWidth())
                    }
                }
                // Mod Alpha edge
                (cmp.res as? Res.Ok)?.value?.let { c ->
                    val top = maxOf(c.modAlphaValue, c.fixedValue).toFloat().coerceAtLeast(1f)
                    GlassCard(Modifier.fillMaxWidth(), gold = true) { Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.AutoAwesome, null, tint = goldInk(), modifier = Modifier.size(18.dp)); HSpace(8.dp)
                            Text("Mod Alpha edge", color = Ma.c.chromeText, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            GhostChip("${inr(c.amount.toLong())}/mo since ${c.since}")
                        }
                        VSpace(12.dp)
                        Text("${if (c.extra >= 0) "+" else "−"}${inr(kotlin.math.abs(c.extra))}", color = goldInk(), fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                        Text("more than a SIP on the ${ordinal(c.fixedDay)} every month", color = Ma.c.chromeSub, fontSize = 12.5.sp)
                        VSpace(12.dp)
                        DarkBar("Mod Alpha dates · ${inr(c.modAlphaValue)}", c.modAlphaValue / top, SolidColor(Color(0xFFD9A441)))
                        VSpace(8.dp)
                        DarkBar("Fixed date · ${inr(c.fixedValue)}", c.fixedValue / top, SolidColor(Ma.c.muted.copy(alpha = .45f)))
                        VSpace(8.dp)
                        Text("Invested ${inr(c.invested)} · backtest on real NAVs", color = Ma.c.chromeMuted, fontSize = 11.sp)
                    } }
                }
                if (fd.benchmark != null && fd.benchmark != "—") Fact("Benchmark", fd.benchmark, Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlineButton(if (watched == true) "Watching" else "Watchlist", {
                        val on = watched != true; watched = on
                        scope.launch { runCatching { nav.repo.setWatch(id, on) }.onSuccess { nav.refreshHome() } }
                    }, Modifier.weight(1f), icon = if (watched == true) Icons.Outlined.Star else Icons.Outlined.StarOutline)
                    OutlineButton("Compare", { nav.push(Route.Compare(id)) }, Modifier.weight(1f), icon = Icons.Outlined.CompareArrows)
                }
            }
        }
    }
}

private fun ordinal(d: Int) = "$d" + if (d in 11..13) "th" else when (d % 10) { 1 -> "st"; 2 -> "nd"; 3 -> "rd"; else -> "th" }

@Composable private fun DarkBar(label: String, frac: Float, brush: Brush) {
    Column(Modifier.fillMaxWidth()) {
        Text(label, color = Ma.c.chromeSub, fontSize = 11.5.sp, maxLines = 1)
        Box(Modifier.padding(top = 4.dp).fillMaxWidth().height(10.dp).clip(CircleShape).background(if (LocalOnLight.current) Ma.c.line else Color.White.copy(alpha = .08f))) {
            Box(Modifier.fillMaxWidth(frac.coerceIn(.03f, 1f)).height(10.dp).clip(CircleShape).background(brush))
        }
    }
}

/** Period pills on a dark header. */
@Composable
fun GlassPills(options: List<String>, selected: String, onSelect: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Ma.c.surface2).border(1.dp, Ma.c.line, RoundedCornerShape(12.dp)).padding(3.dp)) {
        options.forEach { o ->
            val on = o == selected
            Box(Modifier.weight(1f).height(28.dp).clip(RoundedCornerShape(9.dp)).background(if (on) Ma.c.accent else Color.Transparent).clickable { onSelect(o) }, contentAlignment = Alignment.Center) {
                Text(if (o == "MAX") "Max" else o, color = if (on) Color.White else Ma.c.sub, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
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
        val all = nav.repo.nav(id, "MAX")
        val since = all.filter { it.date >= date }
        val years = Analytics.yearReturns(since).takeLast(8)
        val yrs = runCatching { java.time.temporal.ChronoUnit.DAYS.between(LocalDate.parse(date), LocalDate.now()) / 365.25 }.getOrDefault(1.0)
        if (mode == "Lump sum") {
            val r = nav.repo.lumpsum(id, date, amt)
            val pts = since.filter { it.date >= r.investedOn }
            WhatIfOut(r.value, r.gain, r.totalPct, r.cagrPct, r.invested, pts.map { it.value * amt / (pts.firstOrNull()?.value ?: 1.0) }, null, pts.map { it.date },
                null, Analytics.fixedRate(r.invested, yrs, 7.0), years)
        } else {
            val c = nav.repo.sipCompare(id, amt, date, LocalDate.parse(date).dayOfMonth.coerceAtMost(28)) ?: throw Exception("Not enough NAV history for this date")
            val n = c.points.size
            val inv = c.points.mapIndexed { i, _ -> ((i + 1) * amt).toDouble() }
            val fd = (0 until n).sumOf { i -> Analytics.fixedRate(amt.toLong(), (n - i) / 12.0, 7.0) }
            WhatIfOut(c.fixedValue, c.fixedValue - c.invested, (c.fixedValue.toDouble() / c.invested - 1) * 100, null, c.invested, c.points.map { it.fixed.toDouble() }, inv, c.points.map { it.month + "-01" },
                c.modAlphaValue, fd, years)
        }
    }
    val r = (result.res as? Res.Ok)?.value
    val yearsAgo = runCatching { (LocalDate.now().year - LocalDate.parse(date).year).coerceIn(1, 10) }.getOrDefault(5)
    Screen("What if…", onBack = nav::pop, header = {
        Column(Modifier.padding(horizontal = 20.dp)) {
            Segmented(listOf("Lump sum", "Monthly SIP"), mode, { mode = it })
            VSpace(14.dp)
            Text(if (mode == "Lump sum") "${inr(amt.toLong())} in ${f?.short ?: "…"} on ${prettyDate(date)}" else "${inr(amt.toLong())} a month in ${f?.short ?: "…"} since ${prettyDate(date)}",
                color = Ma.c.chromeSub, fontSize = 12.5.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.Bottom) {
                Text(r?.let { inr(it.value) } ?: if (result.res is Res.Loading) "…" else "—", color = Ma.c.chromeText, fontSize = 32.sp, fontWeight = FontWeight.ExtraBold)
                HSpace(10.dp)
                if (r != null) Box(Modifier.padding(bottom = 7.dp)) { UpChip("%.1f%%".format(kotlin.math.abs(r.pct)), up = r.pct >= 0) }
            }
            if (r != null) Text("Invested ${inr(r.invested)} · gain ${inr(r.gain)}${r.cagr?.let { " · %.1f%% a year".format(it) } ?: ""}", color = Ma.c.chromeMuted, fontSize = 12.sp)
            VSpace(8.dp)
            GlassCard(Modifier.fillMaxWidth()) { Column {
            if (r != null && r.series.size > 1) GridChart(
                listOfNotNull(ChartSeries(r.series, Ma.c.accent, fill = true), ChartSeries(r.invested2 ?: List(r.series.size) { r.invested.toDouble() }, Ma.c.muted, dashed = true)),
                yearLabels(r.dates), Modifier.fillMaxWidth().height(130.dp), yFormat = { inrShort(it) }, showY = false,
            ) else Box(Modifier.fillMaxWidth().height(130.dp), contentAlignment = Alignment.Center) {
                Text(when (val s = result.res) { is Res.Err -> s.message; Res.Loading -> "Working it out…"; else -> "Enter an amount of at least ₹500." }, color = Ma.c.chromeMuted, fontSize = 12.5.sp)
            }
            VSpace(6.dp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("$yearsAgo yr${if (yearsAgo > 1) "s" else ""} ago", color = Ma.c.chromeSub, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(62.dp))
                Slider(
                    value = yearsAgo.toFloat(), onValueChange = { v -> date = LocalDate.now().minusYears(v.toLong()).withDayOfMonth(15).toString() },
                    valueRange = 1f..10f, steps = 8, modifier = Modifier.weight(1f),
                    colors = SliderDefaults.colors(thumbColor = Ma.c.accent, activeTrackColor = Ma.c.accent, inactiveTrackColor = Ma.c.line, activeTickColor = Color.Transparent, inactiveTickColor = Color.Transparent),
                )
            }
            } }
        }
    }) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(top = 14.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Field("Fund", Modifier.clickable { pick = true }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    f?.let { AmcLogo(it.amc, 28.dp); HSpace(10.dp) }
                    Text(f?.short ?: "Choose a fund", color = Ma.c.text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f)); Icon(Icons.Outlined.SwapHoriz, null, tint = Ma.c.muted)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Field(if (mode == "Lump sum") "Amount" else "Every month", Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("₹", color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        BasicTextField(amount, { amount = it.filter(Char::isDigit).take(9) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            textStyle = TextStyle(color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold), cursorBrush = SolidColor(Ma.c.accent))
                    }
                }
                Field(if (mode == "Lump sum") "Invested on" else "Starting", Modifier.weight(1f).clickable { datePick = true }) { Text(prettyDate(date), color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold) }
            }
            if (r != null) {
                // Mod Alpha edge (SIP) — what buying on the best date each month would have made
                r.modAlpha?.let { ma ->
                    val extra = ma - r.value
                    val top = maxOf(ma, r.value).toFloat().coerceAtLeast(1f)
                    GlassCard(Modifier.fillMaxWidth(), gold = true) { Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.AutoAwesome, null, tint = goldInk(), modifier = Modifier.size(18.dp)); HSpace(8.dp)
                            Text("With Mod Alpha dates", color = Ma.c.chromeText, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text("${if (extra >= 0) "+" else "−"}${inr(kotlin.math.abs(extra))}", color = goldInk(), fontWeight = FontWeight.ExtraBold)
                        }
                        VSpace(10.dp)
                        DarkBar("Mod Alpha dates · ${inr(ma)}", ma / top, SolidColor(Color(0xFFD9A441)))
                        VSpace(8.dp)
                        DarkBar("Same date every month · ${inr(r.value)}", r.value / top, SolidColor(Ma.c.muted.copy(alpha = .45f)))
                    } }
                }
                // vs fixed deposit
                MaCard(Modifier.fillMaxWidth()) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("vs a fixed deposit at 7%", color = Ma.c.text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            val d = r.value - r.fd
                            Tag((if (d >= 0) "+" else "−") + inr(kotlin.math.abs(d)), if (d >= 0) Tone.Green else Tone.Red)
                        }
                        VSpace(10.dp)
                        val top = maxOf(r.value, r.fd).toFloat().coerceAtLeast(1f)
                        LabeledBar("This fund · ${inr(r.value)}", r.value / top, SolidColor(SoftGood), Ma.c.line)
                        VSpace(8.dp)
                        LabeledBar("Fixed deposit · ${inr(r.fd)}", r.fd / top, Brush.horizontalGradient(listOf(Ma.c.muted.copy(alpha = .6f), Ma.c.muted.copy(alpha = .4f))), Ma.c.line)
                    }
                }
                // Year by year
                if (r.years.size > 1) MaCard(Modifier.fillMaxWidth()) {
                    Column {
                        Text("Year by year", color = Ma.c.text, fontWeight = FontWeight.SemiBold)
                        Caption("Fund return in each calendar year")
                        VSpace(10.dp)
                        Row(Modifier.fillMaxWidth()) {
                            r.years.forEach { (_, v) -> Text(pct(v).replace(".0%", "%"), Modifier.weight(1f), color = if (v >= 0) Ma.c.up else Ma.c.down, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, maxLines = 1) }
                        }
                        VSpace(4.dp)
                        BarStrip(r.years.map { it.second }, Modifier.fillMaxWidth().height(80.dp), good = r.years.indices.filter { r.years[it].second >= 0 }.toSet(), gap = 8.dp, signed = true)
                        VSpace(4.dp)
                        Row(Modifier.fillMaxWidth()) {
                            r.years.forEach { (y, _) -> Text("'" + y.toString().takeLast(2), Modifier.weight(1f), color = Ma.c.muted, fontSize = 10.5.sp, textAlign = TextAlign.Center) }
                        }
                    }
                }
            }
            Text("Based on real NAV history. Past returns don't guarantee future returns.", Modifier.padding(horizontal = 4.dp), color = Ma.c.muted, fontSize = 12.sp)
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

private class WhatIfOut(
    val value: Long, val gain: Long, val pct: Double, val cagr: Double?, val invested: Long, val series: List<Double>, val invested2: List<Double>?, val dates: List<String>,
    val modAlpha: Long?, val fd: Long, val years: List<Pair<Int, Double>>,
)

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
    Row(modifier.clip(RoundedCornerShape(14.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
        if (f != null) { AmcLogo(f.amc, 28.dp); Spacer(Modifier.width(8.dp)) }
        Text(f?.short ?: "Choose", color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
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
