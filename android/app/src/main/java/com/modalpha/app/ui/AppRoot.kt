package com.modalpha.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.ShowChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.compose.viewModel
import com.modalpha.app.Session
import com.modalpha.app.SessionViewModel
import com.modalpha.app.data.Repository
import com.modalpha.app.data.User
import com.modalpha.app.data.prettyMobile
import com.modalpha.app.ui.components.GradientButton
import com.modalpha.app.ui.components.Loader
import com.modalpha.app.ui.components.Pill
import com.modalpha.app.ui.components.VSpace
import com.modalpha.app.data.HomeData
import com.modalpha.app.ui.home.HomeActions
import com.modalpha.app.ui.home.HomeContent
import com.modalpha.app.ui.home.HomeScreen
import com.modalpha.app.ui.home.HomeViewModel
import com.modalpha.app.ui.login.LoginScreen
import com.modalpha.app.ui.login.LoginViewModel
import com.modalpha.app.ui.theme.Ma
import kotlinx.coroutines.launch

/** Signed out → Login.  Signed in → the five tabs. */
@Composable
fun AppRoot(state: Session, session: SessionViewModel) {
    Box(Modifier.fillMaxSize().background(Ma.c.bg)) {
        when (state) {
            Session.Checking -> Loader(Modifier.fillMaxSize())
            Session.SignedOut -> {
                val vm: LoginViewModel = viewModel(key = "login", factory = factory { LoginViewModel(session::repoFor, session::signedIn) })
                LoginScreen(vm)
            }
            is Session.SignedIn -> MainTabs(state.user, state.repo, session::logout)
        }
    }
}

enum class Tab(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Outlined.GridView),
    Funds("Funds", Icons.Outlined.Explore),
    Sip("SIP date", Icons.Outlined.CalendarMonth),
    WhatIf("What if", Icons.AutoMirrored.Outlined.ShowChart),
    Account("Account", Icons.Outlined.Person),
}

@Composable
fun MainTabs(user: User, repo: Repository, onLogout: () -> Unit) {
    var tab by rememberSaveable { mutableStateOf(Tab.Home) }
    val snack = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val toast: (String) -> Unit = { m -> scope.launch { snack.currentSnackbarData?.dismiss(); snack.showSnackbar(m) } }
    val home: HomeViewModel = viewModel(key = "home-${user.id}-${repo.isDemo}", factory = factory { HomeViewModel(repo) })

    TabsScaffold(tab, { tab = it }, snack) { inner ->
            when (tab) {
                Tab.Home -> HomeScreen(
                    home,
                    HomeActions(
                        openFunds = { tab = Tab.Funds },
                        openSip = { tab = Tab.Sip },
                        openPlans = { toast("Plans and payments come in a later screen") },
                        openNotifications = { toast("Notifications come in a later screen") },
                        setReminder = { d -> toast("Reminder set. We'll notify you the day before (day $d).") },
                    ),
                    inner,
                )
                Tab.Account -> AccountTab(user, repo.isDemo, onLogout, inner)
                else -> ComingNext(tab, inner)
            }
    }
}

/** Bottom tab bar + snackbar host around the current tab's content. */
@Composable
fun TabsScaffold(tab: Tab, onTab: (Tab) -> Unit, snack: SnackbarHostState, content: @Composable (PaddingValues) -> Unit) {
    Scaffold(
        containerColor = Ma.c.bg,
        snackbarHost = { SnackbarHost(snack) },
        bottomBar = {
            NavigationBar(containerColor = Ma.c.surface, tonalElevation = 0.dp) {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = tab == t, onClick = { onTab(t) },
                        icon = { Icon(t.icon, null) }, label = { Text(t.label, maxLines = 1) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Ma.c.onAccent, indicatorColor = Ma.c.accent, selectedTextColor = Ma.c.text,
                            unselectedIconColor = Ma.c.muted, unselectedTextColor = Ma.c.muted,
                        ),
                    )
                }
            }
        },
    ) { pad ->
        Box(Modifier.fillMaxSize()) { content(PaddingValues(top = pad.calculateTopPadding(), bottom = pad.calculateBottomPadding())) }
    }
}

/** Home tab with fixed data — for screenshots and Android Studio previews. */
@Composable
fun MainTabsPreview(data: HomeData) {
    TabsScaffold(Tab.Home, {}, remember { SnackbarHostState() }) { inner -> HomeContent(data, false, {}, HomeActions(), inner) }
}

/** Placeholder for the tabs we build next, one screen at a time. */
@Composable
private fun ComingNext(tab: Tab, pad: PaddingValues) {
    Column(Modifier.fillMaxSize().padding(pad).padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(tab.icon, null, tint = Ma.c.accent, modifier = Modifier.size(40.dp))
        VSpace(12.dp)
        Text(tab.label, color = Ma.c.text, style = MaterialTheme.typography.titleLarge)
        VSpace(6.dp)
        Text("This screen is next on the list.", color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
    }
}

/** Minimal Account tab for now: who is signed in, and Log out. */
@Composable
private fun AccountTab(user: User, demo: Boolean, onLogout: () -> Unit, pad: PaddingValues) {
    Column(Modifier.fillMaxSize().padding(pad).padding(20.dp)) {
        Text("Account", color = Ma.c.text, style = MaterialTheme.typography.headlineSmall)
        VSpace(20.dp)
        Text(user.name, color = Ma.c.text, style = MaterialTheme.typography.titleMedium)
        user.mobile?.let { Text(prettyMobile(it), color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium) }
        user.email?.let { Text(it, color = Ma.c.muted, style = MaterialTheme.typography.bodyMedium) }
        if (demo) { VSpace(10.dp); Pill("DEMO MODE · SAMPLE DATA", Ma.c.warn.copy(alpha = .15f), Ma.c.warn) }
        VSpace(28.dp)
        GradientButton("Log out", onLogout, Modifier.fillMaxWidth(), leading = { Icon(Icons.AutoMirrored.Outlined.Logout, null, tint = Ma.c.onAccent, modifier = Modifier.size(18.dp)) })
    }
}

@Suppress("UNCHECKED_CAST")
fun <T : ViewModel> factory(make: () -> T) = object : ViewModelProvider.Factory {
    override fun <V : ViewModel> create(modelClass: Class<V>): V = make() as V
}
