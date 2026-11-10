/* ==========================================================================
   Mod Alpha — boot
   Loaded after every core / shared / feature file (see index.html).
   1. run the start-up steps (listeners, initial values) in their fixed order
   2. render the screen for the current address (#/landing, #/user/overview, …)
      — demo mode only. In live mode core/boot.live.js draws the first screen once
      the session and data are loaded; drawing here first would send live-only
      addresses (#/reset-password, #/verify-email, #/kyc/mock) to the login page.
   Optional modules loaded after this file (theme, Hindi, live API, date picker,
   session timeout, …) enhance the page that is now on screen.
   ========================================================================== */
MA_STARTUP.run();
if (!(window.MA_API && window.MA_API.enabled)) route();
