package com.modalpha.app.ui.welcome

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.R
import com.modalpha.app.ui.components.Gold
import com.modalpha.app.ui.components.GoldDeep
import com.modalpha.app.ui.components.GlassCard
import com.modalpha.app.ui.components.StatBlock
import com.modalpha.app.ui.components.UpChip
import com.modalpha.app.ui.theme.Ma
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Welcome animation B — "Buy when it's cheaper".
 * Six months of a realistic NAV line draw in from left to right inside a chart card. Each month a grey dot buys on the
 * 1st and a gold dot buys on the cheaper mid-month day; the unit counters grow as the line reaches each buy.
 */
private const val DAYS = 22                      // trading days a month
private const val MONTHS = 6
private const val BEST = 8                       // trading-day index of the mid-month dip (~12th)
private val NAV: List<Double> by lazy {
    val rnd = java.util.Random(7)
    var noise = 0.0
    List(MONTHS * DAYS) { i ->
        val m = i / DAYS; val d = i % DAYS
        noise = noise * .85 + rnd.nextGaussian() * .12
        val dip = -1.9 * kotlin.math.exp(-((d - BEST) * (d - BEST)) / 14.0)   // the mid-month dip
        100 + i * .05 + dip + noise + if (m == 3) -.8 else 0.0
    }
}

@Composable
fun WaveWelcome(modifier: Modifier = Modifier, autoPlay: Boolean = true) {
    val tr = rememberInfiniteTransition(label = "wave")
    val cycle by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(7000, easing = LinearEasing)), label = "t")
    val pulse by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(1200), RepeatMode.Reverse), label = "p")
    val prog = if (autoPlay) (cycle / .65f).coerceIn(0f, 1f) else 1f             // draw for 65% of the loop, then hold
    val measurer = rememberTextMeasurer()
    val c = Ma.c
    val grey = Color(0xFFB8C2D6); val line = Color(0xFFA9C4F5)
    val shown = (prog * (NAV.size - 1)).toInt()
    var u1 = 0.0; var u2 = 0.0
    for (m in 0 until MONTHS) { if (m * DAYS <= shown) u1 += 10000 / NAV[m * DAYS]; if (m * DAYS + BEST <= shown) u2 += 10000 / NAV[m * DAYS + BEST] }
    val more = if (u1 > 0) (u2 / u1 - 1) * 100 else 0.0
    val months = listOf("Jun", "Jul", "Aug", "Sep", "Oct", "Nov")
    Column(modifier.padding(horizontal = 20.dp)) {
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Color.White.copy(alpha = .05f)).border(1.dp, Color.White.copy(alpha = .1f), RoundedCornerShape(22.dp)).padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("₹10,000 every month", color = c.chromeText, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text("Same fund · same amount · different day", color = c.chromeMuted, fontSize = 11.5.sp)
                }
                Text("NAV", color = c.chromeMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            }
            Spacer(Modifier.height(10.dp))
            Canvas(Modifier.fillMaxWidth().height(200.dp)) {
                val W = size.width; val labelH = 16.dp.toPx(); val H = size.height - labelH
                val lo = NAV.min() - .8; val hi = NAV.max() + .8
                fun px(i: Int) = W * i / (NAV.size - 1)
                fun py(v: Double) = (H * (1 - (v - lo) / (hi - lo))).toFloat()
                // grid + month labels
                for (k in 1..3) drawLine(Color.White.copy(alpha = .06f), Offset(0f, H * k / 4), Offset(W, H * k / 4), 1f)
                for (m in 0 until MONTHS) {
                    val x = px(m * DAYS)
                    if (m > 0) drawLine(Color.White.copy(alpha = .05f), Offset(x, 0f), Offset(x, H), 1f)
                    val tl = measurer.measure(months[m], TextStyle(color = c.chromeMuted, fontSize = 10.sp)); drawText(tl, topLeft = Offset(x + 4.dp.toPx(), H + 3.dp.toPx()))
                }
                if (shown < 1) return@Canvas
                val p = Path(); p.moveTo(0f, py(NAV[0])); for (i in 1..shown) p.lineTo(px(i), py(NAV[i]))
                val area = Path().apply { addPath(p); lineTo(px(shown), H); lineTo(0f, H); close() }
                drawPath(area, Brush.verticalGradient(listOf(line.copy(alpha = .16f), Color.Transparent), startY = 0f, endY = H))
                drawPath(p, line, style = Stroke(1.8.dp.toPx(), cap = StrokeCap.Round))
                // buys
                for (m in 0 until MONTHS) {
                    val i1 = m * DAYS; val ib = m * DAYS + BEST
                    if (i1 <= shown) { drawCircle(c.chrome2, 5.dp.toPx(), Offset(px(i1), py(NAV[i1]))); drawCircle(grey, 3.5.dp.toPx(), Offset(px(i1), py(NAV[i1]))) }
                    if (ib <= shown) {
                        val o = Offset(px(ib), py(NAV[ib]))
                        val fresh = shown - ib < 6
                        drawCircle(Gold.copy(alpha = if (fresh) .35f else .12f + .1f * pulse), (if (fresh) 11 else 8).dp.toPx(), o)
                        drawCircle(c.chrome2, 5.5.dp.toPx(), o); drawCircle(Gold, 4.dp.toPx(), o)
                        // dashed drop showing how much cheaper than the 1st
                        if (NAV[ib] < NAV[i1]) drawLine(Gold.copy(alpha = .45f), Offset(px(ib), py(NAV[i1])), o, 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(4f, 4f)))
                    }
                }
                // live end point
                val e = Offset(px(shown), py(NAV[shown])); drawCircle(line.copy(alpha = .25f), 7.dp.toPx(), e); drawCircle(Color.White, 3.dp.toPx(), e)
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).clip(CircleShape).background(grey)); Spacer(Modifier.width(5.dp)); Text("Buy on the 1st", color = c.chromeSub, fontSize = 11.sp)
                Spacer(Modifier.width(14.dp))
                Box(Modifier.size(8.dp).clip(CircleShape).background(Gold)); Spacer(Modifier.width(5.dp)); Text("Buy on Mod Alpha date", color = c.chromeSub, fontSize = 11.sp)
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            GlassCard(Modifier.weight(1f)) { StatBlock("On the 1st", "%,.0f".format(u1), "units bought", valueSize = 18) }
            GlassCard(Modifier.weight(1f), gold = true) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Box(Modifier.weight(1f)) { StatBlock("Mod Alpha date", "%,.0f".format(u2), "units bought", valueColor = Gold, valueSize = 18) }
                    if (more > 0.05) Box(Modifier.padding(bottom = 2.dp)) { UpChip("%.1f%%".format(more)) }
                }
            }
        }
    }
}

/**
 * Lock / returning-user animation D — "The date, unlocked".
 * A safe dial with days 1–28 spins, slows and clicks onto `day` under the gold pointer (with a haptic tick).
 * `day` = null → lands on 1 and shows "?" in the badge (no date known on this phone yet).
 */
@Composable
fun DialLock(day: Int?, month: String?, modifier: Modifier = Modifier, play: Boolean = true) {
    val haptic = LocalHapticFeedback.current
    val target = ((day ?: 1) - 1) / 28f * 360f
    val rot = remember { Animatable(if (play) target - 720f - 140f else target) }
    var landed by remember { mutableStateOf(!play) }
    LaunchedEffect(day) {
        if (play) {
            rot.snapTo(target - 720f - 140f)
            rot.animateTo(target, tween(2600, easing = CubicBezierEasing(.16f, .84f, .3f, 1f)))
            haptic.performHapticFeedback(HapticFeedbackType.LongPress); landed = true
        }
    }
    val measurer = rememberTextMeasurer()
    val c = Ma.c
    Box(modifier, contentAlignment = Alignment.TopCenter) {
        Box(Modifier.padding(top = 14.dp).size(290.dp).shadow(30.dp, CircleShape, spotColor = Color.Black).clip(CircleShape)
            .background(Brush.radialGradient(listOf(c.mesh1, c.chrome2))).border(1.dp, Color(0x669CC2FF), CircleShape), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxSize()) {
                val cx = size.width / 2; val cy = size.height / 2; val R = size.width / 2
                for (i in 0 until 84) {
                    val a = Math.toRadians((i / 84f * 360f - rot.value - 90f).toDouble()); val major = i % 3 == 0
                    val r1 = R - 6.dp.toPx(); val r2 = r1 - (if (major) 12 else 6).dp.toPx()
                    drawLine(Color(0xFF9CC2FF).copy(alpha = if (major) .7f else .35f), Offset(cx + (r1 * cos(a)).toFloat(), cy + (r1 * sin(a)).toFloat()), Offset(cx + (r2 * cos(a)).toFloat(), cy + (r2 * sin(a)).toFloat()), (if (major) 2f else 1.2f).dp.toPx())
                }
                for (d in 1..28) {
                    val a = Math.toRadians(((d - 1) / 28f * 360f - rot.value - 90f).toDouble()); val r = R - 38.dp.toPx()
                    val best = landed && day != null && d == day
                    val tl = measurer.measure("$d", TextStyle(color = if (best) Gold else Color(0xFF9FB3DD), fontSize = if (best) 16.sp else 11.sp, fontWeight = if (best) FontWeight.Black else FontWeight.Bold))
                    drawText(tl, topLeft = Offset(cx + (r * cos(a)).toFloat() - tl.size.width / 2f, cy + (r * sin(a)).toFloat() - tl.size.height / 2f))
                }
            }
            // knob with the α
            Box(Modifier.size(140.dp).shadow(14.dp, CircleShape).clip(CircleShape).background(Brush.sweepGradient(listOf(c.hi2, c.hi, c.hi2, c.mesh2, c.hi2))).rotate(rot.value * .25f), contentAlignment = Alignment.Center) {
                Box(Modifier.size(104.dp).clip(CircleShape).background(Brush.radialGradient(listOf(c.chrome, c.chrome2))).border(1.dp, Gold.copy(alpha = .4f), CircleShape).rotate(-rot.value * .25f), contentAlignment = Alignment.Center) {
                    Image(painterResource(R.drawable.brand_mark), "Mod Alpha", Modifier.size(58.dp))
                }
            }
        }
        // gold pointer
        Canvas(Modifier.size(22.dp, 18.dp)) {
            val p = Path().apply { moveTo(0f, 0f); lineTo(size.width, 0f); lineTo(size.width / 2, size.height); close() }
            drawPath(p, Brush.verticalGradient(listOf(Gold, GoldDeep)))
        }
        Box(Modifier.padding(top = 318.dp)) {
            Text(
                if (!landed) "Finding this month's date…" else if (day != null) "🔓  Unlocked · ${day}${sfx(day)} ${month ?: ""}".trim() else "This month's date is ready",
                Modifier.clip(CircleShape).background(Gold.copy(alpha = .16f)).border(1.dp, Gold.copy(alpha = .35f), CircleShape).padding(horizontal = 14.dp, vertical = 7.dp),
                color = Gold, fontSize = 13.sp, fontWeight = FontWeight.Bold,
            )
        }
    }
}

private fun sfx(n: Int) = when { n % 100 in 11..13 -> "th"; n % 10 == 1 -> "st"; n % 10 == 2 -> "nd"; n % 10 == 3 -> "rd"; else -> "th" }

/** Centred "Welcome back" block used by the returning Welcome screen and the Lock screen. */
@Composable
fun WelcomeBack(name: String, sub: String) {
    val c = Ma.c
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(52.dp).clip(CircleShape).background(c.hiBrush).border(2.dp, Gold.copy(alpha = .7f), CircleShape), contentAlignment = Alignment.Center) {
            Text(name.trim().take(1).uppercase(), color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
        }
        Spacer(Modifier.height(10.dp))
        Text("WELCOME BACK", color = Gold, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
        Text(name, color = c.chromeText, fontSize = 28.sp, fontWeight = FontWeight.Black)
        Text(sub, color = c.chromeSub, fontSize = 13.5.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}
