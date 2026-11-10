package com.modalpha.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.modalpha.app.R
import com.modalpha.app.Session
import com.modalpha.app.SessionViewModel
import com.modalpha.app.data.HomeData
import com.modalpha.app.data.Repository
import com.modalpha.app.data.User
import com.modalpha.app.data.prettyMobile
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.Loader
import com.modalpha.app.ui.components.MaCard
import com.modalpha.app.ui.components.Pill
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.ui.home.HomeActions
import com.modalpha.app.ui.home.HomeContent
import com.modalpha.app.ui.home.HomeScreen
import com.modalpha.app.ui.home.HomeViewModel
import com.modalpha.app.ui.login.LoginScreen
import com.modalpha.app.ui.login.LoginViewModel
import com.modalpha.app.ui.theme.AppTheme
import com.modalpha.app.ui.theme.Ma
import com.modalpha.app.ui.theme.colorsFor
import com.modalpha.app.ui.welcome.LockScreen
import com.modalpha.app.ui.welcome.WelcomeScreen
import kotlinx.coroutines.launch
import androidx.compose.runtime.CompositionLocalProvider
import com.modalpha.app.ui.account.CheckoutScreen
import com.modalpha.app.ui.account.HelpScreen
import com.modalpha.app.ui.account.KycScreen
import com.modalpha.app.ui.account.PlansScreen
import com.modalpha.app.ui.account.SubscriptionScreen
import com.modalpha.app.ui.account.SuccessScreen
import com.modalpha.app.ui.account.YouTab
import com.modalpha.app.ui.explore.CompareScreen
import com.modalpha.app.ui.explore.ExploreTab
import com.modalpha.app.ui.explore.FundScreen
import com.modalpha.app.ui.explore.InsightsScreen
import com.modalpha.app.ui.explore.WhatIfScreen
import com.modalpha.app.ui.sip.AskTab
import com.modalpha.app.ui.sip.CalendarTab
import com.modalpha.app.ui.sip.NotificationsScreen
import com.modalpha.app.ui.sip.ReminderSheet

/** Fingerprint support handed down from the Activity (BiometricPrompt needs the Activity). */
class Biometrics(val available: Boolean = false, val prompt: (title: String, onOk: () -> Unit) -> Unit = { _, _ -> })

/** Signed out → Welcome / Log in.  Locked → fingerprint.  Signed in → the tabs. */
@Composable
fun AppRoot(state: Session, session: SessionViewModel, bio: Biometrics) {
    Box(Modifier.fillMaxSize().background(Ma.c.bg)) {
        when (state) {
            Session.Checking -> Box(Modifier.fillMaxSize().background(Ma.c.chromeBrush))
            Session.SignedOut -> SignedOut(session)
            is Session.Locked -> LockScreen(
                name = state.user.firstName,
                onFingerprint = { bio.prompt("Unlock Mod Alpha") { session.unlocked() } },
                onUseOtp = session::logout, onSwitch = session::logout,
            )
            is Session.SignedIn -> {
                MainTabs(state.user, state.repo, session, bio)
                if (state.offerBiometric) AlertDialog(
                    onDismissRequest = { session.setBiometric(false) },
                    icon = { Icon(Icons.Outlined.Fingerprint, null, tint = Ma.c.accent, modifier = Modifier.size(36.dp)) },
                    title = { Text("Unlock with fingerprint?") },
                    text = { Text("Next time, open Mod Alpha with your fingerprint or screen lock instead of an OTP.") },
                    confirmButton = { TextButton(onClick = { bio.prompt("Turn on fingerprint unlock") { session.setBiometric(true) } }) { Text("Turn on", color = Ma.c.accent, fontWeight = FontWeight.SemiBold) } },
                    dismissButton = { TextButton(onClick = { session.setBiometric(false) }) { Text("Not now", color = Ma.c.muted) } },
                    containerColor = Ma.c.surface,
                )
            }
        }
    }
}

/** Welcome (animation + Log in / Create account), then the login form. */
@Composable
private fun SignedOut(session: SessionViewModel) {
    var page by rememberSaveable { mutableStateOf("welcome") }          // welcome | login | signup
    val vm: LoginViewModel = viewModel(key = "login", factory = factory { LoginViewModel(session::repoFor, session::signedIn) })
    when (page) {
        "welcome" -> WelcomeScreen(
            onLogin = { vm.setSignup(false); page = "login" },
            onSignup = { vm.setSignup(true); page = "login" },
            onDemo = { vm.tryDemo(); page = "login" },
        )
        else -> LoginScreen(vm, onBack = { page = "welcome" })
    }
}

enum class Tab(val label: String, val icon: ImageVector?) {
    Home("Home", Icons.Outlined.Home),
    Explore("Explore", Icons.Outlined.Explore),
    Ask("Ask", null),                       // the α button in the middle
    Calendar("Calendar", Icons.Outlined.CalendarMonth),
    You("You", Icons.Outlined.Person),
}

@Composable
fun MainTabs(user: User, repo: Repository, session: SessionViewModel, bio: Biometrics) {
    val tab = rememberSaveable { mutableStateOf(Tab.Home) }
    val stack = remember { androidx.compose.runtime.mutableStateListOf<Route>() }
    val chat = remember { androidx.compose.runtime.mutableStateListOf<com.modalpha.app.data.ChatMsg>() }
    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var remind by remember { mutableStateOf<Int?>(null) }
    var remindOpen by remember { mutableStateOf(false) }
    val home: HomeViewModel = viewModel(key = "home-${user.id}-${repo.isDemo}", factory = factory { HomeViewModel(repo) })
    val nav = remember(user, repo) {
        AppNav(repo, user, stack, tab,
            toast = { m -> scope.launch { snack.currentSnackbarData?.dismiss(); snack.showSnackbar(m) } },
            remindMe = { d -> remind = d; remindOpen = true },
            refreshHome = { home.load() })
    }
    androidx.activity.compose.BackHandler(enabled = stack.isNotEmpty()) { nav.pop() }
    androidx.activity.compose.BackHandler(enabled = stack.isEmpty() && tab.value != Tab.Home) { tab.value = Tab.Home }
    CompositionLocalProvider(LocalNav provides nav) {
        Box(Modifier.fillMaxSize()) {
            TabsScaffold(tab.value, { tab.value = it }, snack) { inner ->
                val bottom = inner.calculateBottomPadding()
                when (tab.value) {
                    Tab.Home -> HomeScreen(
                        home,
                        HomeActions(
                            openFunds = { tab.value = Tab.Explore },
                            openSip = { tab.value = Tab.Calendar },
                            openPlans = { nav.push(Route.Plans) },
                            openNotifications = { nav.push(Route.Notifications) },
                            setReminder = { d -> nav.remindMe(d) },
                            whyDate = { tab.value = Tab.Calendar },
                            openFund = { id -> nav.push(Route.Fund(id)) },
                        ),
                        inner,
                    )
                    Tab.Explore -> ExploreTab(bottom)
                    Tab.Ask -> AskTab(chat, bottom)
                    Tab.Calendar -> CalendarTab(bottom)
                    Tab.You -> YouTab(session, bio, bottom)
                }
            }
            stack.lastOrNull()?.let { r ->
                Box(Modifier.fillMaxSize().background(Ma.c.bg)) {
                    androidx.compose.runtime.key(stack.size, r) {
                        when (r) {
                            is Route.Fund -> FundScreen(r.id)
                            is Route.WhatIf -> WhatIfScreen(r.fundId)
                            is Route.Compare -> CompareScreen(r.a, r.b)
                            Route.Insights -> InsightsScreen()
                            Route.Notifications -> NotificationsScreen()
                            Route.Plans -> PlansScreen()
                            is Route.Checkout -> CheckoutScreen(r.planId, r.cycle)
                            is Route.Kyc -> KycScreen(r.then)
                            is Route.Success -> SuccessScreen(r.planId, r.cycle, r.amount, r.method)
                            Route.Subscription -> SubscriptionScreen()
                            Route.Help -> HelpScreen()
                        }
                    }
                }
                SnackbarHost(snack, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 80.dp))
            }
            if (remindOpen) ReminderSheet(remind) { remindOpen = false }
        }
    }
}

/** Dark tab bar with the Mod Alpha α in the middle (opens Ask Mod Alpha), snackbar host, page content. */
@Composable
fun TabsScaffold(tab: Tab, onTab: (Tab) -> Unit, snack: SnackbarHostState, content: @Composable (PaddingValues) -> Unit) {
    Scaffold(
        containerColor = Ma.c.bg,
        snackbarHost = { SnackbarHost(snack) },
        bottomBar = {
            Row(
                Modifier.fillMaxWidth().background(Ma.c.chrome).navigationBarsPadding().height(68.dp).padding(horizontal = 6.dp),
                horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically,
            ) {
                Tab.entries.forEach { t ->
                    val on = t == tab
                    if (t.icon == null) {
                        Box(
                            Modifier.offset(y = (-14).dp).size(58.dp).clip(CircleShape).background(Ma.c.chrome2)
                                .border(2.dp, if (on) Ma.c.gold else Ma.c.hi, CircleShape).clickable(role = Role.Tab) { onTab(t) },
                            contentAlignment = Alignment.Center,
                        ) { Image(painterResource(R.drawable.brand_mark), "Ask Mod Alpha", Modifier.size(32.dp)) }
                    } else Column(
                        Modifier.width(64.dp).clip(RoundedCornerShape(12.dp)).clickable(role = Role.Tab) { onTab(t) }.padding(vertical = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(t.icon, null, tint = if (on) Ma.c.hi else Ma.c.chromeMuted, modifier = Modifier.size(24.dp))
                        VSpace(3.dp)
                        Text(t.label, color = if (on) Ma.c.chromeText else Ma.c.chromeMuted, fontSize = 11.sp, fontWeight = if (on) FontWeight.SemiBold else FontWeight.Normal)
                    }
                }
            }
        },
    ) { pad ->
        Box(Modifier.fillMaxSize()) { content(PaddingValues(top = pad.calculateTopPadding(), bottom = pad.calculateBottomPadding())) }
    }
}

/** Home tab with fixed data — for screenshots and Android Studio previews. */
@Composable
fun MainTabsPreview(data: HomeData, today: java.time.LocalDate = java.time.LocalDate.now()) {
    TabsScaffold(Tab.Home, {}, remember { SnackbarHostState() }) { inner -> HomeContent(data, false, {}, HomeActions(), inner, today) }
}

@Suppress("UNCHECKED_CAST")
fun <T : ViewModel> factory(make: () -> T) = object : ViewModelProvider.Factory {
    override fun <V : ViewModel> create(modelClass: Class<V>): V = make() as V
}
