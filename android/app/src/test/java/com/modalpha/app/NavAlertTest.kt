package com.modalpha.app

import com.modalpha.app.data.NavAlert
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NavAlertTest {
    @Test fun oneFundFell() {
        val (t, b) = NavAlert.message(12, listOf("Quant Small Cap" to -2.43), "2026-11-11")
        assertEquals("Today is your SIP date · NAV fell 2.4%", t)
        assertTrue(b.startsWith("Quant Small Cap closed lower on 2026-11-11.")); assertTrue(b.endsWith("The 12th is still this month's date."))
    }
    @Test fun twoFundsMoved() {
        val (t, b) = NavAlert.message(1, listOf("SBI Contra" to 2.1, "Axis Bluechip" to -3.0), null)
        assertEquals("Today is your SIP date · 2 funds moved", t)
        assertEquals("SBI Contra ▲ 2.1% · Axis Bluechip ▼ 3.0%. The 1st is still this month's date.", b)
    }
}
