// 殘留掃描 gate:抓「從 chibi(赤壁)複製後忘了改」的漏網字 —— 赤壁專屬的 unit/structure id
// 與地名/典故字串,出現在非赤壁包裡就是 copy-paste 殘留(validator 抓不到字面殘留)。
//
// 用法: node tools/residue-scan.mjs --pkg packages/<slug>/battlefield.json
// 有殘留 → 列出檔案+字+前後文,退出碼 1;乾淨 → PASS。chibi 本身自動跳過。

import { readFileSync, readdirSync } from 'node:fs';
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
  // 結構 id
  'campWulin', 'campChibi', 'huarongPass', 'xiangyang', 'jiangling', 'xiakou', 'chaisang',
  // 地名 / 典故字串(只列赤壁專屬;像「長江」這種跨戰役共用的地理特徵不列,會誤判)
  '赤壁', '烏林', '華容', '連環計', '鐵索連環', '八十萬', '東風', '黃蓋', '周瑜',
];

if (slug === 'chibi') { console.log('SKIP — chibi(赤壁)本身,殘留字屬合法'); process.exit(0); }

const files = readdirSync(dir).filter(f => f.endsWith('.json'));
const hits = [];
for (const f of files) {
  const text = readFileSync(resolve(dir, f), 'utf8');
  const lines = text.split('\n');
  for (const tok of RESIDUE) {
    lines.forEach((ln, i) => { if (ln.includes(tok)) hits.push({ f, line: i + 1, tok, ctx: ln.trim().slice(0, 60) }); });
  }
}

if (hits.length) {
  console.error(`FAIL [${slug}] — ${hits.length} 處赤壁殘留(複製後沒改乾淨):`);
  for (const h of hits.slice(0, 20)) console.error(`  ${h.f}:${h.line}  「${h.tok}」  ${h.ctx}`);
  process.exit(1);
}
console.log(`PASS [${slug}] — 無赤壁殘留字`);
