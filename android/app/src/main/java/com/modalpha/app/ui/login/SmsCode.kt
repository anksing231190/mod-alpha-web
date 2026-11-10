package com.modalpha.app.ui.login

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status
import java.security.MessageDigest

/*
 * OTP auto-read with Google's SMS Retriever API: no SMS permission. The server ends the OTP SMS with this app's
 * 11-character hash (we send it with POST /auth/otp/send); Play services then hands that one SMS to the app.
 */

/** The 11-character hash of package name + signing certificate, as SMS Retriever expects. Null if unavailable. */
fun appSmsHash(context: Context): String? = runCatching {
    val pm = context.packageManager; val pkg = context.packageName
    @Suppress("DEPRECATION")
    val sig = if (Build.VERSION.SDK_INT >= 28)
        pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo!!.apkContentsSigners.first()
    else pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES).signatures!!.first()
    val md = MessageDigest.getInstance("SHA-256")
    md.update("$pkg ${sig.toCharsString()}".toByteArray(Charsets.UTF_8))
    Base64.encodeToString(md.digest().copyOfRange(0, 9), Base64.NO_PADDING or Base64.NO_WRAP).substring(0, 11)
}.getOrNull()

/** While on the code step: listen for the OTP SMS (up to 5 minutes) and hand the 6-digit code to [onCode]. */
@Composable
fun ListenForSmsCode(key: Any, onCode: (String) -> Unit) {
    val ctx = LocalContext.current
    val cb = rememberUpdatedState(onCode)
    DisposableEffect(key) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
                val status = intent.extras?.let { if (Build.VERSION.SDK_INT >= 33) it.getParcelable(SmsRetriever.EXTRA_STATUS, Status::class.java) else @Suppress("DEPRECATION") it.get(SmsRetriever.EXTRA_STATUS) as? Status }
                if (status?.statusCode != CommonStatusCodes.SUCCESS) return
                val msg = intent.extras?.getString(SmsRetriever.EXTRA_SMS_MESSAGE) ?: return
                Regex("""\b(\d{6})\b""").find(msg)?.groupValues?.get(1)?.let { cb.value(it) }
            }
        }
        val ok = runCatching {
            SmsRetriever.getClient(ctx).startSmsRetriever()
            ContextCompat.registerReceiver(ctx, receiver, IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION), SmsRetriever.SEND_PERMISSION, null, ContextCompat.RECEIVER_EXPORTED)
        }.isSuccess
        onDispose { if (ok) runCatching { ctx.unregisterReceiver(receiver) } }
    }
}
