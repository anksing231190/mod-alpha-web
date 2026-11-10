package com.modalpha.app.ui.welcome

import androidx.compose.animation.AnimatedContent
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
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.theme.Ma
import kotlinx.coroutines.delay

private val slides = listOf(
    "Invest at the right time" to "AI finds the statistically best SIP date for every month.",
    "Built on 10+ years of data" to "We study NAV history across funds so you don't have to.",
    "Never miss the date" to "A reminder before every best date. You invest in your own app.",
)

/** First screen when signed out (like a banking app's pre-login screen): animation about Mod Alpha + Log in / Create account. */
@Composable
fun WelcomeScreen(onLogin: () -> Unit, onSignup: () -> Unit, onDemo: () -> Unit, autoPlay: Boolean = true) {
    var i by remember { mutableIntStateOf(0) }
    if (autoPlay) LaunchedEffect(Unit) { while (true) { delay(3500); i = (i + 1) % slides.size } }
    Box(Modifier.fillMaxSize()) {
        MaBackdrop(orbitY = .33f)
        // fade the animation into the bottom panel so the text stays readable
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color.Transparent, .5f to Color.Transparent, .72f to Ma.c.chrome2.copy(alpha = .94f), 1f to Ma.c.chrome2)))
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp)) {
            VSpace(12.dp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Mod Alpha", color = Ma.c.chromeText, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Text("Try the demo", color = Ma.c.chromeSub, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clip(CircleShape).border(1.dp, Ma.c.chromeLine, CircleShape).clickable(role = Role.Button, onClick = onDemo).padding(horizontal = 14.dp, vertical = 8.dp))
            }
            Spacer(Modifier.weight(1f))
            AnimatedContent(i, transitionSpec = { (slideInVertically { it / 4 } + fadeIn()) togetherWith fadeOut() }, label = "slide") { k ->
                Column {
                    Text(slides[k].first, color = Ma.c.chromeText, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 36.sp, letterSpacing = (-.5).sp)
                    VSpace(8.dp)
                    Text(slides[k].second, color = Ma.c.chromeSub, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.height(48.dp))
                }
            }
            VSpace(14.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                slides.indices.forEach { k ->
                    Box(Modifier.height(6.dp).width(if (k == i) 22.dp else 6.dp).clip(CircleShape).background(if (k == i) Ma.c.hi else Ma.c.chromeLine))
                }
            }
            VSpace(28.dp)
            GradientButton("Log in", onLogin, brush = Ma.c.hiBrush)
            VSpace(12.dp)
            Box(
                Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(14.dp)).background(Ma.c.chrome2.copy(alpha = .6f))
                    .border(1.dp, Ma.c.chromeLine, RoundedCornerShape(14.dp)).clickable(role = Role.Button, onClick = onSignup),
                contentAlignment = Alignment.Center,
            ) { Text("Create account", color = Ma.c.chromeText, style = MaterialTheme.typography.labelLarge) }
            VSpace(16.dp)
            Text("Mod Alpha shows historical analysis, not investment advice.", color = Ma.c.chromeMuted, style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            VSpace(16.dp)
        }
    }
}
