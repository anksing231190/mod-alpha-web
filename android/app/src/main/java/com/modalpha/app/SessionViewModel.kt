package com.modalpha.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.modalpha.app.data.AppPrefs
import com.modalpha.app.data.Repository
import com.modalpha.app.data.User
import com.modalpha.app.ui.theme.AppTheme
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Where the app is:
 *   Checking   — reading the saved session (splash stays up)
 *   SignedOut  — Welcome → Log in / Create account
 *   Locked     — saved session + fingerprint unlock on: "Welcome back" + fingerprint
 *   SignedIn   — the tabs. `offerBiometric` asks once whether to turn fingerprint unlock on.
 */
sealed interface Session {
    data object Checking : Session
    data object SignedOut : Session
    data class Locked(val user: User) : Session
    data class SignedIn(val user: User, val repo: Repository, val offerBiometric: Boolean = false) : Session
}

class SessionViewModel(
    private val live: Repository,
    private val demo: Repository,
    private val prefs: AppPrefs,
    val biometricAvailable: Boolean,
) : ViewModel() {
    private val _state = MutableStateFlow<Session>(Session.Checking)
    val state: StateFlow<Session> = _state
    private val _theme = MutableStateFlow(prefs.theme)
    val theme: StateFlow<AppTheme> = _theme
    val biometricOn get() = prefs.biometric
    /** First name of the last person who signed in on this phone (null = first visit). */
    val returningName get() = prefs.lastName
    val lastBestDay get() = prefs.lastBestDay.takeIf { it in 1..31 }
    val lastBestMonth get() = prefs.lastBestMonth
    fun rememberBest(day: Int, month: String) { prefs.lastBestDay = day; prefs.lastBestMonth = month }

    /** Shown once on the welcome screen after the server ended this session ("signed out on another device"). */
    private val _notice = MutableStateFlow<String?>(null)
    val notice: StateFlow<String?> = _notice
    fun noticeShown() { _notice.value = null }

    init {
        // the server ended this device's session → straight back to the welcome screen (the name is kept for "Welcome back")
        viewModelScope.launch {
            live.sessionEnded.collect { msg ->
                if (_state.value is Session.SignedIn && (_state.value as Session.SignedIn).repo.isDemo) return@collect
                if (_state.value is Session.SignedIn || _state.value is Session.Locked) {
                    prefs.biometric = false; prefs.biometricAsked = false
                    _notice.value = msg; _state.value = Session.SignedOut
                }
            }
        }
        viewModelScope.launch {
            val u = runCatching { live.restore() }.getOrNull()
            _state.value = when {
                u == null -> Session.SignedOut
                prefs.biometric && biometricAvailable -> Session.Locked(u)
                else -> Session.SignedIn(u, live)
            }
        }
    }

    fun repoFor(demoMode: Boolean) = if (demoMode) demo else live

    fun signedIn(user: User, repo: Repository) {
        if (!repo.isDemo) prefs.lastName = user.firstName
        val offer = !repo.isDemo && biometricAvailable && !prefs.biometric && !prefs.biometricAsked
        _state.value = Session.SignedIn(user, repo, offer)
    }

    /** Fingerprint accepted on the lock screen. */
    fun unlocked() { (_state.value as? Session.Locked)?.let { _state.value = Session.SignedIn(it.user, live) } }

    fun setBiometric(on: Boolean) {
        prefs.biometric = on; prefs.biometricAsked = true
        (_state.value as? Session.SignedIn)?.let { _state.value = it.copy(offerBiometric = false) }
    }

    /** Back from the background after a while: lock again if fingerprint unlock is on. */
    fun lockIfEnabled() {
        val s = _state.value as? Session.SignedIn ?: return
        if (!s.repo.isDemo && prefs.biometric && biometricAvailable) _state.value = Session.Locked(s.user)
    }

    fun setTheme(t: AppTheme) { prefs.theme = t; _theme.value = t }

    private var watch: kotlinx.coroutines.Job? = null
    /** While the app is open: check the session now and every minute, so "log out of all devices" reaches this phone quickly. */
    fun startWatching() {
        watch?.cancel()
        watch = viewModelScope.launch {
            while (true) {
                val s = _state.value
                if ((s is Session.SignedIn && !s.repo.isDemo) || s is Session.Locked) live.checkSession()
                kotlinx.coroutines.delay(60_000)
            }
        }
    }
    fun stopWatching() { watch?.cancel(); watch = null }

    /** "Log out of all devices": ends every session of this user (phones, tablets, browsers), then this one. */
    fun logoutAll(onError: (String) -> Unit) {
        val s = _state.value as? Session.SignedIn ?: return
        viewModelScope.launch {
            runCatching { s.repo.logoutAll() }
                .onSuccess { n -> prefs.biometric = false; prefs.biometricAsked = false; _notice.value = "Signed out of $n session${if (n == 1) "" else "s"} on all devices."; _state.value = Session.SignedOut }
                .onFailure { onError(it.message ?: "Couldn't sign out of all devices") }
        }
    }

    fun logout() {
        val repo = when (val s = _state.value) { is Session.SignedIn -> s.repo; is Session.Locked -> live; else -> return }
        prefs.biometric = false; prefs.biometricAsked = false
        _state.value = Session.SignedOut
        viewModelScope.launch { runCatching { repo.logout() } }
    }
}
