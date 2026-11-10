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
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
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
 * A NAV line scrolls by like a live market; a grey dot buys on the 1st of each month, a gold dot buys on the best
 * day (the dip) and drops a coin. The two unit counters show the gold strategy pulling ahead.
 */
@Composable
fun WaveWelcome(modifier: Modifier = Modifier, autoPlay: Boolean = true) {
    val tr = rememberInfiniteTransition(label = "wave")
    val t by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(9000, easing = LinearEasing)), label = "t")
    val pulse by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(1400), RepeatMode.Reverse), label = "p")
    val measurer = rememberTextMeasurer()
    val c = Ma.c
    val grey = Color(0xFF94A3B8)
    val fixed = 1184 + (t * 60).toInt(); val ma = (fixed * 1.031).toInt()
    Box(modifier) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 22.dp)) {
            GlassCard(Modifier.weight(1f)) { StatBlock("Units · 1st", "%,d".format(fixed)) }
            Spacer(Modifier.width(10.dp))
            GlassCard(Modifier.weight(1f), gold = true) {
                Row(verticalAlignment = Alignment.Bottom) { StatBlock("Units · Mod Alpha", "%,d".format(ma), valueColor = Gold); Spacer(Modifier.width(6.dp)); Box(Modifier.padding(bottom = 4.dp)) { UpChip("3.1%") } }
            }
        }
        Canvas(Modifier.fillMaxWidth().height(300.dp).padding(top = 80.dp)) {
            val W = size.width; val H = size.height; val mid = H * .5f; val A = H * .26f
            val monthW = W / 3f; val shift = t * 3f                       // three months scroll past per loop
            fun v(m: Float) = (-cos(2 * PI * (m - 12f / 30f)) + .18 * sin(2 * PI * m * 3.1 + 1.3)).toFloat()
            fun y(x: Float) = mid - v(x / monthW + shift) * A
            // grid
            for (k in 1..3) drawLine(Color.White.copy(alpha = .06f), Offset(0f, H * k / 4), Offset(W, H * k / 4), 1f)
            // area + glow line
            val p = Path(); var x = 0f; p.moveTo(0f, y(0f)); while (x <= W) { p.lineTo(x, y(x)); x += 4f }
            val area = Path().apply { addPath(p); lineTo(W, H); lineTo(0f, H); close() }
            drawPath(area, Brush.verticalGradient(listOf(c.hi.copy(alpha = .40f), Color.Transparent)))
            for (k in 1..3) drawPath(p, c.hi.copy(alpha = .12f), style = Stroke((2f + k * 4).dp.toPx(), cap = StrokeCap.Round))
            drawPath(p, Color(0xFF93C5FD), style = Stroke(2.6.dp.toPx(), cap = StrokeCap.Round))
            // buys: the 1st (grey) and the best day (gold) of each visible month
            val months = listOf("Sep", "Oct", "Nov", "Dec", "Jan")
            for (k in -1..4) {
                val mStart = k - (shift % 1f); val label = months[((k + shift.toInt()) % months.size + months.size) % months.size]
                val x1 = mStart * monthW; val xb = (mStart + 11f / 30f) * monthW
                if (x1 in 0f..W) {
                    drawLine(grey.copy(alpha = .5f), Offset(x1, y(x1)), Offset(x1, H), 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 8f)))
                    drawCircle(grey, 5.dp.toPx(), Offset(x1, y(x1)))
                    val tl = measurer.measure(label, TextStyle(color = c.chromeMuted, fontSize = 10.sp)); drawText(tl, topLeft = Offset(x1 + 6.dp.toPx(), H - tl.size.height))
                }
                if (xb in 0f..W) {
                    val py = y(xb)
                    drawCircle(Gold.copy(alpha = .22f + .15f * pulse), (14 + 4 * pulse).dp.toPx(), Offset(xb, py))
                    drawCircle(Gold, 7.dp.toPx(), Offset(xb, py))
                    val tl = measurer.measure("12th · buy", TextStyle(color = Gold, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold)); drawText(tl, topLeft = Offset(xb - tl.size.width / 2f, py + 14.dp.toPx()))
                    // coin dropping into the buy point
                    val fall = ((xb / W) * 1.6f).coerceIn(0f, 1f)
                    val cy = py - 70.dp.toPx() * (1 - fall); if (fall < .98f) {
                        drawCircle(Brush.radialGradient(listOf(Color(0xFFFFF3C4), Gold, Color(0xFFB7791F)), center = Offset(xb - 3f, cy - 3f), radius = 12.dp.toPx()), 10.dp.toPx(), Offset(xb, cy))
                        val ct = measurer.measure("₹", TextStyle(color = Color(0xFF6B3F06), fontSize = 11.sp, fontWeight = FontWeight.Black)); drawText(ct, topLeft = Offset(xb - ct.size.width / 2f, cy - ct.size.height / 2f))
                    }
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
