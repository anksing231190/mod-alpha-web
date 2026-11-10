package com.modalpha.app.ui.account

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.CreditCard
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.modalpha.app.SessionViewModel
import com.modalpha.app.data.ApiException
import com.modalpha.app.data.Invoice
import com.modalpha.app.data.Plan
import com.modalpha.app.data.prettyMobile
import com.modalpha.app.ui.Biometrics
import com.modalpha.app.ui.LocalNav
import com.modalpha.app.ui.Route
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.MaCard
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.components.inr
import com.modalpha.app.ui.explore.SearchField
import com.modalpha.app.ui.explore.prettyDate
import com.modalpha.app.ui.kit.Caption
import com.modalpha.app.ui.kit.CardList
import com.modalpha.app.ui.kit.Chevron
import com.modalpha.app.ui.kit.ChromeHeader
import com.modalpha.app.ui.kit.Empty
import com.modalpha.app.ui.kit.ListRow
import com.modalpha.app.ui.kit.LoadBox
import com.modalpha.app.ui.kit.MaSwitch
import com.modalpha.app.ui.kit.OutlineButton
import com.modalpha.app.ui.kit.Res
import com.modalpha.app.ui.kit.Screen
import com.modalpha.app.ui.kit.SectionTitle
import com.modalpha.app.ui.kit.Segmented
import com.modalpha.app.ui.kit.Tag
import com.modalpha.app.ui.kit.Tone
import com.modalpha.app.ui.kit.rememberLoad
import com.modalpha.app.ui.theme.AppTheme
import com.modalpha.app.ui.theme.Ma
import com.modalpha.app.ui.theme.colorsFor
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.HorizontalDivider
import androidx.compose.ui.text.style.TextOverflow
import com.modalpha.app.ui.components.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.launch
import java.io.File

private val CYCLES = listOf("Monthly", "Quarterly", "Yearly")
private fun months(c: String) = when (c) { "Yearly" -> 12; "Quarterly" -> 3; else -> 1 }
private fun per(c: String) = when (c) { "Yearly" -> "year"; "Quarterly" -> "quarter"; else -> "month" }

/* ============================== You tab ============================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun YouTab(session: SessionViewModel, bio: Biometrics, bottomPad: Dp) {
    val nav = LocalNav.current
    val u = nav.user
    val plan = rememberLoad { nav.repo.subscription() to nav.repo.plan() }
    val kyc = rememberLoad { nav.repo.kycStatus() }
    val tickets = rememberLoad { nav.repo.tickets() }
    val watch = rememberLoad { nav.repo.watchlist().size }
    val hist = rememberLoad { nav.repo.sipHistory() }
    val theme by session.theme.collectAsStateWithLifecycle()
    var bioOn by remember { mutableStateOf(session.biometricOn) }
    var themeSheet by remember { mutableStateOf(false) }
    val (sub, planName) = (plan.res as? Res.Ok)?.value ?: (null to "…")
    val k = (kyc.res as? Res.Ok)?.value
    val open = (tickets.res as? Res.Ok)?.value?.count { it.status != "Closed" && it.status != "Answered" } ?: 0
    Column(Modifier.fillMaxSize().background(Ma.c.bg)) {
        MeshHero(bottomPad = 18.dp) {
            Column(Modifier.padding(horizontal = 20.dp)) {
                Row(Modifier.height(54.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("You", color = Ma.c.chromeText, fontSize = 23.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                    if (nav.repo.isDemo) GhostChip("Demo data")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(54.dp).clip(CircleShape).background(Ma.c.hiBrush).border(2.dp, Gold.copy(alpha = .7f), CircleShape), contentAlignment = Alignment.Center) { Text(u.initial, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold) }
                    HSpace(12.dp)
                    Column(Modifier.weight(1f)) {
                        Text(u.name, color = Ma.c.chromeText, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Text(listOfNotNull(u.mobile?.let { prettyMobile(it) }, u.email).joinToString(" · "), color = Ma.c.chromeSub, fontSize = 12.5.sp, maxLines = 1)
                    }
                }
                VSpace(14.dp)
                // Membership card
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp))
                        .background(if (planName == "Free") Brush.linearGradient(listOf(Color.White.copy(alpha = .1f), Color.White.copy(alpha = .04f))) else Brush.linearGradient(listOf(Color(0xFF3A2A0E), Color(0xFF1E1508))))
                        .border(1.dp, Gold.copy(alpha = .5f), RoundedCornerShape(20.dp))
                        .clickable { nav.push(if (planName == "Free") Route.Plans else Route.Subscription) }.padding(16.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.WorkspacePremium, null, tint = Gold, modifier = Modifier.size(20.dp)); HSpace(8.dp)
                        Text("MOD ALPHA ${(sub?.plan ?: planName).uppercase()}", color = Gold, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, letterSpacing = 1.2.sp, modifier = Modifier.weight(1f))
                        Text(if (planName == "Free") "Upgrade ›" else "Manage ›", color = Ma.c.chromeText, fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp)
                    }
                    VSpace(12.dp)
                    Row {
                        Box(Modifier.weight(1f)) { StatBlock(if (sub?.cancelling == true) "Ends" else "Renews", sub?.renewalDate?.let { prettyDate(it) } ?: "—", sub?.cycle, valueSize = 14) }
                        Box(Modifier.weight(1f)) { StatBlock("KYC", k ?: "…", null, valueColor = if (k == "Verified") Mint else Gold, valueSize = 14) }
                        Box(Modifier.weight(1f)) { StatBlock("Member since", u.signupDate?.let { runCatching { LocalDate.parse(it.take(10)).format(DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH)) }.getOrNull() } ?: "—", null, valueSize = 14) }
                    }
                }
            }
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(top = 14.dp, bottom = bottomPad + 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            // Stat tiles
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val months = (hist.res as? Res.Ok)?.value?.first?.count { it.day != null } ?: 0
                StatTile("Watchlist", "${(watch.res as? Res.Ok)?.value ?: "—"}", "funds", Icons.Outlined.Star, Color(0xFFD97706), Modifier.weight(1f)) { nav.goTab(com.modalpha.app.ui.Tab.Explore) }
                StatTile("SIP dates", "$months", "months", Icons.Outlined.CalendarMonth, Color(0xFF2563EB), Modifier.weight(1f)) { nav.goTab(com.modalpha.app.ui.Tab.Calendar) }
                StatTile("Requests", "$open", "open", Icons.AutoMirrored.Outlined.HelpOutline, Color(0xFF7C3AED), Modifier.weight(1f)) { nav.push(Route.Help) }
            }
            // Settings grid
            Caption("Settings", Modifier.padding(start = 4.dp, top = 4.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SettingTile(Icons.Outlined.Notifications, "Reminders", "When we remind you", Color(0xFFD97706), Modifier.weight(1f)) { nav.remindMe(null) }
                SettingTile(Icons.Outlined.Palette, "Theme", theme.label, Color(0xFFDB2777), Modifier.weight(1f)) { themeSheet = true }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!nav.repo.isDemo && bio.available) SettingTile(Icons.Outlined.Fingerprint, "Fingerprint", if (bioOn) "On" else "Off", Color(0xFF059669), Modifier.weight(1f), trailing = {
                    MaSwitch(bioOn) { want -> if (want) bio.prompt("Turn on fingerprint unlock") { session.setBiometric(true); bioOn = true } else { session.setBiometric(false); bioOn = false } }
                }) { }
                else SettingTile(Icons.Outlined.VerifiedUser, "KYC", k ?: "…", Color(0xFF059669), Modifier.weight(1f)) { if (k != "Verified") nav.push(Route.Kyc()) }
                SettingTile(Icons.AutoMirrored.Outlined.ReceiptLong, "Billing", "Plan & invoices", Color(0xFF2563EB), Modifier.weight(1f)) { nav.push(Route.Subscription) }
            }
            CardList(Modifier.padding(horizontal = 0.dp), rows = listOf(
                { ListRow(Icons.AutoMirrored.Outlined.HelpOutline, "Help & my requests", onClick = { nav.push(Route.Help) }) { if (open > 0) Tag("$open open", Tone.Blue); Chevron() } },
            ))
            OutlineButton("Log out", session::logout, Modifier.fillMaxWidth(), color = Ma.c.down, icon = Icons.AutoMirrored.Outlined.Logout)
        }
    }
    if (themeSheet) ModalBottomSheet({ themeSheet = false }, containerColor = Ma.c.surface) {
        Column(Modifier.padding(start = 20.dp, end = 20.dp, bottom = 32.dp)) {
            Text("Theme", color = Ma.c.text, style = MaterialTheme.typography.titleLarge); VSpace(14.dp)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AppTheme.entries.forEach { t ->
                    val tc = colorsFor(t); val on = t == theme
                    Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).border(if (on) 2.dp else 1.dp, if (on) Ma.c.accent else Ma.c.line, RoundedCornerShape(16.dp)).clickable { session.setTheme(t) }.padding(12.dp)) {
                        Row(Modifier.fillMaxWidth().height(56.dp).clip(RoundedCornerShape(10.dp))) { Box(Modifier.weight(1f).fillMaxSize().background(tc.chrome)); Box(Modifier.weight(1.4f).fillMaxSize().background(tc.bg)) }
                        VSpace(8.dp); Text(t.label, color = Ma.c.text, fontWeight = FontWeight.SemiBold); Text(t.desc, color = Ma.c.muted, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatTile(label: String, value: String, unit: String, icon: ImageVector, tint: Color, modifier: Modifier, onClick: () -> Unit) {
    Column(modifier.clip(RoundedCornerShape(18.dp)).background(Brush.verticalGradient(listOf(tint.copy(alpha = .12f), Ma.c.surface))).border(1.dp, Ma.c.line, RoundedCornerShape(18.dp)).clickable(onClick = onClick).padding(12.dp)) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(18.dp))
        VSpace(8.dp)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, color = Ma.c.text, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
            Text(" $unit", color = Ma.c.muted, fontSize = 11.sp, modifier = Modifier.padding(bottom = 4.dp))
        }
        Text(label, color = Ma.c.sub, fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SettingTile(icon: ImageVector, title: String, sub: String, tint: Color, modifier: Modifier, trailing: (@Composable () -> Unit)? = null, onClick: () -> Unit) {
    Row(modifier.height(72.dp).clip(RoundedCornerShape(18.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(18.dp)).clickable(onClick = onClick).padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(36.dp).clip(RoundedCornerShape(11.dp)).background(tint.copy(alpha = .14f)), contentAlignment = Alignment.Center) { Icon(icon, null, tint = tint, modifier = Modifier.size(19.dp)) }
        HSpace(10.dp)
        Column(Modifier.weight(1f)) {
            Text(title, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1)
            Text(sub, color = Ma.c.muted, fontSize = 11.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        trailing?.invoke()
    }
}

/* ============================== Plans ============================== */

@Composable
fun PlansScreen() {
    val nav = LocalNav.current
    val ctx = LocalContext.current
    val plans = rememberLoad { nav.repo.plans() to nav.repo.subscription() }
    val record = rememberLoad { nav.repo.sipHistory().first.filter { it.day != null && it.month < java.time.YearMonth.now().toString() } }
    var cycle by rememberSaveable { mutableStateOf("Yearly") }
    var pick by rememberSaveable { mutableStateOf("Pro") }
    val sub = (plans.res as? Res.Ok)?.value?.second
    val paid = (plans.res as? Res.Ok)?.value?.first.orEmpty().filter { it.id != "Free" }
    val p = paid.find { it.id == pick }
    Screen("Choose a plan", onBack = nav::pop, header = {
        Column(Modifier.padding(horizontal = 20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Unlock each month's best SIP date", color = Ma.c.chromeText, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    VSpace(4.dp)
                    Text("Our dates are picked from 10 years of NAV history and checked every month.", color = Ma.c.chromeSub, fontSize = 12.5.sp, lineHeight = 17.sp)
                }
                val rec = (record.res as? Res.Ok)?.value.orEmpty()
                if (rec.isNotEmpty()) {
                    HSpace(12.dp)
                    val beat = rec.count { (it.upliftPct ?: 0.0) > 0 }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Ring(beat.toFloat() / rec.size, 66.dp, 7.dp, listOf(SoftGood, SoftGood)) {
                            Text("$beat/${rec.size}", color = Ma.c.chromeText, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                        }
                        Text("beat the 1st", color = Ma.c.chromeMuted, fontSize = 10.sp)
                    }
                }
            }
        }
        VSpace(14.dp)
        Segmented(CYCLES, cycle, { cycle = it }, label = { if (it == "Yearly") "Yearly −20%" else it })
    }, bottom = {
        Column {
            if (sub != null) GradientButton("Change plan on the website", { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://stage.modalpha.in/#/user/subscription"))) })
            else GradientButton(p?.let { "Continue with ${it.name} · ${inr((it.prices[cycle] ?: 0).toLong())}/${per(cycle)}" } ?: "Continue", { p?.let { nav.push(Route.Checkout(it.id, cycle)) } }, enabled = p != null)
            Text(if (sub != null) "You're on ${sub.plan}. Upgrades are prorated with a GST credit note." else "Prices include 18% GST · cancel anytime", Modifier.fillMaxWidth().padding(top = 6.dp), color = Ma.c.muted, fontSize = 11.5.sp, textAlign = TextAlign.Center)
        }
    }) {
        LoadBox(plans) { (all, _) ->
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 16.dp)) {
                all.filter { it.id != "Free" }.forEach { pl -> PlanCard(pl, cycle, pl.id == pick, pl.id == "Pro", sub?.plan == pl.id) { pick = pl.id } }
                // Comparison table
                val cols = all.sortedBy { if (it.id == "Free") 0 else 1 }
                val feats = cols.flatMap { it.features }.distinct().take(8)
                if (cols.size > 1 && feats.isNotEmpty()) MaCard(Modifier.padding(start = 16.dp, end = 16.dp, top = 18.dp).fillMaxWidth()) {
                    Column {
                        Text("Compare plans", color = Ma.c.text, fontWeight = FontWeight.SemiBold)
                        VSpace(10.dp)
                        Row {
                            Spacer(Modifier.weight(2f))
                            cols.forEach { c -> Text(c.name, Modifier.weight(1f), color = if (c.id == pick) Ma.c.accent else Ma.c.muted, fontSize = 11.5.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, maxLines = 1) }
                        }
                        feats.forEach { f ->
                            HorizontalDivider(Modifier.padding(vertical = 7.dp), color = Ma.c.line)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(f, Modifier.weight(2f), color = Ma.c.sub, fontSize = 12.sp, lineHeight = 15.sp)
                                cols.forEach { c ->
                                    Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                                        if (f in c.features) Box(Modifier.size(20.dp).clip(CircleShape).background(Ma.c.up.copy(alpha = .14f)), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Check, null, tint = Ma.c.up, modifier = Modifier.size(13.dp)) }
                                        else Text("—", color = Ma.c.line, fontSize = 13.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlanCard(p: Plan, cycle: String, on: Boolean, popular: Boolean, current: Boolean, onClick: () -> Unit) {
    val price = p.prices[cycle] ?: 0; val perMonth = price / months(cycle)
    val dark = on
    Box(Modifier.padding(start = 16.dp, end = 16.dp, top = 18.dp)) {
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp))
                .background(if (dark) Brush.linearGradient(listOf(Ma.c.chrome, Ma.c.mesh2.copy(alpha = .9f))) else Brush.linearGradient(listOf(Ma.c.surface, Ma.c.surface)))
                .border(if (on) 1.5.dp else 1.dp, if (on) Gold.copy(alpha = .7f) else Ma.c.line, RoundedCornerShape(22.dp)).clickable(onClick = onClick).padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(p.name, color = if (dark) Gold else Ma.c.text, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
                    if (p.tagline.isNotBlank()) Text(p.tagline, color = if (dark) Ma.c.chromeSub else Ma.c.muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Box(Modifier.size(22.dp).clip(CircleShape).border(2.dp, if (on) Gold else Ma.c.line, CircleShape), contentAlignment = Alignment.Center) {
                    if (on) Box(Modifier.size(11.dp).clip(CircleShape).background(Gold))
                }
            }
            VSpace(8.dp)
            Row(verticalAlignment = Alignment.Bottom) {
                Text(inr(perMonth.toLong()), color = if (dark) Ma.c.chromeText else Ma.c.text, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
                Text("/month${if (cycle != "Monthly") " · ${inr(price.toLong())} ${cycle.lowercase()}" else ""}", color = if (dark) Ma.c.chromeMuted else Ma.c.muted, fontSize = 12.5.sp, modifier = Modifier.padding(start = 2.dp, bottom = 5.dp))
            }
            VSpace(4.dp)
            p.features.take(4).forEach { f ->
                Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Check, null, tint = if (dark) Mint else Ma.c.up, modifier = Modifier.size(16.dp)); HSpace(8.dp)
                    Text(f, color = if (dark) Ma.c.chromeSub else Ma.c.sub, fontSize = 13.sp)
                }
            }
        }
        val badge = if (current) "YOUR PLAN" else if (popular) "MOST POPULAR" else null
        if (badge != null) Text(badge, Modifier.align(Alignment.TopEnd).padding(end = 16.dp).offset(y = (-10).dp).clip(CircleShape).background(Brush.horizontalGradient(listOf(Gold, GoldDeep))).padding(horizontal = 10.dp, vertical = 4.dp), color = Color(0xFF3B2A10), fontSize = 10.5.sp, fontWeight = FontWeight.ExtraBold)
    }
}

/* ============================== Checkout ============================== */

@Composable
fun CheckoutScreen(planId: String, cycle: String) {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val plans = rememberLoad { nav.repo.plans() }
    var method by rememberSaveable { mutableStateOf("GPay") }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    val p = (plans.res as? Res.Ok)?.value?.find { it.id == planId }
    val total = p?.prices?.get(cycle) ?: 0
    val base = total / 1.18; val gst = total - base
    fun pay() {
        busy = true; err = null
        scope.launch {
            try {
                val o = nav.repo.checkout(planId, cycle)
                if (o.provider != "mock") throw ApiException("In-app card/UPI payment needs the Razorpay SDK — coming soon. Please subscribe on the website for now.")
                nav.repo.completeMockPayment(o.orderId)
                nav.refreshHome(); nav.replace(Route.Success(planId, cycle, o.amount, method))
            } catch (e: ApiException) {
                if (e.code == "kyc_required") nav.push(Route.Kyc(Route.Checkout(planId, cycle))) else err = e.message
            } catch (e: Exception) { err = e.message }
            busy = false
        }
    }
    Screen("Pay", onBack = nav::pop, actions = {
        Row(Modifier.clip(CircleShape).background(Color.White.copy(alpha = .1f)).padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Lock, null, tint = Ma.c.chromeSub, modifier = Modifier.size(12.dp)); Spacer(Modifier.width(4.dp)); Text("SECURE", color = Ma.c.chromeSub, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }, bottom = {
        Column {
            err?.let { Text(it, Modifier.fillMaxWidth().padding(bottom = 8.dp), color = Ma.c.down, fontSize = 13.sp) }
            GradientButton("Pay ${inr(total.toLong())}${if (method in listOf("GPay", "PhonePe", "Paytm", "BHIM")) " with $method" else ""}", ::pay, loading = busy, enabled = p != null)
            Text("Payments by Razorpay · GST invoice sent by email", Modifier.fillMaxWidth().padding(top = 6.dp), color = Ma.c.muted, fontSize = 11.5.sp, textAlign = TextAlign.Center)
        }
    }) {
        LoadBox(plans) { _ ->
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 16.dp)) {
                MaCard(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp).fillMaxWidth()) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.WorkspacePremium, null, tint = Ma.c.warn); Spacer(Modifier.width(8.dp)); Text("Mod Alpha ${p?.name ?: planId} · $cycle", color = Ma.c.text, fontWeight = FontWeight.Bold) }
                        VSpace(10.dp)
                        Line("Plan price", "₹%,.2f".format(base)); Line("GST (18%)", "₹%,.2f".format(gst))
                        Box(Modifier.fillMaxWidth().padding(vertical = 8.dp).height(1.dp).background(Ma.c.line))
                        Line("Total", inr(total.toLong()), bold = true)
                    }
                }
                SectionTitle("Pay with UPI")
                Row(Modifier.padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf(Triple("GPay", "G", Color(0xFF4285F4)), Triple("PhonePe", "Pe", Color(0xFF5F259F)), Triple("Paytm", "Pt", Color(0xFF00BAF2)), Triple("BHIM", "B", Color(0xFFF37021))).forEach { (n, l, c) ->
                        val on = method == n
                        Column(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(Ma.c.surface).border(if (on) 2.dp else 1.dp, if (on) Ma.c.accent else Ma.c.line, RoundedCornerShape(14.dp)).clickable { method = n }.padding(vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(Modifier.size(34.dp).clip(RoundedCornerShape(10.dp)).background(if (n == "GPay") Color.White else c).border(1.dp, Ma.c.line, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) { Text(l, color = if (n == "GPay") c else Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp) }
                            VSpace(6.dp); Text(n, color = Ma.c.sub, fontSize = 11.5.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                SectionTitle("Other ways")
                CardList(rows = listOf(
                    { ListRow(Icons.Outlined.CreditCard, "Card", "Visa, Mastercard, RuPay", onClick = { method = "Card" }) { RadioButton(method == "Card", { method = "Card" }, colors = RadioButtonDefaults.colors(selectedColor = Ma.c.accent)) } },
                    { ListRow(Icons.Outlined.AccountBalance, "Netbanking", "All major banks", onClick = { method = "Netbanking" }) { RadioButton(method == "Netbanking", { method = "Netbanking" }, colors = RadioButtonDefaults.colors(selectedColor = Ma.c.accent)) } },
                ))
                if (com.modalpha.app.BuildConfig.API_BASE_URL.contains("stage") || nav.repo.isDemo) Text("On stage, payments are simulated: no money is charged.", Modifier.padding(20.dp), color = Ma.c.muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable private fun Line(k: String, v: String, bold: Boolean = false) = Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
    Text(k, Modifier.weight(1f), color = if (bold) Ma.c.text else Ma.c.muted, fontWeight = if (bold) FontWeight.ExtraBold else FontWeight.Normal, fontSize = if (bold) 16.sp else 14.sp)
    Text(v, color = Ma.c.text, fontWeight = if (bold) FontWeight.ExtraBold else FontWeight.Normal, fontSize = if (bold) 16.sp else 14.sp)
}

/* ============================== KYC ============================== */

@Composable
fun KycScreen(then: Route?) {
    val nav = LocalNav.current
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var pan by rememberSaveable { mutableStateOf("") }
    var name by rememberSaveable { mutableStateOf(nav.user.name.takeIf { it != "Investor" } ?: "") }
    var dob by rememberSaveable { mutableStateOf("") }
    var consent by rememberSaveable { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    val panOk = Regex("^[A-Z]{5}[0-9]{4}[A-Z]$").matches(pan)
    val iso = Regex("^(\\d{2})/(\\d{2})/(\\d{4})$").find(dob)?.destructured?.let { (d, m, y) -> "$y-$m-$d" }
    fun submit() {
        if (!panOk) { err = "Enter a valid PAN (5 letters, 4 digits, 1 letter)"; return }
        if (iso == null) { err = "Enter your date of birth as DD/MM/YYYY"; return }
        busy = true; err = null
        scope.launch {
            runCatching { nav.repo.submitPan(pan, name.trim(), iso) }.onSuccess { r ->
                when (r.status) {
                    "Verified" -> { nav.toast("KYC verified"); if (then != null) nav.replace(then) else nav.pop() }
                    "Pending" -> { info = "Your PAN is valid but there is no KYC record yet. Finish with DigiLocker (opens in your browser)."; r.redirectUrl?.let { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(it))) } }
                    else -> info = r.message ?: r.status
                }
            }.onFailure { err = it.message }
            busy = false
        }
    }
    Screen("Verify your PAN", onBack = nav::pop, header = {
        Text("Needed once for GST invoices. Takes 30 seconds.", Modifier.padding(horizontal = 20.dp), color = Ma.c.chromeSub, fontSize = 13.5.sp)
    }, bottom = { GradientButton("Verify & continue", ::submit, loading = busy, enabled = consent && name.length >= 2) }) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(20.dp)) {
            Field("PAN number", pan, { pan = it.uppercase().filter { c -> c.isLetterOrDigit() }.take(10) }, "ABCDE1234F", caps = true, big = true)
            if (panOk) Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.Check, null, tint = Ma.c.up, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(6.dp)); Text("Looks right", color = Ma.c.up, fontSize = 13.sp) }
            VSpace(16.dp)
            Field("Name as on PAN", name, { name = it.take(100) }, "Your full name")
            VSpace(16.dp)
            Field("Date of birth", dob, { v -> val d = v.filter(Char::isDigit).take(8); dob = buildString { d.forEachIndexed { i, c -> if (i == 2 || i == 4) append('/'); append(c) } } }, "DD/MM/YYYY", number = true)
            VSpace(14.dp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(consent, { consent = it }, colors = CheckboxDefaults.colors(checkedColor = Ma.c.accent))
                Text("I agree to Mod Alpha verifying my PAN and KYC records with the income-tax department and KRA.", color = Ma.c.sub, fontSize = 12.5.sp)
            }
            err?.let { VSpace(10.dp); Text(it, color = Ma.c.down, fontSize = 13.sp) }
            info?.let { VSpace(10.dp); Text(it, Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Ma.c.accent.copy(alpha = .08f)).padding(12.dp), color = Ma.c.text, fontSize = 13.sp) }
            VSpace(16.dp)
            MaCard(Modifier.fillMaxWidth(), padding = 14.dp) {
                Column {
                    Step("1", "PAN checked with the income-tax records"); Step("2", "Name matched with your KRA record"); Step("3", "DigiLocker only if KRA has no record", dim = true)
                }
            }
            Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.Lock, null, tint = Ma.c.muted, modifier = Modifier.size(14.dp)); Spacer(Modifier.width(6.dp)); Text("Encrypted. We never share your PAN.", color = Ma.c.muted, fontSize = 12.sp) }
            if (nav.repo.isDemo || com.modalpha.app.BuildConfig.API_BASE_URL.contains("stage")) Text("Stage test PANs: ABCDE1234F (verified at once) · ABCDE5678G (needs DigiLocker) · ABCDE0000X (not found)", Modifier.padding(top = 10.dp), color = Ma.c.warn, fontSize = 11.5.sp)
        }
    }
}

@Composable private fun Step(n: String, t: String, dim: Boolean = false) = Row(Modifier.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
    Box(Modifier.size(24.dp).clip(CircleShape).background(if (dim) Ma.c.surface2 else Ma.c.accent.copy(alpha = .12f)), contentAlignment = Alignment.Center) { Text(n, color = if (dim) Ma.c.muted else Ma.c.accent, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
    Spacer(Modifier.width(10.dp)); Text(t, color = if (dim) Ma.c.muted else Ma.c.text, fontSize = 13.5.sp)
}

@Composable
private fun Field(label: String, v: String, on: (String) -> Unit, hint: String, caps: Boolean = false, big: Boolean = false, number: Boolean = false) {
    Caption(label, Modifier.padding(bottom = 8.dp))
    OutlinedTextField(v, on, Modifier.fillMaxWidth(), singleLine = true, placeholder = { Text(hint) },
        textStyle = MaterialTheme.typography.bodyLarge.copy(fontSize = if (big) 22.sp else 17.sp, fontWeight = if (big) FontWeight.ExtraBold else FontWeight.SemiBold, letterSpacing = if (big) 3.sp else 0.sp, color = Ma.c.text),
        keyboardOptions = KeyboardOptions(capitalization = if (caps) KeyboardCapitalization.Characters else KeyboardCapitalization.Words, keyboardType = if (number) KeyboardType.Number else KeyboardType.Text),
        shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Ma.c.accent, unfocusedBorderColor = Ma.c.line, focusedContainerColor = Ma.c.surface, unfocusedContainerColor = Ma.c.surface))
}

/* ============================== Payment success ============================== */

@Composable
fun SuccessScreen(planId: String, cycle: String, amount: Int, method: String) {
    val nav = LocalNav.current
    val home = rememberLoad { nav.repo.home() }
    Column(Modifier.fillMaxSize().background(Ma.c.chromeBrush).statusBarsPadding().navigationBarsPadding().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Spacer(Modifier.weight(1f))
        Box(Modifier.size(124.dp).clip(CircleShape).background(Color(0xFF22C55E).copy(alpha = .1f)), contentAlignment = Alignment.Center) {
            Box(Modifier.size(96.dp).clip(CircleShape).background(Brush.radialGradient(listOf(Color(0xFF22C55E), Color(0xFF15803D)))), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.Check, null, tint = Color.White, modifier = Modifier.size(52.dp)) }
        }
        VSpace(32.dp)
        Text("You're on $planId 🎉", color = Ma.c.chromeText, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
        VSpace(8.dp)
        Text("${inr(amount.toLong())} paid · $cycle · $method", color = Ma.c.chromeSub, fontSize = 15.sp)
        VSpace(28.dp)
        val sip = (home.res as? Res.Ok)?.value?.sip
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(Color.White.copy(alpha = .06f)).border(1.dp, Ma.c.chromeLine, RoundedCornerShape(20.dp)).padding(18.dp)) {
            Text("UNLOCKED NOW", color = Ma.c.chromeMuted, style = MaterialTheme.typography.labelSmall)
            VSpace(8.dp)
            Row(verticalAlignment = Alignment.Bottom) {
                Text("This month's best date: ", color = Ma.c.chromeText, fontSize = 16.sp)
                Text(sip?.day?.let { "${it}${if (it % 10 == 1 && it != 11) "st" else if (it % 10 == 2 && it != 12) "nd" else if (it % 10 == 3 && it != 13) "rd" else "th"}" } ?: "…", color = Ma.c.gold, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            }
        }
        Spacer(Modifier.weight(1f))
        GradientButton("Set a reminder", { nav.home(); nav.remindMe(sip?.day) }, brush = Ma.c.hiBrush)
        VSpace(10.dp)
        Box(Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(14.dp)).border(1.dp, Ma.c.chromeLine, RoundedCornerShape(14.dp)).clickable { nav.home(); nav.push(Route.Subscription) }, contentAlignment = Alignment.Center) {
            Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.Download, null, tint = Ma.c.chromeText, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("GST invoice", color = Ma.c.chromeText, style = MaterialTheme.typography.labelLarge) }
        }
        VSpace(10.dp)
        TextButton({ nav.home() }) { Text("Go to Home", color = Ma.c.chromeSub) }
    }
}

/* ============================== Subscription & invoices ============================== */

@Composable
fun SubscriptionScreen() {
    val nav = LocalNav.current
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val sub = rememberLoad { nav.repo.subscription() }
    val inv = rememberLoad { nav.repo.invoices() }
    var cancelAsk by remember { mutableStateOf(false) }
    var reason by remember { mutableStateOf<String?>(null) }
    fun open(i: Invoice) = scope.launch {
        runCatching {
            val bytes = nav.repo.invoicePdf(i)
            val dir = File(ctx.cacheDir, "invoices").apply { mkdirs() }
            val f = File(dir, i.number.replace('/', '-') + ".pdf").apply { writeBytes(bytes) }
            val uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".files", f)
            ctx.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/pdf").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        }.onFailure { nav.toast(it.message ?: "Couldn't open the PDF") }
    }
    Screen("Subscription", onBack = nav::pop) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
            LoadBox(sub) { s ->
                if (s == null) Column(Modifier.padding(20.dp)) {
                    MaCard(Modifier.fillMaxWidth()) { Column {
                        Text("You're on Free", color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold); VSpace(4.dp)
                        Text("Upgrade to see each month's best SIP date and get more AI questions.", color = Ma.c.muted, fontSize = 13.sp); VSpace(14.dp)
                        GradientButton("See plans", { nav.push(Route.Plans) })
                    } }
                } else Column {
                    MaCard(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp).fillMaxWidth()) { Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.WorkspacePremium, null, tint = Ma.c.warn); Spacer(Modifier.width(8.dp))
                            Text("${s.plan} · ${s.cycle}", Modifier.weight(1f), color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Tag(if (s.cancelling) "Ends soon" else s.status, if (s.cancelling) Tone.Amber else if (s.status == "Active") Tone.Green else Tone.Red)
                        }
                        VSpace(14.dp)
                        Row { Kv(if (s.cancelling) "Ends on" else "Renews on", prettyDate(s.renewalDate), Modifier.weight(1f)); Kv("Amount", "${inr(s.amount.toLong())} / ${per(s.cycle)}", Modifier.weight(1f)) }
                        VSpace(14.dp)
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            GradientButton("Change plan", { nav.push(Route.Plans) }, Modifier.weight(1f))
                            if (s.cancelling) OutlineButton("Keep my plan", { scope.launch { runCatching { nav.repo.resume(s.id) }.onSuccess { nav.toast("Your plan will renew as usual"); sub.reload() }.onFailure { nav.toast(it.message ?: "Error") } } }, Modifier.weight(1f))
                            else OutlineButton("Cancel", { cancelAsk = true }, Modifier.weight(1f), color = Ma.c.down)
                        }
                    } }
                    Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Info, null, tint = Ma.c.accent, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(10.dp))
                        Text("Cancel anytime: you keep ${s.plan} until ${prettyDate(s.renewalDate)}. Upgrades are prorated with a GST credit note.", color = Ma.c.sub, fontSize = 12.5.sp)
                    }
                    if (cancelAsk) AlertDialog({ cancelAsk = false }, containerColor = Ma.c.surface,
                        title = { Text("Cancel ${s.plan}?") },
                        text = { Column {
                            Text("You keep ${s.plan} until ${prettyDate(s.renewalDate)}. Tell us why (optional):", color = Ma.c.sub); VSpace(8.dp)
                            listOf("too_expensive" to "Too expensive", "not_using" to "Not using it enough", "missing_feature" to "Missing a feature", "found_alternative" to "Found an alternative", "other" to "Something else").forEach { (k, l) ->
                                Row(Modifier.fillMaxWidth().clickable { reason = k }, verticalAlignment = Alignment.CenterVertically) { RadioButton(reason == k, { reason = k }, colors = RadioButtonDefaults.colors(selectedColor = Ma.c.accent)); Text(l, color = Ma.c.text) }
                            }
                        } },
                        confirmButton = { TextButton({ cancelAsk = false; scope.launch { runCatching { nav.repo.cancel(s.id, reason) }.onSuccess { nav.toast(it); sub.reload() }.onFailure { nav.toast(it.message ?: "Error") } } }) { Text("Cancel plan", color = Ma.c.down, fontWeight = FontWeight.SemiBold) } },
                        dismissButton = { TextButton({ cancelAsk = false }) { Text("Keep it", color = Ma.c.accent) } })
                }
            }
            SectionTitle("Invoices")
            LoadBox(inv) { list ->
                if (list.isEmpty()) Text("No invoices yet.", Modifier.padding(horizontal = 20.dp), color = Ma.c.muted)
                else CardList(rows = list.map { i -> {
                    val cn = i.type == "credit_note"
                    Row(Modifier.fillMaxWidth().clickable { open(i) }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(if (cn) Color(0xFFDCFCE7) else Color(0xFFFEE2E2)), contentAlignment = Alignment.Center) { Icon(Icons.AutoMirrored.Outlined.ReceiptLong, null, tint = if (cn) Color(0xFF15803D) else Color(0xFFB91C1C), modifier = Modifier.size(18.dp)) }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(i.number, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text("${prettyDate(i.issuedAt)} · ${if (cn) "credit note" else listOfNotNull(i.plan, i.cycle?.lowercase()).joinToString(" ")}", color = Ma.c.muted, fontSize = 12.sp)
                        }
                        Text((if (cn) "−" else "") + "₹%,.0f".format(i.amount), color = if (cn) Ma.c.up else Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Spacer(Modifier.width(10.dp)); Icon(Icons.Outlined.Download, "Download", tint = Ma.c.accent, modifier = Modifier.size(18.dp))
                    }
                } })
            }
        }
    }
}

@Composable private fun Kv(k: String, v: String, modifier: Modifier) = Column(modifier) { Text(k, color = Ma.c.muted, fontSize = 12.sp); Text(v, color = Ma.c.text, fontWeight = FontWeight.Bold) }

/* ============================== Help ============================== */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HelpScreen() {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val faqs = rememberLoad { nav.repo.faqs() }
    val tickets = rememberLoad { nav.repo.tickets() }
    var q by rememberSaveable { mutableStateOf("") }
    var open by remember { mutableStateOf<Int?>(null) }
    var newReq by remember { mutableStateOf(false) }
    Screen("Help", onBack = nav::pop, header = { SearchField(q, { q = it }, "Search questions", Modifier.padding(horizontal = 20.dp)) }) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
            SectionTitle("My requests", "+ New") { newReq = true }
            LoadBox(tickets) { list ->
                if (list.isEmpty()) Text("No requests yet.", Modifier.padding(horizontal = 20.dp), color = Ma.c.muted)
                else CardList(rows = list.take(5).map { t -> {
                    Column(Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(t.message, Modifier.weight(1f), color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1)
                            Spacer(Modifier.width(8.dp))
                            Tag(if (t.status == "Answered") "Replied" else t.status, when (t.status) { "Answered" -> Tone.Amber; "Closed" -> Tone.Grey; else -> Tone.Blue })
                        }
                        Text("#${t.number} · ${prettyDate(t.createdAt)}${t.reply?.let { " · \"${it.take(60)}…\"" } ?: ""}", color = Ma.c.muted, fontSize = 12.sp, maxLines = 2)
                    }
                } })
            }
            SectionTitle("Common questions")
            LoadBox(faqs) { list ->
                val shown = list.filter { q.isBlank() || it.question.contains(q, true) || it.answer.contains(q, true) }
                if (shown.isEmpty()) Text("No answers for \"$q\". Ask Mod Alpha or raise a request.", Modifier.padding(horizontal = 20.dp), color = Ma.c.muted)
                else CardList(rows = shown.take(12).mapIndexed { i, f -> {
                    Column(Modifier.fillMaxWidth().clickable { open = if (open == i) null else i }.padding(vertical = 13.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) { Text(f.question, Modifier.weight(1f), color = Ma.c.text, fontSize = 14.sp); Chevron() }
                        if (open == i) Text(f.answer, Modifier.padding(top = 8.dp), color = Ma.c.sub, fontSize = 13.5.sp)
                    }
                } })
            }
            Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 14.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).clickable { nav.goTab(com.modalpha.app.ui.Tab.Ask) }.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("Still stuck?", color = Ma.c.text, fontWeight = FontWeight.SemiBold); Text("Ask Mod Alpha, or email support@modalpha.in", color = Ma.c.muted, fontSize = 12.sp) }
                Chevron()
            }
        }
    }
    if (newReq) {
        var topic by remember { mutableStateOf("Product question") }
        var msg by remember { mutableStateOf("") }
        var email by remember { mutableStateOf(nav.user.email ?: "") }
        var busy by remember { mutableStateOf(false) }
        ModalBottomSheet({ newReq = false }, containerColor = Ma.c.surface) {
            Column(Modifier.padding(start = 20.dp, end = 20.dp, bottom = 28.dp)) {
                Text("New request", color = Ma.c.text, style = MaterialTheme.typography.titleLarge); VSpace(12.dp)
                com.modalpha.app.ui.kit.Chips(listOf("Product question", "Fund data", "Subscription", "Account & privacy"), topic, { topic = it }, modifier = Modifier.padding(horizontal = 0.dp))
                VSpace(12.dp)
                if (nav.user.email == null) { OutlinedTextField(email, { email = it.trim() }, Modifier.fillMaxWidth(), label = { Text("Your email (for our reply)") }, singleLine = true); VSpace(10.dp) }
                OutlinedTextField(msg, { msg = it.take(2000) }, Modifier.fillMaxWidth().height(140.dp), label = { Text("How can we help?") })
                VSpace(14.dp)
                GradientButton("Send", {
                    busy = true
                    scope.launch { runCatching { nav.repo.newTicket(email, topic, msg) }.onSuccess { nav.toast("Request $it received. We reply within one business day."); newReq = false; tickets.reload() }.onFailure { nav.toast(it.message ?: "Couldn't send") }; busy = false }
                }, loading = busy, enabled = msg.trim().length >= 10 && email.contains('@'))
            }
        }
    }
}
