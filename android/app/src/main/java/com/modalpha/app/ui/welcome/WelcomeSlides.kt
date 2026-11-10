package com.modalpha.app.ui.welcome

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.data.DemoRepository
import com.modalpha.app.data.Fund
import com.modalpha.app.ui.components.AmcLogo
import com.modalpha.app.ui.components.Gold
import com.modalpha.app.ui.components.GoldDeep
import com.modalpha.app.ui.components.Sparkline
import com.modalpha.app.ui.components.linePath
import com.modalpha.app.ui.theme.Ma

/*
 * Welcome slides 2 and 3 (slide 1 is WaveWelcome). Each is a light card inside the dark panel, the same size as slide 1.
 */

private val INK = Color(0xFF0D1730)

/** Light card used by every welcome slide. */
@Composable
private fun SlideCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val c = Ma.c
    Box(modifier.padding(horizontal = 20.dp).fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(22.dp)).padding(16.dp)) { content() }
}

/* ============================== Slide 2 · 10 years of NAV data ============================== */

/**
 * Fund cards (logo, name, 5Y return, mini chart) flow across a checkered chart in two rows going opposite ways,
 * over faint 10-year NAV lines; a year counter runs 2016 → 2026.
 */
@Composable
fun NavFlowSlide(modifier: Modifier = Modifier, autoPlay: Boolean = true) {
    val c = Ma.c
    val tr = rememberInfiniteTransition(label = "flow")
    val t by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(16000, easing = LinearEasing)), label = "t")
    val yr by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(5200, easing = LinearEasing)), label = "yr")
    val shift = if (autoPlay) t else .18f
    val year = 2016 + ((if (autoPlay) (yr / .8f).coerceAtMost(1f) else 1f) * 10).toInt()
    val funds = DemoRepository.demoFunds
    SlideCard(modifier) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Every fund, every day", color = c.text, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text("NAV history checked back to 2016", color = c.muted, fontSize = 11.5.sp)
                }
                Text("$year", Modifier.clip(RoundedCornerShape(8.dp)).background(c.accent.copy(alpha = .1f)).padding(horizontal = 8.dp, vertical = 3.dp), color = c.accent, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold)
            }
            Spacer(Modifier.height(10.dp))
            // checkered chart with faint NAV lines behind the flowing fund cards
            Box(Modifier.fillMaxWidth().height(212.dp).clip(RoundedCornerShape(14.dp)).clipToBounds()) {
                Canvas(Modifier.fillMaxSize()) {
                    val rows = 6; val ch = size.height / rows; val cols = (size.width / ch).toInt().coerceAtLeast(6); val cw = size.width / cols
                    for (r in 0 until rows) for (k in 0 until cols) if ((r + k) % 2 == 0) drawRect(INK.copy(alpha = .045f), Offset(k * cw, r * ch), Size(cw, ch))
                    for (r in 0..rows) drawLine(INK.copy(alpha = .06f), Offset(0f, r * ch), Offset(size.width, r * ch), 1f)
                    val cols3 = listOf(c.accent, Color(0xFF0D9488), GoldDeep)
                    funds.take(3).forEachIndexed { i, f ->
                        if (f.spark.size > 1) drawPath(linePath(f.spark, size.width, size.height, pad = 18f + i * 22f), cols3[i].copy(alpha = .22f), style = Stroke(1.6.dp.toPx(), cap = StrokeCap.Round))
                    }
                }
                Column(Modifier.fillMaxSize().padding(vertical = 14.dp), verticalArrangement = Arrangement.SpaceEvenly) {
                    FundRow(funds, shift, reverse = false)
                    FundRow(funds.reversed(), shift, reverse = true)
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth()) {
                listOf("10 yrs" to "of NAV data", "3,650" to "days per fund", "28" to "SIP days tested").forEach { (v, k) ->
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(v, color = c.text, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
                        Text(k, color = c.muted, fontSize = 10.5.sp, maxLines = 1)
                    }
                }
            }
        }
    }
}

private val CHIP_W = 150.dp
private val CHIP_GAP = 10.dp

@Composable
private fun FundRow(funds: List<Fund>, t: Float, reverse: Boolean) {
    val step = CHIP_W + CHIP_GAP
    val loop = step * funds.size
    val x: Dp = if (reverse) -loop + loop * t else -(loop * t)
    BoxWithConstraints(Modifier.fillMaxWidth().clipToBounds()) {
        Row(Modifier.wrapContentWidth(Alignment.Start, unbounded = true).offset(x = x), horizontalArrangement = Arrangement.spacedBy(CHIP_GAP)) {
            (funds + funds + funds).forEach { FundChip(it) }
        }
    }
}

@Composable
private fun FundChip(f: Fund) {
    val c = Ma.c
    Row(
        Modifier.width(CHIP_W).clip(RoundedCornerShape(14.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(14.dp)).padding(horizontal = 8.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AmcLogo(f.amc, 26.dp)
        Spacer(Modifier.width(6.dp))
        Column(Modifier.weight(1f)) {
            Text(f.short, color = c.text, fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text("5Y " + (f.r5?.let { "+%.1f%%".format(it) } ?: "—"), color = c.up, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
        Sparkline(f.spark, c.up, Modifier.size(34.dp, 18.dp))
    }
}

/* ============================== Slide 3 · Never miss the date ============================== */

/**
 * A phone with this month's calendar (best date gold, today ringed); a reminder notification drops in, the bell rings,
 * and three steps tick off beside it: date published → reminder → invest in your own app.
 */
@Composable
fun ReminderSlide(modifier: Modifier = Modifier, autoPlay: Boolean = true) {
    val c = Ma.c
    val tr = rememberInfiniteTransition(label = "remind")
    val t0 by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(6000, easing = LinearEasing)), label = "t")
    val pulse by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "p")
    val t = if (autoPlay) t0 else .7f
    fun seg(a: Float, b: Float) = ((t - a) / (b - a)).coerceIn(0f, 1f)
    val noti = seg(.18f, .3f)                      // notification slides in
    val ring = if (t in .3f..0.5f) kotlin.math.sin((t - .3f) * 90f) * 14f else 0f
    val steps = listOf(seg(.05f, .12f), seg(.3f, .38f), seg(.55f, .63f))
    SlideCard(modifier) {
        Row(Modifier.height(352.dp), verticalAlignment = Alignment.CenterVertically) {
            // ---- phone ----
            Box(
                Modifier.width(150.dp).height(300.dp).clip(RoundedCornerShape(24.dp)).background(Color(0xFF111827)).padding(5.dp)
                    .clip(RoundedCornerShape(20.dp)).background(c.bg),
            ) {
                Column(Modifier.fillMaxSize().padding(horizontal = 8.dp, vertical = 8.dp)) {
                    Row { Text("9:41", color = c.text, fontSize = 9.sp, fontWeight = FontWeight.Bold); Spacer(Modifier.weight(1f)); Text("●●●", color = c.muted, fontSize = 7.sp) }
                    Spacer(Modifier.height(30.dp))
                    Text("NOVEMBER", color = c.muted, fontSize = 8.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(Modifier.height(4.dp))
                    MiniCalendar(best = 12, today = 10, glow = pulse)
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(Gold.copy(alpha = .16f)).padding(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(8.dp).clip(CircleShape).background(GoldDeep)); Spacer(Modifier.width(5.dp))
                        Text("Best SIP date · Thu 12th", color = c.text, fontSize = 8.5.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
                // the notification banner drops in from the top of the phone
                Row(
                    Modifier.padding(horizontal = 5.dp).offset(y = (-70 + 92 * noti).dp).alpha(noti).fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(12.dp)).padding(6.dp),
                ) {
                    Box(Modifier.size(20.dp).clip(RoundedCornerShape(6.dp)).background(c.accent), contentAlignment = Alignment.Center) {
                        Text("α", color = Gold, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.width(5.dp))
                    Column {
                        Text("Mod Alpha · 2 days to go", color = c.text, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                        Text("Invest on Thursday, the 12th", color = c.sub, fontSize = 7.5.sp)
                    }
                }
            }
            Spacer(Modifier.width(14.dp))
            // ---- steps ----
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(44.dp).rotate(ring).scale(1f + .06f * pulse * (if (ring != 0f) 1f else 0f)).clip(CircleShape).background(c.accent.copy(alpha = .1f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Outlined.NotificationsActive, null, tint = c.accent, modifier = Modifier.size(24.dp))
                }
                Step(Icons.Outlined.CalendarMonth, "Date published", "by the 25th of each month", steps[0])
                Step(Icons.Outlined.NotificationsActive, "Reminder", "2 days before, on your phone", steps[1])
                Step(Icons.Outlined.PhoneAndroid, "You invest", "in your own app or broker", steps[2])
            }
        }
    }
}

@Composable
private fun Step(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, sub: String, p: Float) {
    val c = Ma.c
    Row(Modifier.alpha(.35f + .65f * p), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(26.dp).clip(CircleShape).background(if (p >= 1f) c.up else c.surface2), contentAlignment = Alignment.Center) {
            Icon(if (p >= 1f) Icons.Outlined.CheckCircle else icon, null, tint = if (p >= 1f) Color.White else c.muted, modifier = Modifier.size(15.dp))
        }
        Spacer(Modifier.width(7.dp))
        Column {
            Text(title, color = c.text, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text(sub, color = c.muted, fontSize = 10.sp, lineHeight = 12.sp)
        }
    }
}

@Composable
private fun MiniCalendar(best: Int, today: Int, glow: Float) {
    val c = Ma.c
    Row(Modifier.fillMaxWidth()) { listOf("S", "M", "T", "W", "T", "F", "S").forEach { Text(it, Modifier.weight(1f), color = c.muted, fontSize = 7.sp, textAlign = TextAlign.Center) } }
    val first = 0  // November 2026 starts on a Sunday
    (List(first) { 0 } + (1..30).toList()).chunked(7).forEach { week ->
        Row(Modifier.fillMaxWidth().padding(vertical = 1.dp)) {
            (0 until 7).forEach { k ->
                val d = week.getOrNull(k) ?: 0
                Box(Modifier.weight(1f).height(18.dp).padding(1.dp), contentAlignment = Alignment.Center) {
                    if (d > 0) {
                        val isBest = d == best
                        Box(
                            Modifier.fillMaxSize().clip(RoundedCornerShape(5.dp))
                                .then(if (isBest) Modifier.background(Gold.copy(alpha = .75f + .25f * glow)) else Modifier)
                                .then(if (d == today) Modifier.border(1.dp, c.text, RoundedCornerShape(5.dp)) else Modifier),
                            contentAlignment = Alignment.Center,
                        ) { Text("$d", color = if (isBest) Color(0xFF3B2405) else c.text, fontSize = 7.5.sp, fontWeight = if (isBest) FontWeight.ExtraBold else FontWeight.Medium) }
                    }
                }
            }
        }
    }
}
