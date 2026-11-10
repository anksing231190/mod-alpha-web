package com.modalpha.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.ui.theme.Ma

/** One line on a [GridChart]. */
data class ChartSeries(val values: List<Double>, val color: Color, val dashed: Boolean = false, val fill: Boolean = false)

/**
 * The app's standard chart (same look as the website): a light checkered background, faint grid lines,
 * value labels on the left, x labels along the bottom, lines drawn on top. The last point of the first series
 * gets a dot.
 */
@Composable
fun GridChart(
    series: List<ChartSeries>,
    xLabels: List<String>,
    modifier: Modifier = Modifier,
    yFormat: (Double) -> String = { "%.0f".format(it) },
    rows: Int = 4,
) {
    val c = Ma.c
    val measurer = rememberTextMeasurer()
    val labelStyle = TextStyle(color = c.muted, fontSize = 10.sp)
    val square = if (c.dark) Color.White.copy(alpha = .035f) else Color(0xFF5A4634).copy(alpha = .045f)
    val line = if (c.dark) Color.White.copy(alpha = .08f) else Color(0xFF5A4634).copy(alpha = .10f)
    Canvas(modifier) {
        val all = series.flatMap { it.values }
        if (all.size < 2) return@Canvas
        var lo = all.min(); var hi = all.max()
        val pad = (hi - lo) * .08; lo = (lo - pad).coerceAtLeast(0.0); hi += pad
        val yLabelW = 40.dp.toPx(); val xLabelH = 18.dp.toPx()
        val left = yLabelW; val top = 4.dp.toPx(); val w = size.width - left; val h = size.height - xLabelH - top

        // checkered background: square cells, every other one tinted
        val cols = (rows * w / h).toInt().coerceAtLeast(4)
        val cw = w / cols; val ch = h / rows
        for (r in 0 until rows) for (k in 0 until cols) if ((r + k) % 2 == 0)
            drawRect(square, Offset(left + k * cw, top + r * ch), Size(cw, ch))
        for (r in 0..rows) {
            val y = top + r * ch
            drawLine(line, Offset(left, y), Offset(left + w, y), 1f)
            val v = hi - (hi - lo) * r / rows
            drawLabel(measurer, yFormat(v), labelStyle, Offset(0f, y), alignRight = yLabelW - 6.dp.toPx())
        }
        for (k in 0..cols) drawLine(line, Offset(left + k * cw, top), Offset(left + k * cw, top + h), 1f)
        if (xLabels.isNotEmpty()) xLabels.forEachIndexed { i, s ->
            val x = left + w * i / (xLabels.size - 1).coerceAtLeast(1)
            val t = measurer.measure(s, labelStyle)
            drawText(t, topLeft = Offset((x - t.size.width / 2f).coerceIn(left, size.width - t.size.width), top + h + 4.dp.toPx()))
        }

        fun pts(v: List<Double>) = v.mapIndexed { i, d -> Offset(left + w * i / (v.size - 1), top + (h * (1 - (d - lo) / (hi - lo))).toFloat()) }
        series.reversed().forEach { s ->
            if (s.values.size < 2) return@forEach
            val p = pts(s.values)
            val path = Path().apply { moveTo(p[0].x, p[0].y); p.drop(1).forEach { lineTo(it.x, it.y) } }
            if (s.fill) {
                val f = Path().apply { addPath(path); lineTo(p.last().x, top + h); lineTo(p[0].x, top + h); close() }
                drawPath(f, Brush.verticalGradient(listOf(s.color.copy(alpha = .30f), s.color.copy(alpha = 0f)), startY = top, endY = top + h))
            }
            drawPath(path, s.color, style = Stroke(
                width = (if (s.dashed) 1.6f else 2.4f).dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round,
                pathEffect = if (s.dashed) PathEffect.dashPathEffect(floatArrayOf(5.dp.toPx(), 4.dp.toPx())) else null,
            ))
        }
        series.firstOrNull()?.let { s ->
            val e = pts(s.values).last()
            drawCircle(s.color.copy(alpha = .25f), 7.dp.toPx(), e)
            drawCircle(s.color, 3.5.dp.toPx(), e)
        }
        drawRoundRect(line, Offset(left, top), Size(w, h), CornerRadius(0f), style = Stroke(1f))
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawLabel(m: TextMeasurer, s: String, style: TextStyle, at: Offset, alignRight: Float) {
    val t = m.measure(s, style)
    drawText(t, topLeft = Offset(alignRight - t.size.width, at.y - t.size.height / 2f))
}

/** ₹ amounts the Indian way: ₹38,420 · ₹8.4L · ₹1.2Cr. */
fun inr(v: Long): String = "₹" + java.text.NumberFormat.getIntegerInstance(java.util.Locale("en", "IN")).format(v)
fun inrShort(v: Double): String = when {
    v >= 1e7 -> "₹%.1fCr".format(v / 1e7)
    v >= 1e5 -> "₹%.1fL".format(v / 1e5).replace(".0L", "L")
    v >= 1e3 -> "₹%.0fK".format(v / 1e3)
    else -> "₹%.0f".format(v)
}
