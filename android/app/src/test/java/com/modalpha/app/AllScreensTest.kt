package com.modalpha.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.modalpha.app.data.AppPrefs
import com.modalpha.app.data.ChatMsg
import com.modalpha.app.data.DemoRepository
import com.modalpha.app.ui.AppNav
import com.modalpha.app.ui.Biometrics
import com.modalpha.app.ui.LocalNav
import com.modalpha.app.ui.MainTabsPreview
import com.modalpha.app.ui.Route
import com.modalpha.app.ui.Tab
import com.modalpha.app.ui.TabsScaffold
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
import com.modalpha.app.ui.theme.AppTheme
import com.modalpha.app.ui.theme.Ma
import com.modalpha.app.ui.theme.ModAlphaTheme
import kotlinx.coroutines.runBlocking
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Every screen after sign-in, with demo data (Pro test account). Output: build/outputs/roborazzi/s-*.png */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w412dp-h915dp-xxhdpi")
class AllScreensTest {
    @get:Rule val rule = createComposeRule()

    private val repo = DemoRepository(latencyMs = 0).also { runBlocking { it.verifyOtp("+919876543210", "123456", false) } }
    private val user = runBlocking { repo.restore()!! }

    @OptIn(com.github.takahirom.roborazzi.ExperimentalRoborazziApi::class)
    private fun shot(name: String, theme: AppTheme = AppTheme.Navy, tab: Tab? = null, screen: Boolean = false, content: @Composable () -> Unit) {
        rule.setContent {
            ModAlphaTheme(theme) {
                val stack = remember { mutableStateListOf<Route>() }; val t = remember { mutableStateOf(tab ?: Tab.Home) }
                CompositionLocalProvider(LocalNav provides AppNav(repo, user, stack, t, {}, {}, {})) {
                    Box(Modifier.fillMaxSize().background(Ma.c.bg)) {
                        if (tab != null) TabsScaffold(tab, {}, remember { SnackbarHostState() }) { inner -> Box(Modifier.fillMaxSize()) { content.also { } ; TabContent(tab, inner.calculateBottomPadding()) } }
                        else content()
                    }
                }
            }
        }
        rule.waitForIdle(); Thread.sleep(150); rule.waitForIdle()
        val out = "build/outputs/roborazzi/s-$name-${theme.name.lowercase()}.png"
        if (screen) com.github.takahirom.roborazzi.captureScreenRoboImage(out) else rule.onRoot().captureRoboImage(out)
    }

    private var tabContent: @Composable (androidx.compose.ui.unit.Dp) -> Unit = {}
    @Composable private fun TabContent(tab: Tab, pad: androidx.compose.ui.unit.Dp) = tabContent(pad)
    private fun tab(name: String, tab: Tab, theme: AppTheme = AppTheme.Navy, c: @Composable (androidx.compose.ui.unit.Dp) -> Unit) { tabContent = c; shot(name, theme, tab) {} }

    private val session by lazy { SessionViewModel(repo, repo, AppPrefs(ApplicationProvider.getApplicationContext()), false) }

    @Test fun explore() = tab("07-explore", Tab.Explore) { ExploreTab(it) }
    @Test fun explore_espresso() = tab("07-explore", Tab.Explore, AppTheme.Espresso) { ExploreTab(it) }
    @Test fun fund() = shot("08-fund") { FundScreen("QSC01") }
    @Test fun whatif() = shot("09-whatif") { WhatIfScreen("QSC01") }
    @Test fun compare() = shot("10-compare") { CompareScreen("QSC01", "SBC01") }
    @Test fun insights() = shot("11-insights") { InsightsScreen() }
    @Test fun calendar() = tab("12-calendar", Tab.Calendar) { CalendarTab(it) }
    @Test fun calendar_espresso() = tab("12-calendar", Tab.Calendar, AppTheme.Espresso) { CalendarTab(it) }
    @Test fun reminder() = shot("13-reminder", screen = true) { MainTabsPreview(runBlocking { repo.home() }); ReminderSheet(12) {} }
    @Test fun ask() = tab("14-ask", Tab.Ask) { AskTab(remember { mutableStateListOf(ChatMsg(true, "Is the 12th good for small-cap funds too?"), ChatMsg(false, "Yes. Across the small-cap funds we track, a SIP on the 12th beat the 1st in **7 of the last 10 years**, by **+3.1%** on average.")) }, it) }
    @Test fun notifications() = shot("15-notifications") { NotificationsScreen() }
    @Test fun you() = shot("16-profile") { YouTab(session, Biometrics(available = false), 0.dp, onBack = {}) }
    @Test fun you_espresso() = shot("16-profile", AppTheme.Espresso) { YouTab(session, Biometrics(available = false), 0.dp, onBack = {}) }
    @Test fun plans() = shot("17-plans") { PlansScreen() }
    @Test fun checkout() = shot("18-checkout") { CheckoutScreen("Pro", "Yearly") }
    @Test fun kyc() = shot("19-kyc") { KycScreen(null) }
    @Test fun success() = shot("20-success") { SuccessScreen("Pro", "Yearly", 2868, "GPay") }
    @Test fun subscription() = shot("21-subscription") { SubscriptionScreen() }
    @Test fun help() = tab("22-support", Tab.Support) { HelpScreen(asTab = true, bottomPad = it) }
}
