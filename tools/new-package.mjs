// 戰場 package scaffold:長出一份最小、validator 過、render-check 過的骨架包,
// 讓 AI/人從綠燈狀態開始編寫(依 docs/authoring/ 逐層填)。
//
// 用法: node tools/new-package.mjs <slug> [顯示名]
//   node tools/new-package.mjs feishui 淝水之戰
// 產出 packages/<slug>/ 的六層 JSON + battlefield.json + audio 空殼 + assets/ +
// narration/script.json + narration/generate.py(edge-tts 旁白範本)。不覆蓋既有 package。

import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
const title = process.argv[3] || '新戰役';
if (!slug || !/^[a-z][a-z0-9_-]*$/.test(slug)) {
  console.error('用法: node tools/new-package.mjs <slug(小寫英數)> [顯示名]'); process.exit(1);
}
const dir = join(ROOT, 'packages', slug);
try { await access(dir); console.error(`FAIL: packages/${slug} 已存在,不覆蓋`); process.exit(1); } catch {}

const J = o => JSON.stringify(o, null, 2) + '\n';

const battlefield = {
  name: `${title} 000`, era: '朝代年號(000)',
  description: '一句話描述這場戰役的關鍵 — 誰、在哪、為何而戰、勝負手。',
  engine: 'battlefield-editor',
  data: { factions: 'factions.json', terrain: 'terrain.json', structures: 'structures.json', scene: 'scene.json', audio: 'audio.json', units: 'units.json' },
  pending: [],
  meta: {
    title, subtitle: '年號・西元○○○', docTitle: `${title} — 全 3D 戰場重現｜歷史特別節目`,
    seal: title.slice(0, 1), broadcastTag: '歷史特別節目・全 3D 戰場重現',
    era: '年號', eraYear: '西元 ○○○ 年・地點',
    intro: { tag: '歷史特別節目・3D 戰場重現', bodyHtml: '開場敘事(可含 &lt;br&gt;)。', footHtml: '兵力為史學估計・標注「史」者見於正史,「演義」者出自演義' },
    finale: { title: '終局標題', subtitle: '終局副標' },
    timeline: { start: '起始年號', mid: '戰 役 時 間 軸', end: '結束年號' },
  },
};

const factions = {
  red:  { name: '紅軍', flag: '紅', css: 'red',  col: '#c0392b', dark: '#7d2018', light: '#e88a7a', panel: '紅軍', legend: '紅方' },
  blue: { name: '藍軍', flag: '藍', css: 'blue', col: '#2e6da4', dark: '#1a4060', light: '#7fb0d8', panel: '藍軍', legend: '藍方' },
};

const terrain = {
  world: { W: 600, H: 400, segX: 180, segZ: 120 },
  colorRamp: [
    { maxH: 0, color: '#2c3b3f' }, { maxH: 1.2, color: '#8a7a4e' },
    { maxH: 7, color: '#7d7448', lerpTo: '#90854f', by: 'fbm' },
    { maxH: null, color: '#9a8c5d', lerpTo: '#b3a987', by: 'ramp', from: 7, span: 12 },
  ],
  rivers: [{ id: 'river1', centerline: [[-300, -60], [0, -40], [300, -70]], halfWidth: 26, depth: -8, bankSlope: 0.2, bankCap: 5, bankFbm: { scale: 0.012, xOff: 7, ampRate: 0.13, ampCap: 14 } }],
  bumps: [],
  bands: [{ axis: 'z', beyond: 120, slope: 0.18, fbm: { scale: 0.02, base: 0.4, offset: 6 } }],
  regions: [{ id: 'plain', center: [0, 60], radius: [140, 80], tint: { color: '#857a45', threshold: 0.25, gain: 1.4, max: 0.5, minH: 0.5, maxH: 9 } }],
};

const structures = {
  structures: [
    { id: 'redBase',  type: 'city', x: -120, z: -150, label: '紅方城', labelPos: [-120, -138], labelClass: 'big' },
    { id: 'blueBase', type: 'city', x: 0,    z: 150,  label: '藍方城', labelPos: [0, 162],     labelClass: 'big' },
    { type: 'marker', label: '河', x: 120, z: -64, labelClass: 'water' },
  ],
};

const units = {
  units: [
    { id: 'redArmy',  kind: 'army', faction: 'red',  n: 40, name: '紅軍本隊', generals: '主將・副將', gait: 'foot', start: { x: -120, z: -145, visible: true }, info: ['紅方主力', '一兩句單位背景。'] },
    { id: 'blueArmy', kind: 'army', faction: 'blue', n: 40, name: '藍軍本隊', generals: '主將・副將', gait: 'foot', start: { x: 0, z: 140, visible: true }, info: ['藍方主力', '一兩句單位背景。'] },
  ],
};

const scene = {
  acts: [{
    key: '第一幕', era: '年號', title: '序戰', dur: 22, env: 'day',
    narr: '這一幕的旁白(會顯示在情報面板;若有旁白語音,也用這段文字產字幕)。',
    power: { red: ['約 40,000', 100, '狀態說明'], blue: ['約 40,000', 100, '狀態說明'] },
    shots: [
      { kind: 'line', a: [-200, 160, -220], b: [-60, 100, -120], look: [-30, 2, -20], dur: 11 },
      { kind: 'orbit', c: [-20, 4, 0], r: 90, h: 44, a0: 0.6, a1: 2.4, dur: 11 },
    ],
    march: [{ pts: [[-120, -145], [-60, -80], [-30, -20]], fac: 'red' }, { pts: [[0, 140], [-10, 60], [-20, 10]], fac: 'blue' }],
    set: { redArmy: { path: [[-120, -145], [-60, -80], [-30, -20]], dur: 12 }, blueArmy: { path: [[0, 140], [-10, 60], [-20, 10]], dur: 12 } },
    events: [{ at: 6, x: -30, z: -10, t: '事件卡(史/演義)', tag: '史' }],
  }],
};

const audio = { music: { scenes: [], theme: '' }, narration: { voices: [], default: '', voiceLabels: {}, pathPattern: 'assets/narration/{voice}/scene{n}.mp3', cues: '' }, sfx: { dir: 'assets/sfx', files: [] }, cues: {} };

// 旁白生成腳本範本(edge-tts 雙聲)。scaffold 一併產出,SKILL 步驟 3 直接用,不必再從別包複製。
// ROOT 用 __file__ 自動指向本 package;唯一要動的是 SUBS(本戰役破音字/罕用字替身)。
const GENERATE_PY = `#!/usr/bin/env python3
"""旁白生成:edge-tts 雙聲 mp3 + 句級字幕 cue(SentenceBoundary 聚行)。
環境前置(本機/CI 都要先備齊,缺則旁白整條跑不起來):
    python3 -m venv /tmp/ttsenv && /tmp/ttsenv/bin/pip install edge-tts   # edge-tts
    需有 ffprobe(ffmpeg 內含)在 PATH                                     # 量音長
用法(在 repo 根執行;edge-tts 走 wss,本機需停用 sandbox 才連得上):
    /tmp/ttsenv/bin/python3 packages/<slug>/narration/generate.py        # 全部
    /tmp/ttsenv/bin/python3 packages/<slug>/narration/generate.py 7      # 只第 7 幕
輸出:packages/<slug>/assets/narration/<voice>/scene<N>.mp3 + cues.json
"""
import asyncio, json, pathlib, subprocess
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent   # 自動指向本 package
VOICES = {"yunjhe": "zh-TW-YunJheNeural", "hsiaochen": "zh-TW-HsiaoChenNeural"}
RATE = "-8%"  # 紀錄片腔放慢

# 破音字 / 罕用字 TTS 替身:餵 TTS 用右邊(目標讀音的同音字),字幕由 to_display 還原左邊原字。
# 台灣讀音為準。罕用字(會吐空音)優先在 script.json 改白話避開;非用不可才在此加替身。
# 例(垓下):{"騅": "錐"}  例(官渡):{"彧": "郁", "郃": "合", "降": "祥"}
SUBS = {
}
def to_tts(text):
    for k, v in SUBS.items():
        text = text.replace(k, v)
    return text
def to_display(text):
    for k, v in SUBS.items():
        text = text.replace(v, k)
    return text


def probe_dur(path):
    return float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)]))


def words_to_lines(words, text):
    lines = []
    for w in words:
        txt = w["w"].strip("。;")
        if len(txt) > 26:
            mid = len(txt) // 2
            cut = max((txt.rfind(c, 0, mid + 6) for c in ",、;——"), default=-1)
            if cut > 4:
                est = w.get("d", 4.0) * (cut / len(txt))
                lines.append({"t": round(w["t"], 2), "text": txt[:cut]})
                lines.append({"t": round(w["t"] + est, 2), "text": txt[cut + 1:]})
                continue
        lines.append({"t": round(w["t"], 2), "text": txt})
    for l in lines:
        l["text"] = to_display(l["text"])
    return lines


async def gen(scene, vkey, vname):
    out = ROOT / "assets" / "narration" / vkey / f"scene{scene['scene']}.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    words = []
    cm = edge_tts.Communicate(to_tts(scene["text"]), vname, rate=RATE)
    with open(out, "wb") as f:
        async for chunk in cm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"].endswith("Boundary"):
                words.append({"t": chunk["offset"] / 1e7, "w": chunk["text"],
                              "d": chunk.get("duration", 4e7) / 1e7})
    dur = probe_dur(out)
    print(f"  scene{scene['scene']} {vkey}: {dur:.1f}s, {len(words)} words")
    return {"dur": round(dur, 2), "lines": words_to_lines(words, scene["text"])}


async def gen_retry(sc, vkey, vname, tries=4):
    for i in range(tries):
        try:
            return await gen(sc, vkey, vname)
        except Exception as e:
            print(f"  scene{sc['scene']} {vkey} retry {i+1}: {str(e)[:60]}")
            await asyncio.sleep(10 * (i + 1))
    raise RuntimeError(f"scene{sc['scene']} {vkey} failed after {tries} tries")


async def main():
    import sys
    only = {int(a) for a in sys.argv[1:]} if len(sys.argv) > 1 else None
    script = json.loads((ROOT / "narration" / "script.json").read_text())
    out = ROOT / "assets" / "narration" / "cues.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    cues = json.loads(out.read_text()) if out.exists() else {}
    for sc in script:
        if only and sc["scene"] not in only:
            continue
        entry = {"title": sc["title"], "text": sc["text"]}
        for vkey, vname in VOICES.items():
            entry[vkey] = await gen_retry(sc, vkey, vname)
        cues[str(sc["scene"])] = entry
        out.write_text(json.dumps(cues, ensure_ascii=False, indent=1))
    print("wrote", out)

asyncio.run(main())
`;

await mkdir(dir, { recursive: true });
for (const sub of ['assets/narration', 'assets/music', 'assets/sfx', 'narration']) await mkdir(join(dir, sub), { recursive: true });
await Promise.all([
  writeFile(join(dir, 'battlefield.json'), J(battlefield)),
  writeFile(join(dir, 'factions.json'), J(factions)),
  writeFile(join(dir, 'terrain.json'), J(terrain)),
  writeFile(join(dir, 'structures.json'), J(structures)),
  writeFile(join(dir, 'units.json'), J(units)),
  writeFile(join(dir, 'scene.json'), J(scene)),
  writeFile(join(dir, 'audio.json'), J(audio)),
  writeFile(join(dir, 'narration', 'script.json'), '[]\n'),
  writeFile(join(dir, 'narration', 'generate.py'), GENERATE_PY),
  ...['assets/narration', 'assets/music', 'assets/sfx'].map(s => writeFile(join(dir, s, '.gitkeep'), '')),
]);

console.log(`OK 已建 packages/${slug}/(最小骨架,綠燈起步;紅/藍 placeholder 待改)`);
console.log(`  驗證:   node tools/validate-data.mjs --pkg packages/${slug}/battlefield.json`);
console.log(`  殘留檢:  node tools/residue-scan.mjs  --pkg packages/${slug}/battlefield.json`);
console.log(`  渲染檢:  node tools/render-check.mjs   --pkg packages/${slug}/battlefield.json`);
console.log(`  音訊檢:  node tools/audio-check.mjs    --pkg packages/${slug}/battlefield.json`);
console.log(`  瀏覽器:  index.html?pkg=packages/${slug}/battlefield.json`);
console.log(`  接著依 docs/authoring/ 逐層編(factions→terrain→structures→units→scene→audio);`);
console.log(`  旁白用 narration/generate.py(已備範本,改 SUBS 即可)。`);
