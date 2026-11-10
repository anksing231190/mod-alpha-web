package com.modalpha.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.modalpha.app.data.HomeData
import com.modalpha.app.data.Repository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface HomeState {
    data object Loading : HomeState
    data class Ready(val data: HomeData, val refreshing: Boolean = false) : HomeState
    data class Failed(val message: String) : HomeState
}

class HomeViewModel(private val repo: Repository) : ViewModel() {
    private val _s = MutableStateFlow<HomeState>(HomeState.Loading)
    val state: StateFlow<HomeState> = _s

    init { load() }

    fun load() {
        val cur = _s.value
        _s.value = if (cur is HomeState.Ready) cur.copy(refreshing = true) else HomeState.Loading
        viewModelScope.launch {
            _s.value = try { HomeState.Ready(repo.home()) } catch (e: Exception) {
                if (cur is HomeState.Ready) cur.copy(refreshing = false) else HomeState.Failed(e.message ?: "Couldn't load your dashboard")
            }
        }
    }
}
