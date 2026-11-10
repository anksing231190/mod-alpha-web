package com.modalpha.app

import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.captureRoboImage
import com.modalpha.app.data.AppPrefs
import com.modalpha.app.data.DemoRepository
import com.modalpha.app.ui.Biometrics
import com.modalpha.app.ui.admin.AdminTabs
import com.modalpha.app.ui.login.LoginScreen
import com.modalpha.app.ui.login.LoginViewModel
import com.modalpha.app.ui.theme.AppTheme
import com.modalpha.app.ui.theme.ModAlphaTheme
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Admin screens with the demo admin account (admin@modalpha.in). Output: build/outputs/roborazzi/a-*.png */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w412dp-h915dp-xxhdpi")
class AdminScreensTest {
    @get:Rule val rule = createComposeRule()
    private val repo = DemoRepository(latencyMs = 0)
    private val admin = runBlocking { repo.verifyAdminCodes("x", "111111", "222222") }
    private val session by lazy { SessionViewModel(repo, repo, AppPrefs(ApplicationProvider.getApplicationContext()), false) }

    private fun cap(name: String, theme: AppTheme = AppTheme.Navy) { rule.waitForIdle(); rule.onRoot().captureRoboImage("build/outputs/roborazzi/a-$name-${theme.name.lowercase()}.png") }
    private fun admin(theme: AppTheme = AppTheme.Navy) = rule.setContent { ModAlphaTheme(theme) { AdminTabs(admin, repo, session, Biometrics()) } }

    @Test fun login_codes() {
        val vm = LoginViewModel({ repo }, { _, _ -> })
        vm.setMethod(com.modalpha.app.ui.login.LoginMethod.Email); vm.onEmail("admin@modalpha.in"); vm.onPassword("admin1234"); vm.loginEmail()
        Thread.sleep(300)
        rule.setContent { ModAlphaTheme { LoginScreen(vm, onBack = {}) } }
        cap("01-login-codes")
    }
    @Test fun overview() { admin(); cap("02-overview") }
    @Test fun overview_espresso() { admin(AppTheme.Espresso); cap("02-overview", AppTheme.Espresso) }
    @Test fun users() { admin(); rule.onNodeWithText("Users").performClick(); rule.waitUntil(5000) { rule.onAllNodesWithText("Sana Iqbal").fetchSemanticsNodes().isNotEmpty() }; cap("03-users") }
    @Test fun user_detail() { admin(); rule.onNodeWithText("Users").performClick()
        rule.waitUntil(5000) { rule.onAllNodesWithText("Sana Iqbal").fetchSemanticsNodes().isNotEmpty() }
        rule.onNodeWithText("Sana Iqbal").performClick(); cap("04-user") }
    @Test fun support() { admin(); rule.onNodeWithText("Support").performClick(); cap("05-support") }
    @Test fun ticket() { admin(); rule.onNodeWithText("Support").performClick(); rule.waitForIdle(); rule.onNodeWithText("My reminder came a day late.").performClick(); cap("06-ticket") }
    @Test fun sip() {
        admin(); rule.onNodeWithText("SIP date").performClick(); rule.waitForIdle()
        rule.onAllNodesWithText("Check").onFirst().performScrollTo().performClick(); rule.waitForIdle()
        rule.onRoot().captureRoboImage("build/outputs/roborazzi/a-07-sip-navy.png")
    }
    @Test fun more() { admin(); rule.onNodeWithText("More").performClick(); cap("08-more") }
}
