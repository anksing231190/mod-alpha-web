/**
 * One-off migration (v23.15): split js/v23-api.js (one big closure) into one "live" file per feature.
 *
 *   node scripts/dev/split-live-api.cjs <apps/web> <descriptions.json>
 *
 * Live files run only when the site talks to the API (config/env.js sets API_BASE_URL).
 * They share helpers and state through window.MA_LIVE (created by src/core/live.js):
 *   - names defined in an EARLIER live file are read once at the top:  const { S, on, busy } = MA_LIVE;
 *   - names defined in a LATER live file, or re-assigned later, are read when used: MA_LIVE.name
 * The files are loaded in the original order, so everything runs in exactly the same sequence as before.
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const WEB = path.resolve(process.argv[2]);
const DESC = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const FILE = path.join(WEB, 'js/v23-api.js');

// section (statement index ranges decided by a marker or a matcher) → output file
const PARTS = [
  // [file, first statement matcher (text includes), header]
  ['src/core/live.js', null],
  ['src/shared/dataset.live.js', 'data bootstrap'],
  ['src/features/auth/auth.live.js', '---- session'],
  ['src/features/subscription/kyc.live.js', 'KYC (mock page'],
  ['src/features/subscription/subscription.live.js', '---- checkout'],
  ['src/features/settings/settings.live.js', '---- settings (profile'],
  ['src/core/notifications-bell.live.js', 'notifications bell'],
  ['src/features/funds/funds.live.js', 'watchlist, support, assistant'],
  ['src/features/help/help.live.js', "on('[data-v22-support]'"],
  ['src/features/assistant/assistant.live.js', 'const chatHistory'],
  ['src/features/what-if/calculators.live.js', 'calculators (server-side'],
  ['src/features/admin/admin.live.js', '=== ADMIN'],
  ['src/features/admin/dashboard/admin-dashboard.live.js', '---- dashboard'],
  ['src/features/admin/users/admin-users.live.js', '---- users'],
  ['src/features/admin/subscriptions/admin-subscriptions.live.js', '---- subscriptions & pricing'],
  ['src/features/admin/sip-date/admin-sip-date.live.js', '---- SIP date configuration'],
  ['src/features/admin/data/admin-data.live.js', '---- data management'],
  ['src/features/admin/notifications/admin-notifications.live.js', '---- notifications & campaigns'],
  ['src/features/admin/ai-models/admin-ai-models.live.js', '---- AI models'],
  ['src/features/admin/audit/admin-audit.live.js', '---- audit log'],
  ['src/features/admin/settings/admin-settings.live.js', '---- system settings'],
  ['src/core/boot.live.js', '--- boot'],
];

const src = fs.readFileSync(FILE, 'utf8');
const host = ts.createCompilerHost({ allowJs: true });
const orig = host.getSourceFile;
host.getSourceFile = (f, l) => (path.resolve(f) === FILE ? ts.createSourceFile(f, src, l, true, ts.ScriptKind.JS) : orig(f, l));
const program = ts.createProgram([FILE], { allowJs: true, noEmit: true, target: ts.ScriptTarget.Latest }, host);
const checker = program.getTypeChecker();
const sf = program.getSourceFile(FILE);
const iife = sf.statements[0].expression.expression.expression; // (function(){ … })()
const body = iife.body.statements;

// --- assign statements to parts
const textOf = (st) => src.slice(st.getFullStart(), st.end);
let part = 0; const partOf = [];
body.forEach((st, i) => {
  // the LAST marker found in this statement's text wins (an empty section leaves its marker on the next statement)
  for (let p = part + 1; p < PARTS.length; p++) if (PARTS[p][1] && textOf(st).includes(PARTS[p][1])) part = p;
  partOf[i] = part;
});
// --- declared top-level names and their symbols
const decl = new Map(); // symbol -> { name, part, kind, reassigned }
body.forEach((st, i) => {
  const add = (id, kind) => { const sym = checker.getSymbolAtLocation(id); if (sym) decl.set(sym, { name: id.text, part: partOf[i], kind, reassigned: false, stmt: i }); };
  if (ts.isFunctionDeclaration(st) && st.name) add(st.name, 'function');
  if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) { if (!ts.isIdentifier(d.name)) throw new Error('destructuring at top level: ' + d.name.getText()); add(d.name, st.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let'); }
});
// reassignments
const visitAll = (n, fn) => { fn(n); ts.forEachChild(n, (c) => visitAll(c, fn)); };
visitAll(iife.body, (n) => {
  let target = null;
  if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment && ts.isIdentifier(n.left)) target = n.left;
  if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && ts.isIdentifier(n.operand) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator)) target = n.operand;
  if (target) { const sym = checker.getSymbolAtLocation(target); const d = sym && decl.get(sym); if (d) d.reassigned = true; }
});
// --- per part: which shared names it uses
const parts = PARTS.map(() => ({ stmts: [], importsEarly: new Set(), lateRefs: [], exports: new Set() }));
body.forEach((st, i) => parts[partOf[i]].stmts.push(i));
const edits = []; // [start, end, replacement]
body.forEach((st, i) => {
  const p = partOf[i];
  visitAll(st, (n) => {
    if (!ts.isIdentifier(n)) return;
    if (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) return;
    if ((ts.isPropertyAssignment(n.parent) || ts.isMethodDeclaration(n.parent)) && n.parent.name === n) return;
    const sym = checker.getSymbolAtLocation(n); const d = sym && decl.get(sym);
    if (!d) return;
    const isDeclName = (ts.isVariableDeclaration(n.parent) || ts.isFunctionDeclaration(n.parent)) && n.parent.name === n;
    const shared = d.reassigned ? usedOutside(d) : d.part !== p;
    if (!shared && !(d.reassigned && usedOutside(d))) return;
    if (d.reassigned) { // live binding through MA_LIVE everywhere
      if (isDeclName) return; // handled below (declaration rewritten)
      if (ts.isShorthandPropertyAssignment(n.parent)) edits.push([n.getStart(), n.end, `${n.text}: MA_LIVE.${n.text}`]);
      else edits.push([n.getStart(), n.end, `MA_LIVE.${n.text}`]);
      parts[d.part].exports.add(d.name);
      return;
    }
    if (d.part < p) { parts[p].importsEarly.add(d.name); parts[d.part].exports.add(d.name); }
    else if (d.part > p) { if (ts.isShorthandPropertyAssignment(n.parent)) edits.push([n.getStart(), n.end, `${n.text}: MA_LIVE.${n.text}`]); else edits.push([n.getStart(), n.end, `MA_LIVE.${n.text}`]); parts[d.part].exports.add(d.name); }
  });
});
function usedOutside(d) { return d._out ?? (d._out = (() => { let out = false; body.forEach((st, i) => { if (partOf[i] === d.part) return; visitAll(st, (n) => { if (ts.isIdentifier(n) && decl.get(checker.getSymbolAtLocation(n)) === d) out = true; }); }); return out; })()); }
// reassigned shared lets: `let X = v, Y;` → `MA_LIVE.X = v; MA_LIVE.Y = undefined;`
const sharedLets = [...decl.values()].filter((d) => d.reassigned && usedOutside(d));
const letRewrite = new Map();
body.forEach((st, i) => {
  if (!ts.isVariableStatement(st)) return;
  const ds = st.declarationList.declarations;
  const shared = ds.map((d) => sharedLets.find((x) => x.name === d.name.getText() && x.stmt === i));
  if (!shared.some(Boolean)) return;
  if (!shared.every(Boolean)) throw new Error('mixed shared/local let in one statement: ' + st.getText().slice(0, 80));
  letRewrite.set(i, ds.map((d) => `MA_LIVE.${d.name.getText()} = ${d.initializer ? applyEdits(d.initializer) : 'undefined'};`).join(' '));
});
function applyEdits(node) {
  const a = node.getStart(), b = node.end; let out = '', pos = a;
  for (const [s, e, r] of edits.filter(([s, e]) => s >= a && e <= b).sort((x, y) => x[0] - y[0])) { out += src.slice(pos, s) + r; pos = e; }
  return out + src.slice(pos, b);
}
function stmtText(i) {
  const st = body[i];
  const lead = src.slice(st.getFullStart(), st.getStart()).replace(/^\s*\n/, '');
  return (letRewrite.has(i) ? lead + letRewrite.get(i) : lead + applyEdits(st));
}
// --- write files
const H = DESC['@live-headers'] || {};
const order = [];
PARTS.forEach(([file], p) => {
  const P = parts[p];
  if (!P.stmts.length && p !== 0) return;
  const exportsList = [...P.exports].filter((n) => !sharedLets.find((d) => d.name === n));
  let out = `/* ==========================================================================\n${(H[file] || file).split('\n').map((l) => '   ' + l).join('\n')}\n   ========================================================================== */\n`;
  if (p === 0) {
    // core/live.js: the original prologue (API guard, shared state and helpers) + MA_LIVE namespace
    out += `(function () {\n` + P.stmts.map(stmtText).join('\n').replace(/^/, '') + `\n\n  // shared with the other live files\n  window.MA_LIVE = { ${exportsList.join(', ')} };\n})();\n`;
  } else {
    const imp = [...P.importsEarly].sort();
    out += `(function () {\n  if (!window.MA_LIVE) return; // demo mode (no API): nothing to do\n${imp.length ? `  const { ${imp.join(', ')} } = MA_LIVE;\n` : ''}` + P.stmts.map(stmtText).join('\n') + (exportsList.length ? `\n\n  // used by other live files\n  Object.assign(MA_LIVE, { ${exportsList.join(', ')} });\n` : '\n') + `})();\n`;
  }
  const abs = path.join(WEB, file); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, out); order.push(file);
});
fs.writeFileSync(path.join(WEB, 'src/.live-files.json'), JSON.stringify(order, null, 1));
console.log('live files:', order.length, '| shared re-assigned lets:', sharedLets.map((d) => d.name).join(', ') || 'none');
