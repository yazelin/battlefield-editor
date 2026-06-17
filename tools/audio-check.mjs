// 音訊 gate(零依賴):驗 validate-data 故意不碰的 audio 正確性 ——
//   1) 旁白音長 ≤ 幕長(否則旁白被切;這是 validate-data/render-check 都抓不到的真破口)
//   2) 已宣告的音訊素材路徑都解析得到(music.scenes / theme / sfx / 各聲線旁白 mp3 / cues.json)
//   3) music.scenes 長度 = 幕數;narration 宣告了 voices 就該每幕有 cues
// 設計成「尚未編音訊時自動放行」:空 music.scenes / 空 voices 視為早期狀態(WARN 不 FAIL),
// 一旦開始填,就嚴格檢查 —— 讓 fresh scaffold 仍綠燈起步,但補了旁白/配樂後會被據實把關。
//
// 用法(在 repo 根執行;--pkg 相對當前目錄解析):
//       node tools/audio-check.mjs --pkg packages/<slug>/battlefield.json
// FAIL 退出碼 1;PASS(可含 WARN)退出碼 0。
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ai = process.argv.indexOf('--pkg');
const MANIFEST = ai >= 0 ? resolve(process.cwd(), process.argv[ai + 1]) : resolve(ROOT, 'packages/chibi/battlefield.json');
const BASE = dirname(MANIFEST);
const slug = basename(BASE);
const read = p => JSON.parse(readFileSync(p, 'utf8'));
// 素材路徑一律 manifest 相對(比照引擎 assetUrl = PKG_BASE + p)。寫成 root-relative
// (packages/<slug>/assets/…)會在此 resolve 成 double-prefix 而判定不存在 → 乾淨退件,
// 不再讀檔 throw ENOENT;這正是引擎執行期會壞的同一條路徑。
const hasAsset = p => !!p && existsSync(resolve(BASE, p));
const sha = p => createHash('sha1').update(readFileSync(p)).digest('hex');
const STASH = process.env.BFE_AUDIO_STASH || '/home/ct/red-cliffs-3d/audio-work/candidates';
const trackFile = t => {                       // 音樂庫曲目的本地實檔:repo local → 海選 stash
  if (t.local && existsSync(resolve(ROOT, t.local))) return resolve(ROOT, t.local);
  if (t.stash && existsSync(resolve(STASH, t.stash))) return resolve(STASH, t.stash);
  return null;
};
let LIB = null, libHashes = null;
const lib = () => {
  if (!LIB) {
    const lp = resolve(ROOT, 'tools/music-library.json');
    LIB = existsSync(lp) ? read(lp) : { tracks: [] };
    libHashes = new Set(LIB.tracks.map(trackFile).filter(Boolean).map(sha));
  }
  return LIB;
};

if (!existsSync(MANIFEST)) { console.error('FAIL\nmanifest 不存在: ' + MANIFEST); process.exit(1); }
const BF = read(MANIFEST);
const A = read(resolve(BASE, BF.data.audio));
const acts = read(resolve(BASE, BF.data.scene)).acts || [];

const errs = [], warns = [];
let assetN = 0, fitN = 0;
const checkAsset = (p, label) => { assetN++; if (!hasAsset(p)) errs.push(`${label} 路徑不存在: ${p}`); };

// 1) 配樂(軟性把關:空 → 列音樂庫可選曲;有設 → 驗解析得到 + 出自音樂庫)
const scenes = A.music?.scenes ?? [];
if (!scenes.length) {
  const picks = lib().tracks.filter(t => t.local).map(t => t.id);
  warns.push(`music.scenes 留空(尚未配樂)。tools/assign-music.mjs 可挑(庫內 ${LIB.tracks.length} 首);in-repo 即用:${picks.join('/')}(全部見 --list)`);
} else {
  if (scenes.length !== acts.length) errs.push(`music.scenes 長度 ${scenes.length} ≠ 幕數 ${acts.length}`);
  lib();
  scenes.forEach((p, i) => {
    checkAsset(p, `music.scenes[${i}]`);
    const fp = resolve(BASE, p);
    if (existsSync(fp) && libHashes.size && !libHashes.has(sha(fp)))
      warns.push(`music.scenes[${i}] 非音樂庫曲目(自訂曲?記得在 CREDITS 補 CC0/授權出處): ${p}`);
  });
}
if (A.music?.theme) checkAsset(A.music.theme, 'music.theme');

// 2) 音效素材
const sfx = A.sfx;
if (sfx?.files?.length) sfx.files.forEach(f => checkAsset(`${sfx.dir}/${f}.mp3`, `sfx ${f}`));

// 3) 旁白:素材解析 + 音長 ≤ 幕長
const nar = A.narration;
if (!nar?.voices?.length) warns.push('narration.voices 留空(尚未配旁白)');
else {
  for (const v of nar.voices)
    for (let n = 1; n <= acts.length; n++)
      checkAsset((nar.pathPattern || '').replace('{voice}', v).replace('{n}', n), `旁白 ${v} scene${n}`);
  if (!nar.cues) errs.push('narration.voices 已宣告,但 narration.cues 未指向 cues.json');
  else if (!hasAsset(nar.cues)) errs.push(`narration.cues 路徑不存在: ${nar.cues}`);
  else {
    const cues = read(resolve(BASE, nar.cues));
    acts.forEach((a, i) => {
      const e = cues[String(i + 1)];   // cues.json 鍵為 1-based 幕序
      if (!e) { errs.push(`act${i + 1} ${a.title}: 旁白 cue 缺(voices 已宣告卻無 cues[${i + 1}])`); return; }
      const mx = Math.max(...nar.voices.map(v => e[v]?.dur ?? 0));
      fitN++;
      if (mx > a.dur) errs.push(`act${i + 1} ${a.title}: 旁白 ${mx.toFixed(1)}s > 幕長 ${a.dur}s —— 會被切`);
      else if (mx + 1.0 > a.dur) warns.push(`act${i + 1} ${a.title}: 緩衝僅 ${(a.dur - mx).toFixed(1)}s(<1s 偏緊,建議 ≥ 旁白 +3.5s)`);
    });
  }
}

for (const w of warns) console.log(`  WARN  ${w}`);
if (errs.length) { console.error(`FAIL [${slug}] — ${errs.length} 項音訊問題:`); for (const e of errs) console.error(`  ${e}`); process.exit(1); }
console.log(`PASS [${slug}] — 音訊 ${assetN} 素材全解析、旁白 ${fitN}/${acts.length} 幕音長 ≤ 幕長`);
