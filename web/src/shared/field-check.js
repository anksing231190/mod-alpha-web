/* ==========================================================================
   Shared: inline field checks — PAN, mobile number and GSTIN are checked as you type
   A ✓ or ! appears in the field and one line under it says what is right or what to fix, before the form
   is sent. The PAN and GSTIN are upper-cased and stripped of spaces as you type; the mobile number is left
   as typed (it may carry +91). Applies to:
     PAN    input[name="pan"]  (KYC dialog)       ·  input[data-check="pan"]
     Mobile #profile-mobile    (Settings)          ·  input[data-check="mobile"]
     GSTIN  #bill-gstin        (Billing details)   ·  input[data-check="gstin"]
   Styles: src/styles/ux.css
   ========================================================================== */
(function () {
  const T = (s) => (window.MA_T ? MA_T(s) : s);
  const STATES = { '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh' };
  const RULES = {
    pan: {
      clean: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
      check: (v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v) ? [true, 'Looks right. We will verify it with the KRA.']
        : (v.length < 10 && /^([A-Z]{0,5}|[A-Z]{5}[0-9]{0,4})$/.test(v)) ? [null, ''] : [false, 'PAN looks like ABCDE1234F: 5 letters, 4 digits, 1 letter'],
    },
    mobile: {
      clean: null,
      check: (v) => { let d = v.replace(/\D/g, ''); if (d.length === 12 && d.startsWith('91')) d = d.slice(2); if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
        if (!d) return [null, ''];
        if (/^[0-5]/.test(d)) return [false, 'Indian mobile numbers start with 6, 7, 8 or 9'];
        if (d.length < 10) return [null, ''];
        return d.length === 10 ? [true, 'We will send a code to this number to confirm it.'] : [false, 'Enter a 10-digit mobile number']; },
    },
    gstin: {
      clean: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15),
      check: (v) => { if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) { const st = STATES[v.slice(0, 2)]; return st ? [true, `${T('Valid format')} · ${st}`] : [false, 'The first two digits must be a valid state code']; }
        return v.length < 15 ? [null, ''] : [false, 'GSTIN has 15 characters, like 27ABCDE1234F1Z5']; },
    },
  };
  const kindOf = (el) => el.dataset.check || (el.name === 'pan' ? 'pan' : el.id === 'profile-mobile' ? 'mobile' : el.id === 'bill-gstin' ? 'gstin' : null);
  function run(el, typing) {
    const k = kindOf(el), r = k && RULES[k]; if (!r) return;
    if (r.clean) { const p = el.selectionStart, before = el.value.length, c = r.clean(el.value); if (c !== el.value) { el.value = c; try { el.setSelectionRange(Math.max(0, p - (before - c.length)), Math.max(0, p - (before - c.length))); } catch (e) {} } }
    const v = el.value.trim(), [ok, msg] = v ? r.check(r.clean ? el.value : v) : [null, ''];
    const host = el.closest('label, .v22-fl, .v22-field') || el.parentElement;
    host.classList.toggle('ma-fc-ok', ok === true); host.classList.toggle('ma-fc-bad', ok === false);
    let st = host.querySelector(':scope > .ma-fc-st'), note = host.querySelector(':scope > .ma-fc-note');
    if (!st) { st = document.createElement('span'); st.className = 'ma-fc-st'; st.setAttribute('aria-hidden', 'true'); host.appendChild(st); }
    if (!note) { note = document.createElement('small'); note.className = 'ma-fc-note'; note.setAttribute('aria-live', 'polite'); note.id = 'ma-fc-' + (el.id || el.name || k); host.appendChild(note); el.setAttribute('aria-describedby', note.id); }
    st.textContent = ok === true ? '✓' : ok === false ? '!' : '';
    note.textContent = msg ? T(msg) : ''; el.setAttribute('aria-invalid', ok === false ? 'true' : 'false');
    if (!typing && ok === null && v) { host.classList.add('ma-fc-bad'); st.textContent = '!'; note.textContent = T(k === 'pan' ? 'PAN looks like ABCDE1234F: 5 letters, 4 digits, 1 letter' : k === 'mobile' ? 'Enter a 10-digit mobile number' : 'GSTIN has 15 characters, like 27ABCDE1234F1Z5'); el.setAttribute('aria-invalid', 'true'); }
  }
  document.addEventListener('input', (e) => { if (e.target.matches && e.target.matches('input')) run(e.target, true); });
  document.addEventListener('focusout', (e) => { if (e.target.matches && e.target.matches('input')) run(e.target, false); });
  window.MA_FIELDCHECK = { run, rules: RULES };
})();
