package com.modalpha.app

import android.graphics.Color
import android.os.Bundle
import android.os.SystemClock
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.modalpha.app.data.AppPrefs
import com.modalpha.app.ui.AppRoot
import com.modalpha.app.ui.Biometrics
import com.modalpha.app.ui.theme.ModAlphaTheme

/** FragmentActivity because the system fingerprint prompt (BiometricPrompt) needs one. */
class MainActivity : FragmentActivity() {
    private val auth = BIOMETRIC_WEAK or DEVICE_CREDENTIAL   // fingerprint / face, or the phone's PIN as fallback
    private val session: SessionViewModel by viewModels {
        val app = application as ModAlphaApp
        val can = BiometricManager.from(this).canAuthenticate(auth) == BiometricManager.BIOMETRIC_SUCCESS
        object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = SessionViewModel(app.live, app.demo, AppPrefs(app), can) as T
        }
    }
    private var stoppedAt = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen().setKeepOnScreenCondition { session.state.value is Session.Checking }
        super.onCreate(savedInstanceState)
        // top panel and tab bar are dark in both themes → light status / navigation bar icons
        enableEdgeToEdge(SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT))
        val bio = Biometrics(available = session.biometricAvailable, prompt = ::prompt)
        handleOpen(intent)
        runCatching { com.modalpha.app.data.NavAlert.schedule(this) }     // daily morning check on the SIP date
        setContent {
            val state by session.state.collectAsStateWithLifecycle()
            val theme by session.theme.collectAsStateWithLifecycle()
            ModAlphaTheme(theme) { AppRoot(state, session, bio) }
        }
    }

    /** Show the system fingerprint sheet; calls onOk only when it succeeds. */
    private fun prompt(title: String, onOk: () -> Unit) {
        val p = BiometricPrompt(this, ContextCompat.getMainExecutor(this), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onOk()
        })
        p.authenticate(BiometricPrompt.PromptInfo.Builder().setTitle(title).setSubtitle("Mod Alpha").setAllowedAuthenticators(auth).build())
    }

    override fun onNewIntent(intent: android.content.Intent) { super.onNewIntent(intent); handleOpen(intent) }
    private fun handleOpen(i: android.content.Intent?) {
        i?.getStringExtra(com.modalpha.app.data.NavAlert.EXTRA_FUND)?.let { (application as ModAlphaApp).openFund.value = it; i.removeExtra(com.modalpha.app.data.NavAlert.EXTRA_FUND) }
    }

    override fun onStop() { super.onStop(); stoppedAt = SystemClock.elapsedRealtime(); session.stopWatching() }
    override fun onStart() {
        super.onStart()
        // locked again after 5 minutes in the background (like banking apps)
        if (stoppedAt > 0 && SystemClock.elapsedRealtime() - stoppedAt > 5 * 60_000) session.lockIfEnabled()
        // check the session now and every minute while open: signed out elsewhere → back to the welcome screen
        session.startWatching()
    }
}
