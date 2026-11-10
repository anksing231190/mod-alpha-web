/* Fund house (AMC) logos.
   Official logos, saved here so the site never loads them from the AMCs' servers. Map the AMC name exactly as it
   appears in the Funds data ("amc") to the file. Funds whose AMC is not listed (or whose file fails to load) show
   the coloured monogram tile instead (src/shared/fund-logos.js).
   Files are 256×256 PNG, white background, taken from each AMC's official website / brand mark (Nov 2026):
     axis.png  — axismf.com app icon (icon3.png)
     ppfas.png — amc.ppfas.com app icon (img/fevicons/AMC.png)
     sbi.png   — the SBI symbol from sbimf.com's header logo (Content/Images/black.svg)
     quant.png — the "quant" wordmark from quantmutual.com (images/quant-logo.png), tagline removed
     hdfc.png  — the HDFC group square mark (HDFC Mutual Fund uses it; hdfcfund.com blocks downloads, so it was
                 taken from the HDFC logo file on Wikimedia Commons)
   Logos are trademarks of their AMCs and are used only to identify each fund house. */
window.MA_AMC_LOGOS = {
  'Axis Mutual Fund': 'assets/funds/axis.png',
  'HDFC Mutual Fund': 'assets/funds/hdfc.png',
  'PPFAS Mutual Fund': 'assets/funds/ppfas.png',
  'Parag Parikh Mutual Fund': 'assets/funds/ppfas.png',
  'Quant Mutual Fund': 'assets/funds/quant.png',
  'quant Mutual Fund': 'assets/funds/quant.png',
  'SBI Mutual Fund': 'assets/funds/sbi.png',
};
