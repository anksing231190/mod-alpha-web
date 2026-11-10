package com.modalpha.app

import android.app.Application
import com.modalpha.app.data.DemoRepository
import com.modalpha.app.data.LiveRepository
import com.modalpha.app.data.Repository

/** Holds the two data sources. The live one points at BuildConfig.API_BASE_URL (stage or prod flavour). */
class ModAlphaApp : Application() {
    val live: Repository by lazy { LiveRepository(this, BuildConfig.API_BASE_URL) }
    val demo: Repository by lazy { DemoRepository() }
}
