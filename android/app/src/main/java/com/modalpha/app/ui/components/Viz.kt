package com.modalpha.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.ui.theme.Ma
import kotlin.math.cos
import kotlin.math.sin

/* Visual building blocks of the redesign: glowing "mesh" headers, glass cards, rings, donuts, bar strips, gauges. */

val Gold = Color(0xFFF0C674)
val GoldDeep = Color(0xFFD97706)
val Mint = Color(0xFF34D399)
val Emerald = Color(0xFF10B981)
/** Muted tones for charts: realistic, not neon. */
val SoftUp = Color(0xFF8CCFB2)
val SoftGood = Color(0xFF5FB894)
val SoftDown = Color(0xFFDB8C8C)
val SoftGold = Color(0xFFE2BF7A)

/** Dark header with two colour glows and a faint dot grid; rounded bottom. Content goes below the status bar. */
@Composable
fun MeshHero(modifier: Modifier = Modifier, bottomPad: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) {
    val c = Ma.c
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(bottomStart = 30.dp, bottomEnd = 30.dp))
            .background(Brush.verticalGradient(listOf(c.chrome, c.chrome2)))
            .drawBehind {
                drawCircle(Brush.radialGradient(listOf(c.mesh1, Color.Transparent), center = Offset(size.width * .1f, 0f), radius = size.width * 1.0f), size.width * 1.0f, Offset(size.width * .1f, 0f))
                drawCircle(Brush.radialGradient(listOf(c.mesh2.copy(alpha = .9f), Color.Transparent), center = Offset(size.width, size.height * .3f), radius = size.width * .8f), size.width * .8f, Offset(size.width, size.height * .3f))
                val step = 22.dp.toPx(); var y = step / 2
                while (y < size.height * .85f) { var x = step / 2; val a = .06f * (1 - y / size.height); while (x < size.width) { drawCircle(Color.White.copy(alpha = a), 1.dp.toPx(), Offset(x, y)); x += step }; y += step }
            }
            .statusBarsPadding().padding(bottom = bottomPad),
        content = content,
    )
}

/** Frosted card for use on dark headers. */
@Composable
fun GlassCard(modifier: Modifier = Modifier, gold: Boolean = false, content: @Composable BoxScope.() -> Unit) =
    Box(modifier.clip(RoundedCornerShape(18.dp)).background(Color.White.copy(alpha = .07f)).border(1.dp, if (gold) Gold.copy(alpha = .45f) else Color.White.copy(alpha = .12f), RoundedCornerShape(18.dp)).padding(12.dp), content = content)

/** Progress ring with a gradient arc; `center` is drawn inside. */
@Composable
fun Ring(pct: Float, size: Dp, stroke: Dp, colors: List<Color>, track: Color = Color.White.copy(alpha = .12f), center: @Composable BoxScope.() -> Unit = {}) {
    Box(Modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size)) {
            val s = stroke.toPx(); val r = Size(this.size.width - s, this.size.height - s); val o = Offset(s / 2, s / 2)
            drawArc(track, 0f, 360f, false, o, r, style = Stroke(s))
            drawArc(Brush.sweepGradient(colors + colors.first()), -90f, 360f * pct.coerceIn(0f, 1f), false, o, r, style = Stroke(s, cap = StrokeCap.Round))
        }
        center()
    }
}

/** Donut chart (values with colours). */
@Composable
fun Donut(parts: List<Pair<Float, Color>>, size: Dp, stroke: Dp, center: @Composable BoxScope.() -> Unit = {}) {
    Box(Modifier.size(size), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(size)) {
            val s = stroke.toPx(); val tot = parts.sumOf { it.first.toDouble() }.toFloat().takeIf { it > 0 } ?: 1f
            var start = -90f
            parts.forEach { (v, col) -> val sweep = 360f * v / tot; drawArc(col, start + 1.5f, (sweep - 3f).coerceAtLeast(.5f), false, Offset(s / 2, s / 2), Size(this.size.width - s, this.size.height - s), style = Stroke(s)); start += sweep }
        }
        center()
    }
}

/** Vertical bar strip; `hi` (gold, glowing) and `good` (green) are 0-based indexes. */
@Composable
fun BarStrip(values: List<Double>, modifier: Modifier, hi: Int? = null, good: Set<Int> = emptySet(), base: Color = Color.White.copy(alpha = .18f), gap: Dp = 3.dp, signed: Boolean = false) {
    if (values.isEmpty()) return
    Canvas(modifier) {
        val n = values.size; val g = gap.toPx(); val w = (size.width - g * (n - 1)) / n
        val lo = if (signed) 0.0 else values.min(); val hiV = values.maxOf { kotlin.math.abs(it) }.takeIf { it > 0 } ?: 1.0
        values.forEachIndexed { i, v ->
            val frac = if (signed) (kotlin.math.abs(v) / hiV).toFloat() else (.22f + .78f * ((v - lo) / ((values.max() - lo).takeIf { it > 0 } ?: 1.0)).toFloat())
            val h = (size.height * frac).coerceAtLeast(3.dp.toPx()); val x = i * (w + g)
            val brush = when {
                i == hi -> SolidColor(SoftGold)
                i in good -> SolidColor(SoftGood.copy(alpha = .85f))
                signed && v < 0 -> SolidColor(SoftDown)
                else -> SolidColor(base)
            }
            drawRoundRect(brush, Offset(x, size.height - h), Size(w, h), CornerRadius(4.dp.toPx(), 4.dp.toPx()))
        }
    }
}

/** SEBI-style riskometer: green → amber → red arc with a needle at `level` 1–5. */
@Composable
fun Riskometer(level: Int, modifier: Modifier = Modifier.size(84.dp, 50.dp), needle: Color = Ma.c.text) {
    Canvas(modifier) {
        val s = 9.dp.toPx(); val r = size.width / 2 - s
        drawArc(Brush.sweepGradient(listOf(Color(0xFF22C55E), Color(0xFFEAB308), Color(0xFFEF4444), Color(0xFF22C55E)), center = Offset(size.width / 2, size.height)),
            180f, 180f, false, Offset(s, size.height - r), Size(r * 2, r * 2), style = Stroke(s, cap = StrokeCap.Round))
        val a = Math.toRadians(180.0 + 180.0 * (level.coerceIn(1, 5) - .5) / 5)
        val cx = size.width / 2; val cy = size.height - s / 2
        drawLine(needle, Offset(cx, cy), Offset(cx + (r * .78f * cos(a)).toFloat(), cy + (r * .78f * sin(a)).toFloat()), 3.dp.toPx(), StrokeCap.Round)
        drawCircle(needle, 4.dp.toPx(), Offset(cx, cy))
    }
}

/** Return chip like "▲ +2.8% vs 1st" — on dark (mint) or light (green) backgrounds. */
@Composable
fun UpChip(text: String, dark: Boolean = true, up: Boolean = true) {
    val fg = if (up) (if (dark) Mint else Color(0xFF047857)) else (if (dark) Color(0xFFF87171) else Color(0xFFB91C1C))
    val bg = if (up) (if (dark) Emerald.copy(alpha = .16f) else Color(0xFFD1FAE5)) else Color(0xFFEF4444).copy(alpha = .14f)
    Text((if (up) "▲ " else "▼ ") + text, Modifier.clip(CircleShape).background(bg).padding(horizontal = 10.dp, vertical = 5.dp), color = fg, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, maxLines = 1)
}

/** Neutral chip on dark headers. */
@Composable
fun GhostChip(text: String, gold: Boolean = false) =
    Text(text, Modifier.clip(CircleShape).background(if (gold) Gold.copy(alpha = .16f) else Color.White.copy(alpha = .08f)).border(1.dp, if (gold) Gold.copy(alpha = .4f) else Color.White.copy(alpha = .14f), CircleShape).padding(horizontal = 10.dp, vertical = 5.dp),
        color = if (gold) Gold else Ma.c.chromeSub, fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)

/** Small "label over value" block used in glass cards. */
@Composable
fun StatBlock(label: String, value: String, sub: String? = null, valueColor: Color = Ma.c.chromeText, subColor: Color = Ma.c.chromeSub, valueSize: Int = 20) {
    Column {
        Text(label.uppercase(), color = Ma.c.chromeMuted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, maxLines = 1)
        Text(value, color = valueColor, fontSize = valueSize.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1)
        if (sub != null) Text(sub, color = subColor, fontSize = 11.sp, maxLines = 1)
    }
}

/** Horizontal comparison bar (value 0..1) with a label above. */
@Composable
fun LabeledBar(label: String, frac: Float, brush: Brush, track: Color = Color(0xFFE2E8F0)) {
    Column(Modifier.fillMaxWidth()) {
        Text(label, color = Ma.c.muted, fontSize = 11.sp)
        Box(Modifier.padding(top = 3.dp).fillMaxWidth().height(9.dp).clip(CircleShape).background(track)) {
            Box(Modifier.fillMaxWidth(frac.coerceIn(0.02f, 1f)).height(9.dp).clip(CircleShape).background(brush))
        }
    }
}

@Composable fun HSpace(w: Dp) = Spacer(Modifier.width(w))

/** Line path helper for custom canvases (values scaled into the given height). */
fun linePath(values: List<Double>, w: Float, h: Float, pad: Float = 6f, lo0: Double? = null, hi0: Double? = null): Path {
    val lo = lo0 ?: values.min(); val hi = hi0 ?: values.max(); val span = (hi - lo).takeIf { it > 0 } ?: 1.0
    return Path().apply { values.forEachIndexed { i, v -> val x = w * i / (values.size - 1).coerceAtLeast(1); val y = (h - pad - (h - 2 * pad) * ((v - lo) / span)).toFloat(); if (i == 0) moveTo(x, y) else lineTo(x, y) } }
}

@Composable fun RowSpacer() = Row {}
