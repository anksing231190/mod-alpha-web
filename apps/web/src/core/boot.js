/* ==========================================================================
   Mod Alpha — boot
   Loaded after every core / shared / feature file (see index.html).
   1. run the start-up steps (listeners, initial values) in their fixed order
   2. render the screen for the current address (#/landing, #/user/overview, …)
   Optional modules loaded after this file (theme, Hindi, live API, date picker,
   session timeout, …) enhance the page that is now on screen.
   ========================================================================== */
MA_STARTUP.run();
route();
