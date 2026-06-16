#!/usr/bin/env python3
"""官渡旁白:edge-tts 雙聲 mp3 + 句級字幕 cue(SentenceBoundary 聚行)。
用法(需先 pip install edge-tts;此環境用 /tmp/ttsenv):
    /tmp/ttsenv/bin/python3 packages/guandu/narration/generate.py        # 全部
    /tmp/ttsenv/bin/python3 packages/guandu/narration/generate.py 7      # 只第 7 幕
輸出:packages/guandu/assets/narration/<voice>/scene<N>.mp3 + cues.json
"""
import asyncio, json, pathlib, subprocess
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent   # packages/guandu
VOICES = {"yunjhe": "zh-TW-YunJheNeural", "hsiaochen": "zh-TW-HsiaoChenNeural"}
RATE = "-8%"  # 紀錄片腔放慢

# 破音字 TTS 替身:餵 TTS 用右邊(目標讀音的同音字),字幕顯示左邊原字。
# 先留空;聽過後把 edge-tts 唸錯的官渡人名/字補進來(如 荀彧/張郃/許攸/淳于瓊/麾蓋)。
SUBS = {"彧": "郁", "郃": "合", "而還": "而環", "降": "祥"}   # 彧=郁(yù)、郃=合(hé):罕用字回空音訊;而還→而環:還唸 hái→用環(huán);降=祥(xiáng):官渡的「降」都是投降,避免唸成 jiàng
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
            cut = max((txt.rfind(c, 0, mid + 6) for c in ",、；——"), default=-1)
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
