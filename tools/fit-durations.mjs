// 幕長自動對齊:讀該包旁白 cues.json 各幕雙聲長度,把 scene.json 每幕 dur 對齊到
// 「最長那條人聲 + buffer」(變長變短都調),連帶調末段鏡頭 dur 與 finale 時點。
// 這是「更新語音後自動調幕長」的核心(編輯器 regen 會呼叫它),也可獨立 CLI 跑。
//
// 用法(repo 根): node tools/fit-durations.mjs --pkg packages/<slug>/battlefield.json [--buffer 3.5] [--dry]
//   --dry 只印不寫。沒旁白的幕不動。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const MANIFEST = resolve(process.cwd(), arg('--pkg', 'packages/chibi/battlefield.json'));
const BUFFER = parseFloat(arg('--buffer', '3.5'));
const DRY = process.argv.includes('--dry');
const BASE = dirname(MANIFEST);
const read = p => JSON.parse(readFileSync(p, 'utf8'));

if (!existsSync(MANIFEST)) { console.error('FAIL\nmanifest 不存在: ' + MANIFEST); process.exit(1); }
const BF = read(MANIFEST);
const scenePath = resolve(BASE, BF.data.scene);
const SCENE = read(scenePath);
const AUDIO = read(resolve(BASE, BF.data.audio));
const voices = AUDIO.narration?.voices || [];
const cuesPath = AUDIO.narration?.cues && resolve(BASE, AUDIO.narration.cues);

if (!voices.length || !cuesPath || !existsSync(cuesPath)) {
  console.log('SKIP — 尚無旁白(narration.voices 空或 cues.json 不存在),無幕長可對齊'); process.exit(0);
}
const cues = read(cuesPath);

let changed = 0;
SCENE.acts.forEach((a, i) => {
  const e = cues[String(i + 1)];
  if (!e) return;                                   // 該幕無旁白 → 不動
  const maxd = Math.max(...voices.map(v => e[v]?.dur ?? 0));
  if (!maxd) return;
  const target = Math.round(maxd + BUFFER);
  if (target === a.dur) { console.log(`  act${i + 1} ${a.title}: 旁白 ${maxd.toFixed(1)}s,幕長 ${a.dur}s 已對齊`); return; }
  const delta = target - a.dur;
  const shots = a.shots || [];
  const last = shots[shots.length - 1];
  const oldLast = last ? last.dur : null;
  if (last) last.dur = Math.max(4, Math.round((last.dur || 0) + delta));
  let finMsg = '';
  if ('finale' in a) { const nf = Math.min(target, Math.max(1, Math.round(maxd + 0.5))); if (nf !== a.finale) { finMsg = ` finale ${a.finale}→${nf}`; a.finale = nf; } }
  console.log(`  act${i + 1} ${a.title}: 旁白 ${maxd.toFixed(1)}s  幕長 ${a.dur}→${target}s${last ? ` 末鏡 ${oldLast}→${last.dur}s` : ''}${finMsg}`);
  a.dur = target;
  changed++;
});

if (changed && !DRY) { writeFileSync(scenePath, JSON.stringify(SCENE, null, 2) + '\n'); }
console.log(changed ? `${DRY ? '[dry] ' : ''}${changed} 幕${DRY ? '需' : '已'}調整(buffer ${BUFFER}s)` : '全部幕長已對齊,無需更動');
