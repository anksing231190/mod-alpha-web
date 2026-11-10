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
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle as JTextStyle
import java.util.Locale

private fun sfx(n: Int) = when { n % 100 in 11..13 -> "th"; n % 10 == 1 -> "st"; n % 10 == 2 -> "nd"; n % 10 == 3 -> "rd"; else -> "th" }
private fun monthName(ym: String, full: Boolean = true) = runCatching { YearMonth.parse(ym).let { it.month.getDisplayName(if (full) JTextStyle.FULL else JTextStyle.SHORT, Locale.ENGLISH) + if (full) " ${it.year}" else "" } }.getOrDefault(ym)

/* ============================== Calendar tab ============================== */

/** Value of a ₹10,000 monthly SIP bought on each day 1–28 (first NAV on/after that day), from real NAV history. */
private fun dayValues(nav: List<Pair<LocalDate, Double>>): List<Double>? {
    if (nav.size < 200) return null
    val first = YearMonth.from(nav.first().first).plusMonths(1); val last = YearMonth.from(nav.last().first).minusMonths(1)
    val endNav = nav.last().second
    return (1..28).map { d ->
        var units = 0.0; var m = first; var i = 0
        while (!m.isAfter(last)) {
            val day = m.atDay(d)
            while (i < nav.size && nav[i].first.isBefore(day)) i++
            if (i >= nav.size) break
            units += 10000 / nav[i].second; m = m.plusMonths(1)
            i = (i - 3).coerceAtLeast(0)
        }
        units * endNav
    }
}

@Composable
fun CalendarTab(bottomPad: Dp) {
    val nav = LocalNav.current
    val hist = rememberLoad { nav.repo.sipHistory() }
    val why = rememberLoad {
        val f = nav.repo.funds().firstOrNull() ?: return@rememberLoad null
        val pts = nav.repo.nav(f.id, "5Y").mapNotNull { p -> runCatching { LocalDate.parse(p.date.take(10)) to p.value }.getOrNull() }
        dayValues(pts)?.let { f.short to it }
    }
    var shown by rememberSaveable { mutableStateOf<String?>(null) }
    val list = (hist.res as? Res.Ok)?.value?.first.orEmpty()
    val locked = (hist.res as? Res.Ok)?.value?.second ?: false
    val thisMonth = YearMonth.now().toString()
    val cur = list.firstOrNull { it.month == thisMonth } ?: list.firstOrNull()
    val month = list.firstOrNull { it.month == (shown ?: cur?.month) } ?: cur
    Column(Modifier.fillMaxSize().background(Ma.c.bg)) {
        ChromeHeader("SIP calendar", actions = { ChromeIcon(Icons.Outlined.NotificationsNone, "Remind me") { nav.remindMe(cur?.day) } }) {
            Text(
                buildAnnotatedString {
                    if (cur?.day != null) { append("This month invest on the "); withStyle(SpanStyle(color = Ma.c.chromeText, fontWeight = FontWeight.Bold)) { append("${cur.day}${sfx(cur.day)}") }; append(" · ") ; withStyle(SpanStyle(color = Color(0xFF4ADE80), fontWeight = FontWeight.SemiBold)) { append(pct(cur.upliftPct)) }; append(" vs the 1st") }
                    else append(if (locked) "This month's date is ready — unlock it with Pro." else "This month's date is being prepared.")
                },
                Modifier.padding(horizontal = 20.dp), color = Ma.c.chromeSub, fontSize = 14.sp,
            )
        }
        LoadBox(hist) { _ ->
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = bottomPad + 20.dp)) {
                month?.let { m ->
                    val idx = list.indexOf(m)
                    MaCard(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp).fillMaxWidth(), padding = 12.dp) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Arrow(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, idx < list.lastIndex) { shown = list[idx + 1].month }
                                Text(monthName(m.month), Modifier.weight(1f), color = Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 17.sp, textAlign = TextAlign.Center)
                                Arrow(Icons.AutoMirrored.Outlined.KeyboardArrowRight, idx > 0) { shown = list[idx - 1].month }
                            }
                            VSpace(6.dp)
                            MonthGrid(m)
                            if (m.day == null && locked) Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Ma.c.surface2).clickable { nav.push(Route.Plans) }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Lock, null, tint = Ma.c.accent, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp))
                                Text("Unlock this month's best date with Pro", color = Ma.c.text, fontSize = 13.5.sp, modifier = Modifier.weight(1f)); Text("See plans", color = Ma.c.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            }
                            VSpace(8.dp)
                            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) { Dot(Ma.c.accent, "Best", ring = true); Dot(Ma.c.up, "Good"); Dot(Color.Transparent, "Today", outline = true) }
                        }
                    }
                }
                (why.res as? Res.Ok)?.value?.let { (fund, vals) ->
                    val best = cur?.day; val good = cur?.alternatives?.map { it.day }.orEmpty()
                    MaCard(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp).fillMaxWidth()) {
                        Column {
                            Text(if (best != null) "Why the $best${sfx(best)}?" else "Does the day matter?", color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text("Value of ₹10,000 a month by SIP day · 5 years · $fund", color = Ma.c.muted, fontSize = 12.sp)
                            VSpace(10.dp)
                            DayBars(vals, best, good)
                            Row(Modifier.fillMaxWidth()) { listOf("1", "7", "14", "21", "28").forEach { Text(it, Modifier.weight(1f), color = Ma.c.muted, fontSize = 10.5.sp, textAlign = TextAlign.Center) } }
                            val top = vals.indices.maxBy { vals[it] } + 1; val diff = (vals[top - 1] / vals[0] - 1) * 100
                            VSpace(6.dp)
                            Text("In this fund the strongest day was the $top${sfx(top)}: ${pct(diff)} more than investing on the 1st.", color = Ma.c.sub, fontSize = 12.5.sp)
                        }
                    }
                }
                val past = list.filter { it.month < thisMonth && it.day != null }
                if (past.isNotEmpty()) {
                    SectionTitle("Past months")
                    CardList(rows = past.take(6).map { p -> {
                        Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(monthName(p.month, false), Modifier.width(48.dp), color = Ma.c.text, fontWeight = FontWeight.Bold)
                            val d = runCatching { YearMonth.parse(p.month).atDay(p.day!!).dayOfWeek.getDisplayName(JTextStyle.FULL, Locale.ENGLISH) }.getOrDefault("")
                            Text("${p.day}${sfx(p.day!!)} · $d", Modifier.weight(1f), color = Ma.c.muted, fontSize = 13.sp)
                            Text(pct(p.upliftPct), color = if ((p.upliftPct ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontWeight = FontWeight.Bold)
                        }
                    } })
                }
            }
        }
    }
}

@Composable private fun Arrow(icon: ImageVector, enabled: Boolean, onClick: () -> Unit) =
    Box(Modifier.size(36.dp).clip(CircleShape).clickable(enabled = enabled, onClick = onClick), contentAlignment = Alignment.Center) { Icon(icon, null, tint = if (enabled) Ma.c.sub else Ma.c.line) }

@Composable
private fun MonthGrid(m: SipMonth) {
    val ym = YearMonth.parse(m.month); val first = ym.atDay(1).dayOfWeek.value % 7; val days = ym.lengthOfMonth()
    val today = LocalDate.now(); val good = m.alternatives.map { it.day }.toSet()
    Row(Modifier.fillMaxWidth()) { listOf("S", "M", "T", "W", "T", "F", "S").forEach { Text(it, Modifier.weight(1f), color = Ma.c.muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center) } }
    VSpace(4.dp)
    val cells = List(first) { 0 } + (1..days).toList()
    cells.chunked(7).forEach { week ->
        Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
            (0 until 7).forEach { k ->
                val d = week.getOrNull(k) ?: 0
                Box(Modifier.weight(1f).height(40.dp).padding(2.dp), contentAlignment = Alignment.Center) {
                    if (d > 0) {
                        val best = d == m.day; val isToday = ym.atDay(d) == today; val we = (first + d - 1) % 7 in setOf(0, 6)
                        Box(
                            Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp))
                                .then(if (best) Modifier.background(Ma.c.accentBrush).border(2.dp, Ma.c.gold, RoundedCornerShape(12.dp)) else if (isToday) Modifier.border(2.dp, Ma.c.accent, RoundedCornerShape(12.dp)) else Modifier),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("$d", color = if (best) Color.White else if (we) Ma.c.muted else Ma.c.text, fontSize = 14.5.sp, fontWeight = FontWeight.SemiBold)
                            if (d in good) Box(Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp).size(5.dp).clip(CircleShape).background(Ma.c.up))
                        }
                    }
                }
            }
        }
    }
}

@Composable private fun Dot(c: Color, t: String, ring: Boolean = false, outline: Boolean = false) = Row(verticalAlignment = Alignment.CenterVertically) {
    Box(Modifier.size(9.dp).clip(CircleShape).background(c).then(if (ring) Modifier.border(1.5.dp, Ma.c.gold, CircleShape) else if (outline) Modifier.border(1.5.dp, Ma.c.accent, CircleShape) else Modifier))
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

private val SUGGEST = listOf("Is the 12th good for small caps?", "Compare Quant Small Cap vs SBI Contra", "What is CAGR?", "Which fund had the best 5 years?")

@Composable
fun AskTab(chat: SnapshotStateList<ChatMsg>, bottomPad: Dp) {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    var input by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var left by remember { mutableStateOf<Int?>(null) }
    var err by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()
    LaunchedEffect(Unit) { left = runCatching { nav.repo.aiLeftToday() }.getOrNull() }
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
        ChromeHeader("Ask Mod Alpha", actions = {
            if (left != null) Text("$left left today", Modifier.clip(CircleShape).background(Ma.c.gold.copy(alpha = .18f)).padding(horizontal = 10.dp, vertical = 5.dp), color = Ma.c.gold, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }) {
            Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).clip(CircleShape).background(Color(0xFF4ADE80))); Spacer(Modifier.width(6.dp))
                Text("Answers from Mod Alpha's fund data", color = Ma.c.chromeSub, fontSize = 13.sp)
            }
        }
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), state = listState, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item { Bubble(ChatMsg(false, "Hi ${nav.user.firstName} 👋 Ask me about funds, returns or SIP dates.")) }
            items(chat) { Bubble(it) }
            if (busy) item { Bubble(ChatMsg(false, "Thinking…")) }
            err?.let { e -> item { Text(e, Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Ma.c.down.copy(alpha = .1f)).padding(12.dp), color = Ma.c.down, fontSize = 13.5.sp) } }
        }
        Column(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = bottomPad + 8.dp)) {
            if (chat.isEmpty()) Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SUGGEST.forEach { s -> Text(s, Modifier.clip(CircleShape).background(Ma.c.surface).border(1.dp, Ma.c.line, CircleShape).clickable { send(s) }.padding(horizontal = 12.dp, vertical = 8.dp), color = Ma.c.sub, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold) }
            }
            Row(Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).padding(start = 14.dp, end = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    if (input.isEmpty()) Text("Ask about funds, returns or SIP dates…", color = Ma.c.muted, fontSize = 14.sp)
                    BasicTextField(input, { input = it.take(2000) }, singleLine = true, textStyle = TextStyle(color = Ma.c.text, fontSize = 14.5.sp), cursorBrush = SolidColor(Ma.c.accent),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send), keyboardActions = KeyboardActions(onSend = { send(input) }), modifier = Modifier.fillMaxWidth())
                }
                Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(Ma.c.hiBrush).clickable(enabled = !busy) { send(input) }, contentAlignment = Alignment.Center) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowForward, "Send", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
            Text("Historical analysis, not investment advice.", Modifier.fillMaxWidth().padding(top = 6.dp), color = Ma.c.muted, fontSize = 10.5.sp, textAlign = TextAlign.Center)
        }
    }
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

@Composable
fun NotificationsScreen() {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val l = rememberLoad { nav.repo.notifications() }
    var tab by rememberSaveable { mutableStateOf("All") }
    Screen("Notifications", onBack = nav::pop, actions = {
        Text("Mark all read", Modifier.clickable { scope.launch { runCatching { nav.repo.markAllRead() }; l.reload(); nav.refreshHome() } }.padding(8.dp), color = Ma.c.chromeSub, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
    }, header = { Chips(listOf("All", "SIP dates", "Account", "Updates"), tab, { tab = it }, dark = true) }) {
        LoadBox(l) { all ->
            fun group(n: Notice) = when { n.kind.contains("sip") || n.kind.contains("remind") || n.kind.contains("date") -> "SIP dates"; n.kind.contains("bill") || n.kind.contains("pay") || n.kind.contains("support") || n.kind.contains("account") || n.kind.contains("sub") -> "Account"; else -> "Updates" }
            val list = all.filter { tab == "All" || group(it) == tab }
            if (list.isEmpty()) Empty(Icons.Outlined.NotificationsNone, "You're all caught up", "New SIP dates, reminders and account updates show up here.")
            else {
                val today = LocalDate.now().toString()
                val (t, e) = list.partition { it.createdAt.startsWith(today) }
                Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
                    if (t.isNotEmpty()) { Caption("Today", Modifier.padding(start = 24.dp, top = 18.dp, bottom = 8.dp)); CardList(rows = t.map { n -> { NoticeRow(n, group(n)) } }) }
                    if (e.isNotEmpty()) { Caption("Earlier", Modifier.padding(start = 24.dp, top = 18.dp, bottom = 8.dp)); CardList(rows = e.map { n -> { NoticeRow(n, group(n)) } }) }
                }
            }
        }
    }
}

@Composable
private fun NoticeRow(n: Notice, group: String) {
    val (icon, bg, fg) = when {
        n.kind.contains("bill") || n.kind.contains("pay") -> Triple(Icons.Outlined.ReceiptLong, Color(0xFFDCFCE7), Color(0xFF15803D))
        n.kind.contains("support") -> Triple(Icons.Outlined.ChatBubbleOutline, Color(0xFFEDE9FE), Color(0xFF6D28D9))
        n.kind.contains("remind") -> Triple(Icons.Outlined.NotificationsActive, Color(0xFFFEF3C7), Color(0xFFB45309))
        group == "SIP dates" -> Triple(Icons.Outlined.CalendarMonth, Color(0xFFDBEAFE), Color(0xFF1D4ED8))
        n.kind.contains("insight") -> Triple(Icons.Outlined.Lightbulb, Color(0xFFFEE2E2), Color(0xFFB91C1C))
        else -> Triple(Icons.Outlined.CheckCircle, Color(0xFFDBEAFE), Color(0xFF1D4ED8))
    }
    Row(Modifier.fillMaxWidth().padding(vertical = 13.dp)) {
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(bg), contentAlignment = Alignment.Center) { Icon(icon, null, tint = fg, modifier = Modifier.size(20.dp)) }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(n.title, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.5.sp, modifier = Modifier.weight(1f, fill = false))
                if (!n.read) { Spacer(Modifier.width(6.dp)); Box(Modifier.size(7.dp).clip(CircleShape).background(Ma.c.hi)) }
            }
            if (n.body.isNotBlank()) Text(n.body, color = Ma.c.sub, fontSize = 13.sp)
            Text(runCatching { val d = java.time.LocalDateTime.parse(n.createdAt.take(19)); if (d.toLocalDate() == LocalDate.now()) d.toLocalTime().toString().take(5) else com.modalpha.app.ui.explore.prettyDate(n.createdAt) }.getOrDefault(n.createdAt.take(10)), color = Ma.c.muted, fontSize = 11.5.sp)
        }
    }
}
