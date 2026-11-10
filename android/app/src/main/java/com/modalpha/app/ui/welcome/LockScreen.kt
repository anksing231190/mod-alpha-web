package com.modalpha.app.ui.welcome

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.ui.components.Gold
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.theme.Ma
import kotlinx.coroutines.delay

/**
 * Returning user with fingerprint unlock on: the safe dial (animation D) lands on the last date this phone showed,
 * then the system fingerprint sheet opens. "Use OTP instead" / "Switch account" sign out.
 */
@Composable
fun LockScreen(
    name: String, onFingerprint: () -> Unit, onUseOtp: () -> Unit, onSwitch: () -> Unit,
    autoPrompt: Boolean = true, lastDay: Int? = null, lastMonth: String? = null,
) {
    val c = Ma.c
    if (autoPrompt) LaunchedEffect(Unit) { delay(2700); onFingerprint() }          // after the dial clicks into place
    val glow by rememberInfiniteTransition(label = "fp").animateFloat(1f, 1.06f, infiniteRepeatable(tween(1100), RepeatMode.Reverse), label = "g")
    Box(Modifier.fillMaxSize().meshBackdrop(c)) {
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 22.dp)) {
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Mod Alpha", color = c.chromeText, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
            VSpace(18.dp)
            Box(Modifier.fillMaxWidth().height(380.dp), contentAlignment = Alignment.TopCenter) { DialLock(lastDay, lastMonth, play = autoPrompt) }
            Spacer(Modifier.weight(1f))
            Text("Welcome back,", color = c.chromeSub, fontSize = 16.sp)
            Text(name, color = c.chromeText, fontSize = 30.sp, fontWeight = FontWeight.Black)
            VSpace(18.dp)
            Row(
                Modifier.fillMaxWidth().height(56.dp).scale(glow).clip(RoundedCornerShape(16.dp)).background(c.hiBrush).clickable(role = Role.Button, onClick = onFingerprint),
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Fingerprint, null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(26.dp)); Spacer(Modifier.width(10.dp))
                Text("Unlock with fingerprint", color = androidx.compose.ui.graphics.Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            VSpace(6.dp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween) {
                TextButton(onClick = onUseOtp) { Text("Use OTP instead", color = Gold, fontWeight = FontWeight.SemiBold) }
                TextButton(onClick = onSwitch) { Text("Not $name?", color = c.chromeMuted) }
            }
            VSpace(8.dp)
        }
    }
}
