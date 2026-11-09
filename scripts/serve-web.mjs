#!/usr/bin/env node
/** Tiny static file server for local testing: node scripts/serve-web.mjs <dir> [port] */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve(process.argv[2] || 'dist/web-local'), port = Number(process.argv[3] || 8081);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`Website: http://localhost:${port}  (serving ${dir})`));
