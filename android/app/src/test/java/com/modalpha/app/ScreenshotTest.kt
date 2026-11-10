package com.modalpha.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.modalpha.app.data.DemoRepository
import com.modalpha.app.data.HomeData
import com.modalpha.app.data.SipMonth
import com.modalpha.app.data.AltDay
import com.modalpha.app.data.User
import com.modalpha.app.ui.MainTabsPreview
import com.modalpha.app.ui.login.LoginScreen
import com.modalpha.app.ui.login.LoginViewModel
import com.modalpha.app.ui.theme.Ma
import com.modalpha.app.ui.theme.ModAlphaTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Renders each screen to PNG (build/outputs/roborazzi) on a Pixel-7-sized phone, Midnight and Sand.
 *   ./gradlew recordRoborazziStageDebug
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w412dp-h915dp-xxhdpi")
class ScreenshotTest {
    @get:Rule val rule = createComposeRule()

    private fun shot(name: String, dark: Boolean, content: @Composable () -> Unit) {
        rule.setContent { ModAlphaTheme(dark = dark) { Box(Modifier.fillMaxSize().background(Ma.c.bg)) { content() } } }
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("build/outputs/roborazzi/$name-${if (dark) "midnight" else "sand"}.png")
    }

    private fun loginVm(otp: Boolean): LoginViewModel {
        val demo = DemoRepository(latencyMs = 0)
        val vm = LoginViewModel({ demo }, { _, _ -> })
        if (otp) { vm.onMobile("98765 43210"); vm.sendOtp(); Thread.sleep(300); vm.onCode("12") }
        return vm
    }

    private val user = User("u1", "Ankit Singh", "ankit@example.com", "+919876543210")
    private val sip = SipMonth("2026-11", 12, 2.8, listOf(AltDay(5, 1.6), AltDay(20, 1.4), AltDay(28, 1.2)))
    private val pro = HomeData(user, "Pro", sip, false, DemoRepository.demoFunds, 24, 2)
    private val free = pro.copy(user = User("u2", "Riya Sharma", null, "+919876500000"), plan = "Free", locked = true, sip = sip.copy(day = null, alternatives = emptyList()), unread = 0)

    @Test fun login_dark() = shot("01-login", true) { LoginScreen(loginVm(false)) }
    @Test fun login_light() = shot("01-login", false) { LoginScreen(loginVm(false)) }
    @Test fun otp_dark() = shot("02-otp", true) { LoginScreen(loginVm(true)) }
    @Test fun otp_light() = shot("02-otp", false) { LoginScreen(loginVm(true)) }
    @Test fun home_dark() = shot("03-home-pro", true) { MainTabsPreview(pro) }
    @Test fun home_light() = shot("03-home-pro", false) { MainTabsPreview(pro) }
    @Test fun home_free_dark() = shot("04-home-free", true) { MainTabsPreview(free) }
    @Test fun home_free_light() = shot("04-home-free", false) { MainTabsPreview(free) }
}
