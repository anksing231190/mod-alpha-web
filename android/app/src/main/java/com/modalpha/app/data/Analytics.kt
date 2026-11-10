package com.modalpha.app.data

import java.time.LocalDate
import java.time.YearMonth

/** Small calculations on real API data, shared by several screens. */
object Analytics {
    /**
     * Value of a ₹10,000 monthly SIP bought on each day 1–28 (first NAV on/after that day), over the NAV history given.
     * The day-of-month "edge" shown on Home and Calendar. Null when there is too little history.
     */
    fun dayValues(nav: List<NavPoint>): List<Double>? {
        val pts = nav.mapNotNull { p -> runCatching { LocalDate.parse(p.date.take(10)) to p.value }.getOrNull() }
        if (pts.size < 200) return null
        val first = YearMonth.from(pts.first().first).plusMonths(1); val last = YearMonth.from(pts.last().first).minusMonths(1)
        val endNav = pts.last().second
        return (1..28).map { d ->
            var units = 0.0; var m = first; var i = 0
            while (!m.isAfter(last)) {
                val day = m.atDay(d)
                while (i < pts.size && pts[i].first.isBefore(day)) i++
                if (i >= pts.size) break
                units += 10000 / pts[i].second; m = m.plusMonths(1); i = (i - 3).coerceAtLeast(0)
            }
            units * endNav
        }
    }

    /** Return of each calendar year from NAV points (first and last NAV inside the year). */
    fun yearReturns(nav: List<NavPoint>): List<Pair<Int, Double>> =
        nav.groupBy { it.date.take(4).toIntOrNull() ?: 0 }.filterKeys { it > 0 }.toSortedMap()
            .mapNotNull { (y, l) -> if (l.size < 2) null else y to (l.last().value / l.first().value - 1) * 100 }

    /** Same confidence formula as the API (how far the best day leads the next-best). */
    fun confidence(uplift: Double?, alts: List<Double?>): Pair<Int, String> {
        val best = uplift ?: 0.0; val next = alts.filterNotNull().maxOrNull()
        val gap = if (next != null) (best - next).coerceAtLeast(0.0) else best
        val pct = (55 + gap * 25).coerceIn(40.0, 95.0).toInt()
        return pct to if (pct >= 80) "High" else if (pct >= 62) "Medium" else "Low"
    }

    /** Lump sum at a fixed yearly rate (e.g. a 7% fixed deposit), for "What if" comparisons. */
    fun fixedRate(amount: Long, years: Double, ratePct: Double) = (amount * Math.pow(1 + ratePct / 100, years)).toLong()
}
