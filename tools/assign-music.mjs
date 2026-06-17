// 每幕背景音樂指派:從音樂庫(tools/music-library.json)依「幕→曲」把 CC0 配樂materialize
// 進該 package、寫好 audio.json 的 music.scenes/theme、更新 CREDITS.md 音樂出處。
// 任一目錄項都可用 —— 來源解析順序:repo 內 local 檔 → 本機海選 stash → preview URL 下載。
// 所以全 74 首池子、以及「之後 append 進 catalog 的新曲」都能直接被 AI 指派,不必先手動下載。
//
// 用法(在 repo 根執行;若需從 preview URL 下載,該次 Bash 要 dangerouslyDisableSandbox):
//   node tools/assign-music.mjs --list                        # 依情緒分類列出音樂庫(fit/出處/是否 in-repo)
//   node tools/assign-music.mjs <slug> <id1> ... <idN>        # N=幕數,依幕序給 track id
//   node tools/assign-music.mjs <slug> <ids...> --theme <id>  # 另指定主題曲(預設=末幕那首)
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STASH = process.env.BFE_AUDIO_STASH || '/home/ct/red-cliffs-3d/audio-work/candidates';
const LIB = JSON.parse(readFileSync(resolve(ROOT, 'tools/music-library.json'), 'utf8'));
const byId = Object.fromEntries(LIB.tracks.map(t => [t.id, t]));

const argv = process.argv.slice(2);
function printLib() {
  console.log(`音樂庫(${LIB.tracks.length} 首 CC0;[repo]=已在庫內、[池]=目錄項用時取得):`);
  let cat = '';
  for (const t of LIB.tracks) {
    if (t.category !== cat) { cat = t.category; console.log(`\n[${cat}] ${t.mood}`); }
    console.log(`  ${(t.id).padEnd(20)} fit ${String(t.fit ?? '-').padStart(2)}  ${t.local ? '[repo]' : '[池] '}  ${t.credit.author}`);
  }
}
if (argv.includes('--list') || !argv.length) { printLib(); process.exit(0); }

let themeId = null;
const ti = argv.indexOf('--theme');
if (ti >= 0) { themeId = argv[ti + 1]; argv.splice(ti, 2); }
const slug = argv[0];
const ids = argv.slice(1);

const dir = resolve(ROOT, 'packages', slug);
const manifest = join(dir, 'battlefield.json');
if (!existsSync(manifest)) { console.error(`FAIL: packages/${slug}/battlefield.json 不存在`); process.exit(1); }
const BF = JSON.parse(readFileSync(manifest, 'utf8'));
const acts = JSON.parse(readFileSync(join(dir, BF.data.scene), 'utf8')).acts || [];
const audioPath = join(dir, BF.data.audio);

const bad = [...ids, ...(themeId ? [themeId] : [])].filter(id => !byId[id]);
if (bad.length) { console.error(`FAIL: 未知 track id: ${bad.join(', ')}(node tools/assign-music.mjs --list 看可選)`); process.exit(1); }
if (ids.length !== acts.length) {
  console.error(`FAIL: 給了 ${ids.length} 首,但 ${slug} 有 ${acts.length} 幕 —— 需一幕一首,依幕序給。`);
  acts.forEach((a, i) => console.error(`  幕${i + 1} ${a.title}`));
  process.exit(1);
}

// materialize:把 track 取成一個本地檔路徑(repo local → 海選 stash → preview 下載)
async function materialize(t) {
  if (t.local && existsSync(resolve(ROOT, t.local))) return resolve(ROOT, t.local);
  if (t.stash && existsSync(join(STASH, t.stash))) return join(STASH, t.stash);
  if (t.preview) {
    const dest = join(STASH, t.stash || `${t.id}.mp3`);
    mkdirSync(dirname(dest), { recursive: true });
    const r = await fetch(t.preview);
    if (!r.ok) throw new Error(`下載失敗 ${t.preview} (${r.status})`);
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    return dest;
  }
  throw new Error(`track ${t.id} 無可用來源(local/stash/preview 皆無)`);
}

const mdir = join(dir, 'assets', 'music');
mkdirSync(mdir, { recursive: true });
const scenes = [];
for (let i = 0; i < ids.length; i++) {
  const src = await materialize(byId[ids[i]]);
  const rel = `assets/music/scene${i + 1}.mp3`;
  copyFileSync(src, join(dir, rel));
  scenes.push(rel);
}
let themeRel = scenes[scenes.length - 1];
if (themeId) {
  const idx = ids.indexOf(themeId);
  if (idx >= 0) themeRel = scenes[idx];
  else { themeRel = 'assets/music/theme.mp3'; copyFileSync(await materialize(byId[themeId]), join(dir, themeRel)); }
}

const AUDIO = JSON.parse(readFileSync(audioPath, 'utf8'));
AUDIO.music = { ...(AUDIO.music || {}), scenes, theme: themeRel };
writeFileSync(audioPath, JSON.stringify(AUDIO, null, 2) + '\n');

// CREDITS.md 音樂區塊(marker 包夾)
const used = [...new Set(ids.concat(themeId && !ids.includes(themeId) ? [themeId] : []))];
const rows = used.map(id => { const t = byId[id]; return `| 幕配樂 ${id} | [${t.credit.title}](${t.credit.url}) | ${t.credit.author} | ${t.credit.license} |`; }).join('\n');
const block = `<!-- music-credits:start -->
## 背景音樂(CC0,經 tools/assign-music.mjs 自音樂庫指派)

| 用途 | 原始素材 | 作者 | 授權 |
|---|---|---|---|
${rows}
<!-- music-credits:end -->`;
const creditsPath = join(dir, 'assets', 'CREDITS.md');
let credits = existsSync(creditsPath) ? readFileSync(creditsPath, 'utf8') : `# 音訊素材來源\n\n旁白由 edge-tts 生成(授權灰色,可換)。其餘程序合成音效無外部素材。\n\n`;
credits = /<!-- music-credits:start -->[\s\S]*<!-- music-credits:end -->/.test(credits)
  ? credits.replace(/<!-- music-credits:start -->[\s\S]*<!-- music-credits:end -->/, block)
  : credits.trimEnd() + '\n\n' + block + '\n';
mkdirSync(dirname(creditsPath), { recursive: true });
writeFileSync(creditsPath, credits);

console.log(`OK ${slug}: 指派 ${ids.length} 幕配樂(theme=${themeRel})`);
ids.forEach((id, i) => console.log(`  幕${i + 1} ${acts[i].title} ← ${id}(${byId[id].mood}${byId[id].local ? '' : ',目錄池'})`));
console.log(`  接著:node tools/audio-check.mjs --pkg packages/${slug}/battlefield.json`);
