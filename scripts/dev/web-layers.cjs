/**
 * Analyse the legacy layered website scripts (data.js, app.js, v22.js, v22-data.js, v22-integrations.js, v22-ui.js).
 * Later files re-define functions of earlier ones. This works out, for every top-level name, which definitions are
 * still live (the final one, plus any that a later wrapper captures as its `base`) and which are dead.
 * Used once by restructure-web.cjs; kept for reference.
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function load(webDir, layers) {
  const out = [];
  for (const L of layers) {
    const src = fs.readFileSync(path.join(webDir, L), 'utf8');
    const sf = ts.createSourceFile(L, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    sf.statements.forEach((st, idx) => out.push({ L, idx, st, sf, src, id: `${L}#${idx}` }));
  }
  return out;
}
/** `(function(){const base=N;N=function(...){...}})();` → { name, fn } */
function wrapperOf(st) {
  if (!ts.isExpressionStatement(st) || !ts.isCallExpression(st.expression)) return null;
  let f = st.expression.expression; if (ts.isParenthesizedExpression(f)) f = f.expression;
  if (!ts.isFunctionExpression(f) || st.expression.arguments.length) return null;
  const b = f.body.statements;
  if (b.length !== 2 || !ts.isVariableStatement(b[0]) || !ts.isExpressionStatement(b[1])) return null;
  const d = b[0].declarationList.declarations[0];
  if (d.name.getText() !== 'base' || !d.initializer || !ts.isIdentifier(d.initializer)) return null;
  const a = b[1].expression;
  if (!ts.isBinaryExpression(a) || a.operatorToken.kind !== ts.SyntaxKind.EqualsToken || !ts.isIdentifier(a.left) || a.left.text !== d.initializer.text) return null;
  if (!ts.isFunctionExpression(a.right)) return null;
  return { name: a.left.text, fn: a.right, baseVar: 'base' };
}
/** `N = function(...){...};` → { name, fn } */
function assignOf(st) {
  if (!ts.isExpressionStatement(st)) return null;
  const a = st.expression;
  if (!ts.isBinaryExpression(a) || a.operatorToken.kind !== ts.SyntaxKind.EqualsToken || !ts.isIdentifier(a.left)) return null;
  if (!ts.isFunctionExpression(a.right)) return null;
  return { name: a.left.text, fn: a.right };
}
/** `const X = N;` (capture of a function before it is replaced) → { capVar, name } */
function captureOf(st) {
  if (!ts.isVariableStatement(st)) return null;
  const ds = st.declarationList.declarations;
  if (ds.length !== 1 || !ds[0].initializer || !ts.isIdentifier(ds[0].initializer)) return null;
  return { capVar: ds[0].name.getText(), name: ds[0].initializer.text };
}
function analyse(stmts) {
  // definitions per name in activation order. Function declarations activate at the start of their file.
  const byLayer = {};
  for (const s of stmts) (byLayer[s.L] = byLayer[s.L] || []).push(s);
  const chains = {}; // name -> [{s, kind, capturedBy}]
  const cur = {};    // name -> current definition record
  const set = (name, rec) => { (chains[name] = chains[name] || []).push(rec); cur[name] = rec; };
  for (const L of Object.keys(byLayer)) {
    for (const s of byLayer[L]) if (ts.isFunctionDeclaration(s.st)) set(s.st.name.text, { s, kind: 'decl' });
    for (const s of byLayer[L]) {
      const w = wrapperOf(s.st), a = !w && assignOf(s.st), c = captureOf(s.st);
      if (w) { if (cur[w.name]) cur[w.name].captured = true; set(w.name, { s, kind: 'wrapper', fn: w.fn }); }
      else if (a) { set(a.name, { s, kind: 'assign', fn: a.fn }); }
      else if (c && chains[c.name]) { cur[c.name].captured = true; cur[c.name].capVar = c.capVar; s.captureStmt = c; }
    }
  }
  // live = final definition + every captured one; the rest are dead
  for (const [n, list] of Object.entries(chains)) list.forEach((r, i) => { r.live = i === list.length - 1 || !!r.captured; });
  return chains;
}
module.exports = { load, analyse, wrapperOf, assignOf, captureOf };

if (require.main === module) {
  const web = process.argv[2];
  const stmts = load(web, ['data.js', 'app.js', 'v22.js', 'v22-data.js', 'v22-integrations.js', 'v22-ui.js']);
  const chains = analyse(stmts);
  for (const [n, list] of Object.entries(chains)) if (list.length > 1) console.log(n.padEnd(20), list.map((r) => `${r.s.id}:${r.kind}${r.live ? '' : '(dead)'}${r.captured ? '(captured' + (r.capVar ? ' as ' + r.capVar : '') + ')' : ''}`).join('  '));
  let dead = 0; for (const list of Object.values(chains)) for (const r of list) if (!r.live) dead += r.s.st.end - r.s.st.getFullStart();
  console.log('dead bytes', dead);
}
