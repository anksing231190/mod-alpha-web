# Mod Alpha — Android app

Native Android app (Kotlin + Jetpack Compose, Material 3). It uses the **same API and the same database** as the
website: every screen reads and writes through `api/` (stage: `https://api.stage.modalpha.in`, prod:
`https://api.modalpha.in`). Nothing is stored on the phone except the sign-in session.

Built one screen at a time, designed for the phone (less content per screen than the website, larger touch targets).

| Screen | Status |
|---|---|
| Splash, Login / Create account (mobile OTP, email + password, "Try the demo") | done |
| Home: best SIP date (locked on Free), top funds, quick stats, bottom tabs | done |
| Funds, SIP date, What if, Account (full), notifications, plans & payment | next |

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
  ui/theme/  Midnight (phone dark mode) and Sand (light mode) colours — same as the website
  ui/components/  cards, buttons, fund logos, sparkline, loader
  ui/login/  LoginScreen + LoginViewModel
  ui/home/   HomeScreen + HomeViewModel
  ui/AppRoot.kt   bottom tabs
app/src/test/…/ScreenshotTest.kt   renders every screen to PNG (no emulator): ./gradlew recordRoborazziStageDebug
```

Sessions work like the browser: the API's `ma_at` / `ma_rt` cookies are kept in a cookie jar saved on the phone, and
an expired access token is refreshed once via `POST /auth/refresh`. Admin accounts are sent to the website.
