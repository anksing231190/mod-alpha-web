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
            _s.value = try {
                val d = repo.home()
                val top = d.topFunds.firstOrNull()
                val nav5 = top?.let { runCatching { repo.nav(it.id, "5Y") }.getOrNull() }.orEmpty()
                val edge = runCatching { com.modalpha.app.data.Analytics.dayValues(nav5) }.getOrNull()
                val since = java.time.LocalDate.now().minusMonths(12).withDayOfMonth(1).toString()
                val past = runCatching { repo.sipHistory().first.mapNotNull { m -> m.day?.let { m.month to it } }.toMap() }.getOrDefault(emptyMap())
                HomeState.Ready(d.copy(dayEdge = edge, candleNav = nav5.filter { it.date >= since }, candleFund = top?.short, pastDays = past))
            } catch (e: Exception) {
                if (cur is HomeState.Ready) cur.copy(refreshing = false) else HomeState.Failed(e.message ?: "Couldn't load your dashboard")
            }
        }
    }
}
