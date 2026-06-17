// 音效指派:從音效庫(tools/sfx-library.json)挑要用的音效,materialize 進該 package 的
// assets/sfx/、寫好 audio.json 的 sfx.files、更新 CREDITS.md 音效出處。
// 來源解析同 assign-music:repo local → 本機海選 stash → preview URL 下載。
// 注意:package 的 audio.cues 用 `name` 引用音效,name 必須等於這裡指派的 id。
//
// 用法(在 repo 根執行;若需下載 preview,該次 Bash 要 dangerouslyDisableSandbox):
//   node tools/assign-sfx.mjs --list
//   node tools/assign-sfx.mjs <slug> <id1> <id2> ...   # 例: battlecry sword1 sword2 sword3 sword4
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STASH = process.env.BFE_AUDIO_STASH || '/home/ct/red-cliffs-3d/audio-work/candidates';
const LIB = JSON.parse(readFileSync(resolve(ROOT, 'tools/sfx-library.json'), 'utf8'));
const byId = Object.fromEntries(LIB.tracks.map(t => [t.id, t]));

const argv = process.argv.slice(2);
function printLib() {
  console.log(`音效庫(${LIB.tracks.length} 個 CC0;[repo]=已在庫內、[池]=目錄項用時取得):`);
  let cat = '';
  for (const t of LIB.tracks) {
    if (t.category !== cat) { cat = t.category; console.log(`\n[${cat}] ${t.mood}`); }
    console.log(`  ${(t.id).padEnd(20)} fit ${String(t.fit ?? '-').padStart(2)}  ${t.local ? '[repo]' : '[池] '}  ${t.credit.author}`);
  }
}
if (argv.includes('--list') || !argv.length) { printLib(); process.exit(0); }

const slug = argv[0];
const ids = argv.slice(1);
const dir = resolve(ROOT, 'packages', slug);
const manifest = join(dir, 'battlefield.json');
if (!existsSync(manifest)) { console.error(`FAIL: packages/${slug}/battlefield.json 不存在`); process.exit(1); }
const bad = ids.filter(id => !byId[id]);
if (bad.length) { console.error(`FAIL: 未知 sfx id: ${bad.join(', ')}(node tools/assign-sfx.mjs --list 看可選)`); process.exit(1); }
if (!ids.length) { console.error('FAIL: 至少給一個 sfx id'); process.exit(1); }

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
  throw new Error(`sfx ${t.id} 無可用來源`);
}

const sdir = join(dir, 'assets', 'sfx');
mkdirSync(sdir, { recursive: true });
for (const id of ids) copyFileSync(await materialize(byId[id]), join(sdir, `${id}.mp3`));

const BF = JSON.parse(readFileSync(manifest, 'utf8'));
const audioPath = join(dir, BF.data.audio);
const AUDIO = JSON.parse(readFileSync(audioPath, 'utf8'));
AUDIO.sfx = { dir: 'assets/sfx', files: ids };
writeFileSync(audioPath, JSON.stringify(AUDIO, null, 2) + '\n');

const rows = ids.map(id => { const t = byId[id]; return `| 音效 ${id} | [${t.credit.title}](${t.credit.url}) | ${t.credit.author} | ${t.credit.license} |`; }).join('\n');
const block = `<!-- sfx-credits:start -->
## 音效(CC0,經 tools/assign-sfx.mjs 自音效庫指派)

| 用途 | 原始素材 | 作者 | 授權 |
|---|---|---|---|
${rows}
<!-- sfx-credits:end -->`;
const creditsPath = join(dir, 'assets', 'CREDITS.md');
let credits = existsSync(creditsPath) ? readFileSync(creditsPath, 'utf8') : `# 音訊素材來源\n\n旁白由 edge-tts 生成(授權灰色,可換)。\n\n`;
credits = /<!-- sfx-credits:start -->[\s\S]*<!-- sfx-credits:end -->/.test(credits)
  ? credits.replace(/<!-- sfx-credits:start -->[\s\S]*<!-- sfx-credits:end -->/, block)
  : credits.trimEnd() + '\n\n' + block + '\n';
mkdirSync(dirname(creditsPath), { recursive: true });
writeFileSync(creditsPath, credits);

console.log(`OK ${slug}: 指派 ${ids.length} 個音效 → sfx.files=[${ids.join(', ')}]`);
console.log(`  提醒:audio.cues 的 {type:"sfx",name:"…"} 要用上列 id;接著跑 audio-check / validate-data。`);
