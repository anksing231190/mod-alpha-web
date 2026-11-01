/**
 * One-off migration (v23.15): split the layered legacy website scripts into one folder per feature.
 *
 *   node scripts/dev/restructure-web.cjs <apps/web> <descriptions.json>
 *
 * What it does, without changing behaviour:
 *   1. Drops dead code: older copies of functions that a later file replaced without using them.
 *   2. Turns "wrapper" overrides  (function(){const base=N;N=function(){… base() …}})()  into plain named
 *      functions, e.g. renderUserPage() (the original) + renderUser() (the wrapper calling renderUserPage()).
 *   3. Puts every function / constant into its feature file (src/features/<feature>/…, src/core, src/shared).
 *   4. Code that must run at start-up (event listeners, values computed from the page) becomes a numbered
 *      start-up step: MA_STARTUP(order, label, fn). src/core/boot.js runs the steps in the original order
 *      and then renders the first page — exactly what the old scripts did while loading.
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const { load, analyse, wrapperOf, assignOf, captureOf } = require('./web-layers.cjs');

const WEB = path.resolve(process.argv[2]);
const DESC = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const LAYERS = ['app.js', 'v22.js', 'v22-data.js', 'v22-ui.js'];
const stmts = load(WEB, LAYERS);
const chains = analyse(stmts);

/* ---------- names for functions that are extended by a later wrapper ---------- */
const CHAIN_NAMES = {
  route: ['routeBase', 'route'],
  renderAuth: ['renderAuthForm', 'renderAuth'],
  shell: ['shellLayout', 'shellWithIcons', 'shell'],
  renderUser: ['renderUserPage', 'renderUser'],
  renderLanding: ['renderLandingBase', 'renderLanding'],
  publicFooter: ['publicFooterBase', 'publicFooterWithSocial', 'publicFooter'],
  renderPublic: ['renderPublicBase', 'renderPublicWithFaq', 'renderPublic'],
  v22Hero: ['v22HeroBase', 'v22Hero'],
  v22DetailChart: ['v22DetailChartSample', 'v22DetailChart'],
  v22DashChart: ['v22DashChartSample', 'v22DashChart'],
  v22UserKpis: ['v22UserKpisSample', 'v22UserKpis'],
};
/* functions nothing calls any more (checked across every script and index.html) */
const UNUSED = new Set(['chartPanel', 'flowCompact', 'fundCard', 'insightMini', 'maAdminCombo', 'maChart', 'maFundIcon', 'maMultiChart', 'planCard', 'lineChart']);
const UNUSED_VARS = new Set(['V22_HEROES', 'V22_SUBS', 'lakh', 'v22Csv']);
const BOOT_ROUTES = new Set(['app.js#86', 'v22.js#140', 'v22-ui.js#35']);

/* ---------- feature of every function / constant ---------- */
const F = {
  'core/state': 'app toast modalRoot D pricingBilling authMode currentRole selectedFund selectedPeriod settingsTab currentUser filters calcResult adminTab maFundPage maAuthMethod money pct esc notify go showModal exportCSV field',
  'core/format': 'V22_MON inr lakh v22Num v22ParseDate v22FmtDate v22Tags v22Pills v22Seeded v22DateField v22Iso v22Today v22D v22AddY v22Fmt v22Short v22Pct v22Csv v22Status v22Avatar v22Sel v22Toggle v22Strip',
  'core/icons': 'V22_ICONS ic cic v22Cid v22Mark v22BrandMark V22X',
  'core/router': 'routeBase route',
  'core/layout': 'U_NAV A_NAV V22_ADMIN_NAV V22_USER_NAV v22DataOpen logo topbar sidebar shellLayout shellWithIcons shell pageHead kpi userBanner adminNotice v22Head v22Kpis V22_NOTIFS renderUserPage renderUser renderAdmin wireCommon v22AdminProfile v22Loading v22NoData v22Pager',
  'features/theme/theme-core': 'getTheme setTheme',
  'shared/charts': 'lineChart chartPanel v22Chart v22Mix v22Spark maChart maMultiChart v22AdminChart v22NiceMax v22Buckets v22CountIn v22SumPays V22_HOV v22HovSet',
  'shared/fund-logos': 'V22_AMC_STYLE v22AmcMono v22FundLogo v22FundIcon maFundIcon',
  'shared/dataset': 'V22_BUNDLED_URL V22_TEMPLATE_URL V22_BUNDLE_VERSION V22_ENUM V22_SCHEMA V22D v22Mem v22Idb v22Get v22Put v22Del v22ParseCell v22ReadSheet v22Validate v22NavAt v22BuildModel v22Apply v22LoadDataset v22Sample v22PeriodStart',
  'features/landing/landing': 'renderLandingBase renderLanding flowCompact flowLarge initFlowAnimation initPublicActivityToast v22NetworkBg v22HeroBase v22Hero v22Robot v22Features v22InitReveal v22FitFibers V22_HEROES v22HeroVariant v22HeroArtB v22HeroArtC v22HeroArtD',
  'features/public-pages/public-pages': 'publicFooterBase publicFooterWithSocial publicFooter V22_SOCIAL renderPublicBase renderPublicWithFaq renderPublic V22_FAQ v22FaqCat v22Faq',
  'features/pricing/pricing': 'pricingSection planCard v22Billing V22_PLAN_META v22PlanPrice v22AnimatePrice V22_PRICE_KEY v22PricingLoad',
  'features/auth/auth': 'renderAuthForm renderAuth v22AuthAnim',
  'features/dashboard/dashboard': 'userOverview insightMini v22DashPeriod v22DashChartSample v22DashChart v22UserKpisSample v22UserKpis v22CalMonth v22SipFor v22PickDay v22ReminderState v22ReminderCard v22CalFooter v22Calendar v22EstHTML v22EstBars v22QuickCalc',
  'features/funds/funds': 'fundExplorer fundCard fundDetail fundTab v22Chip v22Page v22DetailPeriod v22Since v22DetailSeries v22DetailChartSample v22DetailChart v22FundSpark',
  'features/what-if/what-if': 'whatIf runCalc V22_ASOF V22_LUMP_CAGR v22Lump v22SolveRate v22WhatIf v22JourneyChart v22ResultRows v22InsightText',
  'features/sip/sip-compare': 'sipCompare runSip V22_R_MOD V22_R_TRAD v22Sip v22SipState v22SipChart v22SipResults',
  'features/assistant/assistant': 'insightsPage chatWidget answerAI answerChat v22Answer v22ChatSend V22_CHAT_PROMPTS v22OpenChat',
  'features/subscription/subscription': 'subscriptionPage V22_SUB_FAQ',
  'features/settings/settings': 'settingsPage',
  'features/help/help': 'helpPage V22_HELP v22HelpCat v22HelpQ v22HelpList',
  'features/admin/dashboard/admin-dashboard': 'adminDashboard v22AdminKpi maAdminCombo v22MonthStats v22AdmPeriod V22_RANGE v22RangeBuckets v22KpiStats v22RangeModal',
  'features/admin/users/admin-users': 'adminUsers usersTable filterUsers v22UList v22UPage V22_UPER',
  'features/admin/subscriptions/admin-subscriptions': 'adminSubs V22_SUBS v22SList v22SPage v22SubRows v22FilterSubs v22PricingModal v22PricingSave',
  'features/admin/sip-date/admin-sip-date': 'adminSipDate',
  'features/admin/data/admin-data': 'adminData v22SchemaTable v22LastReport v22LastFile v22Pipe v22HandleFile v22ReportHTML v22Publish v22IssuesCsv v22ExportDataset',
  'features/admin/notifications/admin-notifications': 'adminNotifications',
  'features/admin/ai-models/admin-ai-models': 'adminMethodology V22_GATES',
  'features/admin/audit/admin-audit': 'adminAudit V22_AUDIT v22FilterAudit',
  'features/admin/settings/admin-settings': 'adminSettings v22IntCat v22IntStatus v22IntQ v22IntList v22IntPill v22IntCsv',
};
const NAME2F = {};
for (const [f, names] of Object.entries(F)) for (const n of names.split(/\s+/)) NAME2F[n] = f;
/* start-up steps: feature by statement id (default core/events) */
const STEP_F = {
  'app.js#8': 'features/theme/theme-core', 'app.js#87': 'features/theme/theme-core', 'app.js#83': 'core/router', 'v22.js#81': 'core/router',
  'v22.js#76': 'features/admin/data/admin-data', 'v22.js#77': 'features/admin/data/admin-data', 'v22.js#78': 'features/admin/data/admin-data',
  'v22.js#138': 'features/admin/data/admin-data', 'v22.js#139': 'features/admin/data/admin-data',
  'v22-data.js#69': 'features/admin/data/admin-data', 'v22-data.js#70': 'features/admin/data/admin-data', 'v22-data.js#71': 'features/admin/data/admin-data', 'v22-data.js#72': 'features/admin/data/admin-data',
  'v22.js#104': 'features/assistant/assistant', 'v22-ui.js#0': 'features/assistant/assistant',
  'v22.js#142': 'features/landing/landing', 'v22-data.js#73': 'shared/dataset',
  'v22-data.js#75': 'shared/charts', 'v22-data.js#76': 'shared/charts',
  'v22-ui.js#13': 'features/pricing/pricing', 'v22-ui.js#34': 'features/pricing/pricing',
  'v22.js#134': 'features/help/help', 'v22-ui.js#23': 'features/admin/settings/admin-settings',
};

/* ---------- helpers ---------- */
const topNames = new Set(); for (const s of stmts) { if (ts.isFunctionDeclaration(s.st)) topNames.add(s.st.name.text); if (ts.isVariableStatement(s.st)) s.st.declarationList.declarations.forEach((d) => topNames.add(d.name.getText())); }
function isPure(init) {
  let pure = true;
  const walk = (n, inFn) => {
    if (!pure) return;
    if (!inFn && (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n) || ts.isAwaitExpression(n))) { pure = false; return; }
    if (!inFn && ts.isIdentifier(n) && topNames.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n)) { pure = false; return; }
    ts.forEachChild(n, (c) => walk(c, inFn || ts.isFunctionLike(n)));
  };
  walk(init, false);
  return pure;
}
/** text of a node with identifier renames applied (rename map: oldName -> newName; only real identifier uses) */
function textWithRenames(node, src, map) {
  const edits = [];
  const walk = (n) => {
    if (ts.isIdentifier(n) && map[n.text] && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n)) edits.push([n.getStart(), n.end, map[n.text]]);
    ts.forEachChild(n, walk);
  };
  walk(node);
  let start = node.getStart(), out = '', pos = start;
  for (const [a, b, r] of edits.sort((x, y) => x[0] - y[0])) { out += src.slice(pos, a) + r; pos = b; }
  return out + src.slice(pos, node.end);
}
/** leading comments of a statement, minus old section banners */
function leading(s) {
  const ranges = ts.getLeadingCommentRanges(s.src, s.st.getFullStart()) || [];
  return ranges.map((r) => s.src.slice(r.pos, r.end))
    .filter((c) => !/^\/\*\s*[-=]{3,}/.test(c))          // old section banners: replaced by the file header
    .join('\n');
}
const describe = (name) => DESC[name];
const missing = new Set();
function docFor(name, fallback) { const d = describe(name); if (!d) missing.add(name); return d || fallback; }

/* ---------- walk all statements and decide what each becomes ---------- */
const files = {};   // feature -> [{order, text}]
const steps = {};   // feature -> [{order, label, body}]
const emit = (f, order, text) => (files[f] = files[f] || []).push({ order, text });
const step = (f, order, label, body) => (steps[f] = steps[f] || []).push({ order, label, body });
const capVars = {}; // capture variable -> base function name
for (const [n, list] of Object.entries(chains)) {
  const live = list.filter((r) => r.live);
  if (live.length > 1) { const names = CHAIN_NAMES[n]; if (!names || names.length !== live.length) throw new Error('chain names needed for ' + n + ' (' + live.length + ')'); live.forEach((r, i) => { r.newName = names[i]; if (r.capVar) capVars[r.capVar] = names[i]; }); live.forEach((r, i) => { if (i > 0) r.baseName = names[i - 1]; }); }
  else if (live.length === 1) live[0].newName = n;
}
const recOf = new Map(); for (const list of Object.values(chains)) for (const r of list) recOf.set(r.s.id, r);
const featureOfName = (n) => { const f = NAME2F[n]; if (!f) { missing.add('FEATURE:' + n); return 'core/misc'; } return f; };

stmts.forEach((s, order) => {
  const st = s.st, rec = recOf.get(s.id);
  if (BOOT_ROUTES.has(s.id)) return;                                   // replaced by core/boot.js
  if (rec && !rec.live) return;                                        // dead copy
  if (rec && UNUSED.has(rec.newName)) return;                          // never called
  if (s.captureStmt) return;                                           // `const v22BaseX = v22X` → replaced by a named function
  const lead = leading(s);
  if (rec) {
    const name = rec.newName, f = featureOfName(name);
    let text;
    if (rec.kind === 'decl') {
      const t = s.src.slice(st.getStart(), st.end);
      text = name === st.name.text ? t : t.replace(/^function\s+[A-Za-z0-9_$]+/, `function ${name}`);
    } else {
      // wrapper / assignment → named function declaration
      const fn = rec.fn, map = { ...capVars };
      if (rec.kind === 'wrapper') map.base = rec.baseName;
      const params = fn.parameters.map((p) => s.src.slice(p.getStart(), p.end)).join(',');
      const body = textWithRenames(fn.body, s.src, map);
      text = `function ${name}(${params})${body}`;
    }
    const doc = docFor(name, '');
    emit(f, order, `${doc ? `/** ${doc} */\n` : ''}${lead ? lead + '\n' : ''}${text}`);
    return;
  }
  if (ts.isFunctionDeclaration(st)) throw new Error('unexpected bare function ' + s.id);
  if (ts.isVariableStatement(st)) {
    const ds = st.declarationList.declarations, names = ds.map((d) => d.name.getText());
    if (names.every((n) => UNUSED_VARS.has(n))) return;                // never read
    const f = featureOfName(names[0]);
    const keyword = st.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let';
    const doc = names.map((n) => describe(n)).filter(Boolean).join(' ') || (missing.add(names.join(',')), '');
    if (ds.every((d) => !d.initializer || isPure(d.initializer))) {
      emit(f, order, `${doc ? `/** ${doc} */\n` : ''}${lead ? lead + '\n' : ''}${textWithRenames(st, s.src, capVars)}`);
    } else {
      // value computed from the page / other code → declared here, filled in at start-up (same order as before)
      emit(f, order, `${doc ? `/** ${doc} */\n` : ''}${lead ? lead + '\n' : ''}let ${names.join(', ')}; // set at start-up (step ${order})`);
      const body = ds.filter((d) => d.initializer).map((d) => `${d.name.getText()} = ${textWithRenames(d.initializer, s.src, capVars)};`).join('\n');
      step(f, order, `initialise ${names.join(', ')}${keyword === 'const' ? '' : ''}`, body);
    }
    return;
  }
  // expression statement → start-up step
  const t = textWithRenames(st, s.src, capVars);
  const sels = [...t.matchAll(/closest\??\.?\('([^']+)'\)/g)].map((m) => m[1]);
  const ev = (t.match(/^(?:document|window)?\.?addEventListener\('([a-z]+)'/) || [])[1];
  const label = DESC['step:' + s.id] || (ev ? `${ev} listener${sels.length ? ': ' + [...new Set(sels)].slice(0, 6).join(' · ') + (sels.length > 6 ? ' …' : '') : ''}` : t.slice(0, 60).replace(/\s+/g, ' '));
  step(STEP_F[s.id] || 'core/events', order, label, (lead ? lead + '\n' : '') + t);
});

/* ---------- write files ---------- */
const HEAD = DESC['@headers'] || {};
const outDir = path.join(WEB, 'src');
const written = [];
for (const f of [...new Set([...Object.keys(files), ...Object.keys(steps)])].sort()) {
  const parts = [];
  const h = HEAD[f]; if (!h) missing.add('HEADER:' + f);
  parts.push(`/* ==========================================================================\n${(h || f).split('\n').map((l) => '   ' + l).join('\n')}\n   ========================================================================== */\n`);
  for (const it of (files[f] || []).sort((a, b) => a.order - b.order)) parts.push(it.text + '\n');
  const ss = (steps[f] || []).sort((a, b) => a.order - b.order);
  if (ss.length) {
    parts.push(`/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */\n`);
    for (const x of ss) parts.push(`MA_STARTUP(${x.order}, ${JSON.stringify(x.label)}, () => {\n${x.body}\n});\n`);
  }
  const file = path.join(outDir, f + '.js');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, parts.join('\n'));
  written.push('src/' + f + '.js');
}
fs.writeFileSync(path.join(outDir, '.layered-files.json'), JSON.stringify(written, null, 1));
console.log('wrote', written.length, 'files');
if (missing.size) console.log('MISSING:', [...missing].join(' '));
