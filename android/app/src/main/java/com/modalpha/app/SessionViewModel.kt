package com.modalpha.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.modalpha.app.data.Repository
import com.modalpha.app.data.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/** Signed in or not, and which data source (live API or demo) the signed-in screens use. */
sealed interface Session {
    data object Checking : Session
    data object SignedOut : Session
    data class SignedIn(val user: User, val repo: Repository) : Session
}

class SessionViewModel(private val live: Repository, private val demo: Repository) : ViewModel() {
    private val _state = MutableStateFlow<Session>(Session.Checking)
    val state: StateFlow<Session> = _state

    init {
        viewModelScope.launch {
            val u = runCatching { live.restore() }.getOrNull()
            _state.value = if (u != null) Session.SignedIn(u, live) else Session.SignedOut
        }
    }

    fun repoFor(demoMode: Boolean) = if (demoMode) demo else live
    fun signedIn(user: User, repo: Repository) { _state.value = Session.SignedIn(user, repo) }

    fun logout() {
        val s = _state.value as? Session.SignedIn ?: return
        _state.value = Session.SignedOut
        viewModelScope.launch { runCatching { s.repo.logout() } }
    }
}
