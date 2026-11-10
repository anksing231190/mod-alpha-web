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
    var lastName: String?
        get() = p.getString("last_name", null)
        set(v) = p.edit().putString("last_name", v).apply()
}
