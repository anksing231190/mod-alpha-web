package com.modalpha.app.ui.login

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.modalpha.app.data.prettyMobile
import com.modalpha.app.ui.components.BrandMark
import com.modalpha.app.ui.components.ErrorBanner
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.theme.Ma

/**
 * Login / Create account, phone-first.
 * Step 1: mobile number (or email + password).  Step 2: the 6-digit code, auto-submitted when complete.
 * Smaller than the website's login: one card, no side illustration, the brand on top.
 */
@Composable
fun LoginScreen(vm: LoginViewModel, onBack: (() -> Unit)? = null) {
    val s by vm.state.collectAsStateWithLifecycle()
    Box(Modifier.fillMaxSize().background(Ma.c.bg)) {
        // dark brand panel at the top, the form card overlaps it
        Box(
            Modifier.fillMaxWidth().height(400.dp).clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp)).background(Ma.c.chromeBrush)
                .background(Brush.radialGradient(listOf(Ma.c.glow.copy(alpha = .30f), Color.Transparent), radius = 700f))
        ) { com.modalpha.app.ui.welcome.LoginBackdrop(Modifier.fillMaxSize()) }
        val glow = com.modalpha.app.ui.welcome.rememberLogoGlow()
        // the form card slides up once when the screen opens
        val enter = androidx.compose.runtime.remember { androidx.compose.animation.core.Animatable(0f) }
        androidx.compose.runtime.LaunchedEffect(Unit) { enter.animateTo(1f, androidx.compose.animation.core.tween(650, easing = androidx.compose.animation.core.FastOutSlowInEasing)) }
        Column(
            Modifier.fillMaxSize().systemBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.fillMaxWidth().height(48.dp)) {
                if (onBack != null) IconButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterStart)) {
                    Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back", tint = Ma.c.chromeText)
                }
            }
            // round logo filling its gold ring, with a breathing glow behind
            Box(
                Modifier.size(92.dp).drawBehind {
                    val r = size.minDimension / 2
                    drawCircle(Brush.radialGradient(listOf(com.modalpha.app.ui.components.Gold.copy(alpha = .16f + .16f * glow), Color.Transparent), radius = r * (1.55f + .25f * glow)), r * (1.55f + .25f * glow))
                }.clip(CircleShape).background(Ma.c.surface)
                    .border(1.5.dp, com.modalpha.app.ui.components.Gold.copy(alpha = .45f + .35f * glow), CircleShape),
                contentAlignment = Alignment.Center,
            ) { androidx.compose.foundation.Image(androidx.compose.ui.res.painterResource(com.modalpha.app.R.drawable.brand_mark), "Mod Alpha", Modifier.size(56.dp)) }
            VSpace(14.dp)
            Text("Mod Alpha", color = Ma.c.chromeText, style = MaterialTheme.typography.headlineSmall)
            VSpace(4.dp)
            Text("Invest at the right time with AI", color = Ma.c.chromeSub, style = MaterialTheme.typography.bodyMedium)
            VSpace(78.dp)

            Column(
                Modifier.graphicsLayer { translationY = (1 - enter.value) * 60.dp.toPx(); alpha = .3f + .7f * enter.value }.fillMaxWidth().shadow(18.dp, RoundedCornerShape(24.dp), ambientColor = Ma.c.chrome, spotColor = Ma.c.chrome)
                    .clip(RoundedCornerShape(24.dp)).background(Ma.c.surface)
                    .border(1.dp, Ma.c.line, RoundedCornerShape(24.dp)).padding(20.dp)
            ) {
                AnimatedContent(
                    targetState = s.step,
                    transitionSpec = { (slideInHorizontally { it / 3 } + fadeIn()) togetherWith fadeOut() },
                    label = "login-step",
                ) { step ->
                    when (step) { LoginStep.Otp -> OtpStep(s, vm); LoginStep.AdminCodes -> AdminCodesStep(s, vm); else -> EnterStep(s, vm) }
                }
            }

            VSpace(18.dp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(if (s.signup) "Already have an account?" else "New to Mod Alpha?", color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium)
                TextButton(onClick = vm::toggleSignup) { Text(if (s.signup) "Log in" else "Create account", color = Ma.c.accent, fontWeight = FontWeight.SemiBold) }
            }
            VSpace(24.dp)
            Text(
                "By continuing you agree to our Terms and Privacy Policy.",
                color = Ma.c.muted, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center,
            )
            VSpace(16.dp)
        }
    }
}

@Composable
private fun EnterStep(s: LoginState, vm: LoginViewModel) {
    val uri = LocalUriHandler.current
    Column {
        Text(if (s.signup) "Create your account" else "Log in", color = Ma.c.text, style = MaterialTheme.typography.titleLarge)
        VSpace(4.dp)
        Text(
            if (s.method == LoginMethod.Mobile) "We'll text you a 6-digit code." else "Use the email and password you signed up with.",
            color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium,
        )
        VSpace(16.dp)
        MethodTabs(s.method, vm::setMethod)
        VSpace(16.dp)
        if (s.method == LoginMethod.Mobile) {
            OutlinedTextField(
                value = s.mobile, onValueChange = vm::onMobile, singleLine = true,
                label = { Text("Mobile number") }, placeholder = { Text("98765 43210") },
                prefix = { Text("+91  ", color = Ma.c.sub) },
                leadingIcon = { Icon(Icons.Outlined.PhoneAndroid, null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { vm.sendOtp() }),
                colors = fieldColors(), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth(),
            )
            if (s.error != null) { VSpace(12.dp); ErrorBanner(s.error) }
            VSpace(16.dp)
            GradientButton("Send code", vm::sendOtp, loading = s.busy)
        } else {
            var show by remember { mutableStateOf(false) }
            OutlinedTextField(
                value = s.email, onValueChange = vm::onEmail, singleLine = true, label = { Text("Email") },
                leadingIcon = { Icon(Icons.Outlined.Email, null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                colors = fieldColors(), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth(),
            )
            VSpace(12.dp)
            OutlinedTextField(
                value = s.password, onValueChange = vm::onPassword, singleLine = true, label = { Text("Password") },
                leadingIcon = { Icon(Icons.Outlined.Lock, null) },
                trailingIcon = {
                    IconButton(onClick = { show = !show }) { Icon(if (show) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, if (show) "Hide password" else "Show password") }
                },
                visualTransformation = if (show) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { vm.loginEmail() }),
                colors = fieldColors(), shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth(),
            )
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                TextButton(onClick = { uri.openUri("https://modalpha.in/#/login") }) { Text("Forgot password?", color = Ma.c.accent) }
            }
            if (s.error != null) { ErrorBanner(s.error); VSpace(12.dp) }
            GradientButton("Log in", vm::loginEmail, loading = s.busy)
        }
    }
}

@Composable
private fun OtpStep(s: LoginState, vm: LoginViewModel) {
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = vm::changeNumber, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Change number", tint = Ma.c.text) }
            Spacer(Modifier.width(6.dp))
            Text("Enter the code", color = Ma.c.text, style = MaterialTheme.typography.titleLarge)
        }
        VSpace(6.dp)
        Text("Sent by SMS to ${prettyMobile(s.sentTo)}", color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium)
        VSpace(20.dp)
        // One hidden text field drives six boxes, so paste and SMS autofill work.
        BasicTextField(
            value = s.code, onValueChange = vm::onCode,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
            modifier = Modifier.focusRequester(focus).semantics { contentDescription = "6-digit code" },
            decorationBox = {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    repeat(6) { i ->
                        val ch = s.code.getOrNull(i)?.toString() ?: ""
                        val active = i == s.code.length
                        Box(
                            Modifier.weight(1f).height(56.dp).clip(RoundedCornerShape(12.dp)).background(Ma.c.surface2)
                                .border(if (active) 2.dp else 1.dp, if (active) Ma.c.accent else if (s.error != null) Ma.c.down else Ma.c.line, RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center,
                        ) { Text(ch, color = Ma.c.text, fontSize = 22.sp, fontWeight = FontWeight.Bold) }
                    }
                }
            },
        )
        if (s.hintCode != null) {
            VSpace(10.dp)
            Text("Test code: ${s.hintCode}", color = Ma.c.warn, style = MaterialTheme.typography.bodySmall)
        }
        if (s.error != null) { VSpace(12.dp); ErrorBanner(s.error) }
        VSpace(18.dp)
        GradientButton("Verify & continue", vm::verify, loading = s.busy, enabled = s.code.length == 6)
        VSpace(8.dp)
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (s.resendIn > 0) Text("Resend code in 0:%02d".format(s.resendIn), color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(12.dp))
            else TextButton(onClick = vm::sendOtp, enabled = !s.busy) { Text("Resend code", color = Ma.c.accent, fontWeight = FontWeight.SemiBold) }
        }
    }
}

/** Mobile | Email switch. */
@Composable
private fun MethodTabs(current: LoginMethod, onPick: (LoginMethod) -> Unit) {
    Row(Modifier.fillMaxWidth().height(44.dp).clip(RoundedCornerShape(12.dp)).background(Ma.c.surface2).border(1.dp, Ma.c.line, RoundedCornerShape(12.dp)).padding(4.dp)) {
        LoginMethod.entries.forEach { m ->
            val on = m == current
            Box(
                Modifier.weight(1f).fillMaxSize().clip(RoundedCornerShape(9.dp))
                    .background(if (on) Ma.c.accentBrush else Brush.linearGradient(listOf(Color.Transparent, Color.Transparent)))
                    .clickable { onPick(m) },
                contentAlignment = Alignment.Center,
            ) {
                Text(if (m == LoginMethod.Mobile) "Mobile" else "Email", color = if (on) Ma.c.onAccent else Ma.c.sub, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Ma.c.accent, unfocusedBorderColor = Ma.c.line,
    focusedLabelColor = Ma.c.accent, unfocusedLabelColor = Ma.c.muted,
    focusedTextColor = Ma.c.text, unfocusedTextColor = Ma.c.text, cursorColor = Ma.c.accent,
    focusedLeadingIconColor = Ma.c.accent, unfocusedLeadingIconColor = Ma.c.muted,
    focusedTrailingIconColor = Ma.c.muted, unfocusedTrailingIconColor = Ma.c.muted,
    focusedContainerColor = Ma.c.surface2, unfocusedContainerColor = Ma.c.surface2,
    focusedPlaceholderColor = Ma.c.muted, unfocusedPlaceholderColor = Ma.c.muted,
)

/** Admin sign-in: a code by email AND a code by SMS (both required). */
@Composable
private fun AdminCodesStep(s: LoginState, vm: LoginViewModel) {
    val c = s.challenge ?: return
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = vm::changeNumber, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back", tint = Ma.c.text) }
            Spacer(Modifier.width(6.dp))
            Text("Admin sign-in", color = Ma.c.text, style = MaterialTheme.typography.titleLarge)
        }
        VSpace(6.dp)
        Text("For your security we sent two codes. Enter both to continue.", color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium)
        VSpace(16.dp)
        OutlinedTextField(s.emailCode, vm::onEmailCode, Modifier.fillMaxWidth(), singleLine = true, label = { Text("Email code") },
            supportingText = { Text("Sent to ${c.email}") }, leadingIcon = { Icon(Icons.Outlined.Email, null) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Next), colors = fieldColors(), shape = RoundedCornerShape(14.dp))
        VSpace(6.dp)
        OutlinedTextField(s.smsCode, vm::onSmsCode, Modifier.fillMaxWidth(), singleLine = true, label = { Text("SMS code") },
            supportingText = { Text("Sent to ${c.mobile}") }, leadingIcon = { Icon(Icons.Outlined.PhoneAndroid, null) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done), keyboardActions = KeyboardActions(onDone = { vm.verifyAdmin() }), colors = fieldColors(), shape = RoundedCornerShape(14.dp))
        if (c.devEmail != null) { VSpace(8.dp); Text("Test codes: email ${c.devEmail} · SMS ${c.devSms}", color = Ma.c.warn, style = MaterialTheme.typography.bodySmall) }
        if (s.error != null) { VSpace(12.dp); ErrorBanner(s.error) }
        VSpace(16.dp)
        GradientButton("Verify & sign in", vm::verifyAdmin, loading = s.busy, enabled = s.emailCode.length == 6 && s.smsCode.length == 6)
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            TextButton(onClick = vm::resendAdmin, enabled = !s.busy && s.resendIn == 0) { Text(if (s.resendIn > 0) "Resend codes in 0:%02d".format(s.resendIn) else "Resend codes", color = Ma.c.accent, fontWeight = FontWeight.SemiBold) }
        }
    }
}
