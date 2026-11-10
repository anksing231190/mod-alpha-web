package com.modalpha.app.ui.welcome

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
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.R
import com.modalpha.app.ui.theme.Ma
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.random.Random

/**
 * The animated "about Mod Alpha" background used behind Welcome and the fingerprint lock:
 *  • a slowly drifting network of data points (the market data we analyse),
 *  • the gold α in the middle with the days of the month orbiting it — the best day (12) glows,
 *  • two soft colour glows that wander.
 * `orbitY` is where the α sits, as a fraction of the height.
 */
@Composable
fun MaBackdrop(modifier: Modifier = Modifier, orbitY: Float = .34f, bestDay: Int = 12, markSize: Dp = 92.dp) {
    val c = Ma.c
    val tr = rememberInfiniteTransition(label = "backdrop")
    val t by tr.animateFloat(0f, 1f, infiniteRepeatable(tween(60_000, easing = LinearEasing)), label = "t")       // 60 s cycle
    val pulse by tr.animateFloat(.92f, 1.06f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "pulse")
    val measurer = rememberTextMeasurer()
    val dots = remember { val r = Random(7); List(38) { floatArrayOf(r.nextFloat(), r.nextFloat(), r.nextFloat() * 6.28f, .4f + r.nextFloat()) } }
    val gold = c.gold

    BoxWithConstraints(modifier.fillMaxSize().background(c.chromeBrush)) {
        Canvas(Modifier.fillMaxSize()) {
            val W = size.width; val H = size.height; val tau = t * 2 * PI.toFloat()
            // wandering glows
            drawCircle(Brush.radialGradient(listOf(c.glow.copy(alpha = .30f), Color.Transparent),
                center = Offset(W * (.3f + .15f * sin(tau * 2)), H * (.25f + .06f * cos(tau * 3))), radius = W * .8f), radius = W * .8f,
                center = Offset(W * (.3f + .15f * sin(tau * 2)), H * (.25f + .06f * cos(tau * 3))))
            drawCircle(Brush.radialGradient(listOf(c.hi2.copy(alpha = .22f), Color.Transparent),
                center = Offset(W * (.8f - .12f * cos(tau * 2)), H * (.55f + .05f * sin(tau * 4))), radius = W * .7f), radius = W * .7f,
                center = Offset(W * (.8f - .12f * cos(tau * 2)), H * (.55f + .05f * sin(tau * 4))))
            // data network
            val pts = dots.map { d -> Offset(W * (d[0] + .04f * sin(tau * 3 * d[3] + d[2])), H * (d[1] + .03f * cos(tau * 2 * d[3] + d[2]))) }
            val link = 110.dp.toPx(); val dotCol = c.chromeSub
            for (i in pts.indices) for (j in i + 1 until pts.size) {
                val dd = hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
                if (dd < link) drawLine(dotCol.copy(alpha = .16f * (1 - dd / link)), pts[i], pts[j], 1.dp.toPx())
            }
            pts.forEachIndexed { i, p -> drawCircle(dotCol.copy(alpha = .25f + .35f * dots[i][3] / 1.4f), (1.2f + dots[i][3] * 1.4f).dp.toPx(), p) }

            // orbit of dates
            val cx = W / 2; val cy = H * orbitY; val R = W * .36f
            drawCircle(c.chromeLine, R, Offset(cx, cy), style = Stroke(1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 6.dp.toPx()))))
            drawCircle(c.chromeLine.copy(alpha = c.chromeLine.alpha * .7f), R * .68f, Offset(cx, cy), style = Stroke(1.dp.toPx()))
            for (d in 1..28) {
                val a = (d - 1) / 28f * 2 * PI.toFloat() + tau * 1.5f - PI.toFloat() / 2
                val p = Offset(cx + R * cos(a), cy + R * sin(a))
                if (d == bestDay) {
                    drawCircle(Brush.radialGradient(listOf(gold.copy(alpha = .55f), Color.Transparent), center = p, radius = 30.dp.toPx() * pulse), 30.dp.toPx() * pulse, p)
                    drawCircle(gold, 15.dp.toPx(), p)
                    val tl = measurer.measure("$d", TextStyle(color = Color(0xFF2B1D0E), fontSize = 13.sp, fontWeight = FontWeight.ExtraBold))
                    drawText(tl, topLeft = Offset(p.x - tl.size.width / 2f, p.y - tl.size.height / 2f))
                } else {
                    val tl = measurer.measure("$d", TextStyle(color = c.chromeMuted, fontSize = 10.sp, fontWeight = FontWeight.Medium))
                    drawText(tl, topLeft = Offset(p.x - tl.size.width / 2f, p.y - tl.size.height / 2f))
                }
            }
        }
        // the α mark, breathing slightly
        Box(
            Modifier.align(Alignment.TopCenter).offset(y = maxHeight * orbitY - markSize / 2).size(markSize).scale(.97f + (pulse - .92f) * .4f)
                .clip(RoundedCornerShape(markSize * .28f)).background(c.chrome2).border(1.dp, c.chromeLine, RoundedCornerShape(markSize * .28f)),
            contentAlignment = Alignment.Center,
        ) { Image(painterResource(R.drawable.brand_mark), "Mod Alpha", Modifier.size(markSize * .68f)) }
    }
}
