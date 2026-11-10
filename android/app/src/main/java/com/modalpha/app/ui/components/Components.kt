package com.modalpha.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.modalpha.app.R
import com.modalpha.app.ui.theme.Ma

/** Rounded card with the theme's surface and hairline border. */
@Composable
fun MaCard(modifier: Modifier = Modifier, padding: Dp = 16.dp, content: @Composable () -> Unit) {
    Box(
        modifier
            .clip(RoundedCornerShape(20.dp))
            .background(Ma.c.surface)
            .border(1.dp, Ma.c.line, RoundedCornerShape(20.dp))
            .padding(padding)
    ) { content() }
}

/** The Mod Alpha α mark (gold) — used on Login and as the avatar fallback. */
@Composable
fun BrandMark(size: Dp, modifier: Modifier = Modifier, dark: Boolean = false) {
    Box(modifier.size(size).clip(RoundedCornerShape(size * 0.26f)).background(if (dark) Ma.c.chrome2 else Ma.c.surface).border(1.dp, if (dark) Ma.c.chromeLine else Ma.c.line, RoundedCornerShape(size * 0.26f)), contentAlignment = Alignment.Center) {
        Image(painterResource(R.drawable.brand_mark), contentDescription = "Mod Alpha", Modifier.size(size * 0.7f))
    }
}

/** Fund-house logo by AMC name; a lettered circle when we have no logo file. */
@Composable
fun AmcLogo(amc: String, size: Dp = 36.dp) {
    val res = when {
        amc.contains("quant", true) -> R.drawable.amc_quant
        amc.contains("sbi", true) -> R.drawable.amc_sbi
        amc.contains("hdfc", true) -> R.drawable.amc_hdfc
        amc.contains("ppfas", true) || amc.contains("parag", true) -> R.drawable.amc_ppfas
        amc.contains("axis", true) -> R.drawable.amc_axis
        else -> null
    }
    Box(Modifier.size(size).clip(RoundedCornerShape(10.dp)).background(Color.White).border(1.dp, Ma.c.line, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
        if (res != null) Image(painterResource(res), contentDescription = amc, Modifier.size(size * 0.72f))
        else Text(amc.take(1).uppercase(), color = Color(0xFF334155), fontWeight = FontWeight.Bold)
    }
}

/** Thin line chart with a soft fill, for fund cards. */
@Composable
fun Sparkline(values: List<Double>, color: Color, modifier: Modifier = Modifier) {
    if (values.size < 2) { Spacer(modifier); return }
    Canvas(modifier) {
        val min = values.min(); val max = values.max(); val span = (max - min).takeIf { it > 0 } ?: 1.0
        val pts = values.mapIndexed { i, v -> Offset(size.width * i / (values.size - 1), (size.height * (1 - (v - min) / span)).toFloat() * 0.9f + size.height * 0.05f) }
        val line = Path().apply { moveTo(pts[0].x, pts[0].y); pts.drop(1).forEach { lineTo(it.x, it.y) } }
        val fill = Path().apply { addPath(line); lineTo(size.width, size.height); lineTo(0f, size.height); close() }
        drawPath(fill, Brush.verticalGradient(listOf(color.copy(alpha = .28f), color.copy(alpha = 0f))))
        drawPath(line, color, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        drawCircle(color, 3.dp.toPx(), pts.last())
    }
}

/** Same loader size everywhere (the website's 34px orb). */
@Composable
fun Loader(modifier: Modifier = Modifier, label: String? = null) {
    Box(modifier, contentAlignment = Alignment.Center) {
        androidx.compose.foundation.layout.Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(Modifier.size(34.dp), color = Ma.c.accent, strokeWidth = 3.dp, trackColor = Ma.c.line)
            if (label != null) Text(label, Modifier.padding(top = 12.dp), color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

/** Red-tinted message row for errors. */
@Composable
fun ErrorBanner(text: String, modifier: Modifier = Modifier) {
    Row(
        modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Ma.c.down.copy(alpha = .12f)).padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.ErrorOutline, null, tint = Ma.c.down, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(text, color = Ma.c.down, style = MaterialTheme.typography.bodyMedium)
    }
}

/** Small rounded label (plan name, "AI"). */
@Composable
fun Pill(text: String, bg: Color, fg: Color, modifier: Modifier = Modifier) {
    Text(text, modifier.clip(CircleShape).background(bg).padding(horizontal = 10.dp, vertical = 4.dp), color = fg, style = MaterialTheme.typography.labelSmall)
}

@Composable fun VSpace(h: Dp) = Spacer(Modifier.height(h))
