// 自檢 gate:headless 載入一份 package、逐幕截圖、掃 console error。
// AI loop 用它當客觀關卡;人用產出的截圖 contact sheet 驗空間/時序。
//
// 用法:
//   npm install                                   # 先裝 puppeteer-core(只此工具需要;引擎本身零依賴)
//   node tools/render-check.mjs                    # 檢查預設 packages/chibi
//   node tools/render-check.mjs --pkg packages/guandu/battlefield.json
//   CHROME=/path/to/chrome node tools/render-check.mjs --pkg ...
//
// 截圖輸出:tools/render-out/<package>/act-NN.png(gitignored)
// 任一 console error 或 0 幕 → 退出碼 1。

import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname, basename } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ai = process.argv.indexOf('--pkg');
const PKG = ai >= 0 ? process.argv[ai + 1] : 'packages/chibi/battlefield.json';
const SLUG = basename(dirname(PKG)) || 'pkg';
const OUT = join(ROOT, 'tools', 'render-out', SLUG);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.css': 'text/css', '.ico': 'image/x-icon' };

function chromePath() {
  const cands = [process.env.CHROME, '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'].filter(Boolean);
  for (const c of cands) if (existsSync(c)) return c;
  throw new Error('找不到 Chrome/Chromium;用 CHROME=/path 指定');
}

// ── 靜態伺服器(零依賴)──
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let fp = join(ROOT, url === '/' ? 'index.html' : url);
    if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    const buf = await readFile(fp);
    res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404).end('not found'); }
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!existsSync(join(ROOT, PKG))) { console.error('FAIL: package 不存在:', PKG); process.exit(1); }
  let puppeteer;
  try { puppeteer = (await import('puppeteer-core')).default; }
  catch { console.error('FAIL: 缺 puppeteer-core,先跑 `npm install`'); process.exit(1); }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const base = `http://localhost:${port}`;

  const errs = [], titles = [];
  let browser, meta = {}, ok = false;
  try {
    browser = await puppeteer.launch({ executablePath: chromePath(), headless: 'new',
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist', '--enable-webgl', '--window-size=1280,720'],
      defaultViewport: { width: 1280, height: 720 } });
    const page = await browser.newPage();
    page.on('console', m => m.type() === 'error' && errs.push(m.text()));
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

    await page.goto(`${base}/play.html?pkg=${PKG}`, { waitUntil: 'load', timeout: 45000 });
    await sleep(2500);
    meta = await page.evaluate(() => ({
      title: document.getElementById('brdTitle')?.textContent,
      nodes: document.querySelectorAll('.node').length,
      canvas: !!document.querySelector('canvas'),
    }));
    try { await page.click('#btnAuto'); } catch {}
    await sleep(2000);
    for (let k = 0; k < meta.nodes; k++) {
      await page.evaluate(i => { const n = document.querySelectorAll('.node')[i]; if (n) n.click(); }, k);
      await sleep(k === meta.nodes - 1 ? 3500 : 2800);
      titles.push(await page.evaluate(() => document.getElementById('phTitle')?.textContent));
      await page.screenshot({ path: join(OUT, `act-${String(k + 1).padStart(2, '0')}.png`) });
    }
    ok = meta.nodes > 0 && errs.length === 0 && meta.canvas;
  } finally {
    if (browser) await browser.close().catch(() => {});   // 一定關瀏覽器,避免洩漏 chrome 進程耗盡資源
    server.close();
  }

  console.log(`${ok ? 'PASS' : 'FAIL'} [${meta.title}] — ${meta.nodes} 幕, canvas=${meta.canvas}`);
  console.log('  acts:', JSON.stringify(titles));
  console.log('  screenshots:', OUT.replace(ROOT + '/', ''));
  console.log('  console errors:', errs.length ? '\n   - ' + errs.slice(0, 8).join('\n   - ') : 'none');
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error('FAIL:', e.message); server.close?.(); process.exit(1); });
