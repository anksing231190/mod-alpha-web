package com.modalpha.app.ui.explore

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.data.AppPrefs
import com.modalpha.app.data.Insight
import com.modalpha.app.ui.LocalNav
import com.modalpha.app.ui.Route
import com.modalpha.app.ui.Tab
import com.modalpha.app.ui.components.Gold
import com.modalpha.app.ui.components.GoldDeep
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.kit.Chips
import com.modalpha.app.ui.kit.LoadBox
import com.modalpha.app.ui.kit.Res
import com.modalpha.app.ui.kit.Screen
import com.modalpha.app.ui.kit.rememberLoad
import com.modalpha.app.ui.theme.Ma

/* Insights: Instagram reels (open in Instagram) and articles (open in the reader below). */

const val INSTAGRAM_URL = "https://www.instagram.com/mod_alpha_/"
private val IG = listOf(Color(0xFFFEDA75), Color(0xFFFA7E1E), Color(0xFFD62976), Color(0xFF962FBF), Color(0xFF4F5BD5))
private val igBrush get() = Brush.linearGradient(IG)

/** The Instagram glyph (rounded square, lens, dot) in Instagram's gradient. */
@Composable
fun InstaIcon(size: Dp) = Canvas(Modifier.size(size)) {
    val s = this.size.width
    drawRoundRect(Brush.linearGradient(IG, start = Offset(0f, s), end = Offset(s, 0f)), size = Size(s, s), cornerRadius = CornerRadius(s * .27f))
    val st = Stroke(s * .08f)
    drawRoundRect(Color.White, Offset(s * .24f, s * .24f), Size(s * .52f, s * .52f), CornerRadius(s * .17f), style = st)
    drawCircle(Color.White, s * .13f, Offset(s / 2, s / 2), style = st)
    drawCircle(Color.White, s * .045f, Offset(s * .7f, s * .3f))
}

private fun openUrl(ctx: android.content.Context, url: String) = runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }

/** Topic of an article, from its title (shown as a coloured tag and thumbnail). */
private fun topic(i: Insight): Triple<String, Color, Color> {
    val t = (i.title + " " + i.body.take(200)).lowercase()
    return when {
        "date" in t || "day of" in t || "sip" in t && "timing" in t -> Triple("SIP TIMING", Color(0xFF1E3A8A), Color(0xFF3B82F6))
        "cap" in t || "fund" in t || "nav" in t -> Triple("FUNDS", Color(0xFF0F766E), Color(0xFF14B8A6))
        else -> Triple("BASICS", Color(0xFFB45309), Color(0xFFF59E0B))
    }
}

/** Light checkered pattern for chart-like banners and cards. */
private fun DrawScope.checks(alpha: Float, cell: Float) {
    var y = 0f; var r = 0
    while (y < size.height) { var x = 0f; var k = 0; while (x < size.width) { if ((r + k) % 2 == 0) drawRect(Color.White.copy(alpha = alpha), Offset(x, y), Size(cell, cell)); x += cell; k++ }; y += cell; r++ }
}
private fun DrawScope.wave(col: Color, seed: Int, dots: Boolean) {
    val n = 12; val pts = List(n) { i -> val v = .25f + .5f * i / n + .12f * kotlin.math.sin(i * 1.3f + seed).toFloat(); Offset(size.width * i / (n - 1), size.height * (1 - v)) }
    val p = Path().apply { moveTo(pts[0].x, pts[0].y); pts.drop(1).forEach { lineTo(it.x, it.y) } }
    drawPath(p, col, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
    if (dots) listOf(2, 7).forEach { drawCircle(Color(0xFFE0A63C), 3.5.dp.toPx(), pts[it]) }
}

@Composable
fun InsightsScreen() {
    val nav = LocalNav.current
    val ctx = LocalContext.current
    val c = Ma.c
    val items = rememberLoad { nav.repo.insights() }
    val prefs = remember { AppPrefs(ctx) }
    var seen by remember { mutableStateOf(prefs.seenInsights) }
    fun markSeen(id: Int) { seen = seen + id.toString(); prefs.seenInsights = seen }
    var tab by rememberSaveable { mutableStateOf("All") }
    Screen("Insights", onBack = nav::pop, header = {
        // follow card
        Row(Modifier.padding(horizontal = 18.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(16.dp))
            .clickable { openUrl(ctx, INSTAGRAM_URL) }.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            InstaIcon(36.dp); Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text("@mod_alpha_", color = c.text, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text("60-second reels on SIP timing", color = c.muted, fontSize = 12.sp)
            }
            Text("Follow", Modifier.clip(RoundedCornerShape(10.dp)).background(igBrush).padding(horizontal = 14.dp, vertical = 8.dp), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
        }
        VSpace(12.dp)
        Chips(listOf("All", "Reels", "Articles"), tab, { tab = it }, dark = true)
    }) {
        LoadBox(items) { list ->
            val reels = list.filter { it.kind == "instagram" }; val text = list.filter { it.kind != "instagram" }
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 28.dp)) {
                if (tab != "Articles" && reels.isNotEmpty()) {
                    // story rings: latest topics (coloured ring = not opened yet)
                    Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        reels.take(4).forEachIndexed { i, r ->
                            val new = r.id.toString() !in seen
                            Column(Modifier.width(72.dp).clickable { markSeen(r.id); r.url?.let { openUrl(ctx, it) } }, horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(Modifier.size(62.dp).clip(CircleShape).background(if (new) igBrush else Brush.linearGradient(listOf(c.line, c.line))).padding(3.dp)
                                    .clip(CircleShape).background(c.bg).padding(2.dp).clip(CircleShape).background(Brush.linearGradient(reelColors(i))), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Outlined.PlayArrow, null, tint = Color.White, modifier = Modifier.size(24.dp))
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(r.title, color = c.sub, fontSize = 10.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center)
                            }
                        }
                    }
                    // featured reel
                    val f = reels.first()
                    Text("Featured reel", Modifier.padding(start = 18.dp, bottom = 8.dp), color = c.text, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Box(Modifier.padding(horizontal = 18.dp).fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(igBrush).padding(2.5.dp)
                        .clip(RoundedCornerShape(18.dp)).background(Brush.linearGradient(listOf(Color(0xFF1E3A8A), Color(0xFF5B21B6)))).height(190.dp)
                        .drawBehind { checks(.06f, 22.dp.toPx()); wave(Color(0xFFA9C4F5), 1, true) }
                        .clickable { markSeen(f.id); f.url?.let { openUrl(ctx, it) } }) {
                        Row(Modifier.padding(10.dp).clip(RoundedCornerShape(8.dp)).background(Color.Black.copy(alpha = .3f)).padding(horizontal = 7.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            InstaIcon(14.dp); Spacer(Modifier.width(5.dp)); Text("Reel", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        Box(Modifier.align(Alignment.Center).size(52.dp).clip(CircleShape).background(Color.White.copy(alpha = .92f)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Outlined.PlayArrow, "Play", tint = Color(0xFF0F1A33), modifier = Modifier.size(30.dp))
                        }
                        Column(Modifier.align(Alignment.BottomStart).padding(12.dp)) {
                            Text(f.title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Text("${prettyDate(f.publishedAt)} · Watch on Instagram ↗", color = Color.White.copy(alpha = .8f), fontSize = 11.5.sp)
                        }
                    }
                    // more reels: three that always fit the width
                    val more = reels.drop(1).take(3)
                    if (more.isNotEmpty()) {
                        Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 18.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("More reels", color = c.text, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                            Text("See all on Instagram ↗", Modifier.clickable { openUrl(ctx, INSTAGRAM_URL) }, color = c.accent, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp)
                        }
                        Row(Modifier.padding(horizontal = 18.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            more.forEachIndexed { i, r ->
                                Box(Modifier.weight(1f).height(190.dp).clip(RoundedCornerShape(16.dp)).background(Brush.verticalGradient(reelColors(i + 1)))
                                    .clickable { markSeen(r.id); r.url?.let { openUrl(ctx, it) } }.padding(8.dp)) {
                                    InstaIcon(18.dp)
                                    Box(Modifier.align(Alignment.Center).size(34.dp).clip(CircleShape).background(Color.White.copy(alpha = .88f)), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Outlined.PlayArrow, "Play", tint = Color(0xFF0F1A33), modifier = Modifier.size(20.dp))
                                    }
                                    Text(r.title, Modifier.align(Alignment.BottomStart), color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, maxLines = 3, overflow = TextOverflow.Ellipsis, lineHeight = 15.sp)
                                }
                            }
                            if (more.size < 3) Column(Modifier.weight(1f).height(190.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFFFDF2F8)).border(1.dp, Color(0xFFF5D0E6), RoundedCornerShape(16.dp))
                                .clickable { openUrl(ctx, INSTAGRAM_URL) }.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                InstaIcon(34.dp); Spacer(Modifier.height(8.dp))
                                Text("See all on Instagram", color = Color(0xFF9D174D), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, textAlign = TextAlign.Center)
                            }
                            repeat((2 - more.size).coerceAtLeast(0)) { Spacer(Modifier.weight(1f)) }
                        }
                    }
                }
                if (tab != "Reels" && text.isNotEmpty()) {
                    Text("Read", Modifier.padding(start = 18.dp, top = 20.dp, bottom = 8.dp), color = c.text, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    text.forEachIndexed { i, t -> ArticleRow(t, i) { nav.push(Route.Article(t)) } }
                }
                // invite to follow
                Row(Modifier.padding(start = 18.dp, end = 18.dp, top = 14.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp))
                    .background(Brush.horizontalGradient(listOf(Color(0xFFFDF2F8), c.surface))).border(1.dp, Color(0xFFF5D0E6), RoundedCornerShape(16.dp))
                    .clickable { openUrl(ctx, INSTAGRAM_URL) }.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    InstaIcon(40.dp); Spacer(Modifier.width(12.dp))
                    Column {
                        Text("ON INSTAGRAM", color = Color(0xFF9D174D), fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                        Text("New reels every week. Follow @mod_alpha_", color = Color(0xFF0F1A33), fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp)
                    }
                }
            }
        }
    }
}

private fun reelColors(i: Int) = listOf(listOf(Color(0xFF1E3A8A), Color(0xFF5B21B6)), listOf(Color(0xFF0F766E), Color(0xFF1E3A8A)), listOf(Color(0xFF9A3412), Color(0xFF7C2D12)), listOf(Color(0xFF5B21B6), Color(0xFF1E3A8A)))[i % 4]

@Composable
private fun ArticleRow(t: Insight, i: Int, onClick: () -> Unit) {
    val c = Ma.c
    val (tag, c1, c2) = topic(t)
    Row(Modifier.padding(horizontal = 18.dp, vertical = 5.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(10.dp),
        verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(64.dp).clip(RoundedCornerShape(14.dp)).background(Brush.linearGradient(listOf(c1, c2))).drawBehind {
            checks(.08f, 10.dp.toPx())
            when (i % 3) {
                0 -> listOf(.35f, .55f, .8f, .5f).forEachIndexed { k, h -> drawRect(if (k == 2) Gold else Color.White.copy(alpha = .85f), Offset(size.width * (.15f + k * .2f), size.height * (.85f - h * .7f)), Size(size.width * .12f, size.height * h * .7f)) }
                1 -> wave(Color.White, i, false)
                else -> { drawCircle(Color.White, size.width * .26f, center, style = Stroke(2.5.dp.toPx())); drawCircle(Gold, size.width * .08f, center) }
            }
        })
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(tag, Modifier.clip(RoundedCornerShape(6.dp)).background(c2.copy(alpha = .15f)).padding(horizontal = 7.dp, vertical = 2.dp), color = c1, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = .6.sp)
            Spacer(Modifier.height(4.dp))
            Text(t.title, color = c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.5.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text("${(t.body.split(" ").size / 200).coerceAtLeast(1)} min read · ${prettyDate(t.publishedAt)}", color = c.muted, fontSize = 12.sp)
        }
    }
}

/** Article reader: checkered chart banner, tag, title, the key number pulled out, the text; Share and Ask α. */
@Composable
fun ArticleScreen(t: Insight) {
    val nav = LocalNav.current
    val ctx = LocalContext.current
    val c = Ma.c
    val (tag, c1, c2) = topic(t)
    val key = Regex("""[+−-]?\d+(\.\d+)?%""").find(t.body)?.value
    val keyLine = key?.let { k -> t.body.split(Regex("""(?<=[.!?])\s+""")).firstOrNull { k in it }?.trim() }
    Column(Modifier.fillMaxSize().background(c.bg)) {
        Box(Modifier.fillMaxWidth().height(210.dp).background(Brush.linearGradient(listOf(c.chrome, c1))).drawBehind { checks(.06f, 22.dp.toPx()); wave(Color(0xFFA9C4F5), t.id, true) }) {
            IconButton(onClick = nav::pop, modifier = Modifier.statusBarsPadding().padding(4.dp)) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back", tint = Color.White) }
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(20.dp)) {
            Text(tag, Modifier.clip(RoundedCornerShape(6.dp)).background(c2.copy(alpha = .15f)).padding(horizontal = 8.dp, vertical = 3.dp), color = c1, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, letterSpacing = .6.sp)
            VSpace(8.dp)
            Text(t.title, color = c.text, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 28.sp)
            Text("${(t.body.split(" ").size / 200).coerceAtLeast(1)} min read · ${prettyDate(t.publishedAt)} · Mod Alpha research", color = c.muted, fontSize = 12.5.sp, modifier = Modifier.padding(top = 4.dp))
            if (key != null && keyLine != null) {
                Row(Modifier.padding(vertical = 14.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(Color(0xFFFFFBEB)).border(1.dp, Color(0xFFF3D38A), RoundedCornerShape(14.dp)).padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Text(key, color = GoldDeep, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                    Spacer(Modifier.width(12.dp))
                    Text(keyLine, color = Color(0xFF3B2A10), fontSize = 13.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
            } else VSpace(14.dp)
            Text(t.body, color = c.sub, fontSize = 15.5.sp, lineHeight = 24.sp)
        }
        Row(Modifier.fillMaxWidth().background(c.surface).navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1f).height(48.dp).clip(RoundedCornerShape(14.dp)).border(1.dp, c.line, RoundedCornerShape(14.dp)).clickable {
                val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "${t.title}\n\n${t.body.take(280)}…\n\nvia Mod Alpha")
                runCatching { ctx.startActivity(Intent.createChooser(send, "Share")) }
            }, contentAlignment = Alignment.Center) { Text("Share", color = c.text, fontWeight = FontWeight.SemiBold) }
            Box(Modifier.weight(1.4f).height(48.dp).clip(RoundedCornerShape(14.dp)).background(c.accentBrush).clickable { nav.goTab(Tab.Ask) }, contentAlignment = Alignment.Center) {
                Text("Ask α about this", color = Color.White, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
