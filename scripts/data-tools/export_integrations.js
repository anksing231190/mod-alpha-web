#!/usr/bin/env node
/* Writes docs/22_integration_backlog.md from web/src/features/admin/settings/integrations-catalogue.js (single source of truth). */
const fs=require('fs'),path=require('path');global.window={};
require(path.join(__dirname,'..','..','apps','web','src','features','admin','settings','integrations-catalogue.js'));
const C=window.V22_INTEGRATION_CATEGORIES,I=window.V22_INTEGRATIONS;
const cnt=f=>I.filter(f).length,esc=s=>String(s||'').replace(/\|/g,'\\|');
let md=`# 22 — Live integration & API backlog

**Generated from** \`web/src/features/admin/settings/integrations-catalogue.js\` (run \`node scripts/data-tools/export_integrations.js\`). The same list appears in **Admin → System Settings → Integration readiness**, where you can filter it, search it and export it as CSV.

The list comes from auditing every screen, button and data flow. Since v23 the backend API implements most of it; items marked *Mock* run on stand-in providers on stage and switch to the real vendor through environment variables.

## Summary

| | Count |
|---|---|
| Total integrations | ${I.length} |
| P0 — launch-blocking | ${cnt(x=>x.p==='P0')} |
| P1 — needed for launch quality | ${cnt(x=>x.p==='P1')} |
| P2 — post-launch | ${cnt(x=>x.p==='P2')} |
| Pending (not built yet) | ${cnt(x=>x.status==='Pending')} |
| Mock — API built, provider mocked (integrated later) | ${cnt(x=>x.status==='Mock')} |
| Manual (interim manual process) | ${cnt(x=>x.status==='Manual')} |
| Ready | ${cnt(x=>x.status==='Ready')} |

**Status key:** *Ready* — implemented in the API and website · *Mock* — API and UI implemented, the external provider is mocked and will be integrated later (see docs/23) · *Manual* — an interim manual process is in place · *Pending* — not built yet.
**Priority key:** *P0* launch-blocking · *P1* needed for a quality launch · *P2* post-launch.

`;
for(const[c,name] of C){const L=I.filter(x=>x.cat===c);if(!L.length)continue;
 md+=`## ${name} (${L.length})\n\n| ID | Integration | Priority | Status | Where in the UI | API / contract | Provider options | Notes |\n|---|---|---|---|---|---|---|---|\n`;
 for(const x of L)md+=`| ${x.id} | ${esc(x.name)} | ${x.p} | ${x.status==='Mock'?'Mock (integrated later)':x.status} | ${esc(x.ui)} | \`${esc(x.api)}\` | ${esc(x.opts)} | ${esc(x.note)} |\n`;
 md+='\n';}
md+=`## Still to integrate or build

${I.filter(x=>x.status!=='Ready').map(x=>`- **${x.ui}** → ${x.id} ${x.name}`).join('\n')}
`;
fs.writeFileSync(path.join(__dirname,'..','..','docs','22_integration_backlog.md'),md);console.log('wrote docs/22_integration_backlog.md',I.length,'items');
