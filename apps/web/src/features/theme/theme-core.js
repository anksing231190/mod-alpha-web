/* ==========================================================================
   Feature: light / dark theme — saving and applying the choice
   The theme is stored in localStorage ('mod-alpha-theme') and applied to <html data-theme>.
   The light "Sand" palette itself: src/features/theme/theme.js, theme-palette.js and the CSS.
   ========================================================================== */

/** Saved theme: 'light' or 'dark' (default). */
function getTheme(){try{return localStorage.getItem('mod-alpha-theme')==='light'?'light':'dark'}catch(e){return 'dark'}}

/** Apply and save a theme; tells charts and the toggle (event ma:theme). */
function setTheme(theme){theme=theme==='light'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('mod-alpha-theme',theme)}catch(e){};const select=document.getElementById('theme-select');if(select)select.value=theme;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=theme==='light'?'#f4ecdd':'#080b18';window.dispatchEvent(new CustomEvent('ma:theme',{detail:theme}))}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(8, "setTheme(getTheme());", () => {
setTheme(getTheme());
});

MA_STARTUP(87, "setTheme(getTheme());", () => {
setTheme(getTheme());
});
