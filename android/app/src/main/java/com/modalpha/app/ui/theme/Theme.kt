package com.modalpha.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * The app's two looks. Both have light pages and dark "chrome" (the top panel, tab bar, welcome and lock screens):
 *   Navy     — white pages, dark navy chrome            (default)
 *   Espresso — cream pages, dark espresso-brown chrome  (same as the website's Espresso theme)
 * Page colours: bg / surface / text …   Chrome colours: chrome / chromeText … and `hi` for buttons on chrome.
 */
enum class AppTheme(val label: String, val desc: String) {
    Navy("Navy", "White & dark navy"),
    Espresso("Espresso", "Cream & dark brown"),
}

@Immutable
data class MaColors(
    val theme: AppTheme,
    // pages
    val bg: Color, val bg2: Color,
    val surface: Color, val surface2: Color, val line: Color,
    val text: Color, val sub: Color, val muted: Color,
    val accent: Color, val accent2: Color, val onAccent: Color,
    val up: Color, val down: Color, val warn: Color,
    // dark chrome
    val chrome: Color, val chrome2: Color, val chromeLine: Color,
    val chromeText: Color, val chromeSub: Color, val chromeMuted: Color,
    val hi: Color, val hi2: Color,          // bright action colour on chrome
    val glow: Color, val gold: Color = Color(0xFFE7B766),
) {
    val dark get() = false
    val accentBrush get() = Brush.linearGradient(listOf(accent, accent2))
    val hiBrush get() = Brush.linearGradient(listOf(hi, hi2))
    val chromeBrush get() = Brush.verticalGradient(listOf(chrome, chrome2))
}

val Navy = MaColors(
    theme = AppTheme.Navy,
    bg = Color(0xFFF4F6FA), bg2 = Color(0xFFEDF1F7),
    surface = Color(0xFFFFFFFF), surface2 = Color(0xFFF6F8FB), line = Color(0xFFE2E7EF),
    text = Color(0xFF0F1B33), sub = Color(0xFF3B4A66), muted = Color(0xFF6B7A94),
    accent = Color(0xFF1E3A8A), accent2 = Color(0xFF13285F), onAccent = Color.White,
    up = Color(0xFF15803D), down = Color(0xFFC0262D), warn = Color(0xFFB7791F),
    chrome = Color(0xFF0B1B3F), chrome2 = Color(0xFF081430), chromeLine = Color(0x2EA9BCE6),
    chromeText = Color(0xFFF1F5FF), chromeSub = Color(0xFFBFCBE6), chromeMuted = Color(0xFF8C9BBD),
    hi = Color(0xFF3B82F6), hi2 = Color(0xFF1D4ED8), glow = Color(0xFF3B82F6),
)

val Espresso = MaColors(
    theme = AppTheme.Espresso,
    bg = Color(0xFFF4ECDD), bg2 = Color(0xFFEFE4D0),
    surface = Color(0xFFFFFAF1), surface2 = Color(0xFFF8F0E2), line = Color(0xFFE3D5BE),
    text = Color(0xFF2B2118), sub = Color(0xFF5A4634), muted = Color(0xFF7A6650),
    accent = Color(0xFF9C5F2A), accent2 = Color(0xFF6B2F4A), onAccent = Color.White,
    up = Color(0xFF2F7D32), down = Color(0xFFB3261E), warn = Color(0xFFB7791F),
    chrome = Color(0xFF1E1813), chrome2 = Color(0xFF15100C), chromeLine = Color(0x33E6CBA6),
    chromeText = Color(0xFFF6EBDA), chromeSub = Color(0xFFD9C4A6), chromeMuted = Color(0xFFA8957D),
    hi = Color(0xFFC08548), hi2 = Color(0xFF9C5F2A), glow = Color(0xFFC08548),
)

fun colorsFor(t: AppTheme) = if (t == AppTheme.Espresso) Espresso else Navy

val LocalMa = staticCompositionLocalOf { Navy }

/** Shortcut: `Ma.c.text` inside composables. */
object Ma { val c: MaColors @Composable get() = LocalMa.current }

private val type = Typography(
    displaySmall = TextStyle(fontSize = 34.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.5).sp),
    headlineSmall = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.3).sp),
    titleLarge = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Bold),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
    labelLarge = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.SemiBold),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.8.sp),
)

@Composable
fun ModAlphaTheme(theme: AppTheme = AppTheme.Navy, content: @Composable () -> Unit) {
    val c = colorsFor(theme)
    val scheme = lightColorScheme(
        primary = c.accent, onPrimary = c.onAccent, secondary = c.accent2, background = c.bg, onBackground = c.text,
        surface = c.surface, onSurface = c.text, onSurfaceVariant = c.muted, outline = c.line, error = c.down,
        surfaceContainerHigh = c.surface, surfaceContainerHighest = c.surface,
    )
    CompositionLocalProvider(LocalMa provides c) {
        MaterialTheme(colorScheme = scheme, typography = type, content = content)
    }
}
