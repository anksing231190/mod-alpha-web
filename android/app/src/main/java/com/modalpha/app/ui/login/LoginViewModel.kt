package com.modalpha.app.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.modalpha.app.data.Repository
import com.modalpha.app.data.User
import com.modalpha.app.data.normaliseMobile
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class LoginMethod { Mobile, Email }
enum class LoginStep { Enter, Otp }

data class LoginState(
    val method: LoginMethod = LoginMethod.Mobile,
    val step: LoginStep = LoginStep.Enter,
    val signup: Boolean = false,
    val mobile: String = "",
    val sentTo: String = "",            // normalised +91… number the code went to
    val code: String = "",
    val email: String = "",
    val password: String = "",
    val busy: Boolean = false,
    val error: String? = null,
    val resendIn: Int = 0,              // seconds until "Resend code" is allowed
    val hintCode: String? = null,       // stage / demo only: the test code
)

/**
 * Login and Create account (they share one screen: mobile OTP or email + password).
 * `repoFor(demo)` gives the live API or the built-in demo data; `onSignedIn` hands the user to the app.
 */
class LoginViewModel(
    private val repoFor: (demo: Boolean) -> Repository,
    private val onSignedIn: (User, Repository) -> Unit,
) : ViewModel() {
    private val _s = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _s
    private var demo = false
    private var timer: Job? = null

    fun setMethod(m: LoginMethod) = _s.update { it.copy(method = m, step = LoginStep.Enter, error = null) }
    fun setSignup(on: Boolean) = _s.update { it.copy(signup = on, step = LoginStep.Enter, error = null) }
    fun toggleSignup() = _s.update { it.copy(signup = !it.signup, step = LoginStep.Enter, error = null) }
    fun onMobile(v: String) {
        demo = false
        _s.update { it.copy(mobile = v.filter { c -> c.isDigit() || c == ' ' }.take(14), error = null) }
    }
    fun onEmail(v: String) = _s.update { it.copy(email = v.trim(), error = null) }
    fun onPassword(v: String) = _s.update { it.copy(password = v, error = null) }
    fun changeNumber() = _s.update { it.copy(step = LoginStep.Enter, code = "", error = null) }

    fun onCode(v: String) {
        val d = v.filter { it.isDigit() }.take(6)
        _s.update { it.copy(code = d, error = null) }
        if (d.length == 6 && !_s.value.busy) verify()
    }

    /** "Try the demo": sign in to the built-in Pro test account without typing anything. */
    fun tryDemo() {
        demo = true
        _s.update { it.copy(method = LoginMethod.Mobile, signup = false, mobile = "98765 43210") }
        sendOtp()
    }

    fun sendOtp() {
        val m = normaliseMobile(_s.value.mobile) ?: return _s.update { it.copy(error = "Enter a valid 10-digit Indian mobile number") }
        run {
            val r = repoFor(demo).sendOtp(m, _s.value.signup)
            _s.update { it.copy(step = LoginStep.Otp, sentTo = m, code = "", hintCode = r.devCode) }
            startTimer()
        }
    }

    fun verify() {
        val s = _s.value
        if (s.code.length != 6) return _s.update { it.copy(error = "Enter the 6-digit code") }
        run {
            val repo = repoFor(demo)
            onSignedIn(repo.verifyOtp(s.sentTo, s.code, s.signup), repo)
        }
    }

    fun loginEmail() {
        val s = _s.value
        if (!s.email.contains('@') || s.password.isEmpty()) return _s.update { it.copy(error = "Enter your email and password") }
        demo = s.email.equals("demo@modalpha.in", ignoreCase = true)
        run {
            val repo = repoFor(demo)
            onSignedIn(repo.loginWithEmail(s.email, s.password), repo)
        }
    }

    private fun startTimer() {
        timer?.cancel()
        timer = viewModelScope.launch {
            for (t in 30 downTo 0) { _s.update { it.copy(resendIn = t) }; delay(1000) }
        }
    }

    private fun run(block: suspend () -> Unit) {
        if (_s.value.busy) return
        _s.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try { block() } catch (e: Exception) {
                _s.update { it.copy(error = e.message ?: "Something went wrong", code = if (it.step == LoginStep.Otp) "" else it.code) }
            } finally { _s.update { it.copy(busy = false) } }
        }
    }
}
