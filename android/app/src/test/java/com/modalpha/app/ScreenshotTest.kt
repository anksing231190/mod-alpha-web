package com.modalpha.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.modalpha.app.data.AltDay
import com.modalpha.app.data.DemoRepository
import com.modalpha.app.data.HomeData
import com.modalpha.app.data.SipMonth
import com.modalpha.app.data.User
import com.modalpha.app.ui.MainTabsPreview
import com.modalpha.app.ui.login.LoginScreen
import com.modalpha.app.ui.login.LoginViewModel
import com.modalpha.app.ui.theme.AppTheme
import com.modalpha.app.ui.theme.Ma
import com.modalpha.app.ui.theme.ModAlphaTheme
import com.modalpha.app.ui.welcome.LockScreen
import com.modalpha.app.ui.welcome.WelcomeScreen
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.time.LocalDate

/**
 * Renders each screen to PNG (build/outputs/roborazzi) on a Pixel-7-sized phone, in both themes.
 *   ./gradlew recordRoborazziStageDebug
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w412dp-h915dp-xxhdpi")
class ScreenshotTest {
    @get:Rule val rule = createComposeRule()

    /** Animated screens never go idle, so the test clock is advanced by hand. */
    private fun shot(name: String, theme: AppTheme, animatedMs: Long = 0, content: @Composable () -> Unit) {
        if (animatedMs > 0) rule.mainClock.autoAdvance = false
        rule.setContent { ModAlphaTheme(theme) { Box(Modifier.fillMaxSize().background(Ma.c.bg)) { content() } } }
        if (animatedMs > 0) rule.mainClock.advanceTimeBy(animatedMs) else rule.waitForIdle()
        rule.onRoot().captureRoboImage("build/outputs/roborazzi/$name-${theme.name.lowercase()}.png")
    }

    private fun loginVm(otp: Boolean): LoginViewModel {
        val demo = DemoRepository(latencyMs = 0)
        val vm = LoginViewModel({ demo }, { _, _ -> })
        if (otp) { vm.onMobile("98765 43210"); vm.sendOtp(); Thread.sleep(300); vm.onCode("12") }
        return vm
    }

    private val today = LocalDate.of(2026, 11, 10)
    private val user = User("u1", "Ankit Singh", "ankit@example.com", "+919876543210")
    private val sip = SipMonth("2026-11", 12, 2.8, listOf(AltDay(5, 1.6), AltDay(20, 1.4), AltDay(28, 1.2)))
    private val pro = HomeData(user, "Pro", sip, false, DemoRepository.demoFunds, 24, 2, DemoRepository.demoCompare, DemoRepository.demoFunds.take(2))
    private val free = pro.copy(user = User("u2", "Riya Sharma", null, "+919876500000"), plan = "Free", locked = true,
        sip = sip.copy(day = null, alternatives = emptyList()), unread = 0, watchlist = emptyList())


    @Test fun welcome_navy() = shot("01-welcome", AppTheme.Navy, 2600) { WelcomeScreen({}, {}, {}, autoPlay = false) }
    @Test fun welcome_espresso() = shot("01-welcome", AppTheme.Espresso, 2600) { WelcomeScreen({}, {}, {}, autoPlay = false) }
    @Test fun welcome_returning() = shot("01b-welcome-back", AppTheme.Navy, 3200) { WelcomeScreen({}, {}, {}, autoPlay = false, returningName = "Ankit", lastDay = 12, lastMonth = "November") }
    @Test fun lock_navy() = shot("02-lock", AppTheme.Navy, 2600) { LockScreen("Ankit", {}, {}, {}, autoPrompt = false, lastDay = 12, lastMonth = "November") }
    @Test fun lock_espresso() = shot("02-lock", AppTheme.Espresso, 2600) { LockScreen("Ankit", {}, {}, {}, autoPrompt = false, lastDay = 12, lastMonth = "November") }
    @Test fun login_navy() = shot("03-login", AppTheme.Navy, 2400) { LoginScreen(loginVm(false), onBack = {}) }
    @Test fun login_espresso() = shot("03-login", AppTheme.Espresso, 2400) { LoginScreen(loginVm(false), onBack = {}) }
    @Test fun otp_navy() = shot("04-otp", AppTheme.Navy, 2400) { LoginScreen(loginVm(true), onBack = {}) }
    @Test fun home_navy() = shot("05-home-pro", AppTheme.Navy) { MainTabsPreview(pro, today) }
    @Test fun home_espresso() = shot("05-home-pro", AppTheme.Espresso) { MainTabsPreview(pro, today) }
    @Test fun home_free_navy() = shot("06-home-free", AppTheme.Navy) { MainTabsPreview(free, today) }
    @Test fun home_free_espresso() = shot("06-home-free", AppTheme.Espresso) { MainTabsPreview(free, today) }
}
