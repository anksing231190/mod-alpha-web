# Mod Alpha — Android app

Native Android app (Kotlin + Jetpack Compose, Material 3). It uses the **same API and the same database** as the
website: every screen reads and writes through `api/` (stage: `https://api.stage.modalpha.in`, prod:
`https://api.modalpha.in`). Nothing is stored on the phone except the sign-in session.

Built one screen at a time, designed for the phone (less content per screen than the website, larger touch targets).

| Screen | Status |
|---|---|
| Welcome (animated: data network + orbiting dates around the α), Log in / Create account, Try the demo | done |
| Log in: mobile OTP (6 boxes, resend timer) or email + password | done |
| Fingerprint unlock (offered after first log-in; on/off in You; re-locks after 5 min in background) | done |
| Home: best SIP date (blurred on Free), backtest chart on the checkered grid, watchlist; tab bar with α centre | done |
| Explore (search, categories, sort) · Fund detail (NAV chart, facts, watchlist, Mod Alpha backtest) · What if (lump sum / SIP) · Compare · Insights & reels | done |
| Calendar (best / good dates, "Why the 12th?" from real NAV history, past months) · Remind me sheet (/me/preferences) | done |
| Ask Mod Alpha (POST /assistant/messages, daily limit shown) · Notifications (filters, mark all read) | done |
| You (plan, KYC, reminders, theme, fingerprint) · Plans · Checkout (stage: simulated payment) · KYC (PAN) · Payment success · Subscription & invoices (PDF, cancel / keep) · Help (FAQ, my requests, new request) | done |

| **Admin** (admin / super admin accounts): sign-in with password + email code + SMS code · Overview (KPIs vs previous period, revenue chart, recent sign-ups and subscriptions) · Users (search, filter, detail, suspend / reactivate with reason) · Support inbox (reply, change status) · Publish SIP date (checks, then publish + reminder campaign) · More (payments this month, theme, fingerprint) | done |

Admin demo account: **admin@modalpha.in / admin1234**, codes 111111 (email) and 222222 (SMS). Refunds, role changes,
data uploads, templates and settings stay on the website admin.

**Not in the app yet:** live Razorpay checkout (needs the Razorpay Android SDK + key; stage uses the mock provider end
to end), changing an existing plan (opens the website), push notifications (FCM), Hindi.

**Themes** (You → Theme): **Navy** — white pages, dark navy top panel and tab bar (default); **Espresso** — cream
pages, dark brown chrome (same as the website's Espresso).

## Build and run

Requirements: JDK 17, Android SDK 35 (Android Studio installs both).

```bash
cd android
./gradlew assembleStageDebug        # app/build/outputs/apk/stage/debug/app-stage-debug.apk
./gradlew installStageDebug         # onto a connected phone / emulator
```

Flavours: `stage` (talks to the stage API, app name "Mod Alpha (Stage)", can sit next to the real app) and `prod`.

## Test accounts

On **stage** the SMS provider is a mock, so the screen shows the OTP ("Test code: …"); any account that exists
in the stage database works. **Try the demo** (or these numbers) uses built-in sample data with no network:

| Login | Plan |
|---|---|
| +91 98765 43210, code 123456 | Pro (best SIP date visible) |
| +91 98765 00000, code 123456 | Free (best SIP date locked) |
| demo@modalpha.in / demo1234 | Pro |

## Code map

```
app/src/main/java/com/modalpha/app/
  MainActivity.kt, ModAlphaApp.kt, SessionViewModel.kt   start-up, signed in / out
  data/      Repository (interface), LiveRepository (API + saved session cookies), DemoRepository, models
  ui/theme/  Navy and Espresso colours (pages + dark chrome)
  ui/welcome/  animated backdrop, Welcome, fingerprint Lock screen
  data/AppPrefs.kt  theme, fingerprint on/off
  ui/components/  cards, buttons, fund logos, sparkline, loader
  ui/login/  LoginScreen + LoginViewModel
  ui/home/   HomeScreen + HomeViewModel
  ui/explore/  Explore, Fund, What if, Compare, Insights
  ui/sip/    Calendar, Remind me sheet, Ask Mod Alpha, Notifications
  ui/account/  You, Plans, Checkout, KYC, Success, Subscription & invoices, Help
  ui/kit/    screen frame, list rows, chips, tags, loading/error
  ui/Nav.kt, ui/AppRoot.kt   routes (back stack over the tabs) and the tab bar
app/src/test/…/ScreenshotTest.kt, AllScreensTest.kt   render every screen to PNG (no emulator): ./gradlew recordRoborazziStageDebug
```

Sessions work like the browser: the API's `ma_at` / `ma_rt` cookies are kept in a cookie jar saved on the phone, and
an expired access token is refreshed once via `POST /auth/refresh`. Admin accounts are sent to the website.
