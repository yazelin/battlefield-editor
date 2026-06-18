// 殘留掃描 gate:抓「從 chibi(赤壁)複製後忘了改」的漏網字 —— 赤壁專屬的 unit/structure id
// 與地名/典故字串,出現在非赤壁包裡就是 copy-paste 殘留(validator 抓不到字面殘留)。
//
// 用法(在 repo 根執行): node tools/residue-scan.mjs --pkg packages/<slug>/battlefield.json
// 有赤壁殘留 → 列出檔案+字+前後文,退出碼 1;乾淨 → PASS。chibi 本身自動跳過。
// 另對未改的 scaffold placeholder(red/blue/紅方城…)印 WARN(不致命,提醒交付前換掉)。
// 掃描範圍含 narration/(script.json / generate.py),抓藏在旁白檔的複製殘留。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ai = process.argv.indexOf('--pkg');
const MANIFEST = ai >= 0 ? resolve(process.cwd(), process.argv[ai + 1]) : resolve(ROOT, 'packages/chibi/battlefield.json');
const dir = dirname(MANIFEST);
const slug = basename(dir);

// 赤壁(chibi)專屬、高辨識度的殘留字:出現在別包 = 沒改乾淨
const RESIDUE = [
  // 單位 id
  'caoNavy', 'caoRen', 'caoMain', 'sunFleet', 'hgFleet', 'liuArmy', 'liuFleet',
  // 結構 id(只列赤壁專屬;襄陽/江陵/夏口/柴桑等是跨戰役共用大城,不列,否則像水淹七軍會誤判)
  'campWulin', 'campChibi', 'huarongPass',
  // 地名 / 典故字串(只列赤壁專屬;像「長江」「襄陽」這種跨戰役共用的地理不列,會誤判)
  '赤壁', '烏林', '華容', '連環計', '鐵索連環', '八十萬', '東風', '黃蓋', '周瑜',
  // 赤壁專屬頁連結(red-cliffs-3d 才有的頁;複製到別包 = 死連結)
  'classic.html', 'audition.html', '無聲原版', '選曲記錄',
];

if (slug === 'chibi') { console.log('SKIP — chibi(赤壁)本身,殘留字屬合法'); process.exit(0); }

// scaffold placeholder:不算複製殘留(不致命),但交付前該全部改掉 → WARN 提醒。
const PLACEHOLDER = [
  'redBase', 'blueBase', 'redArmy', 'blueArmy', '紅方城', '藍方城', '紅軍本隊', '藍軍本隊',
  '朝代年號', '主將・副將', '一句話描述', '一兩句單位背景', '終局標題', '終局副標',
  '狀態說明', '事件卡(史/演義)', '年號・西元○○○',
];

// 掃 manifest 同目錄的 *.json,外加 narration/ 的 script.json / generate.py(複製殘留常藏這)。
const targets = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) targets.push([f, resolve(dir, f)]);
const ndir = resolve(dir, 'narration');
if (existsSync(ndir)) for (const f of readdirSync(ndir).filter(f => /\.(json|py)$/.test(f))) targets.push([`narration/${f}`, resolve(ndir, f)]);

const hits = [], phits = [];
for (const [f, fp] of targets) {
  readFileSync(fp, 'utf8').split('\n').forEach((ln, i) => {
    for (const tok of RESIDUE) if (ln.includes(tok)) hits.push({ f, line: i + 1, tok, ctx: ln.trim().slice(0, 60) });
    for (const tok of PLACEHOLDER) if (ln.includes(tok)) phits.push({ f, line: i + 1, tok });
  });
}

if (phits.length) {
  console.log(`WARN [${slug}] — ${phits.length} 處未改的 scaffold placeholder(交付前該換掉;此項不致命):`);
  for (const h of phits.slice(0, 12)) console.log(`  ${h.f}:${h.line}  「${h.tok}」`);
}
if (hits.length) {
  console.error(`FAIL [${slug}] — ${hits.length} 處赤壁殘留(複製後沒改乾淨):`);
  for (const h of hits.slice(0, 20)) console.error(`  ${h.f}:${h.line}  「${h.tok}」  ${h.ctx}`);
  process.exit(1);
}
console.log(`PASS [${slug}] — 無赤壁殘留字${phits.length ? `(但有 ${phits.length} 處 placeholder 待改,見上)` : ''}`);
