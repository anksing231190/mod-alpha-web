package com.modalpha.app.ui.sip

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.Sms
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.R
import com.modalpha.app.data.ChatMsg
import com.modalpha.app.data.Notice
import com.modalpha.app.data.Prefs
import com.modalpha.app.data.SipMonth
import com.modalpha.app.ui.LocalNav
import com.modalpha.app.ui.Route
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.MaCard
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.explore.pct
import com.modalpha.app.ui.kit.Caption
import com.modalpha.app.ui.kit.CardList
import com.modalpha.app.ui.kit.ChromeHeader
import com.modalpha.app.ui.kit.ChromeIcon
import com.modalpha.app.ui.kit.Chips
import com.modalpha.app.ui.kit.Empty
import com.modalpha.app.ui.kit.ListRow
import com.modalpha.app.ui.kit.LoadBox
import com.modalpha.app.ui.kit.MaSwitch
import com.modalpha.app.ui.kit.Res
import com.modalpha.app.ui.kit.Screen
import com.modalpha.app.ui.kit.SectionTitle
import com.modalpha.app.ui.kit.rememberLoad
import com.modalpha.app.ui.theme.Ma
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.style.TextOverflow
import com.modalpha.app.data.Analytics
import com.modalpha.app.ui.components.*
import com.modalpha.app.ui.kit.Tag
import com.modalpha.app.ui.kit.Tone
import com.modalpha.app.data.Fund
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle as JTextStyle
import java.util.Locale

private fun sfx(n: Int) = when { n % 100 in 11..13 -> "th"; n % 10 == 1 -> "st"; n % 10 == 2 -> "nd"; n % 10 == 3 -> "rd"; else -> "th" }
private fun monthName(ym: String, full: Boolean = true) = runCatching { YearMonth.parse(ym).let { it.month.getDisplayName(if (full) JTextStyle.FULL else JTextStyle.SHORT, Locale.ENGLISH) + if (full) " ${it.year}" else "" } }.getOrDefault(ym)

/* ============================== Calendar tab ============================== */

@Composable
fun CalendarTab(bottomPad: Dp) {
    val nav = LocalNav.current
    val hist = rememberLoad { nav.repo.sipHistory() }
    val prefs = rememberLoad { nav.repo.prefs() }
    val why = rememberLoad {
        val f = nav.repo.funds().firstOrNull() ?: return@rememberLoad null
        Analytics.dayValues(nav.repo.nav(f.id, "5Y"))?.let { f.short to it }
    }
    var shown by rememberSaveable { mutableStateOf<String?>(null) }
    val list = (hist.res as? Res.Ok)?.value?.first.orEmpty()
    val locked = (hist.res as? Res.Ok)?.value?.second ?: false
    val thisMonth = YearMonth.now().toString()
    val cur = list.firstOrNull { it.month == thisMonth } ?: list.firstOrNull()
    val month = list.firstOrNull { it.month == (shown ?: cur?.month) } ?: cur
    val vals = (why.res as? Res.Ok)?.value?.second
    Column(Modifier.fillMaxSize().background(Ma.c.bg)) {
        ChromeHeader("SIP calendar", actions = { ChromeIcon(Icons.Outlined.NotificationsNone, "Remind me") { nav.remindMe(cur?.day) } }) {
            Row(Modifier.padding(horizontal = 16.dp).padding(top = 4.dp).height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GlassCard(Modifier.weight(1.15f).fillMaxHeight(), gold = true) {
                    Column {
                        Text("BEST DATE", color = goldInk(), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        if (cur?.day != null) {
                            Row(verticalAlignment = Alignment.Top) {
                                Text("${cur.day}", color = Ma.c.chromeText, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                                Text(sfx(cur.day), Modifier.padding(top = 5.dp, start = 1.dp), color = Ma.c.chromeSub, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            }
                            Text("${pct(cur.upliftPct)} vs 1st", color = mintInk(), fontSize = 11.5.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                        } else {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
                                Icon(Icons.Outlined.Lock, null, tint = Gold, modifier = Modifier.size(22.dp))
                            }
                            Text(if (locked) "Unlock with Pro" else "Coming soon", color = Ma.c.chromeSub, fontSize = 11.5.sp, maxLines = 1)
                        }
                    }
                }
                GlassCard(Modifier.weight(1f).fillMaxHeight()) {
                    Column {
                        Text("GOOD DATES", color = Ma.c.chromeMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, maxLines = 1)
                        Text("${cur?.alternatives?.size ?: 0}", color = Ma.c.chromeText, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                        Text(cur?.alternatives?.takeIf { it.isNotEmpty() }?.joinToString(", ") { "${it.day}${sfx(it.day)}" } ?: "—", color = Ma.c.chromeSub, fontSize = 11.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
                GlassCard(Modifier.weight(1f).fillMaxHeight().clickable { nav.remindMe(cur?.day) }) {
                    Column {
                        Text("REMINDER", color = Ma.c.chromeMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        VSpace(6.dp)
                        Icon(Icons.Outlined.NotificationsActive, null, tint = Ma.c.chromeText, modifier = Modifier.size(24.dp))
                        VSpace(6.dp)
                        val p = (prefs.res as? Res.Ok)?.value
                        Text(if (p == null) "—" else if (!p.sipReminder) "Off" else p.timing, color = Ma.c.chromeSub, fontSize = 11.5.sp, maxLines = 2)
                    }
                }
            }
        }
        LoadBox(hist) { _ ->
            Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(top = 14.dp, bottom = bottomPad + 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                month?.let { m ->
                    val idx = list.indexOf(m)
                    MaCard(Modifier.fillMaxWidth(), padding = 12.dp) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Arrow(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, idx < list.lastIndex) { shown = list[idx + 1].month }
                                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(monthName(m.month), color = Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                                    if (m.day != null) Text("${m.confidenceLabel} confidence · ${m.confidencePct}%", color = Ma.c.muted, fontSize = 11.5.sp)
                                }
                                Arrow(Icons.AutoMirrored.Outlined.KeyboardArrowRight, idx > 0) { shown = list[idx - 1].month }
                            }
                            VSpace(6.dp)
                            MonthGrid(m, vals)
                            if (m.day == null && locked) Row(Modifier.padding(top = 6.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Ma.c.surface2).clickable { nav.push(Route.Plans) }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Lock, null, tint = Ma.c.accent, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp))
                                Text("Unlock this month's best date with Pro", color = Ma.c.text, fontSize = 13.5.sp, modifier = Modifier.weight(1f)); Text("See plans", color = Ma.c.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                            VSpace(10.dp)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Dot(Gold, "Best", ring = true); Dot(Ma.c.up, "Good"); Dot(Color.Transparent, "Today", outline = true)
                                if (vals != null) Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Weak", color = Ma.c.muted, fontSize = 10.5.sp); HSpace(4.dp)
                                    Box(Modifier.size(42.dp, 8.dp).clip(CircleShape).background(Brush.horizontalGradient(listOf(Ma.c.accent.copy(alpha = .04f), Ma.c.accent.copy(alpha = .3f)))))
                                    HSpace(4.dp); Text("Strong", color = Ma.c.muted, fontSize = 10.5.sp)
                                }
                            }
                        }
                    }
                }
                val past = list.filter { it.month < thisMonth && it.day != null }.take(12).reversed()
                if (past.size > 1) {
                    val beat = past.count { (it.upliftPct ?: 0.0) > 0 }
                    MaCard(Modifier.fillMaxWidth()) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text("Month by month", color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                                    Caption("Our date vs investing on the 1st")
                                }
                                Tag("$beat of ${past.size} beat the 1st", if (beat * 2 >= past.size) Tone.Green else Tone.Amber)
                            }
                            VSpace(12.dp)
                            BarStrip(past.map { it.upliftPct ?: 0.0 }, Modifier.fillMaxWidth().height(90.dp), hi = past.lastIndex, good = past.indices.filter { (past[it].upliftPct ?: 0.0) > 0 }.toSet(), gap = 6.dp, signed = true)
                            VSpace(4.dp)
                            Row(Modifier.fillMaxWidth()) { past.forEach { Text(monthName(it.month, false).take(1), Modifier.weight(1f), color = Ma.c.muted, fontSize = 10.5.sp, textAlign = TextAlign.Center) } }
                            VSpace(8.dp)
                            val avg = past.mapNotNull { it.upliftPct }.average()
                            Text("Average edge ${pct(avg)} a month · best ${pct(past.maxOf { it.upliftPct ?: 0.0 })} in ${monthName(past.maxBy { it.upliftPct ?: 0.0 }.month)}", color = Ma.c.sub, fontSize = 12.5.sp)
                        }
                    }
                }
                (why.res as? Res.Ok)?.value?.let { (fund, v) ->
                    val best = cur?.day; val good = cur?.alternatives?.map { it.day }.orEmpty()
                    MaCard(Modifier.fillMaxWidth()) {
                        Column {
                            Text(if (best != null) "Why the $best${sfx(best)}?" else "Does the day matter?", color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text("Value of ₹10,000 a month by SIP day · 5 years · $fund", color = Ma.c.muted, fontSize = 12.sp)
                            VSpace(10.dp)
                            DayBars(v, best, good)
                            Row(Modifier.fillMaxWidth()) { listOf("1", "7", "14", "21", "28").forEach { Text(it, Modifier.weight(1f), color = Ma.c.muted, fontSize = 10.5.sp, textAlign = TextAlign.Center) } }
                            val top = v.indices.maxBy { v[it] } + 1; val diff = (v[top - 1] / v[0] - 1) * 100
                            VSpace(6.dp)
                            Text("In this fund the strongest day was the $top${sfx(top)}: ${pct(diff)} more than investing on the 1st.", color = Ma.c.sub, fontSize = 12.5.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable private fun Arrow(icon: ImageVector, enabled: Boolean, onClick: () -> Unit) =
    Box(Modifier.size(36.dp).clip(CircleShape).clickable(enabled = enabled, onClick = onClick), contentAlignment = Alignment.Center) { Icon(icon, null, tint = if (enabled) Ma.c.sub else Ma.c.line) }

/** Month grid as a heat map: each day shaded by how strong it has been (dayValues), best date gold, today ringed. */
@Composable
private fun MonthGrid(m: SipMonth, vals: List<Double>?) {
    val ym = YearMonth.parse(m.month); val first = ym.atDay(1).dayOfWeek.value % 7; val days = ym.lengthOfMonth()
    val today = LocalDate.now(); val good = m.alternatives.map { it.day }.toSet()
    val lo = vals?.min() ?: 0.0; val span = vals?.let { (it.max() - lo).takeIf { s -> s > 0 } } ?: 1.0
    Row(Modifier.fillMaxWidth()) { listOf("S", "M", "T", "W", "T", "F", "S").forEach { Text(it, Modifier.weight(1f), color = Ma.c.muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center) } }
    VSpace(4.dp)
    val cells = List(first) { 0 } + (1..days).toList()
    cells.chunked(7).forEach { week ->
        Row(Modifier.fillMaxWidth()) {
            (0 until 7).forEach { k ->
                val d = week.getOrNull(k) ?: 0
                Box(Modifier.weight(1f).height(42.dp).padding(2.dp), contentAlignment = Alignment.Center) {
                    if (d > 0) {
                        val best = d == m.day; val isToday = ym.atDay(d) == today
                        val heat = vals?.getOrNull(d - 1)?.let { ((it - lo) / span).toFloat() }
                        val bg = when {
                            best -> Modifier.background(Brush.linearGradient(listOf(Gold, GoldDeep)))
                            heat != null -> Modifier.background(Ma.c.accent.copy(alpha = .04f + .26f * heat))
                            else -> Modifier.background(Ma.c.surface2)
                        }
                        Box(
                            Modifier.fillMaxSize().clip(RoundedCornerShape(11.dp)).then(bg)
                                .then(if (isToday) Modifier.border(2.dp, Ma.c.text, RoundedCornerShape(11.dp)) else Modifier),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("$d", color = if (best) Color(0xFF3B2405) else Ma.c.text, fontSize = 14.sp, fontWeight = if (best) FontWeight.ExtraBold else FontWeight.SemiBold)
                            if (d in good) Box(Modifier.align(Alignment.BottomCenter).padding(bottom = 3.dp).size(5.dp).clip(CircleShape).background(Ma.c.up))
                        }
                    }
                }
            }
        }
    }
}

@Composable private fun Dot(c: Color, t: String, ring: Boolean = false, outline: Boolean = false) = Row(verticalAlignment = Alignment.CenterVertically) {
    Box(Modifier.size(9.dp).clip(CircleShape).background(c).then(if (ring) Modifier.border(1.5.dp, GoldDeep, CircleShape) else if (outline) Modifier.border(1.5.dp, Ma.c.text, CircleShape) else Modifier))
    Spacer(Modifier.width(5.dp)); Text(t, color = Ma.c.muted, fontSize = 11.5.sp)
}

@Composable
private fun DayBars(vals: List<Double>, best: Int?, good: List<Int>) {
    val lo = vals.min(); val hi = vals.max(); val span = (hi - lo).takeIf { it > 0 } ?: 1.0
    val grey = Ma.c.line; val acc = Ma.c.accent; val up = Ma.c.up
    Canvas(Modifier.fillMaxWidth().height(80.dp)) {
        val w = size.width / vals.size
        vals.forEachIndexed { i, v ->
            val h = (size.height * (.25 + .75 * (v - lo) / span)).toFloat(); val d = i + 1
            drawRoundRect(if (d == best) acc else if (d in good) up.copy(alpha = .6f) else grey, Offset(i * w + w * .15f, size.height - h), Size(w * .7f, h), CornerRadius(3f, 3f))
        }
    }
}

/* ============================== Remind me sheet ============================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReminderSheet(day: Int?, onDone: () -> Unit) {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val load = rememberLoad { nav.repo.prefs() }
    var p by remember { mutableStateOf<Prefs?>(null) }
    var saving by remember { mutableStateOf(false) }
    LaunchedEffect(load.res) { if (p == null) p = (load.res as? Res.Ok)?.value }
    ModalBottomSheet(onDone, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Ma.c.surface) {
        Column(Modifier.padding(start = 20.dp, end = 20.dp, bottom = 28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(44.dp).clip(RoundedCornerShape(14.dp)).background(Ma.c.accent.copy(alpha = .1f)), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.NotificationsActive, null, tint = Ma.c.accent) }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("Remind me", color = Ma.c.text, style = MaterialTheme.typography.titleLarge)
                    Text(if (day != null) "for this month's SIP on the $day${sfx(day)}" else "before each month's best SIP date", color = Ma.c.muted, fontSize = 13.sp)
                }
            }
            val q = p
            if (q == null) { if (load.res is Res.Err) Text((load.res as Res.Err).message, color = Ma.c.down, modifier = Modifier.padding(top = 16.dp)) else VSpace(120.dp); return@Column }
            Caption("When", Modifier.padding(top = 20.dp, bottom = 8.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("3 days before", "2 days before", "1 day before", "On the day").forEach { o -> Opt(o.replace("1 day", "Day"), q.timing == o) { p = q.copy(timing = o) } }
            }
            Caption("How", Modifier.padding(top = 18.dp))
            ListRow(Icons.Outlined.Notifications, "App notification", trailing = { MaSwitch(q.push) { p = q.copy(push = it) } })
            ListRow(Icons.Outlined.Sms, "SMS", nav.user.mobile?.let { com.modalpha.app.data.prettyMobile(it) }, trailing = { MaSwitch(q.sms) { p = q.copy(sms = it) } })
            ListRow(Icons.Outlined.Email, "Email", nav.user.email, trailing = { MaSwitch(q.email) { p = q.copy(email = it) } })
            ListRow(Icons.Outlined.CalendarMonth, "Every month", "Remind me before each month's best date", trailing = { MaSwitch(q.sipReminder) { p = q.copy(sipReminder = it) } })
            ListRow(Icons.Outlined.NotificationsNone, "New date published", "Tell me when next month's date is out", trailing = { MaSwitch(q.datePublished) { p = q.copy(datePublished = it) } })
            VSpace(14.dp)
            GradientButton("Save reminder", {
                saving = true
                scope.launch { runCatching { nav.repo.savePrefs(q) }.onSuccess { nav.toast("Reminder saved"); onDone() }.onFailure { nav.toast(it.message ?: "Couldn't save") }; saving = false }
            }, loading = saving)
        }
    }
}

@Composable private fun Opt(t: String, on: Boolean, onClick: () -> Unit) =
    Text(t, Modifier.clip(RoundedCornerShape(14.dp)).background(if (on) Ma.c.accent.copy(alpha = .08f) else Ma.c.surface).border(if (on) 2.dp else 1.dp, if (on) Ma.c.accent else Ma.c.line, RoundedCornerShape(14.dp))
        .clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 12.dp), color = if (on) Ma.c.accent else Ma.c.sub, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)

/* ============================== Ask Mod Alpha ============================== */

private val SUGGEST = listOf(
    Triple("📅", "Is the 12th good for small caps?", "SIP dates"),
    Triple("⚖️", "Compare Quant Small Cap vs SBI Contra", "Funds"),
    Triple("📈", "What is CAGR?", "Basics"),
    Triple("🏆", "Which fund had the best 5 years?", "Returns"),
)

/** Funds named in a message (by short name or first words of the full name). */
private fun mentioned(text: String, funds: List<Fund>): List<Fund> {
    val t = text.lowercase()
    return funds.filter { f -> t.contains(f.short.lowercase()) || t.contains(f.name.lowercase().split(" ").take(2).joinToString(" ")) }.take(2)
}

@Composable
fun AskTab(chat: SnapshotStateList<ChatMsg>, bottomPad: Dp) {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    var input by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var left by remember { mutableStateOf<Int?>(null) }
    var limit by remember { mutableStateOf<Int?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    val funds = rememberLoad { nav.repo.funds() }
    val all = (funds.res as? Res.Ok)?.value.orEmpty()
    val listState = rememberLazyListState()
    LaunchedEffect(Unit) { left = runCatching { nav.repo.aiLeftToday() }.getOrNull(); limit = runCatching { nav.repo.aiLimitToday() }.getOrNull() }
    LaunchedEffect(chat.size, busy) { if (chat.isNotEmpty()) listState.animateScrollToItem(chat.size + if (busy) 1 else 0) }
    fun send(text: String) {
        val t = text.trim(); if (t.isEmpty() || busy) return
        chat.add(ChatMsg(true, t)); input = ""; err = null; busy = true
        scope.launch {
            runCatching { nav.repo.ask(chat.toList()) }.onSuccess { chat.add(ChatMsg(false, it.text)); left = it.leftToday ?: left }.onFailure { err = it.message }
            busy = false
        }
    }
    Column(Modifier.fillMaxSize().background(Ma.c.bg).imePadding()) {
        ChromeHeader("Ask Mod Alpha") {
            Row(Modifier.padding(horizontal = 20.dp).padding(bottom = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).clip(CircleShape).background(Mint)); HSpace(6.dp)
                        Text("Answers from real fund data", color = Ma.c.chromeSub, fontSize = 13.sp)
                    }
                    VSpace(4.dp)
                    Text("${all.size.takeIf { it > 0 } ?: "—"} funds · 10 years of NAVs · SIP date history", color = Ma.c.chromeMuted, fontSize = 11.5.sp)
                }
                val l = left; val lim = limit
                if (l != null) Ring(if (lim != null && lim > 0) l.toFloat() / lim else 1f, 54.dp, 6.dp, listOf(Gold, GoldDeep)) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("$l", color = Ma.c.chromeText, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, lineHeight = 16.sp)
                        Text("left", color = Ma.c.chromeMuted, fontSize = 9.sp, lineHeight = 10.sp)
                    }
                }
            }
        }
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), state = listState, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item { Bubble(ChatMsg(false, "Hi ${nav.user.firstName} 👋 Ask me about funds, returns or SIP dates.")) }
            if (chat.isEmpty()) item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
                    Caption("Try asking")
                    SUGGEST.chunked(2).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { (emo, q, tag) ->
                                Column(Modifier.weight(1f).height(96.dp).clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).clickable { send(q) }.padding(12.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(emo, fontSize = 16.sp); HSpace(6.dp)
                                        Text(tag.uppercase(), color = Ma.c.muted, fontSize = 9.5.sp, fontWeight = FontWeight.Bold, letterSpacing = .8.sp)
                                    }
                                    VSpace(6.dp)
                                    Text(q, color = Ma.c.text, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, lineHeight = 17.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                    }
                }
            }
            items(chat.size) { i ->
                val m = chat[i]
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Bubble(m)
                    if (!m.fromUser) {
                        val q = chat.getOrNull(i - 1)?.text.orEmpty()
                        val fs = mentioned(q + " " + m.text, all)
                        if (fs.isNotEmpty()) Row(Modifier.padding(start = 38.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            fs.forEach { f -> FundDataCard(f, Modifier.weight(1f)) { nav.push(Route.Fund(f.id)) } }
                            if (fs.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
            if (busy) item { Bubble(ChatMsg(false, "Thinking…")) }
            err?.let { e -> item { Text(e, Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Ma.c.down.copy(alpha = .1f)).padding(12.dp), color = Ma.c.down, fontSize = 13.5.sp) } }
        }
        Column(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = bottomPad + 8.dp)) {
            Row(Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(18.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(18.dp)).padding(start = 14.dp, end = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    if (input.isEmpty()) Text("Ask about funds, returns or SIP dates…", color = Ma.c.muted, fontSize = 14.sp)
                    BasicTextField(input, { input = it.take(2000) }, singleLine = true, textStyle = TextStyle(color = Ma.c.text, fontSize = 14.5.sp), cursorBrush = SolidColor(Ma.c.accent),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send), keyboardActions = KeyboardActions(onSend = { send(input) }), modifier = Modifier.fillMaxWidth())
                }
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(Ma.c.hiBrush).clickable(enabled = !busy) { send(input) }, contentAlignment = Alignment.Center) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowForward, "Send", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
            Text("Historical analysis, not investment advice.", Modifier.fillMaxWidth().padding(top = 6.dp), color = Ma.c.muted, fontSize = 10.5.sp, textAlign = TextAlign.Center)
        }
    }
}

/** Small card with a fund's real numbers, shown under an answer that mentions it. */
@Composable
private fun FundDataCard(f: Fund, modifier: Modifier, onClick: () -> Unit) {
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(12.dp)) { OnLight {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AmcLogo(f.amc, 22.dp); HSpace(6.dp)
            Text(f.short, color = Ma.c.chromeText, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        VSpace(6.dp)
        Sparkline(f.spark, Ma.c.up, Modifier.fillMaxWidth().height(30.dp))
        VSpace(6.dp)
        Row(Modifier.fillMaxWidth()) {
            listOf("1Y" to f.r1, "3Y" to f.r3, "5Y" to f.r5).forEach { (k, v) ->
                Column(Modifier.weight(1f)) {
                    Text(k, color = Ma.c.chromeMuted, fontSize = 9.5.sp)
                    Text(pct(v).replace(".0%", "%"), color = if ((v ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                }
            }
        }
    } }
}

@Composable
private fun Bubble(m: ChatMsg) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (m.fromUser) Arrangement.End else Arrangement.Start, verticalAlignment = Alignment.Bottom) {
        if (!m.fromUser) {
            Box(Modifier.size(30.dp).clip(CircleShape).background(Ma.c.chrome).border(1.5.dp, Ma.c.gold, CircleShape), contentAlignment = Alignment.Center) { Image(painterResource(R.drawable.brand_mark), null, Modifier.size(17.dp)) }
            Spacer(Modifier.width(8.dp))
        }
        val shape = if (m.fromUser) RoundedCornerShape(18.dp, 18.dp, 6.dp, 18.dp) else RoundedCornerShape(18.dp, 18.dp, 18.dp, 6.dp)
        Text(
            bold(m.text),
            Modifier.widthIn(max = 290.dp).clip(shape).then(if (m.fromUser) Modifier.background(Ma.c.accentBrush) else Modifier.background(Ma.c.surface).border(1.dp, Ma.c.line, shape)).padding(horizontal = 14.dp, vertical = 11.dp),
            color = if (m.fromUser) Color.White else Ma.c.text, fontSize = 14.5.sp, lineHeight = 21.sp,
        )
    }
}

/** **bold** markdown → bold text (the assistant answers in light markdown). */
private fun bold(s: String) = buildAnnotatedString {
    val parts = s.replace("\r", "").split("**")
    parts.forEachIndexed { i, p -> if (i % 2 == 1) withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(p) } else append(p.replace(Regex("^#+ ", RegexOption.MULTILINE), "").replace(Regex("^[*-] ", RegexOption.MULTILINE), "• ")) }
}

/* ============================== Notifications ============================== */

private fun noticeGroup(n: Notice) = when {
    n.kind.contains("sip") || n.kind.contains("remind") || n.kind.contains("date") -> "SIP dates"
    n.kind.contains("bill") || n.kind.contains("pay") || n.kind.contains("support") || n.kind.contains("account") || n.kind.contains("sub") -> "Account"
    else -> "Updates"
}

@Composable
fun NotificationsScreen() {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val l = rememberLoad { nav.repo.notifications() }
    var tab by rememberSaveable { mutableStateOf("All") }
    val items = (l.res as? Res.Ok)?.value.orEmpty()
    Screen("Notifications", onBack = nav::pop, actions = {
        Text("Mark all read", Modifier.clickable { scope.launch { runCatching { nav.repo.markAllRead() }; l.reload(); nav.refreshHome() } }.padding(8.dp), color = Ma.c.chromeSub, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }, header = {
        Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Unread" to items.count { !it.read }, "SIP dates" to items.count { noticeGroup(it) == "SIP dates" }, "Account" to items.count { noticeGroup(it) == "Account" }).forEach { (k, v) ->
                GlassCard(Modifier.weight(1f), gold = k == "Unread" && v > 0) { StatBlock(k, "$v", valueSize = 22) }
            }
        }
        VSpace(12.dp)
        Chips(listOf("All", "SIP dates", "Account", "Updates"), tab, { tab = it }, dark = true)
    }) {
        LoadBox(l) { all ->
            val list = all.filter { tab == "All" || noticeGroup(it) == tab }
            if (list.isEmpty()) Empty(Icons.Outlined.NotificationsNone, "You're all caught up", "New SIP dates, reminders and account updates show up here.")
            else {
                val today = LocalDate.now().toString()
                val (t, e) = list.partition { it.createdAt.startsWith(today) }
                Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
                    listOf("Today" to t, "Earlier" to e).filter { it.second.isNotEmpty() }.forEach { (label, ns) ->
                        Caption(label, Modifier.padding(start = 4.dp, top = 18.dp, bottom = 8.dp))
                        ns.forEachIndexed { i, n -> NoticeRow(n, noticeGroup(n), last = i == ns.lastIndex) }
                    }
                }
            }
        }
    }
}

/** Timeline row: coloured node + line on the left, card with an action chip on the right. */
@Composable
private fun NoticeRow(n: Notice, group: String, last: Boolean) {
    val nav = LocalNav.current
    val (icon, fg, action) = when {
        n.kind.contains("bill") || n.kind.contains("pay") -> Triple(Icons.Outlined.ReceiptLong, Color(0xFF16A34A), "Invoice" to { nav.push(Route.Subscription) })
        n.kind.contains("support") -> Triple(Icons.Outlined.ChatBubbleOutline, Color(0xFF7C3AED), "Open" to { nav.push(Route.Help) })
        n.kind.contains("remind") -> Triple(Icons.Outlined.NotificationsActive, Color(0xFFD97706), "Remind me" to { nav.remindMe(null) })
        group == "SIP dates" -> Triple(Icons.Outlined.CalendarMonth, Color(0xFF2563EB), "See date" to { nav.remindMe(null) })
        n.kind.contains("insight") -> Triple(Icons.Outlined.Lightbulb, Color(0xFFDC2626), "Read" to { nav.push(Route.Insights) })
        else -> Triple(Icons.Outlined.CheckCircle, Color(0xFF2563EB), null)
    }
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
        Column(Modifier.width(36.dp).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.size(32.dp).clip(CircleShape).background(fg.copy(alpha = .14f)).border(1.5.dp, fg.copy(alpha = .5f), CircleShape), contentAlignment = Alignment.Center) { Icon(icon, null, tint = fg, modifier = Modifier.size(16.dp)) }
            if (!last) Box(Modifier.width(2.dp).weight(1f).background(Brush.verticalGradient(listOf(fg.copy(alpha = .4f), Ma.c.line))))
        }
        HSpace(10.dp)
        Column(
            Modifier.weight(1f).padding(bottom = 10.dp).clip(RoundedCornerShape(16.dp)).background(Ma.c.surface)
                .border(1.dp, if (!n.read) fg.copy(alpha = .45f) else Ma.c.line, RoundedCornerShape(16.dp)).padding(12.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(n.title, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, modifier = Modifier.weight(1f))
                if (!n.read) { HSpace(6.dp); Box(Modifier.size(7.dp).clip(CircleShape).background(fg)) }
            }
            if (n.body.isNotBlank()) Text(n.body, color = Ma.c.sub, fontSize = 12.5.sp, lineHeight = 17.sp)
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(runCatching { val d = java.time.LocalDateTime.parse(n.createdAt.take(19)); if (d.toLocalDate() == LocalDate.now()) d.toLocalTime().toString().take(5) else com.modalpha.app.ui.explore.prettyDate(n.createdAt) }.getOrDefault(n.createdAt.take(10)),
                    color = Ma.c.muted, fontSize = 11.sp, modifier = Modifier.weight(1f))
                action?.let { (label, go) ->
                    Text(label, Modifier.clip(CircleShape).background(fg.copy(alpha = .12f)).clickable { go() }.padding(horizontal = 10.dp, vertical = 4.dp), color = fg, fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
