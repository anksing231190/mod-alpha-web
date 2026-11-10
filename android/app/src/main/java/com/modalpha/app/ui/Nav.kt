package com.modalpha.app.ui

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.staticCompositionLocalOf
import com.modalpha.app.data.Repository
import com.modalpha.app.data.User

/** Screens opened on top of the tabs (back arrow / system back pops them). */
sealed interface Route {
    data class Fund(val id: String) : Route
    data class WhatIf(val fundId: String? = null) : Route
    data class Compare(val a: String? = null, val b: String? = null) : Route
    data object Insights : Route
    data object Notifications : Route
    data object Plans : Route
    data class Checkout(val planId: String, val cycle: String) : Route
    data class Kyc(val then: Route? = null) : Route
    data class Success(val planId: String, val cycle: String, val amount: Int, val method: String) : Route
    data object Subscription : Route
    data object Help : Route
    data object Profile : Route
}

/** What every screen can reach: data, the signed-in user, navigation, toasts and the Remind me sheet. */
class AppNav(
    val repo: Repository,
    val user: User,
    private val stack: SnapshotStateList<Route>,
    private val tab: MutableState<Tab>,
    val toast: (String) -> Unit,
    val remindMe: (day: Int?) -> Unit,
    val refreshHome: () -> Unit,
) {
    fun push(r: Route) { stack.add(r) }
    fun pop() { if (stack.isNotEmpty()) stack.removeAt(stack.lastIndex) }
    /** Replace the top screen (e.g. KYC → Checkout). */
    fun replace(r: Route) { pop(); push(r) }
    fun home(t: Tab = Tab.Home) { stack.clear(); tab.value = t }
    fun goTab(t: Tab) { stack.clear(); tab.value = t }
}

val LocalNav = staticCompositionLocalOf<AppNav> { error("AppNav not provided") }
