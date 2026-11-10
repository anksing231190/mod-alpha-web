package com.modalpha.app.data

import android.content.Context
import com.modalpha.app.ui.theme.AppTheme

/** Small on-device settings: theme, fingerprint unlock, and the name shown on the lock screen. */
class AppPrefs(context: Context) {
    private val p = context.getSharedPreferences("ma_prefs", Context.MODE_PRIVATE)
    var theme: AppTheme
        get() = runCatching { AppTheme.valueOf(p.getString("theme", null) ?: "Navy") }.getOrDefault(AppTheme.Navy)
        set(v) = p.edit().putString("theme", v.name).apply()
    var biometric: Boolean
        get() = p.getBoolean("biometric", false)
        set(v) = p.edit().putBoolean("biometric", v).apply()
    /** We asked once after sign-in; don't ask again (it can still be turned on in Account). */
    var biometricAsked: Boolean
        get() = p.getBoolean("biometric_asked", false)
        set(v) = p.edit().putBoolean("biometric_asked", v).apply()
    /** Last best SIP date shown on Home (unlocked), so the lock / welcome dial can land on it. */
    var lastBestDay: Int
        get() = p.getInt("last_best_day", 0)
        set(v) = p.edit().putInt("last_best_day", v).apply()
    var lastBestMonth: String?
        get() = p.getString("last_best_month", null)
        set(v) = p.edit().putString("last_best_month", v).apply()
    /** Morning NAV alert on the SIP date: minimum move in % (0 = off). */
    var navAlertPct: Int
        get() = p.getInt("nav_alert_pct", 2)
        set(v) = p.edit().putInt("nav_alert_pct", v).apply()
    var lastNavAlert: String?
        get() = p.getString("last_nav_alert", null)
        set(v) = p.edit().putString("last_nav_alert", v).apply()
    var notifAsked: Boolean
        get() = p.getBoolean("notif_asked", false)
        set(v) = p.edit().putBoolean("notif_asked", v).apply()
    var lastName: String?
        get() = p.getString("last_name", null)
        set(v) = p.edit().putString("last_name", v).apply()
}
