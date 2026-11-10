package com.modalpha.app.ui.welcome

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.theme.Ma

/**
 * Returning user with fingerprint unlock turned on: "Welcome back, <name>" and a fingerprint button.
 * The system prompt opens by itself once (autoPrompt); "Use OTP instead" and "Switch account" sign out.
 */
@Composable
fun LockScreen(name: String, onFingerprint: () -> Unit, onUseOtp: () -> Unit, onSwitch: () -> Unit, autoPrompt: Boolean = true) {
    if (autoPrompt) LaunchedEffect(Unit) { onFingerprint() }
    val ring by rememberInfiniteTransition(label = "ring").animateFloat(1f, 1.18f, infiniteRepeatable(tween(1300), RepeatMode.Reverse), label = "r")
    Box(Modifier.fillMaxSize()) {
        MaBackdrop(orbitY = .30f)
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color.Transparent, .45f to Color.Transparent, .65f to Ma.c.chrome2.copy(alpha = .94f), 1f to Ma.c.chrome2)))
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.weight(1f))
            Text("Welcome back,", color = Ma.c.chromeSub, fontSize = 16.sp)
            Text(name, color = Ma.c.chromeText, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
            VSpace(28.dp)
            Box(contentAlignment = Alignment.Center) {
                Box(Modifier.size(84.dp).scale(ring).clip(CircleShape).background(Ma.c.hi.copy(alpha = .22f)))
                Box(
                    Modifier.size(76.dp).clip(CircleShape).background(Ma.c.hiBrush).clickable(role = Role.Button, onClick = onFingerprint),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Outlined.Fingerprint, "Unlock with fingerprint", tint = Ma.c.onAccent, modifier = Modifier.size(42.dp)) }
            }
            VSpace(14.dp)
            Text("Touch to unlock", color = Ma.c.chromeSub, style = MaterialTheme.typography.bodyMedium)
            VSpace(28.dp)
            TextButton(onClick = onUseOtp) { Text("Use OTP instead", color = Ma.c.hi, fontWeight = FontWeight.SemiBold) }
            TextButton(onClick = onSwitch) { Text("Not $name? Switch account", color = Ma.c.chromeMuted) }
            VSpace(20.dp)
        }
    }
}
