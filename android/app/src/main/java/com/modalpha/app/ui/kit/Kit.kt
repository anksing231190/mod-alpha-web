package com.modalpha.app.ui.kit

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.modalpha.app.ui.components.ErrorBanner
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.Loader
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.theme.Ma

/* ---------------- loading data ---------------- */

sealed interface Res<out T> {
    data object Loading : Res<Nothing>
    data class Ok<T>(val value: T) : Res<T>
    data class Err(val message: String) : Res<Nothing>
}

/** Loads `block` when `key` changes; `reload()` runs it again. */
class Loadable<T>(val state: MutableState<Res<T>>, private val tick: androidx.compose.runtime.MutableIntState) {
    val res get() = state.value
    fun reload() { tick.intValue++ }
    fun set(v: T) { state.value = Res.Ok(v) }
}

@Composable
fun <T> rememberLoad(key: Any? = Unit, block: suspend () -> T): Loadable<T> {
    val state = remember(key) { mutableStateOf<Res<T>>(Res.Loading) }
    val tick = remember(key) { mutableIntStateOf(0) }
    LaunchedEffect(key, tick.intValue) {
        if (state.value !is Res.Ok) state.value = Res.Loading
        state.value = try { Res.Ok(block()) } catch (e: Exception) { Res.Err(e.message ?: "Something went wrong") }
    }
    return remember(key) { Loadable(state, tick) }
}

/** Spinner / error with Try again / content. */
@Composable
fun <T> LoadBox(l: Loadable<T>, modifier: Modifier = Modifier, content: @Composable (T) -> Unit) {
    when (val r = l.res) {
        Res.Loading -> Loader(modifier.fillMaxWidth().padding(vertical = 60.dp))
        is Res.Err -> Column(modifier.fillMaxWidth().padding(20.dp)) { ErrorBanner(r.message); VSpace(12.dp); GradientButton("Try again", l::reload) }
        is Res.Ok -> content(r.value)
    }
}

/* ---------------- screen frame ---------------- */

/**
 * A screen: dark chrome header (title, back arrow, actions, optional extra content such as search or tabs),
 * then the page; an optional bar pinned to the bottom (e.g. "Pay").
 */
@Composable
fun Screen(
    title: String,
    onBack: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    header: @Composable ColumnScope.() -> Unit = {},
    bottom: (@Composable () -> Unit)? = null,
    bottomPad: Dp = 0.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(Modifier.fillMaxSize().background(Ma.c.bg)) {
        ChromeHeader(title, onBack, actions, header)
        Column(Modifier.weight(1f).fillMaxWidth()) { content() }
        if (bottom != null) Box(Modifier.fillMaxWidth().background(Ma.c.surface).navigationBarsPadding().padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 12.dp)) { bottom() }
        else Spacer(Modifier.height(bottomPad))
    }
}

@Composable
fun ChromeHeader(title: String, onBack: (() -> Unit)? = null, actions: @Composable RowScope.() -> Unit = {}, extra: @Composable ColumnScope.() -> Unit = {}) {
    com.modalpha.app.ui.components.MeshHero {
        Row(Modifier.fillMaxWidth().height(54.dp).padding(start = if (onBack != null) 4.dp else 18.dp, end = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            if (onBack != null) IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back", tint = Ma.c.chromeText) }
            Text(title, color = Ma.c.chromeText, fontSize = 23.sp, fontWeight = FontWeight.Black, letterSpacing = (-.3).sp, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            actions()
        }
        extra()
    }
}

/** Round icon button on the dark header. */
@Composable
fun ChromeIcon(icon: ImageVector, label: String, tint: Color = Ma.c.chromeText, onClick: () -> Unit) {
    Box(Modifier.size(40.dp).clip(RoundedCornerShape(13.dp)).background(Color.White.copy(alpha = .08f)).border(1.dp, Color.White.copy(alpha = .12f), RoundedCornerShape(13.dp)).clickable(role = Role.Button, onClick = onClick), contentAlignment = Alignment.Center) {
        Icon(icon, label, tint = tint, modifier = Modifier.size(19.dp))
    }
}

/* ---------------- building blocks ---------------- */

@Composable
fun SectionTitle(title: String, action: String? = null, onAction: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(start = 18.dp, end = 18.dp, top = 16.dp, bottom = 8.dp), verticalAlignment = Alignment.Bottom) {
        Text(title, color = Ma.c.text, fontSize = 15.5.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        if (action != null) Text(action, color = Ma.c.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.clickable(onClick = onAction))
    }
}

@Composable
fun Caption(text: String, modifier: Modifier = Modifier) =
    Text(text.uppercase(), modifier, color = Ma.c.muted, style = MaterialTheme.typography.labelSmall)

/** White card holding rows separated by hairlines. */
@Composable
fun CardList(modifier: Modifier = Modifier, rows: List<@Composable () -> Unit>) {
    Column(modifier.padding(horizontal = 18.dp).fillMaxWidth().clip(RoundedCornerShape(22.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(22.dp)).padding(horizontal = 14.dp)) {
        rows.forEachIndexed { i, r -> if (i > 0) HorizontalDivider(color = Ma.c.line); r() }
    }
}

@Composable
fun ListRow(icon: ImageVector?, title: String, subtitle: String? = null, iconTint: Color = Ma.c.accent, onClick: (() -> Unit)? = null, trailing: @Composable () -> Unit = { if (onClick != null) Chevron() }) {
    Row(
        Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) {
            Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Ma.c.surface2), contentAlignment = Alignment.Center) { Icon(icon, null, tint = iconTint, modifier = Modifier.size(19.dp)) }
            Spacer(Modifier.width(12.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = Ma.c.text, fontSize = 15.sp)
            if (subtitle != null) Text(subtitle, color = Ma.c.muted, style = MaterialTheme.typography.bodySmall)
        }
        trailing()
    }
}

@Composable fun Chevron() = Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, null, tint = Ma.c.muted, modifier = Modifier.size(20.dp))

/** Status pill: green / amber / blue / red / gold. */
enum class Tone { Green, Amber, Blue, Red, Gold, Grey }
@Composable
fun Tag(text: String, tone: Tone) {
    val (bg, fg) = when (tone) {
        Tone.Green -> Color(0xFFDCFCE7) to Color(0xFF166534); Tone.Amber -> Color(0xFFFEF3C7) to Color(0xFF92400E)
        Tone.Blue -> Color(0xFFDBEAFE) to Color(0xFF1E40AF); Tone.Red -> Color(0xFFFEE2E2) to Color(0xFF991B1B)
        Tone.Gold -> Ma.c.gold.copy(alpha = .2f) to Color(0xFF8A5A12); Tone.Grey -> Ma.c.surface2 to Ma.c.muted
    }
    Text(text.uppercase(), Modifier.clip(CircleShape).background(bg).padding(horizontal = 9.dp, vertical = 3.dp), color = fg, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, letterSpacing = .3.sp, maxLines = 1)
}

/** Horizontally scrolling chips. `dark` = on the chrome header. */
@Composable
fun Chips(options: List<String>, selected: String, onSelect: (String) -> Unit, dark: Boolean = false, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { o ->
            val on = o == selected
            val bg = when { on && dark -> Ma.c.hi; on -> Ma.c.accent; dark -> Color.White.copy(alpha = .07f); else -> Ma.c.surface }
            val fg = when { on -> Color.White; dark -> Ma.c.chromeSub; else -> Ma.c.sub }
            Text(o, Modifier.clip(CircleShape).background(bg).border(1.dp, if (on) bg else if (dark) Ma.c.chromeLine else Ma.c.line, CircleShape)
                .clickable(role = Role.Tab) { onSelect(o) }.padding(horizontal = 14.dp, vertical = 8.dp), color = fg, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

/** Two–four way switch. */
@Composable
fun Segmented(options: List<String>, selected: String, onSelect: (String) -> Unit, dark: Boolean = true, modifier: Modifier = Modifier, label: (String) -> String = { it }) {
    Row(
        modifier.fillMaxWidth().padding(horizontal = 20.dp).clip(RoundedCornerShape(12.dp))
            .background(if (dark) Color.White.copy(alpha = .07f) else Ma.c.surface2).border(1.dp, if (dark) Ma.c.chromeLine else Ma.c.line, RoundedCornerShape(12.dp)).padding(4.dp)
    ) {
        options.forEach { o ->
            val on = o == selected
            Box(
                Modifier.weight(1f).height(36.dp).clip(RoundedCornerShape(9.dp)).background(if (on) (if (dark) Ma.c.hi else Ma.c.accent) else Color.Transparent).clickable(role = Role.Tab) { onSelect(o) },
                contentAlignment = Alignment.Center,
            ) { Text(label(o), color = if (on) Color.White else if (dark) Ma.c.chromeSub else Ma.c.sub, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1) }
        }
    }
}

@Composable
fun MaSwitch(checked: Boolean, onChange: (Boolean) -> Unit) =
    Switch(checked, onChange, colors = SwitchDefaults.colors(checkedTrackColor = Ma.c.accent, checkedThumbColor = Color.White, uncheckedTrackColor = Ma.c.line, uncheckedBorderColor = Ma.c.line, uncheckedThumbColor = Color.White))

/** Outlined secondary button (same height as GradientButton). */
@Composable
fun OutlineButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, color: Color = Ma.c.text, icon: ImageVector? = null) {
    Row(
        modifier.height(52.dp).clip(RoundedCornerShape(14.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(14.dp)).clickable(role = Role.Button, onClick = onClick).padding(horizontal = 14.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) { Icon(icon, null, tint = color, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)) }
        Text(text, color = color, style = MaterialTheme.typography.labelLarge, maxLines = 1)
    }
}

/** Empty state inside a card. */
@Composable
fun Empty(icon: ImageVector, title: String, body: String, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(56.dp).clip(CircleShape).background(Ma.c.surface2), contentAlignment = Alignment.Center) { Icon(icon, null, tint = Ma.c.accent, modifier = Modifier.size(26.dp)) }
        VSpace(12.dp); Text(title, color = Ma.c.text, style = MaterialTheme.typography.titleMedium)
        VSpace(4.dp); Text(body, color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

val PadAll = PaddingValues(20.dp)
