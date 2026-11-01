/* ==========================================================================
   Mod Alpha — start-up registry
   --------------------------------------------------------------------------
   Feature files only DEFINE things (functions, constants). Anything that has to
   run when the page opens — event listeners, values read from the page,
   one-off set-up — is registered here as a numbered step:

       MA_STARTUP(order, 'what it does', () => { … });

   core/boot.js runs all steps in ascending `order` once every feature file has
   loaded, then shows the first screen. The numbers keep the original start-up
   order of the app (listeners on the same event fire in registration order),
   so a step can be moved to another file without changing behaviour.
   ========================================================================== */
(function () {
  const steps = [];
  /** Register a start-up step. */
  function MA_STARTUP(order, label, fn) { steps.push({ order, label, fn }); }
  /** Run every registered step once, in order (called by core/boot.js). */
  MA_STARTUP.run = function () {
    steps.sort((a, b) => a.order - b.order);
    for (const s of steps) {
      try { s.fn(); } catch (e) { console.error(`[start-up step ${s.order}] ${s.label}`, e); }
    }
  };
  /** The registered steps (handy in the browser console). */
  MA_STARTUP.list = () => steps.map((s) => `${s.order}  ${s.label}`);
  window.MA_STARTUP = MA_STARTUP;
})();
