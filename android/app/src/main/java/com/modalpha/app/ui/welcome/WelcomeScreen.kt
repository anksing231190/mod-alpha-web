package com.modalpha.app.ui.welcome

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.ui.components.Gold
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.theme.Ma
import kotlinx.coroutines.delay

/** Dark full-screen backdrop with the two colour glows (shared by Welcome and Lock). */
fun Modifier.meshBackdrop(c: com.modalpha.app.ui.theme.MaColors) = this
    .background(Brush.verticalGradient(listOf(c.chrome, c.chrome2)))
    .drawBehind {
        drawCircle(Brush.radialGradient(listOf(c.mesh1, Color.Transparent), center = Offset(size.width * .5f, size.height * .3f), radius = size.width), size.width, Offset(size.width * .5f, size.height * .3f))
        drawCircle(Brush.radialGradient(listOf(c.mesh2.copy(alpha = .8f), Color.Transparent), center = Offset(size.width * .95f, size.height * .95f), radius = size.width * .8f), size.width * .8f, Offset(size.width * .95f, size.height * .95f))
    }

private val slides = listOf(
    Triple("Buy when it's ", "cheaper.", "Same amount, more units — that's the whole idea. We find the day for you."),
    Triple("10 years of ", "NAV data.", "Every day of the month, backtested across funds."),
    Triple("Never miss ", "the date.", "A reminder before each best date. You invest in your own app."),
)

/**
 * Signed-out start screen.
 *   First time on this phone → animation B (the NAV wave: buy the dip) + three short messages.
 *   Been here before (`returningName`) → animation D (the dial lands on the last date we showed) + "Welcome back".
 */
@Composable
fun WelcomeScreen(
    onLogin: () -> Unit, onSignup: () -> Unit, onDemo: () -> Unit,
    autoPlay: Boolean = true, returningName: String? = null, lastDay: Int? = null, lastMonth: String? = null, startSlide: Int = 0, lastYm: String? = null,
) {
    val c = Ma.c
    var i by remember { mutableIntStateOf(startSlide) }
    // slide 1 stays longer so its chart can finish drawing; each slide's picture changes with its message
    // first visit: 3 messages with their own pictures; returning: dial → tear-off calendar → countdown
    val ym = remember(lastYm) { lastYm?.let { runCatching { java.time.YearMonth.parse(it) }.getOrNull() } }
    if (autoPlay) LaunchedEffect(Unit) { while (true) { delay(if (returningName != null) 5500L else if (i == 0) 6500L else 6000L); i = (i + 1) % 3 } }
    Column(Modifier.fillMaxSize().background(c.bg)) {
        // dark panel: brand row + the animation
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp)).meshBackdrop(c).statusBarsPadding().padding(bottom = 18.dp)) {
            Row(Modifier.fillMaxWidth().padding(start = 22.dp, end = 22.dp, top = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Mod Alpha", color = c.chromeText, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            VSpace(14.dp)
            if (returningName == null) AnimatedContent(i, transitionSpec = { fadeIn(tween(450)) togetherWith fadeOut(tween(300)) }, label = "panel") { k ->
                Box(Modifier.fillMaxWidth().height(392.dp), contentAlignment = Alignment.TopCenter) {
                    when (k) { 0 -> WaveWelcome(Modifier.fillMaxWidth(), autoPlay); 1 -> NavFlowSlide(autoPlay = autoPlay); else -> ReminderSlide(autoPlay = autoPlay) }
                }
            }
            else AnimatedContent(i, transitionSpec = { fadeIn(tween(450)) togetherWith fadeOut(tween(300)) }, label = "back") { k ->
                Box(Modifier.fillMaxWidth().height(380.dp), contentAlignment = Alignment.TopCenter) {
                    when (k) { 0 -> DialLock(lastDay, lastMonth, play = autoPlay); 1 -> TearOffSlide(lastDay, ym, autoPlay); else -> CountdownSlide(lastDay, ym, autoPlay) }
                }
            }
        }
        // light page: message + actions
        Column(Modifier.weight(1f).fillMaxWidth().navigationBarsPadding().padding(horizontal = 24.dp)) {
            Spacer(Modifier.weight(1f))
            if (returningName != null) {
                WelcomeBack(returningName, listOf("Log in to see this month's best SIP date.", "Your date is ready. Log in to plan your SIP.", "Log in to set your reminder.")[i], onDark = false)
                VSpace(10.dp)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)) { (0..2).forEach { k -> Box(Modifier.height(5.dp).width(if (k == i) 22.dp else 6.dp).clip(CircleShape).background(if (k == i) c.accent else c.line)) } }
            }
            else {
                AnimatedContent(i, transitionSpec = { (slideInVertically { it / 4 } + fadeIn()) togetherWith fadeOut() }, label = "slide") { k ->
                    Column {
                        Text(buildAnnotatedString { append(slides[k].first); withStyle(SpanStyle(brush = Brush.horizontalGradient(listOf(c.hi, c.hi2)))) { append(slides[k].second) } },
                            color = c.text, fontSize = 27.sp, fontWeight = FontWeight.Black, lineHeight = 32.sp, letterSpacing = (-.5).sp)
                        VSpace(6.dp)
                        Text(slides[k].third, color = c.sub, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.height(42.dp))
                    }
                }
                VSpace(8.dp)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { slides.indices.forEach { k -> Box(Modifier.height(5.dp).width(if (k == i) 22.dp else 6.dp).clip(CircleShape).background(if (k == i) c.accent else c.line)) } }
            }
            Spacer(Modifier.weight(1f))
            GradientButton("Log in", onLogin, brush = c.accentBrush)
            VSpace(10.dp)
            Box(Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(14.dp)).background(c.surface).border(1.dp, c.line, RoundedCornerShape(14.dp)).clickable(role = Role.Button, onClick = onSignup), contentAlignment = Alignment.Center) {
                Text(if (returningName != null) "Not ${returningName}? Create account" else "Create account", color = c.text, style = MaterialTheme.typography.labelLarge)
            }
            VSpace(10.dp)
            Text("Historical analysis, not investment advice.", color = c.muted, fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            VSpace(10.dp)
        }
    }
}
