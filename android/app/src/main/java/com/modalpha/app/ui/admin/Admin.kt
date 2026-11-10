package com.modalpha.app.ui.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.SupportAgent
import androidx.compose.material.icons.outlined.TrendingUp
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.modalpha.app.SessionViewModel
import com.modalpha.app.data.AdminTicket
import com.modalpha.app.data.AdminUser
import com.modalpha.app.data.AltDay
import com.modalpha.app.data.Kpi
import com.modalpha.app.data.Repository
import com.modalpha.app.data.SipValidation
import com.modalpha.app.data.User
import com.modalpha.app.data.prettyMobile
import com.modalpha.app.ui.Biometrics
import com.modalpha.app.ui.components.ChartSeries
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.GridChart
import com.modalpha.app.ui.components.MaCard
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.components.inr
import com.modalpha.app.ui.components.inrShort
import com.modalpha.app.ui.explore.SearchField
import com.modalpha.app.ui.explore.prettyDate
import com.modalpha.app.ui.kit.Caption
import com.modalpha.app.ui.kit.CardList
import com.modalpha.app.ui.kit.Chevron
import com.modalpha.app.ui.kit.ChromeHeader
import com.modalpha.app.ui.kit.Chips
import com.modalpha.app.ui.kit.Empty
import com.modalpha.app.ui.kit.ListRow
import com.modalpha.app.ui.kit.LoadBox
import com.modalpha.app.ui.kit.MaSwitch
import com.modalpha.app.ui.kit.OutlineButton
import com.modalpha.app.ui.kit.Res
import com.modalpha.app.ui.kit.Screen
import com.modalpha.app.ui.kit.SectionTitle
import com.modalpha.app.ui.kit.Tag
import com.modalpha.app.ui.kit.Tone
import com.modalpha.app.ui.kit.rememberLoad
import com.modalpha.app.ui.theme.AppTheme
import com.modalpha.app.ui.theme.Ma
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.ui.graphics.Brush
import com.modalpha.app.data.Analytics
import com.modalpha.app.ui.components.*
import kotlinx.coroutines.launch
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

/* ============================== frame ============================== */

enum class AdminTab(val label: String, val icon: ImageVector) {
    Overview("Overview", Icons.Outlined.Insights), Users("Users", Icons.Outlined.People), Support("Support", Icons.Outlined.SupportAgent),
    Sip("SIP date", Icons.Outlined.CalendarMonth), More("More", Icons.Outlined.MoreHoriz),
}
sealed interface AdminRoute { data class UserDetail(val id: String) : AdminRoute; data class Ticket(val t: AdminTicket) : AdminRoute }

class AdminNav(val repo: Repository, val me: User, val toast: (String) -> Unit, val push: (AdminRoute) -> Unit, val pop: () -> Unit, val tab: (AdminTab) -> Unit)
val LocalAdmin = staticCompositionLocalOf<AdminNav> { error("no admin nav") }

private fun pctTxt(v: Double?) = v?.let { (if (it >= 0) "▲ " else "▼ ") + "%.1f%%".format(kotlin.math.abs(it)) } ?: ""
private fun statusTone(s: String) = when (s) { "Active", "Verified", "captured", "Answered" -> Tone.Green; "Suspended", "Rejected", "failed", "Closed" -> Tone.Red; "refunded", "In review", "In progress", "Pending" -> Tone.Amber; "Open" -> Tone.Blue; else -> Tone.Grey }

/** Admin home: five tabs, screens pushed over them, same theme as the investor app. */
@Composable
fun AdminTabs(me: User, repo: Repository, session: SessionViewModel, bio: Biometrics) {
    var tab by rememberSaveable { mutableStateOf(AdminTab.Overview) }
    val stack = remember { mutableStateListOf<AdminRoute>() }
    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val nav = remember(me) { AdminNav(repo, me, { m -> scope.launch { snack.currentSnackbarData?.dismiss(); snack.showSnackbar(m) } }, { stack.add(it) }, { if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex) }, { tab = it }) }
    androidx.activity.compose.BackHandler(stack.isNotEmpty()) { nav.pop() }
    androidx.activity.compose.BackHandler(stack.isEmpty() && tab != AdminTab.Overview) { tab = AdminTab.Overview }
    CompositionLocalProvider(LocalAdmin provides nav) {
        Box(Modifier.fillMaxSize()) {
            Scaffold(containerColor = Ma.c.bg, snackbarHost = { SnackbarHost(snack) }, bottomBar = {
                Box(Modifier.fillMaxWidth().background(Ma.c.bg).navigationBarsPadding().padding(start = 12.dp, end = 12.dp, bottom = 8.dp, top = 6.dp)) {
                    Row(Modifier.fillMaxWidth().height(64.dp).clip(RoundedCornerShape(24.dp)).background(Ma.c.chrome.copy(alpha = .96f)).border(1.dp, Color.White.copy(alpha = .08f), RoundedCornerShape(24.dp)),
                        horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
                        AdminTab.entries.forEach { t ->
                            val on = t == tab
                            Column(Modifier.width(64.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Tab) { tab = t }.padding(vertical = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(t.icon, null, tint = if (on) Ma.c.hi else Ma.c.chromeMuted, modifier = Modifier.size(22.dp)); VSpace(3.dp)
                                Text(t.label, color = if (on) Color.White else Ma.c.chromeMuted, fontSize = 10.5.sp, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal, maxLines = 1)
                            }
                        }
                    }
                }
            }) { pad ->
                val b = pad.calculateBottomPadding()
                when (tab) {
                    AdminTab.Overview -> OverviewTab(b)
                    AdminTab.Users -> UsersTab(b)
                    AdminTab.Support -> SupportTab(b)
                    AdminTab.Sip -> SipDateTab(b)
                    AdminTab.More -> MoreTab(session, bio, b)
                }
            }
            stack.lastOrNull()?.let { r ->
                Box(Modifier.fillMaxSize().background(Ma.c.bg)) {
                    androidx.compose.runtime.key(stack.size) {
                        when (r) { is AdminRoute.UserDetail -> UserDetailScreen(r.id); is AdminRoute.Ticket -> TicketScreen(r.t) }
                    }
                }
                SnackbarHost(snack, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 16.dp))
            }
        }
    }
}

/** Dark header with the admin badge. */
@Composable
private fun AdminHeader(title: String, sub: String? = null, extra: @Composable () -> Unit = {}) {
    val a = LocalAdmin.current
    ChromeHeader(title, actions = {
        Text((if (a.me.role == "superadmin") "Super admin" else "Admin").uppercase(), Modifier.clip(CircleShape).background(Color(0xFFFDF3DC)).border(1.dp, Ma.c.gold, CircleShape).padding(horizontal = 10.dp, vertical = 4.dp),
            color = Color(0xFF92600A), fontSize = 10.5.sp, fontWeight = FontWeight.Bold, letterSpacing = .4.sp)
    }) {
        if (sub != null) Text(sub, Modifier.padding(horizontal = 20.dp), color = Ma.c.chromeSub, fontSize = 13.5.sp)
        extra()
    }
}

/* ============================== Overview ============================== */

private val PLAN_COLORS = listOf(Color(0xFF94A3B8), Color(0xFF6366F1), Gold, Color(0xFF10B981), Color(0xFFEC4899))

@Composable
private fun OverviewTab(bottom: Dp) {
    val a = LocalAdmin.current
    val o = rememberLoad { a.repo.adminOverview() }
    Column(Modifier.fillMaxSize()) {
        val r = (o.res as? Res.Ok)?.value
        AdminHeader("Overview", r?.let { "${prettyDate(it.from)} – ${prettyDate(it.to)} · vs previous period" } ?: "This month") {
            if (r != null) {
                VSpace(12.dp)
                val users = r.series.map { it.newUsers.toDouble() }
                var cum = 0.0; val rev = r.series.map { cum += it.revenue; cum }
                Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GlassKpi("Total users", "%,d".format(r.totalUsers.value.toLong()), r.totalUsers, users, Modifier.weight(1f))
                        GlassKpi("Subscribers", "%,d".format(r.activeSubs.value.toLong()), r.activeSubs, rev, Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GlassKpi("Revenue", inrShort(r.revenue.value), r.revenue, rev, Modifier.weight(1f), gold = true)
                        GlassKpi("Conversion", "%.1f%%".format(r.conversion.value), r.conversion, users, Modifier.weight(1f), pp = true)
                    }
                }
            }
        }
        LoadBox(o) { d ->
            Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(top = 14.dp, bottom = bottom + 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Plan mix donut
                    MaCard(Modifier.weight(1.25f).fillMaxHeight(), padding = 14.dp) {
                        Column {
                            Text("Plan mix", color = Ma.c.text, fontWeight = FontWeight.SemiBold)
                            VSpace(10.dp)
                            val mix = d.planMix.filter { it.users > 0 }
                            val tot = mix.sumOf { it.users }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Donut(mix.mapIndexed { i, p -> p.users.toFloat() to PLAN_COLORS[i % PLAN_COLORS.size] }, 74.dp, 11.dp) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(if (tot >= 10000) "%.1fK".format(tot / 1000.0) else "%,d".format(tot), color = Ma.c.text, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp)
                                        Text("users", color = Ma.c.muted, fontSize = 9.5.sp)
                                    }
                                }
                                HSpace(10.dp)
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    mix.forEachIndexed { i, p ->
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(Modifier.size(8.dp).clip(CircleShape).background(PLAN_COLORS[i % PLAN_COLORS.size])); HSpace(5.dp)
                                            Text(p.plan, color = Ma.c.sub, fontSize = 11.5.sp, maxLines = 1)
                                            HSpace(4.dp)
                                            Text("${if (tot > 0) p.users * 100 / tot else 0}%", color = Ma.c.text, fontSize = 11.5.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Support tile
                    Column(
                        Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(20.dp)).background(Brush.linearGradient(listOf(Color(0xFF7C3AED), Color(0xFF4F46E5))))
                            .clickable { a.tab(AdminTab.Support) }.padding(14.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.SupportAgent, null, tint = Color.White, modifier = Modifier.size(18.dp)); HSpace(6.dp)
                            Text("Support", color = Color.White, fontWeight = FontWeight.SemiBold)
                        }
                        VSpace(6.dp)
                        Text("${d.openTickets}", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                        Text("waiting", color = Color.White.copy(alpha = .8f), fontSize = 12.sp)
                        Spacer(Modifier.weight(1f))
                        Text(listOfNotNull(d.avgReplyHours?.let { "avg reply %.1fh".format(it) }, d.oldestWaiting?.let { "oldest ${prettyDate(it).substringBeforeLast(" ")}" }).joinToString(" · ").ifEmpty { "All caught up" },
                            color = Color.White.copy(alpha = .85f), fontSize = 11.sp, lineHeight = 14.sp)
                    }
                }
                d.funnel?.let { f ->
                    MaCard(Modifier.fillMaxWidth()) {
                        Column {
                            Row { Text("Sign-up funnel", color = Ma.c.text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f)); Text("this period", color = Ma.c.muted, fontSize = 12.sp) }
                            VSpace(10.dp)
                            val top = f.signedUp.coerceAtLeast(1)
                            listOf("Signed up" to f.signedUp, "Verified" to f.verified, "KYC done" to f.kyc, "Paid" to f.paid).forEachIndexed { i, (k, v) ->
                                Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(k, Modifier.width(76.dp), color = Ma.c.sub, fontSize = 12.sp)
                                    Box(Modifier.weight(1f).height(22.dp).clip(RoundedCornerShape(7.dp)).background(Ma.c.surface2)) {
                                        Box(Modifier.fillMaxWidth((v.toFloat() / top).coerceIn(.04f, 1f)).height(22.dp).clip(RoundedCornerShape(7.dp))
                                            .background(Brush.horizontalGradient(listOf(Ma.c.hi.copy(alpha = 1f - i * .18f), Ma.c.hi2.copy(alpha = 1f - i * .18f)))))
                                    }
                                    Text("%,d".format(v), Modifier.width(52.dp), color = Ma.c.text, fontSize = 12.5.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End)
                                }
                            }
                            Text("${"%.1f".format(f.paid * 100.0 / top)}% of new sign-ups paid", color = Ma.c.muted, fontSize = 11.5.sp, modifier = Modifier.padding(top = 6.dp))
                        }
                    }
                }
                if (d.series.size > 1) MaCard(Modifier.fillMaxWidth()) {
                    Column {
                        Row { Text("Revenue", color = Ma.c.text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f)); Text("${d.newUsers} new users", color = Ma.c.muted, fontSize = 12.5.sp) }
                        VSpace(10.dp)
                        var cum = 0.0
                        GridChart(listOf(ChartSeries(d.series.map { cum += it.revenue; cum }, Ma.c.accent, fill = true)),
                            listOf(d.series.first().bucket, d.series[d.series.size / 2].bucket, d.series.last().bucket).map { prettyDate(it).substringBeforeLast(" ") },
                            Modifier.fillMaxWidth().height(140.dp), yFormat = { inrShort(it) }, glow = true)
                        Text("Cumulative revenue this period", color = Ma.c.muted, fontSize = 11.5.sp, modifier = Modifier.padding(top = 6.dp))
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp, start = 4.dp)) {
                    Text("Recent sign-ups", color = Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    Text("All users", Modifier.clickable { a.tab(AdminTab.Users) }, color = Ma.c.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
                CardList(Modifier.padding(horizontal = 0.dp), rows = d.signups.map { s -> { Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Avatar(s.name); Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) { Text(s.name, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp); Text("${s.contact} · ${prettyDate(s.date)}", color = Ma.c.muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis) }
                    Tag(s.status, statusTone(s.status))
                } } })
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp, start = 4.dp)) {
                    Text("Recent subscriptions", color = Ma.c.text, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                    Text("Payments", Modifier.clickable { a.tab(AdminTab.More) }, color = Ma.c.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
                CardList(Modifier.padding(horizontal = 0.dp), rows = d.subs.map { s -> { Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text(s.name, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp); Text("${s.plan} · ${s.cycle} · ${prettyDate(s.date)}", color = Ma.c.muted, fontSize = 12.sp) }
                    Text(inr(s.amount.toLong()), color = Ma.c.text, fontWeight = FontWeight.Bold)
                } } })
            }
        }
    }
}

/** KPI on the dark header: value, change and a sparkline. */
@Composable
private fun GlassKpi(label: String, value: String, k: Kpi, spark: List<Double>, modifier: Modifier, pp: Boolean = false, gold: Boolean = false) {
    GlassCard(modifier, gold = gold) {
        Column {
            Text(label.uppercase(), color = if (gold) goldInk() else Ma.c.chromeMuted, fontSize = 9.5.sp, fontWeight = FontWeight.Bold, letterSpacing = .8.sp, maxLines = 1)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(value, color = Ma.c.chromeText, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1, modifier = Modifier.weight(1f))
                if (spark.size > 1) Sparkline(spark, if (gold) GoldDeep else Ma.c.up, Modifier.size(48.dp, 22.dp))
            }
            k.changePct?.let {
                Text(if (pp) (if (it >= 0) "▲ " else "▼ ") + "%.1f pts".format(kotlin.math.abs(it)) else pctTxt(it), color = if (it >= 0) mintInk() else Color(0xFFF87171), fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable private fun Avatar(name: String) = Box(Modifier.size(36.dp).clip(CircleShape).background(Ma.c.accent.copy(alpha = .12f)), contentAlignment = Alignment.Center) {
    Text(name.trim().take(1).uppercase().ifBlank { "?" }, color = Ma.c.accent, fontWeight = FontWeight.Bold)
}

/* ============================== Users ============================== */

@Composable
private fun UsersTab(bottom: Dp) {
    val a = LocalAdmin.current
    var q by rememberSaveable { mutableStateOf("") }
    var st by rememberSaveable { mutableStateOf("All") }
    val users = rememberLoad(q to st) { kotlinx.coroutines.delay(250); a.repo.adminUsers(q, st.takeIf { it != "All" }) }
    Column(Modifier.fillMaxSize()) {
        AdminHeader("Users") {
            SearchField(q, { q = it }, "Name, email, mobile or ID", Modifier.padding(horizontal = 20.dp)); VSpace(12.dp)
            Chips(listOf("All", "Active", "Suspended", "Closed"), st, { st = it }, dark = true)
        }
        LoadBox(users) { list ->
            if (list.isEmpty()) Empty(Icons.Outlined.People, "No users found", "Try another name, email or mobile number.")
            else Column(Modifier.verticalScroll(rememberScrollState()).padding(top = 12.dp, bottom = bottom + 20.dp)) {
                CardList(rows = list.map { u -> { UserRow(u) { a.push(AdminRoute.UserDetail(u.id)) } } })
            }
        }
    }
}

@Composable
private fun UserRow(u: AdminUser, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
        Avatar(u.name); Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(u.name, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(listOfNotNull(u.email, u.mobile?.let { prettyMobile(it) }).firstOrNull() ?: u.ref, color = Ma.c.muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(u.plan, color = if (u.plan.startsWith("Free")) Ma.c.muted else Ma.c.accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        }
        Column(horizontalAlignment = Alignment.End) { Tag(u.status, statusTone(u.status)); VSpace(4.dp); Text("KYC ${u.kyc}", color = Ma.c.muted, fontSize = 11.sp) }
    }
}

@Composable
private fun UserDetailScreen(id: String) {
    val a = LocalAdmin.current
    val scope = rememberCoroutineScope()
    val d = rememberLoad(id) { a.repo.adminUser(id) }
    var ask by remember { mutableStateOf<String?>(null) }
    var reason by remember { mutableStateOf("") }
    Screen("User", onBack = a.pop) {
        LoadBox(d) { x ->
            val u = x.user
            Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
                MaCard(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp).fillMaxWidth()) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Avatar(u.name); Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) { Text(u.name, color = Ma.c.text, fontSize = 18.sp, fontWeight = FontWeight.Bold); Text("${u.ref} · joined ${prettyDate(u.signupDate)}", color = Ma.c.muted, fontSize = 12.sp) }
                            Tag(u.status, statusTone(u.status))
                        }
                        VSpace(14.dp)
                        Kv("Email", (u.email ?: "—") + if (u.email != null) (if (x.emailVerified) "  ✓ verified" else "  · not verified") else "")
                        Kv("Mobile", (u.mobile?.let { prettyMobile(it) } ?: "—") + if (u.mobile != null) (if (x.mobileVerified) "  ✓ verified" else "  · not verified") else "")
                        Kv("KYC", u.kyc); Kv("Plan", u.plan); Kv("Role", u.role)
                    }
                }
                SectionTitle("Subscriptions")
                if (x.subs.isEmpty()) Text("No subscriptions.", Modifier.padding(horizontal = 20.dp), color = Ma.c.muted)
                else CardList(rows = x.subs.map { s -> { Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text("${s.plan} · ${s.cycle}", color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp); Text("${s.id} · ${prettyDate(s.start)}${s.renewal?.let { " → " + prettyDate(it) } ?: ""}", color = Ma.c.muted, fontSize = 12.sp) }
                    Column(horizontalAlignment = Alignment.End) { Text(inr(s.amount.toLong()), color = Ma.c.text, fontWeight = FontWeight.Bold); Tag(s.status, statusTone(s.status)) }
                } } })
                Row(Modifier.padding(20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (u.status == "Active") OutlineButton("Suspend account", { reason = ""; ask = "Suspended" }, Modifier.weight(1f), color = Ma.c.down)
                    else GradientButton("Reactivate", { reason = ""; ask = "Active" }, Modifier.weight(1f))
                }
                Text("Refunds, role changes and data exports are on the website admin.", Modifier.padding(horizontal = 20.dp), color = Ma.c.muted, fontSize = 12.sp)
            }
            ask?.let { target ->
                AlertDialog({ ask = null }, containerColor = Ma.c.surface,
                    title = { Text(if (target == "Active") "Reactivate ${u.name}?" else "Suspend ${u.name}?") },
                    text = { Column {
                        Text(if (target == "Active") "They can sign in again." else "They are signed out everywhere and can't sign in until reactivated.", color = Ma.c.sub); VSpace(10.dp)
                        OutlinedTextField(reason, { reason = it.take(200) }, Modifier.fillMaxWidth(), label = { Text("Reason (kept in the audit log)") })
                    } },
                    confirmButton = { TextButton({
                        scope.launch { runCatching { a.repo.adminSetStatus(u.id, target, reason.trim()) }.onSuccess { a.toast(if (target == "Active") "Account reactivated" else "Account suspended"); d.reload() }.onFailure { a.toast(it.message ?: "Error") } }
                        ask = null
                    }, enabled = reason.trim().length >= 3) { Text(if (target == "Active") "Reactivate" else "Suspend", color = if (target == "Active") Ma.c.accent else Ma.c.down, fontWeight = FontWeight.SemiBold) } },
                    dismissButton = { TextButton({ ask = null }) { Text("Cancel", color = Ma.c.muted) } })
            }
        }
    }
}

@Composable private fun Kv(k: String, v: String) = Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
    Text(k, Modifier.width(72.dp), color = Ma.c.muted, fontSize = 13.sp); Text(v, color = Ma.c.text, fontSize = 13.5.sp)
}

/* ============================== Support ============================== */

private fun statusColor(s: String) = when (s) { "Open" -> Color(0xFF2563EB); "In progress" -> Color(0xFFD97706); "Answered" -> Color(0xFF059669); else -> Color(0xFF94A3B8) }

@Composable
private fun SupportTab(bottom: Dp) {
    val a = LocalAdmin.current
    var st by rememberSaveable { mutableStateOf("Open") }
    val l = rememberLoad(st) { a.repo.adminTickets(st.takeIf { it != "All" }) }
    val avg = rememberLoad { a.repo.adminOverview().avgReplyHours }
    val counts = (l.res as? Res.Ok)?.value?.second.orEmpty()
    Column(Modifier.fillMaxSize()) {
        AdminHeader("Support inbox") {
            Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Open", "In progress", "Answered").forEach { s ->
                    GlassCard(Modifier.weight(1f).clickable { st = s }, gold = s == st) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(7.dp).clip(CircleShape).background(statusColor(s))); HSpace(5.dp)
                                Text((if (s == "In progress") "Working" else s).uppercase(), color = Ma.c.chromeMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = .6.sp, maxLines = 1)
                            }
                            Text("${counts[s] ?: 0}", color = Ma.c.chromeText, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                        }
                    }
                }
                GlassCard(Modifier.weight(1f)) {
                    Column {
                        Text("AVG REPLY", color = Ma.c.chromeMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = .6.sp, maxLines = 1)
                        Text((avg.res as? Res.Ok)?.value?.let { "%.1fh".format(it) } ?: "—", color = mintInk(), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
            VSpace(12.dp)
            Chips(listOf("Open", "In progress", "Answered", "Closed", "All"), st, { st = it }, dark = true)
        }
        LoadBox(l) { (list, _) ->
            if (list.isEmpty()) Empty(Icons.Outlined.CheckCircle, "Nothing here", if (st == "Open") "No open requests. Nice." else "No requests with this status.")
            else Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(top = 14.dp, bottom = bottom + 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                list.forEach { t ->
                    val col = statusColor(t.status)
                    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min).clip(RoundedCornerShape(16.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(16.dp)).clickable { a.push(AdminRoute.Ticket(t)) }) {
                        Box(Modifier.width(5.dp).fillMaxHeight().background(col))
                        Column(Modifier.weight(1f).padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(t.topic, Modifier.clip(CircleShape).background(col.copy(alpha = .12f)).padding(horizontal = 8.dp, vertical = 2.dp), color = col, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.weight(1f))
                                Text(prettyDate(t.createdAt), color = Ma.c.muted, fontSize = 11.sp)
                            }
                            VSpace(6.dp)
                            Text(t.message, color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            VSpace(6.dp)
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Avatar(t.name ?: t.email); HSpace(8.dp)
                                Text("${t.name ?: t.email} · #${t.number}", Modifier.weight(1f), color = Ma.c.muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Tag(t.status, statusTone(t.status))
                            }
                        }
                    }
                }
            }
        }
    }
}

private val QUICK = listOf(
    "Thanks for writing in — we're looking into this and will update you shortly.",
    "Your payment has been confirmed and your plan is active now.",
    "Please update the app and sign in again; that should fix it.",
    "The best SIP date is published by the 25th for the next month.",
)

@Composable
private fun TicketScreen(t0: AdminTicket) {
    val a = LocalAdmin.current
    val scope = rememberCoroutineScope()
    var t by remember { mutableStateOf(t0) }
    var reply by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    fun update(rp: String?, status: String?) {
        busy = true
        scope.launch {
            runCatching { a.repo.adminUpdateTicket(t.number, rp, status) }.onSuccess {
                t = t.copy(reply = rp ?: t.reply, status = status ?: if (rp != null) "Answered" else t.status); if (rp != null) reply = ""
                a.toast(if (rp != null) "Reply sent to ${t.email}" else "Marked ${status!!.lowercase()}")
            }.onFailure { a.toast(it.message ?: "Error") }
            busy = false
        }
    }
    Screen("#${t.number}", onBack = a.pop, header = {
        Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            GhostChip(t.topic); HSpace(8.dp); GhostChip(t.status, gold = t.status == "Open")
            Spacer(Modifier.weight(1f))
            Text(prettyDate(t.createdAt), color = Ma.c.chromeMuted, fontSize = 12.sp)
        }
    }, bottom = {
        Column {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                QUICK.forEach { q -> Text(q.take(28) + "…", Modifier.clip(CircleShape).background(Ma.c.accent.copy(alpha = .1f)).clickable { reply = q }.padding(horizontal = 10.dp, vertical = 6.dp), color = Ma.c.accent, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
            }
            OutlinedTextField(reply, { reply = it.take(4000) }, Modifier.fillMaxWidth().height(100.dp), placeholder = { Text("Write a reply… (emailed to ${t.email})") },
                shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Ma.c.accent, unfocusedBorderColor = Ma.c.line))
            VSpace(10.dp)
            GradientButton("Send reply", { update(reply.trim(), null) }, loading = busy, enabled = reply.trim().length >= 2)
        }
    }) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(t.name ?: t.email); HSpace(10.dp)
                Column { Text(t.name ?: "Visitor", color = Ma.c.text, fontWeight = FontWeight.SemiBold); Text(t.email, color = Ma.c.muted, fontSize = 12.5.sp) }
            }
            VSpace(12.dp)
            Text(t.message, Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp, 18.dp, 18.dp, 6.dp)).background(Ma.c.surface).border(1.dp, Ma.c.line, RoundedCornerShape(18.dp, 18.dp, 18.dp, 6.dp)).padding(14.dp), color = Ma.c.text, fontSize = 15.sp)
            t.reply?.let {
                VSpace(12.dp)
                Text(it, Modifier.padding(start = 40.dp).fillMaxWidth().clip(RoundedCornerShape(18.dp, 18.dp, 6.dp, 18.dp)).background(Ma.c.accentBrush).padding(14.dp), color = Color.White, fontSize = 14.5.sp)
                Text("Our reply", Modifier.fillMaxWidth().padding(top = 4.dp), color = Ma.c.muted, fontSize = 11.sp, textAlign = TextAlign.End)
            }
            VSpace(14.dp)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("In progress", "Closed", "Open").filter { it != t.status }.forEach { s -> OutlineButton("Mark ${s.lowercase()}", { update(null, s) }) }
            }
        }
    }
}

/* ============================== SIP date ============================== */

@Composable
private fun SipDateTab(bottom: Dp) {
    val a = LocalAdmin.current
    val scope = rememberCoroutineScope()
    val months = listOf(YearMonth.now(), YearMonth.now().plusMonths(1), YearMonth.now().plusMonths(2)).map { it.toString() }
    var month by rememberSaveable { mutableStateOf(months[1]) }
    var day by rememberSaveable { mutableStateOf(12) }
    var uplift by rememberSaveable { mutableStateOf("2.8") }
    var alts by rememberSaveable { mutableStateOf("5,20,28") }
    var reason by rememberSaveable { mutableStateOf("") }
    var check by remember { mutableStateOf<SipValidation?>(null) }
    var busy by remember { mutableStateOf(false) }
    var confirm by remember { mutableStateOf(false) }
    var err by remember { mutableStateOf<String?>(null) }
    val hist = rememberLoad { a.repo.sipHistory().first }
    val altList = alts.split(",", " ").mapNotNull { it.trim().toIntOrNull() }.filter { it in 1..28 && it != day }.distinct().take(3).map { AltDay(it, null) }
    val up = uplift.toDoubleOrNull()
    val (confPct, confLabel) = Analytics.confidence(up, altList.map { up?.let { u -> u * .6 } })
    fun mName(m: String) = YearMonth.parse(m).let { it.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + it.year }
    fun validate(then: (() -> Unit)? = null) {
        busy = true; err = null
        scope.launch { runCatching { a.repo.adminValidateSip(month, day, reason.trim().ifEmpty { "Checking the date" }, uplift.toDoubleOrNull(), altList) }.onSuccess { check = it; then?.invoke() }.onFailure { err = it.message }; busy = false }
    }
    Column(Modifier.fillMaxSize()) {
        AdminHeader("Publish SIP date") {
            Column(Modifier.padding(horizontal = 16.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    months.forEach { m ->
                        val on = m == month
                        Text(mName(m), Modifier.weight(1f).clip(RoundedCornerShape(10.dp)).background(if (on) Ma.c.accent else Ma.c.surface)
                            .border(1.dp, if (on) Ma.c.accent else Ma.c.line, RoundedCornerShape(10.dp)).clickable { month = m; check = null }.padding(vertical = 8.dp),
                            color = if (on) Color.White else Ma.c.sub, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
                    }
                }
                VSpace(10.dp)
                (1..28).chunked(7).forEach { w ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                        w.forEach { d ->
                            val on = d == day; val alt = altList.any { it.day == d }
                            Box(
                                Modifier.weight(1f).height(34.dp).clip(RoundedCornerShape(9.dp))
                                    .background(if (on) Brush.linearGradient(listOf(Gold, GoldDeep)) else Brush.linearGradient(listOf(if (alt) Color(0xFFE3F5EC) else Ma.c.surface, if (alt) Color(0xFFE3F5EC) else Ma.c.surface)))
                                    .border(1.dp, if (alt) Ma.c.up else Ma.c.line, RoundedCornerShape(9.dp)).clickable { day = d; check = null },
                                contentAlignment = Alignment.Center,
                            ) { Text("$d", color = if (on) Color(0xFF3B2405) else Ma.c.text, fontWeight = if (on) FontWeight.ExtraBold else FontWeight.SemiBold, fontSize = 13.sp) }
                        }
                    }
                }
                VSpace(10.dp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GlassCard(Modifier.weight(1f)) { StatBlock("Confidence", "$confPct%", confLabel, valueColor = if (confPct >= 80) mintInk() else goldInk(), valueSize = 18) }
                    GlassCard(Modifier.weight(1f)) { StatBlock("Uplift", up?.let { pct(it) } ?: "—", "vs the 1st", valueSize = 18) }
                    GlassCard(Modifier.weight(1f)) { StatBlock("Reminders", check?.let { "%,d".format(it.recipients) } ?: "—", "subscribers", valueSize = 18) }
                }
            }
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 14.dp, bottom = bottom + 20.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Field("Uplift vs 1st (%)", uplift, { uplift = it.filter { c -> c.isDigit() || c == '.' || c == '-' }.take(6); check = null }, Modifier.weight(1f), KeyboardType.Decimal)
                Field("Good days (up to 3)", alts, { alts = it.filter { c -> c.isDigit() || c == ',' || c == ' ' }.take(12); check = null }, Modifier.weight(1.3f), KeyboardType.Number)
            }
            VSpace(10.dp)
            Field("Reason (shown in the audit log)", reason, { reason = it.take(500) }, Modifier.fillMaxWidth())
            VSpace(14.dp)
            check?.let { v ->
                MaCard(Modifier.fillMaxWidth(), padding = 14.dp) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Checks for ${prettyDate(v.date)}", color = Ma.c.text, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Tag(if (v.ok) "Ready" else "Blocked", if (v.ok) Tone.Green else Tone.Red)
                        }
                        VSpace(6.dp)
                        v.checks.forEach { c ->
                            Row(Modifier.padding(vertical = 4.dp)) {
                                val (ic, col) = when (c.level) { "error" -> Icons.Outlined.ErrorOutline to Ma.c.down; "warn" -> Icons.Outlined.Warning to Ma.c.warn; else -> Icons.Outlined.CheckCircle to Ma.c.up }
                                Icon(ic, null, tint = col, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(c.msg, color = Ma.c.sub, fontSize = 13.sp)
                            }
                        }
                        VSpace(6.dp); Text("Reminder campaign: ${"%,d".format(v.recipients)} active subscribers, 2 days before.", color = Ma.c.muted, fontSize = 12.5.sp)
                    }
                }
                VSpace(12.dp)
            }
            err?.let { Text(it, color = Ma.c.down, fontSize = 13.sp, modifier = Modifier.padding(bottom = 10.dp)) }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlineButton("Check", { validate() }, Modifier.weight(1f))
                GradientButton("Publish", { validate { confirm = true } }, Modifier.weight(1.4f), loading = busy, enabled = reason.trim().length >= 5)
            }
            if (reason.trim().length < 5) Text("Add a reason (at least 5 characters) to publish.", Modifier.padding(top = 8.dp), color = Ma.c.muted, fontSize = 12.sp)
            // Last 6 published months
            val past = (hist.res as? Res.Ok)?.value.orEmpty().filter { it.day != null }.take(6).reversed()
            if (past.size > 1) {
                VSpace(14.dp)
                MaCard(Modifier.fillMaxWidth()) {
                    Column {
                        Text("Last ${past.size} months", color = Ma.c.text, fontWeight = FontWeight.SemiBold)
                        Caption("Published date and its edge over the 1st")
                        VSpace(10.dp)
                        Row(Modifier.fillMaxWidth()) { past.forEach { Text(pct(it.upliftPct), Modifier.weight(1f), color = if ((it.upliftPct ?: 0.0) >= 0) Ma.c.up else Ma.c.down, fontSize = 10.5.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, maxLines = 1) } }
                        BarStrip(past.map { it.upliftPct ?: 0.0 }, Modifier.fillMaxWidth().height(70.dp), hi = past.lastIndex, good = past.indices.filter { (past[it].upliftPct ?: 0.0) > 0 }.toSet(), gap = 10.dp, signed = true)
                        VSpace(4.dp)
                        Row(Modifier.fillMaxWidth()) { past.forEach { m -> Text("${m.day}${ordinalSfx(m.day!!)} " + YearMonth.parse(m.month).month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH), Modifier.weight(1f), color = Ma.c.muted, fontSize = 10.sp, textAlign = TextAlign.Center, maxLines = 1) } }
                    }
                }
            }
        }
    }
    if (confirm) check?.let { v ->
        AlertDialog({ confirm = false }, containerColor = Ma.c.surface,
            title = { Text(if (v.ok) "Publish ${prettyDate(v.date)}?" else "Can't publish") },
            text = { Text(if (!v.ok) v.checks.filter { it.level == "error" }.joinToString("\n") { it.msg } else (if (v.existingDay != null) "This replaces the ${v.existingDay} for ${mName(month)} and notifies subscribers of the change. " else "") + "${"%,d".format(v.recipients)} subscribers get a reminder.", color = Ma.c.sub) },
            confirmButton = { if (v.ok) TextButton({
                confirm = false; busy = true
                scope.launch { runCatching { a.repo.adminPublishSip(month, day, reason.trim(), uplift.toDoubleOrNull(), altList) }.onSuccess { a.toast(it); check = null; reason = ""; hist.reload() }.onFailure { err = it.message }; busy = false }
            }) { Text("Publish", color = Ma.c.accent, fontWeight = FontWeight.SemiBold) } },
            dismissButton = { TextButton({ confirm = false }) { Text(if (v.ok) "Cancel" else "OK", color = Ma.c.muted) } })
    }
}

private fun ordinalSfx(n: Int) = when { n % 100 in 11..13 -> "th"; n % 10 == 1 -> "st"; n % 10 == 2 -> "nd"; n % 10 == 3 -> "rd"; else -> "th" }
private fun pct(v: Double?) = v?.let { (if (it >= 0) "+" else "") + "%.1f%%".format(it) } ?: "—"

@Composable private fun Pick(t: String, on: Boolean, modifier: Modifier, onClick: () -> Unit) =
    Text(t, modifier.clip(RoundedCornerShape(12.dp)).background(if (on) Ma.c.accent else Ma.c.surface).border(1.dp, if (on) Ma.c.accent else Ma.c.line, RoundedCornerShape(12.dp)).clickable(onClick = onClick).padding(vertical = 11.dp),
        color = if (on) Color.White else Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, textAlign = TextAlign.Center)

@Composable private fun Field(label: String, v: String, on: (String) -> Unit, modifier: Modifier, kb: KeyboardType = KeyboardType.Text) =
    OutlinedTextField(v, on, modifier, singleLine = true, label = { Text(label, maxLines = 1) }, keyboardOptions = KeyboardOptions(keyboardType = kb),
        shape = RoundedCornerShape(14.dp), colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Ma.c.accent, unfocusedBorderColor = Ma.c.line, focusedContainerColor = Ma.c.surface, unfocusedContainerColor = Ma.c.surface))

/* ============================== More: payments + settings ============================== */

@Composable
private fun MoreTab(session: SessionViewModel, bio: Biometrics, bottom: Dp) {
    val a = LocalAdmin.current
    val pay = rememberLoad { a.repo.adminPayments() }
    val theme by session.theme.collectAsStateWithLifecycle()
    var bioOn by remember { mutableStateOf(session.biometricOn) }
    Column(Modifier.fillMaxSize()) {
        AdminHeader("More", "${a.me.name} · ${a.me.email ?: ""}")
        Column(Modifier.verticalScroll(rememberScrollState()).padding(bottom = bottom + 20.dp)) {
            LoadBox(pay) { (items, m) ->
                Column {
                    Row(Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        MaCard(Modifier.weight(1f), padding = 14.dp) { Column { Text("Collected this month", color = Ma.c.muted, fontSize = 12.sp); Text(inr(m.gross.toLong()), color = Ma.c.text, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold) } }
                        MaCard(Modifier.weight(1f), padding = 14.dp) { Column { Text("Refunded", color = Ma.c.muted, fontSize = 12.sp); Text(inr(m.refunded.toLong()), color = Ma.c.down, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold); Text("${m.refunds} refund${if (m.refunds == 1) "" else "s"}", color = Ma.c.muted, fontSize = 11.5.sp) } }
                    }
                    SectionTitle("Payments")
                    if (items.isEmpty()) Text("No payments yet.", Modifier.padding(horizontal = 20.dp), color = Ma.c.muted)
                    else CardList(rows = items.take(30).map { p -> { Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Ma.c.surface2), contentAlignment = Alignment.Center) { Icon(Icons.AutoMirrored.Outlined.ReceiptLong, null, tint = Ma.c.accent, modifier = Modifier.size(18.dp)) }
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(p.name ?: p.email ?: "—", color = Ma.c.text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(listOfNotNull(p.plan?.let { "$it ${p.cycle?.lowercase() ?: ""}".trim() }, p.kind.takeIf { it != "new" }, prettyDate(p.paidOn)).joinToString(" · "), color = Ma.c.muted, fontSize = 12.sp)
                            p.invoice?.let { Text(it, color = Ma.c.muted, fontSize = 11.sp) }
                        }
                        Column(horizontalAlignment = Alignment.End) { Text(inr(p.amount.toLong()), color = Ma.c.text, fontWeight = FontWeight.Bold); Tag(p.status, statusTone(p.status)) }
                    } } })
                    Text("Refunds (super admin) are made on the website admin, which issues the GST credit note.", Modifier.padding(horizontal = 20.dp, vertical = 10.dp), color = Ma.c.muted, fontSize = 12.sp)
                }
            }
            Caption("Settings", Modifier.padding(start = 24.dp, top = 8.dp, bottom = 6.dp))
            CardList(rows = listOfNotNull(
                { ListRow(Icons.Outlined.Palette, "Theme", onClick = { session.setTheme(if (theme == AppTheme.Navy) AppTheme.Espresso else AppTheme.Navy) }) { Text(theme.label, color = Ma.c.muted, fontSize = 13.sp); Chevron() } },
                if (bio.available && !a.repo.isDemo) ({ ListRow(Icons.Outlined.Fingerprint, "Fingerprint unlock", trailing = { MaSwitch(bioOn) { w -> if (w) bio.prompt("Turn on fingerprint unlock") { session.setBiometric(true); bioOn = true } else { session.setBiometric(false); bioOn = false } } }) }) else null,
            ))
            if (a.repo.isDemo) Text("Demo mode · sample data", Modifier.fillMaxWidth().padding(top = 14.dp), color = Ma.c.warn, fontSize = 12.sp, textAlign = TextAlign.Center)
            Box(Modifier.padding(20.dp)) { OutlineButton("Log out", session::logout, Modifier.fillMaxWidth(), color = Ma.c.down, icon = Icons.AutoMirrored.Outlined.Logout) }
            Text("Admin sessions end after 8 hours. Everything you do here is in the audit log.", Modifier.fillMaxWidth().padding(horizontal = 20.dp), color = Ma.c.muted, fontSize = 11.5.sp, textAlign = TextAlign.Center)
        }
    }
}
