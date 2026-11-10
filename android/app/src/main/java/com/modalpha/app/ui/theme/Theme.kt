package com.modalpha.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
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
 * Mod Alpha colours on the phone. Same two looks as the website:
 *   Midnight (dark, follows the phone's dark mode) and Sand (cream & beige, light mode).
 */
@Immutable
data class MaColors(
    val dark: Boolean,
    val bg: Color, val bg2: Color,
    val surface: Color, val surface2: Color, val line: Color,
    val text: Color, val sub: Color, val muted: Color,
    val accent: Color, val accent2: Color, val onAccent: Color,
    val up: Color, val down: Color, val warn: Color,
    val heroStart: Color, val heroEnd: Color,
) {
    val accentBrush get() = Brush.linearGradient(listOf(accent, accent2))
    val heroBrush get() = Brush.linearGradient(listOf(heroStart, heroEnd))
}

val Midnight = MaColors(
    dark = true,
    bg = Color(0xFF080B18), bg2 = Color(0xFF0B1022),
    surface = Color(0xFF111A32), surface2 = Color(0xFF0E172D), line = Color(0x29829DDC),
    text = Color(0xFFEEF3FF), sub = Color(0xFFB8C3DC), muted = Color(0xFF8E9BB7),
    accent = Color(0xFF6366F1), accent2 = Color(0xFF8B5CF6), onAccent = Color.White,
    up = Color(0xFF22C55E), down = Color(0xFFF43F5E), warn = Color(0xFFFBBF24),
    heroStart = Color(0xFF312E81), heroEnd = Color(0xFF5B21B6),
)

val Sand = MaColors(
    dark = false,
    bg = Color(0xFFF4ECDD), bg2 = Color(0xFFEFE4D0),
    surface = Color(0xFFFFFAF1), surface2 = Color(0xFFF8F0E2), line = Color(0xFFE3D5BE),
    text = Color(0xFF2B2118), sub = Color(0xFF5A4634), muted = Color(0xFF7A6650),
    accent = Color(0xFF9C5F2A), accent2 = Color(0xFF6B2F4A), onAccent = Color.White,
    up = Color(0xFF2F7D32), down = Color(0xFFB3261E), warn = Color(0xFFB7791F),
    heroStart = Color(0xFF8A5226), heroEnd = Color(0xFF5E2A44),
)

val LocalMa = staticCompositionLocalOf { Midnight }

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
fun ModAlphaTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val c = if (dark) Midnight else Sand
    val scheme = if (dark) darkColorScheme(
        primary = c.accent, onPrimary = c.onAccent, secondary = c.accent2, background = c.bg, onBackground = c.text,
        surface = c.surface, onSurface = c.text, onSurfaceVariant = c.muted, outline = c.line, error = c.down,
    ) else lightColorScheme(
        primary = c.accent, onPrimary = c.onAccent, secondary = c.accent2, background = c.bg, onBackground = c.text,
        surface = c.surface, onSurface = c.text, onSurfaceVariant = c.muted, outline = c.line, error = c.down,
    )
    CompositionLocalProvider(LocalMa provides c) {
        MaterialTheme(colorScheme = scheme, typography = type, content = content)
    }
}
