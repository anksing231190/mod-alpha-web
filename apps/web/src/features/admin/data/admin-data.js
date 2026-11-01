/* ==========================================================================
   Feature: admin — data management (#/admin/data)
   Upload a workbook (drag & drop), see the validation report, publish or discard,
   export the live dataset, sheet rules.
   ========================================================================== */

/** Sheet rules table. */
function v22SchemaTable(s){const sch=V22_SCHEMA[s];return `<div class="table-scroll"><table class="v22-table v22-schema-table"><thead><tr><th>Column</th><th>Type</th><th>Required</th><th>Rules / allowed values</th></tr></thead><tbody>${Object.entries(sch.cols).map(([c,d])=>`<tr><td><code>${c}</code></td><td>${{id:'Text (ID)',str:'Text',num:'Number',int:'Whole number',date:'Date',month:'Month',enum:'List',email:'Email'}[d.t]}</td><td>${d.req?'<span class="v22-pill info">Required</span>':'<span class="v22-pill neutral">Optional</span>'}</td><td>${[d.v?d.v.join(' · '):'',d.t==='date'?'YYYY-MM-DD or Excel date':'',d.t==='month'?'YYYY-MM':'',d.gt!==undefined?`> ${d.gt}`:'',d.min!==undefined?`min ${d.min}`:'',d.max!==undefined?`max ${d.max}`:'',d.ref?`must exist in ${d.ref}`:'',d.notFuture?'not in the future':'',d.def?`default ${d.def}`:'',sch.key.length===1&&sch.key[0]===c?'unique':'',(sch.unique||[]).includes(c)?'unique':'',d.ex?`e.g. ${d.ex}`:''].filter(Boolean).join(' · ')}</td></tr>`).join('')}</tbody></table></div><p class="v22-hint">Unique key: <code>${sch.key.join(' + ')}</code></p>`}

/** Data management screen. */
function adminData(){
 const M=V22D.model,meta=V22D.meta||{},hist=V22D.history||[];
 const counts=M?{Funds:M.funds.length,NAV_History:M.navRows,Users:M.users.length,Subscriptions:M.subs.length,SIP_Dates:M.sip.length,Market_Holidays:M.holidays.length}:{};
 return `<div class="v22 v22-adm">${v22Head('Data Management','Upload, validate and publish the test-data workbook that drives every chart, KPI and table.',`<a class="v22-outline-btn" href="${V22_TEMPLATE_URL}" download>${ic('download')} Blank template</a><a class="v22-outline-btn" href="${V22_BUNDLED_URL}" download>${ic('download')} Sample test data</a>${M?`<button type="button" class="v22-outline-btn" data-v22-export-ds>${ic('file')} Export active dataset</button>`:''}`,'ADMIN · DATA')}${adminNotice()}
 ${M?v22Kpis([['db','Active dataset',V22D.source==='uploaded'?'Uploaded':'Bundled',esc(meta.fileName||''),''],['chart','NAV records',M.navRows.toLocaleString('en-IN'),`${M.funds.length} funds · till ${v22Fmt(M.funds.map(f=>f.navDate).sort().at(-1))}`,'pos'],['users','Users',M.users.length.toLocaleString('en-IN'),`${M.subs.length.toLocaleString('en-IN')} subscriptions`,''],['calendar','Dataset as-of',v22Fmt(M.asOf),`${M.sip.length} SIP months`,'']]):`<div class="v22-notice">${cic('warn',22)}<div><b>No dataset loaded.</b><span>${esc(V22D.error||'Loading…')}</span></div></div>`}
 <section class="v22-card"><div class="v22-card-head"><div><h2>Upload test-data workbook</h2><p>Sheets in the file replace the matching sheets of the active dataset; sheets you leave out are kept. The first upload must contain all required sheets.</p></div></div>
 <div class="v22-pipeline" id="v22-pipe">${[['upload','Upload'],['doc','Parse'],['shield','Validate'],['help','Review'],['check','Publish']].map((x,i)=>`<div data-step="${i}">${cic(x[0],28)}<b>${x[1]}</b></div>`).join('<i></i>')}</div>
 <div class="v22-upload-grid"><label class="v22-drop big" for="v22-wb-file">${cic('upload',52)}<b>Drop the .xlsx workbook here</b><small>Excel (.xlsx / .xls), or a single-sheet .csv · max 50MB · or <u>click to browse</u></small><span class="v22-outline-btn">Choose File</span><em id="v22-wb-name">No file selected</em><input type="file" id="v22-wb-file" accept=".xlsx,.xls,.csv" hidden></label>
 <div class="v22-upload-fields"><label class="v22-fl">If uploading a CSV, it contains${v22Sel('v22-csv-as',Object.keys(V22_SCHEMA))}<small>Workbooks are matched by sheet name; this only applies to CSV files.</small></label><div class="v22-callout">${cic('doc',20)} <span>Required sheets: <b>Funds, NAV_History, Users, Subscriptions, SIP_Dates</b>. Optional: Market_Holidays. Format: <code>docs/21_test_data_excel_format.md</code>.</span></div>${V22D.source==='uploaded'?`<button type="button" class="v22-danger-btn" data-v22-reset>${ic('refresh')} Reset to bundled test data</button>`:''}</div></div>
 <div id="v22-report"></div></section>
 <div class="v22-data-two"><section class="v22-card"><div class="v22-card-head"><h2>Workbook format</h2><div class="v22-seg-pills sm wrap" id="v22-schema-tabs">${Object.keys(V22_SCHEMA).map((s,i)=>`<button type="button" class="${i===1?'active':''}" data-v22-schema="${s}">${s.replace('_',' ')}</button>`).join('')}</div></div><div id="v22-schema-body"><p class="v22-sub" style="margin-bottom:10px">${V22_SCHEMA.NAV_History.desc}</p>${v22SchemaTable('NAV_History')}</div></section>
 <section class="v22-card"><div class="v22-card-head"><h2>Active dataset</h2>${M?v22Status(V22D.source==='uploaded'?'Published':'Active'):''}</div>${M?`<div class="v22-kv">${[['File',esc(meta.fileName||'—')],['Loaded',meta.loadedAt?new Date(meta.loadedAt).toLocaleString('en-IN'):'—'],['By',esc(meta.by||'—')],['Sheets replaced',esc((meta.replaced||Object.keys(V22_SCHEMA)).join(', '))]].map(x=>`<div><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div><div class="v22-sheet-counts">${Object.keys(V22_SCHEMA).map(s=>`<div>${cic({Funds:'bars',NAV_History:'chart',Users:'users',Subscriptions:'crown',SIP_Dates:'calendar',Market_Holidays:'clock'}[s]||'doc',24)}<span>${s}</span><b>${(counts[s]||0).toLocaleString('en-IN')}</b></div>`).join('')}</div>`:'<p class="v22-sub">Nothing loaded yet.</p>'}
 <h3 class="v22-set-h" style="margin:20px 0 10px!important;font-size:15px">Upload history</h3>${hist.length?hist.slice().reverse().map(h=>`<div class="v22-batch">${cic('doc',28)}<div><b>${esc(h.fileName)}</b><small>${new Date(h.loadedAt).toLocaleString('en-IN')} · ${esc((h.replaced||[]).join(', '))}</small></div>${v22Status(h.status||'Published')}</div>`).join(''):'<p class="v22-sub">No uploads in this browser yet.</p>'}</section></div></div>`;
}

/** Last validation report and file. */
let v22LastReport=null,v22LastFile=null;

/** Upload progress steps. */
function v22Pipe(n,fail){document.querySelectorAll('#v22-pipe>div').forEach(x=>{const s=+x.dataset.step;x.classList.toggle('done',s<n);x.classList.toggle('fail',!!fail&&s===n)})}

/** Read and validate a dropped / chosen workbook. */
async function v22HandleFile(file){
 const name=document.getElementById('v22-wb-name'),out=document.getElementById('v22-report');if(!file||!out)return;
 if(!/\.(xlsx|xls|csv)$/i.test(file.name)){out.innerHTML=`<div class="v22-rep-fatal">${cic('warn',24)} Unsupported file type. Upload .xlsx, .xls or .csv.</div>`;return}
 if(file.size>50*1024*1024){out.innerHTML=`<div class="v22-rep-fatal">${cic('warn',24)} File exceeds the 50MB limit.</div>`;return}
 name.textContent=`${file.name} · ${(file.size/1024).toFixed(0)} KB`;v22Pipe(1);out.innerHTML=`<div class="v22-loading inline"><span class="v22-spin"></span><b>Parsing ${esc(file.name)}…</b></div>`;
 await new Promise(r=>setTimeout(r,30));
 try{
  const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',dense:true});v22Pipe(2);
  const rep=v22Validate(wb,V22D.sheets,/\.csv$/i.test(file.name)?document.getElementById('v22-csv-as').value:null);v22LastReport=rep;v22LastFile=file.name;v22Pipe(rep.fatal||rep.errors?2:4,rep.fatal||rep.errors);
  out.innerHTML=v22ReportHTML(rep,file.name);
 }catch(e){v22Pipe(1,1);out.innerHTML=`<div class="v22-rep-fatal">${cic('warn',24)} Could not read this file: ${esc(e.message)}</div>`}
}

/** Validation report (per sheet: rows, errors, warnings). */
function v22ReportHTML(rep,file){
 if(rep.fatal&&!Object.keys(rep.sheets).length)return `<div class="v22-rep-fatal">${cic('warn',24)} ${esc(rep.fatal)}</div>`;
 const ok=!rep.fatal&&!rep.errors;
 return `<div class="v22-report ${ok?'ok':'bad'}"><div class="v22-rep-head">${cic(ok?'check':'warn',30)}<div><b>${ok?'Validation passed':'Validation failed'} — ${esc(file)}</b><small>${rep.replaced.length} sheet(s) checked · ${rep.errors} error(s) · ${rep.warnings} warning(s)${rep.ignored.length?` · ignored sheets: ${esc(rep.ignored.join(', '))}`:''}</small></div><div class="v22-rep-actions">${rep.errors||rep.warnings?`<button type="button" class="v22-outline-btn sm" data-v22-errcsv>${ic('download')} Issues CSV</button>`:''}<button type="button" class="v22-outline-btn sm" data-v22-discard>Discard</button><button type="button" class="v22-grad-btn" data-v22-publish ${ok?'':'disabled'}>${ic('check')} Publish dataset</button></div></div>
 ${rep.fatal?`<div class="v22-rep-fatal">${cic('warn',22)} ${esc(rep.fatal)}</div>`:''}
 <div class="v22-rep-sheets">${Object.values(rep.sheets).map(s=>`<details class="v22-rep-sheet" ${s.errors.length?'open':''}><summary>${cic(s.errors.length?'warn':'check',22)}<b>${s.name}</b><span>${(s.total??s.rows.length).toLocaleString('en-IN')} rows · ${s.rows.length.toLocaleString('en-IN')} valid</span>${s.errors.length?`<span class="v22-pill bad">${s.errors.length} errors</span>`:''}${s.warnings.length?`<span class="v22-pill warn">${s.warnings.length} warnings</span>`:''}${!s.errors.length&&!s.warnings.length?'<span class="v22-pill ok">OK</span>':''}</summary>${[...s.errors.map(e=>['bad',e]),...s.warnings.map(e=>['warn',e])].slice(0,25).map(([k,e])=>`<div class="v22-issue ${k}"><span class="mono">Row ${e.row}</span>${e.col?`<code>${e.col}</code>`:''}<span>${esc(e.msg)}</span></div>`).join('')}${s.errors.length+s.warnings.length>25?`<div class="v22-issue more">…${s.errors.length+s.warnings.length-25} more — download the issues CSV.</div>`:''}</details>`).join('')}</div></div>`;
}

/** Publish the validated workbook. */
async function v22Publish(){
 const rep=v22LastReport;if(!rep||rep.fatal||rep.errors)return;
 const sheets=v22Strip(rep.merged),meta={fileName:v22LastFile,loadedAt:new Date().toISOString(),by:'Admin (demo)',replaced:rep.replaced,counts:Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.length]))};
 v22Apply(sheets,meta);V22D.source='uploaded';
 const hist=(await v22Get('history'))||[];hist.push({...meta,status:'Published'});V22D.history=hist.slice(-10);
 await v22Put('dataset',{sheets,meta});await v22Put('history',V22D.history);
 v22LastReport=null;notify('Dataset published. Dashboards, funds and tables now use the uploaded data.');renderAdmin('data');
}

/** Download the validation issues as CSV. */
function v22IssuesCsv(){const rep=v22LastReport;if(!rep)return;const rows=[['sheet','row','column','severity','message']];for(const s of Object.values(rep.sheets)){s.errors.forEach(e=>rows.push([s.name,e.row,e.col||'','error',e.msg]));s.warnings.forEach(e=>rows.push([s.name,e.row,e.col||'','warning',e.msg]))}const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='mod-alpha-validation-issues.csv';a.click()}

/** Download the active dataset as a workbook. */
function v22ExportDataset(){if(!V22D.sheets)return;const wb=XLSX.utils.book_new();for(const s of Object.keys(V22_SCHEMA)){const cols=Object.keys(V22_SCHEMA[s].cols);XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cols,...(V22D.sheets[s]||[]).map(r=>cols.map(c=>r[c]??''))]),s)}XLSX.writeFile(wb,'mod-alpha-active-dataset.xlsx')}

/* ---------- start-up steps (run once by core/boot.js, in this global order) ---------- */

MA_STARTUP(164, "dragover listener: .v22-drop", () => {
document.addEventListener('dragover',e=>{const d=e.target.closest?.('.v22-drop');if(d){e.preventDefault();d.classList.add('over')}});
});

MA_STARTUP(165, "dragleave listener: .v22-drop", () => {
document.addEventListener('dragleave',e=>{e.target.closest?.('.v22-drop')?.classList.remove('over')});
});

MA_STARTUP(166, "drop listener: .v22-drop", () => {
document.addEventListener('drop',e=>{const d=e.target.closest?.('.v22-drop');if(!d)return;e.preventDefault();d.classList.remove('over');const inp=document.getElementById('v22-nav-file');if(e.dataTransfer.files.length){inp.files=e.dataTransfer.files;inp.dispatchEvent(new Event('change',{bubbles:true}))}});
});

MA_STARTUP(226, "dragover listener: .v22-drop.big", () => {
document.addEventListener('dragover',e=>{if(e.target.closest?.('.v22-drop.big')){e.preventDefault()}});
});

MA_STARTUP(227, "drop listener: .v22-drop.big", () => {
document.addEventListener('drop',e=>{const d=e.target.closest?.('.v22-drop.big');if(!d)return;e.preventDefault();const inp=document.getElementById('nav-file');if(e.dataTransfer.files.length){inp.files=e.dataTransfer.files;inp.dispatchEvent(new Event('change',{bubbles:true}))}});
});

MA_STARTUP(300, "change listener", () => {
document.addEventListener('change',e=>{if(e.target.id==='v22-wb-file'&&e.target.files[0])v22HandleFile(e.target.files[0])});
});

MA_STARTUP(301, "dragover listener: label[for=\"v22-wb-file\"]", () => {
document.addEventListener('dragover',e=>{const d=e.target.closest?.('label[for="v22-wb-file"]');if(d){e.preventDefault();d.classList.add('over')}});
});

MA_STARTUP(302, "dragleave listener: label[for=\"v22-wb-file\"]", () => {
document.addEventListener('dragleave',e=>{e.target.closest?.('label[for="v22-wb-file"]')?.classList.remove('over')});
});

MA_STARTUP(303, "drop listener: label[for=\"v22-wb-file\"]", () => {
document.addEventListener('drop',e=>{const d=e.target.closest?.('label[for="v22-wb-file"]');if(!d)return;e.preventDefault();d.classList.remove('over');if(e.dataTransfer.files[0])v22HandleFile(e.dataTransfer.files[0])});
});
