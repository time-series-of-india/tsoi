// Build a single self-contained HTML file of a read, with working interactives,
// that opens from file:// — for sharing a draft privately (email, WhatsApp)
// without publishing or network access.
//
//   node scripts/build-standalone-read.mjs <slug>        # e.g. upi-architecture
//   → standalone/<slug>.html
//
// How: serve dist/ locally, load the page once in headless Chromium and record
// which JSON/geojson it actually fetches. Then rewrite the page HTML:
//   - stylesheets inlined (fonts rewritten to data: URIs)
//   - the page's external module script bundled to one inline ES module (esbuild)
//   - a fetch() shim prepended, serving the recorded JSON from memory
// Run AFTER a normal build (dist/ must exist and be current).
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(SITE, 'dist');
const slug = process.argv[2];
if (!slug) { console.error('usage: node scripts/build-standalone-read.mjs <slug>'); process.exit(1); }
const pagePath = resolve(DIST, 'economy/read', slug, 'index.html');
if (!existsSync(pagePath)) { console.error(`no built page at ${pagePath} — run the build first`); process.exit(1); }

// --- 1. serve dist/ and record the page's data fetches -------------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = resolve(DIST, '.' + path);
  if (!extname(file)) file = resolve(file, 'index.html');
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
const dataUrls = new Set();
page.on('response', (r) => {
  const u = new URL(r.url());
  if (u.port === String(port) && (u.pathname.endsWith('.json') || u.pathname.endsWith('.geojson')))
    dataUrls.add(u.pathname);
});
await page.goto(`http://127.0.0.1:${port}/economy/read/${slug}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await browser.close();
server.close();
if (!dataUrls.size) console.warn('warning: the page fetched no JSON — shim will be empty');

// --- 2. rewrite the HTML --------------------------------------------------------
let html = readFileSync(pagePath, 'utf8');

// font preloads point at /fonts/, which does not exist on file:// — drop them
// (the fonts ride inside the inlined CSS as data: URIs)
html = html.replace(/<link rel="preload"[^>]*\/fonts\/[^>]*>/g, '');

// stylesheets → inline <style>, with font files as data: URIs
html = html.replace(/<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)"[^>]*>/g, (_, href) => {
  let css = readFileSync(resolve(DIST, '.' + href), 'utf8');
  css = css.replace(/url\((\/fonts\/[^)]+\.woff2)\)/g, (m, f) => {
    const file = resolve(DIST, '.' + f);
    return existsSync(file) ? `url(data:font/woff2;base64,${readFileSync(file).toString('base64')})` : m;
  });
  return `<style>${css}</style>`;
});

// external module scripts → bundled, inlined. Both output knobs are load-bearing:
// format 'iife' breaks echarts' classes (sloppy-mode rewrap of vite's strict
// chunks) and minify re-minifies vite's output into a duplicate `$` binding —
// esm + no minify is the combination that runs from file://.
const srcs = [...html.matchAll(/<script type="module" src="(\/_astro\/[^"]+\.js)"><\/script>/g)].map((m) => m[1]);
for (const src of srcs) {
  const out = await build({
    entryPoints: [resolve(DIST, '.' + src)],
    bundle: true, format: 'esm', minify: false, write: false,
    logLevel: 'silent',
  });
  const js = out.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
  html = html.replace(`<script type="module" src="${src}"></script>`, `<script type="module">${js}</script>`);
}
// (self-contained inline module scripts are left as they are)

// fetch shim: recorded JSON served from memory; everything else falls through
const payload = {};
for (const p of dataUrls) payload[p] = JSON.parse(readFileSync(resolve(DIST, '.' + p), 'utf8'));
const shim = `<script>(function(){var D=${JSON.stringify(payload).replace(/<\/script>/gi, '<\\/script>')};var f=window.fetch&&window.fetch.bind(window);window.fetch=function(u,o){var p;try{p=new URL(u,location.href).pathname}catch(e){p=String(u)}if(D[p])return Promise.resolve(new Response(JSON.stringify(D[p]),{status:200,headers:{'content-type':'application/json'}}));if(typeof u==='string'&&D[u])return Promise.resolve(new Response(JSON.stringify(D[u]),{status:200,headers:{'content-type':'application/json'}}));return f?f(u,o):Promise.reject(new Error('offline'))};})();</script>`;
html = html.replace('</head>', shim + '\n<!-- standalone draft build: not for publication -->\n</head>');

const outDir = resolve(SITE, 'standalone');
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, `${slug}.html`);
writeFileSync(outFile, html);
console.log(`standalone/${slug}.html — ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB, ${dataUrls.size} datasets inlined, ${srcs.length} scripts bundled`);
