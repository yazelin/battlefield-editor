// 本機編輯器 dev server:服務 repo 靜態檔 + 提供編輯 API。
// play.html 偵測到 editor-server(GET / 帶 x-bfe-editor 標頭)才顯示編輯 UI;公開 Pages 維持唯讀觀看版。
// 首頁 / = index.html 戰場列表 gallery(靜態);各戰場在 /play.html?pkg=…。
// 所有編輯寫回 package 的資料檔(唯一源頭),不在前端飄。零依賴(只用 node 內建)。
//
// 用法(在 repo 根執行;旁白重生會跑 edge-tts,本機需可連網/必要時停 sandbox):
//   node tools/editor-server.mjs            # 預設 http://localhost:8090
//   PORT=9000 BFE_PY=/tmp/ttsenv/bin/python3 node tools/editor-server.mjs
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, extname, normalize } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.PORT || '8090', 10);
const PY = process.env.BFE_PY || '/tmp/ttsenv/bin/python3';
const STASH = process.env.BFE_AUDIO_STASH || '/home/ct/red-cliffs-3d/audio-work/candidates';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const okSlug = s => typeof s === 'string' && /^[a-z][a-z0-9_-]*$/.test(s) && existsSync(join(ROOT, 'packages', s));
const pkgDir = s => join(ROOT, 'packages', s);
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'x-bfe-editor': '1' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });
const run = (cmd, args) => { try { return { ok: true, out: execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || e.message || '') }; } };

function materialize(t) {                          // music-library track → 本地檔路徑(local→stash→fetch 由 assign 工具處理;這裡只 local/stash)
  if (t.local && existsSync(resolve(ROOT, t.local))) return resolve(ROOT, t.local);
  if (t.stash && existsSync(join(STASH, t.stash))) return join(STASH, t.stash);
  return null;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  // ── API ──
  if (p === '/api/ping') return send(res, 200, { editor: true, root: ROOT });
  if (p.startsWith('/api/') && req.method === 'POST') {
    const b = await body(req);
    if (!okSlug(b.pkg)) return send(res, 400, { ok: false, err: `bad pkg: ${b.pkg}` });
    const dir = pkgDir(b.pkg), manifest = join(dir, 'battlefield.json');
    const BF = JSON.parse(readFileSync(manifest, 'utf8'));

    if (p === '/api/save-script') {                 // 寫回旁白稿
      writeFileSync(join(dir, 'narration', 'script.json'), JSON.stringify(b.script, null, 1) + '\n');
      return send(res, 200, { ok: true });
    }
    if (p === '/api/save-subs') {                    // 破音字替換表 → narration/subs.json(generate.py 會 merge)
      mkdirSync(join(dir, 'narration'), { recursive: true });
      writeFileSync(join(dir, 'narration', 'subs.json'), JSON.stringify(b.subs || {}, null, 1) + '\n');
      return send(res, 200, { ok: true });
    }
    if (p === '/api/regen-narration') {              // edge-tts 重生 + 自動對齊幕長
      const args = [join(dir, 'narration', 'generate.py'), ...(b.scenes || []).map(String)];
      const g = run(PY, args);
      const fit = run(process.execPath, [join(ROOT, 'tools', 'fit-durations.mjs'), '--pkg', `packages/${b.pkg}/battlefield.json`]);
      return send(res, g.ok ? 200 : 500, { ok: g.ok, log: g.out + '\n---fit---\n' + fit.out });
    }
    if (p === '/api/set-act-music') {                // 單幕換配樂
      const lib = JSON.parse(readFileSync(join(ROOT, 'tools', 'music-library.json'), 'utf8'));
      const t = lib.tracks.find(x => x.id === b.id);
      if (!t) return send(res, 400, { ok: false, err: `unknown track ${b.id}` });
      const src = materialize(t);
      if (!src) return send(res, 400, { ok: false, err: `track ${b.id} 無本地來源(用 assign-music 先下載 preview)` });
      const rel = `assets/music/scene${b.act + 1}.mp3`;
      mkdirSync(join(dir, 'assets', 'music'), { recursive: true });
      copyFileSync(src, join(dir, rel));
      const A = JSON.parse(readFileSync(join(dir, BF.data.audio), 'utf8'));
      A.music = A.music || { scenes: [], theme: '' };
      while (A.music.scenes.length <= b.act) A.music.scenes.push('');
      A.music.scenes[b.act] = rel;
      writeFileSync(join(dir, BF.data.audio), JSON.stringify(A, null, 2) + '\n');
      return send(res, 200, { ok: true });
    }
    if (p === '/api/save-layer') {                   // 通用:寫回某層 JSON(座標/文字編輯用)
      const layer = b.layer, allow = Object.values(BF.data);
      if (!allow.includes(layer)) return send(res, 400, { ok: false, err: `bad layer ${layer}` });
      writeFileSync(join(dir, layer), JSON.stringify(b.data, null, 2) + '\n');
      return send(res, 200, { ok: true });
    }
    if (p === '/api/gates') {                         // 跑驗收回報
      const v = run(process.execPath, [join(ROOT, 'tools', 'validate-data.mjs'), '--pkg', `packages/${b.pkg}/battlefield.json`]);
      const a = run(process.execPath, [join(ROOT, 'tools', 'audio-check.mjs'), '--pkg', `packages/${b.pkg}/battlefield.json`]);
      return send(res, 200, { ok: v.ok && a.ok, validate: v.out.trim(), audio: a.out.trim() });
    }
    return send(res, 404, { ok: false, err: 'unknown api' });
  }

  // ── static ──
  let fp = normalize(join(ROOT, decodeURIComponent(p === '/' ? '/index.html' : p)));
  if (!fp.startsWith(ROOT) || !existsSync(fp)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[extname(fp)] || 'application/octet-stream', 'x-bfe-editor': '1' });
  res.end(readFileSync(fp));
});
server.listen(PORT, () => console.log(`戰場編輯器 dev server: http://localhost:${PORT}/  (編輯模式;Ctrl+C 結束)\n  例:http://localhost:${PORT}/?pkg=packages/feishui/battlefield.json`));
