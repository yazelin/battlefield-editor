// 戰場資料包驗證器(零依賴)
// 用法: node tools/validate-data.mjs                          # 驗預設赤壁(data/battlefield.json)
//       node tools/validate-data.mjs --pkg battlefields/guandu/battlefield.json   # 驗任意資料包
// 路徑解析比照引擎 PKG_BASE:manifest.data 內的子層路徑相對於 manifest 所在目錄。
// 除了結構合法性,也做跨檔交叉引用(scene 引用的 unit/structure/faction 必須存在),
// 當作 AI/人編輯資料包的安全網——引擎吃到壞引用會在執行期 throw,這裡要先攔下。
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ai = process.argv.indexOf('--pkg');
const MANIFEST = ai >= 0 ? resolve(process.cwd(), process.argv[ai + 1]) : resolve(ROOT, 'packages/chibi/battlefield.json');
const BASE = dirname(MANIFEST);
const readAbs = p => JSON.parse(readFileSync(p, 'utf8'));
const layer = name => resolve(BASE, name);   // manifest 相對

const ENVS = ['day', 'cold', 'dusk', 'night', 'inferno', 'dawn'];   // 引擎 ENV preset
const SHOT_KINDS = ['line', 'orbit', 'follow'];
let errs = [];
if (!existsSync(MANIFEST)) { console.error('FAIL\nmanifest 不存在: ' + MANIFEST); process.exit(1); }

const BF = readAbs(MANIFEST);
for (const f of ['name', 'era', 'data']) if (!(f in BF)) errs.push(`battlefield 缺 ${f}`);
if (BF.meta && !(BF.meta.finale && BF.meta.finale.title)) errs.push('battlefield.meta.finale.title 缺');
for (const [k, p] of Object.entries(BF.data || {})) {
  if (typeof p !== 'string') { errs.push(`battlefield.data.${k} 非路徑字串`); continue; }
  if (!existsSync(layer(p))) errs.push(`battlefield.data.${k} 路徑不存在: ${p}`);
}

// ── factions(陣營白名單由此推導,不再寫死)──
const FAC = readAbs(layer(BF.data.factions));
const FACS = Object.keys(FAC);
for (const [k, v] of Object.entries(FAC)) {
  for (const f of ['name', 'flag', 'css', 'col', 'dark']) if (!(f in v)) errs.push(`factions.${k} 缺 ${f}`);
  for (const f of ['col', 'dark', 'light']) if (v[f] && !/^#[0-9a-fA-F]{6}$/.test(v[f])) errs.push(`factions.${k}.${f} 非 #RRGGBB`);
}

// ── structures ──
const S = readAbs(layer(BF.data.structures)).structures;
const TYPES = ['city', 'camp', 'pass', 'marker', 'ferry'], STRUCT_IDS = new Set();
S.forEach((s, i) => {
  if (!TYPES.includes(s.type)) errs.push(`structures[${i}] type 非法: ${s.type}`);
  if (typeof s.x !== 'number') errs.push(`structures[${i}] x 非數字`);
  if (!(s.type === 'marker' && s.followRiver) && typeof s.z !== 'number') errs.push(`structures[${i}] z 非數字`);
  if (s.type === 'camp' && !FACS.includes(s.faction)) errs.push(`structures[${i}] camp faction 非法: ${s.faction}`);
  if (s.id) { if (STRUCT_IDS.has(s.id)) errs.push(`重複 id: ${s.id}`); STRUCT_IDS.add(s.id); }
});

// ── terrain ──
const T = readAbs(layer(BF.data.terrain));
if (!Array.isArray(T.rivers) || !T.rivers.length) errs.push('terrain 缺 rivers');
for (const [i, r] of (T.rivers || []).entries()) {
  if (!Array.isArray(r.centerline) || r.centerline.length < 2) errs.push(`river[${i}] centerline 不足`);
  for (const f of ['halfWidth', 'depth']) if (typeof r[f] !== 'number') errs.push(`river[${i}] ${f} 非數`);
}
const xy2 = a => Array.isArray(a) && a.length === 2 && a.every(n => typeof n === 'number');
for (const [i, b] of (T.bumps || []).entries()) {
  if (!xy2(b.center)) errs.push(`bump[${i}] center`);
  if (!xy2(b.radius) && !xy2(b.k)) errs.push(`bump[${i}] 需 radius 或 k`);
  if (typeof b.height !== 'number') errs.push(`bump[${i}] height`);
}
for (const [i, rg] of (T.regions || []).entries()) {
  if (!xy2(rg.center)) errs.push(`region[${i}] center`);
  if (!xy2(rg.radius) && !xy2(rg.k)) errs.push(`region[${i}] 需 radius 或 k`);
}
for (const [i, s] of (T.colorRamp || []).entries()) if (!/^#[0-9a-fA-F]{6}$/.test(s.color || '')) errs.push(`colorRamp[${i}] color`);

// ── units(陣營對照動態白名單;先建 id 集合供 scene 交叉檢查)──
const UNIT_KINDS = ['army', 'fleet'], UNIT_IDS = new Set();
let unitCount = 0;
const UNITS = readAbs(layer(BF.data.units)).units;
if (!Array.isArray(UNITS) || !UNITS.length) errs.push('units.units 非非空陣列');
else UNITS.forEach((u, i) => {
  unitCount++;
  for (const f of ['id', 'kind', 'faction', 'n']) if (!(f in u)) errs.push(`units[${i}] 缺 ${f}`);
  if (!UNIT_KINDS.includes(u.kind)) errs.push(`units[${i}] kind 非法: ${u.kind}`);
  if (!FACS.includes(u.faction)) errs.push(`units[${i}] faction 非法: ${u.faction}`);
  if (typeof u.n !== 'number') errs.push(`units[${i}] n 非數字`);
  if (u.id) { if (UNIT_IDS.has(u.id)) errs.push(`重複 unit id: ${u.id}`); UNIT_IDS.add(u.id); }
});

// ── scene(逐幕 + 跨檔交叉引用)──
const FX_TYPES = ['volley', 'ignite', 'shake', 'campFire'];
const SET_RESERVED = ['chains', 'wind'];
const isUnit = id => UNIT_IDS.has(id), isStruct = id => STRUCT_IDS.has(id);
const SCENE = readAbs(layer(BF.data.scene));
const acts = SCENE.acts;
if (!Array.isArray(acts) || !acts.length) errs.push('scene.acts 非非空陣列');
else acts.forEach((a, i) => {
  const at = `scene.acts[${i}]`;
  for (const f of ['key', 'title', 'dur', 'env']) if (!(f in a)) errs.push(`${at} 缺 ${f}`);
  if (a.env && !ENVS.includes(a.env)) errs.push(`${at} env 非法(引擎無此 preset): ${a.env}`);
  // 鏡頭:director 每幀讀 shots,缺/空會在自動播映時 throw
  if (!Array.isArray(a.shots) || !a.shots.length) errs.push(`${at} 缺 shots(非空陣列)`);
  else a.shots.forEach((sh, j) => { if (sh.kind && !SHOT_KINDS.includes(sh.kind)) errs.push(`${at}.shots[${j}] kind 非法: ${sh.kind}`); });
  // 戰力:key 必須是陣營,否則面板靜默跳過
  for (const fk of Object.keys(a.power || {})) if (!FACS.includes(fk)) errs.push(`${at}.power 含非陣營 key: ${fk}`);
  // 行軍:fac 未知 → addMarch throw
  (a.march || []).forEach((m, j) => { if (!FACS.includes(m.fac)) errs.push(`${at}.march[${j}] fac 非陣營: ${m.fac}`); });
  // combat:必須是單位 id
  (a.combat || []).forEach((id, j) => { if (!isUnit(id)) errs.push(`${at}.combat[${j}] 非單位 id: ${id}`); });
  // set / scrubSet:key 須為保留字、單位 id 或結構 id
  for (const setKey of ['set', 'scrubSet']) {
    for (const id of Object.keys(a[setKey] || {})) {
      if (!SET_RESERVED.includes(id) && !isUnit(id) && !isStruct(id))
        errs.push(`${at}.${setKey} 未知 key(非單位/結構/保留字): ${id}`);
    }
  }
  // fx:ignite 的 unit、campFire 的 camp 必須存在
  (a.fx || []).forEach((e, j) => {
    if (typeof e.at !== 'number') errs.push(`${at}.fx[${j}] at 非數`);
    if (!FX_TYPES.includes(e.type)) errs.push(`${at}.fx[${j}] type 非法: ${e.type}`);
    if (e.type === 'ignite' && !isUnit(e.unit)) errs.push(`${at}.fx[${j}] ignite unit 不存在: ${e.unit}`);
    if (e.type === 'campFire' && !isStruct(e.camp)) errs.push(`${at}.fx[${j}] campFire camp 不存在: ${e.camp}`);
  });
});

// ── audio(允許精簡:空 scenes/cues 合法)──
const AUDIO_CUE_TYPES = ['synth', 'sfx', 'sword', 'burst'];
let audioCueCount = 0;
const AUDIO = readAbs(layer(BF.data.audio));
const scenes = AUDIO.music?.scenes;
if (!Array.isArray(scenes)) errs.push('audio.music.scenes 非陣列');
else scenes.forEach((p, i) => {
  if (typeof p !== 'string') { errs.push(`audio.music.scenes[${i}] 非路徑字串`); return; }
  if (p && !existsSync(layer(p)) && !existsSync(resolve(ROOT, p))) errs.push(`audio.music.scenes[${i}] 路徑不存在: ${p}`);
});
for (const [scene, list] of Object.entries(AUDIO.cues || {})) {
  (list || []).forEach((e, j) => {
    audioCueCount++;
    if (typeof e.at !== 'number') errs.push(`audio.cues[${scene}][${j}] at 非數`);
    if (!AUDIO_CUE_TYPES.includes(e.type)) errs.push(`audio.cues[${scene}][${j}] type 非法: ${e.type}`);
  });
}

if (errs.length) { console.error('FAIL\n' + errs.join('\n')); process.exit(1); }
console.log(`PASS [${BF.name}] — factions ${FACS.length}、structures ${S.length}、terrain ${T.rivers.length}河、scene ${acts.length}幕、audio ${audioCueCount}cue、units ${unitCount}`);
